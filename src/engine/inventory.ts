// Pure inventory operations. Every function returns a NEW CharacterStats —
// callers feed these into immer stores, so mutating the input would freeze and
// crash. Never mutate `c`, its inventory array, or its nested objects.
import { CharacterStats } from 'src/engine/character';
import {
  ITEMS,
  ItemDef,
  getItem,
  ARMOR_PROFICIENCY,
  SHIELD_PROFICIENT,
} from 'src/data/items';
import { parseDamageNotation } from 'src/engine/dice';

/** Add `qty` of an item to the bag, stacking onto any existing entry. */
export function addItem(c: CharacterStats, itemId: string, qty = 1): CharacterStats {
  if (qty <= 0) return c;
  const existing = c.inventory.find((e) => e.itemId === itemId);
  const inventory = existing
    ? c.inventory.map((e) => (e.itemId === itemId ? { ...e, qty: e.qty + qty } : e))
    : [...c.inventory, { itemId, qty }];
  return { ...c, inventory };
}

/** Remove `qty` of an item; drops the stack entirely once it hits zero. */
export function removeItem(c: CharacterStats, itemId: string, qty = 1): CharacterStats {
  const inventory = c.inventory
    .map((e) => (e.itemId === itemId ? { ...e, qty: e.qty - qty } : e))
    .filter((e) => e.qty > 0);
  return { ...c, inventory };
}

/** Whether the character may equip the item (proficiency / kind checks). */
export function canEquip(c: CharacterStats, itemId: string): { ok: boolean; reason?: string } {
  const item = getItem(itemId);
  switch (item.kind) {
    case 'armor': {
      const category = item.armor!.category;
      if (!ARMOR_PROFICIENCY[c.classId].includes(category)) {
        return { ok: false, reason: `${c.classId} is not proficient with ${category} armor` };
      }
      return { ok: true };
    }
    case 'shield':
      if (!SHIELD_PROFICIENT.includes(c.classId)) {
        return { ok: false, reason: `${c.classId} cannot use shields` };
      }
      return { ok: true };
    case 'weapon':
      return { ok: true };
    case 'trinket':
      return { ok: true };
    case 'potion':
      return { ok: false, reason: 'Potions are consumed, not equipped' };
    default:
      return { ok: false, reason: 'Unknown item kind' };
  }
}

// Maps a currently-equipped piece of gear back to a bag item id, but only when
// the catalogue can represent it (magic weapons, shop armors). Free starter
// gear with no ItemDef is simply discarded on swap.
function itemIdForEquippedArmor(armorId: string | undefined): string | null {
  if (!armorId) return null;
  const item = ITEMS[armorId];
  return item && item.kind === 'armor' ? armorId : null;
}

function itemIdForEquippedWeapon(weaponId: string): string | null {
  const item = ITEMS[weaponId];
  return item && item.kind === 'weapon' ? weaponId : null;
}

/**
 * Equip an item out of the bag. Validates proficiency, swaps the previously
 * equipped gear of the same slot back into the bag (when representable), and
 * for amulets adjusts max/current HP by the change in maxHPBonus.
 */
export function equipItem(c: CharacterStats, itemId: string): CharacterStats {
  const check = canEquip(c, itemId);
  if (!check.ok) throw new Error(check.reason ?? `Cannot equip ${itemId}`);
  const item = getItem(itemId);

  // Pull one copy out of the bag.
  let next = removeItem(c, itemId, 1);

  switch (item.kind) {
    case 'weapon': {
      const oldId = itemIdForEquippedWeapon(next.mainHand.id);
      if (oldId) next = addItem(next, oldId, 1);
      next = { ...next, mainHand: { ...item.weapon! } };
      break;
    }
    case 'armor': {
      const oldId = itemIdForEquippedArmor(next.armor?.id);
      if (oldId) next = addItem(next, oldId, 1);
      next = { ...next, armor: { ...item.armor! } };
      break;
    }
    case 'shield': {
      // A previously-equipped shield can be a magic one worth returning.
      if (next.shield) {
        const oldShieldId = next.shieldBonus && next.shieldBonus >= 3 ? 'shield_plus_1' : 'shield';
        next = addItem(next, oldShieldId, 1);
      }
      next = { ...next, shield: true, shieldBonus: item.shieldBonus ?? 2 };
      break;
    }
    case 'trinket': {
      const oldHPBonus = next.trinketId ? getItem(next.trinketId).maxHPBonus ?? 0 : 0;
      if (next.trinketId) next = addItem(next, next.trinketId, 1);
      const newHPBonus = item.maxHPBonus ?? 0;
      const delta = newHPBonus - oldHPBonus;
      const maxHP = Math.max(1, next.maxHP + delta);
      const currentHP = Math.max(0, Math.min(maxHP, next.currentHP + delta));
      next = { ...next, trinketId: itemId, maxHP, currentHP };
      break;
    }
  }
  return next;
}

/** Sell-back value: half price, rounded down. */
export function sellPrice(item: ItemDef): number {
  return Math.floor(item.price / 2);
}

/**
 * Buy one of an item: deduct its price and add it to the bag. No-op (returns
 * the unchanged character) when the character cannot afford it.
 */
export function buyItem(c: CharacterStats, itemId: string): CharacterStats {
  const item = getItem(itemId);
  if (c.gold < item.price) return c;
  const next = { ...c, gold: c.gold - item.price };
  return addItem(next, itemId, 1);
}

/**
 * Sell one of an item from the bag: remove it and credit half its price.
 * No-op when the bag holds none of it.
 */
export function sellItem(c: CharacterStats, itemId: string): CharacterStats {
  const owned = c.inventory.find((e) => e.itemId === itemId);
  if (!owned || owned.qty <= 0) return c;
  const item = getItem(itemId);
  const next = removeItem(c, itemId, 1);
  return { ...next, gold: next.gold + sellPrice(item) };
}

// Average healing of a potion's dice, used to rank potions by strength.
function averageHeal(item: ItemDef): number {
  if (!item.healDice) return 0;
  const { count, sides, bonus } = parseDamageNotation(item.healDice);
  return (count * (sides + 1)) / 2 + bonus;
}

/** The strongest healing potion currently in the bag, or null when none. */
export function bestPotion(c: CharacterStats): ItemDef | null {
  let best: ItemDef | null = null;
  for (const entry of c.inventory) {
    if (entry.qty <= 0) continue;
    const item = ITEMS[entry.itemId];
    if (!item || item.kind !== 'potion') continue;
    if (!best || averageHeal(item) > averageHeal(best)) best = item;
  }
  return best;
}

/**
 * Consume the best potion in the bag, returning the updated character and the
 * potion's healing dice. Actual HP application is the caller's job (combat or
 * the inventory screen) — this only resolves which potion and decrements it.
 * Returns healed: 0 and the unchanged character when no potion is held.
 */
export function drinkPotion(c: CharacterStats): { character: CharacterStats; healed: string | null } {
  const potion = bestPotion(c);
  if (!potion) return { character: c, healed: null };
  return { character: removeItem(c, potion.id, 1), healed: potion.healDice ?? null };
}
