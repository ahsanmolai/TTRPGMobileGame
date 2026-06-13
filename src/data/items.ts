// Shop / loot catalogue: every purchasable or droppable item, plus the
// per-class equip rules the inventory engine validates against.
import { ArmorData, ArmorCategory } from 'src/engine/character';
import { WeaponData, WEAPONS } from 'src/data/weapons';
import { ClassId } from 'src/data/classes';
import { getArmor } from 'src/data/armor';

export type ItemKind = 'weapon' | 'armor' | 'shield' | 'potion' | 'trinket';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  /** Gold cost to buy; sell-back = floor(price / 2). */
  price: number;
  /** First floor whose shop can stock the item. */
  minFloor: number;
  description: string;
  weapon?: WeaponData;
  armor?: ArmorData;
  /** Shield AC bonus (shield: 2, shield_plus_1: 3). */
  shieldBonus?: number;
  /** Potion healing dice notation. */
  healDice?: string;
  /** Trinket AC bonus, always applied (ring of protection). */
  acBonus?: number;
  /** Trinket AC bonus applied only when unarmored (bracers of defense). */
  unarmoredACBonus?: number;
  /** Trinket max-HP bonus (amulet of vitality). */
  maxHPBonus?: number;
}

// Magic weapon tiers: minFloor and price keyed by enchantment bonus.
const MAGIC_TIERS: Record<1 | 2 | 3, { minFloor: number; price: number }> = {
  1: { minFloor: 4, price: 150 },
  2: { minFloor: 10, price: 600 },
  3: { minFloor: 16, price: 2000 },
};

function magicWeaponItems(): Record<string, ItemDef> {
  const out: Record<string, ItemDef> = {};
  for (const base of Object.values(WEAPONS)) {
    for (const bonus of [1, 2, 3] as const) {
      const tier = MAGIC_TIERS[bonus];
      const id = `${base.id}_plus_${bonus}`;
      out[id] = {
        id,
        name: `${base.name} +${bonus}`,
        kind: 'weapon',
        price: tier.price,
        minFloor: tier.minFloor,
        description: `A magical ${base.name.toLowerCase()} granting +${bonus} to attack and damage.`,
        weapon: { ...base, id, name: `${base.name} +${bonus}`, magicBonus: bonus },
      };
    }
  }
  return out;
}

// Armor items reference the ArmorData defined in src/data/armor.ts.
function armorItem(
  armorId: string,
  price: number,
  minFloor: number,
  description: string,
): ItemDef {
  const armor = getArmor(armorId);
  return { id: armorId, name: armor.name, kind: 'armor', price, minFloor, description, armor };
}

export const ITEMS: Record<string, ItemDef> = {
  // Potions (stackable).
  potion_healing: {
    id: 'potion_healing',
    name: 'Potion of Healing',
    kind: 'potion',
    price: 25,
    minFloor: 1,
    description: 'Restores 2d4+2 hit points.',
    healDice: '2d4+2',
  },
  potion_greater_healing: {
    id: 'potion_greater_healing',
    name: 'Greater Potion of Healing',
    kind: 'potion',
    price: 75,
    minFloor: 4,
    description: 'Restores 4d4+4 hit points.',
    healDice: '4d4+4',
  },
  potion_superior_healing: {
    id: 'potion_superior_healing',
    name: 'Superior Potion of Healing',
    kind: 'potion',
    price: 200,
    minFloor: 9,
    description: 'Restores 8d4+8 hit points.',
    healDice: '8d4+8',
  },
  potion_supreme_healing: {
    id: 'potion_supreme_healing',
    name: 'Supreme Potion of Healing',
    kind: 'potion',
    price: 500,
    minFloor: 14,
    description: 'Restores 10d4+20 hit points.',
    healDice: '10d4+20',
  },

  // Mundane armor (SRD tiers).
  studded: armorItem('studded', 45, 2, 'Light armor; AC 12 + full Dex.'),
  hide: armorItem('hide', 30, 1, 'Medium armor; AC 12 + Dex (max 2).'),
  chain_shirt: armorItem('chain_shirt', 50, 2, 'Medium armor; AC 13 + Dex (max 2).'),
  scale: armorItem('scale', 60, 4, 'Medium armor; AC 14 + Dex (max 2).'),
  breastplate: armorItem('breastplate', 120, 6, 'Medium armor; AC 14 + Dex (max 2).'),
  half_plate: armorItem('half_plate', 200, 8, 'Medium armor; AC 15 + Dex (max 2).'),
  ring: armorItem('ring', 70, 3, 'Heavy armor; AC 14.'),
  splint: armorItem('splint', 200, 8, 'Heavy armor; AC 17.'),
  plate: armorItem('plate', 600, 11, 'Heavy armor; AC 18.'),

  // Caster armor.
  mage_robe: armorItem('mage_robe', 90, 3, 'Arcane vestments; AC 13 + full Dex.'),
  greater_robe: armorItem('greater_robe', 400, 10, 'Arcane vestments; AC 15 + full Dex.'),

  // Shields.
  shield: {
    id: 'shield',
    name: 'Shield',
    kind: 'shield',
    price: 10,
    minFloor: 1,
    description: '+2 AC while equipped.',
    shieldBonus: 2,
  },
  shield_plus_1: {
    id: 'shield_plus_1',
    name: 'Shield +1',
    kind: 'shield',
    price: 250,
    minFloor: 8,
    description: '+3 AC while equipped.',
    shieldBonus: 3,
  },

  // Trinkets (one slot).
  ring_of_protection: {
    id: 'ring_of_protection',
    name: 'Ring of Protection',
    kind: 'trinket',
    price: 300,
    minFloor: 6,
    description: '+1 AC at all times.',
    acBonus: 1,
  },
  bracers_of_defense: {
    id: 'bracers_of_defense',
    name: 'Bracers of Defense',
    kind: 'trinket',
    price: 350,
    minFloor: 7,
    description: '+2 AC while wearing no armor.',
    unarmoredACBonus: 2,
  },
  amulet_of_vitality: {
    id: 'amulet_of_vitality',
    name: 'Amulet of Vitality',
    kind: 'trinket',
    price: 450,
    minFloor: 9,
    description: '+15 maximum hit points while worn.',
    maxHPBonus: 15,
  },

  // Magic weapons (+1/+2/+3 of every base weapon).
  ...magicWeaponItems(),
};

export function getItem(id: string): ItemDef {
  const item = ITEMS[id];
  if (!item) throw new Error(`Unknown item: ${id}`);
  return item;
}

// Armor proficiency by class. Casters use 'arcane' vestments; monks too.
export const ARMOR_PROFICIENCY: Record<ClassId, ArmorCategory[]> = {
  fighter: ['light', 'medium', 'heavy'],
  paladin: ['light', 'medium', 'heavy'],
  barbarian: ['light', 'medium'],
  cleric: ['light', 'medium'],
  druid: ['light', 'medium'],
  ranger: ['light', 'medium'],
  bard: ['light'],
  rogue: ['light'],
  warlock: ['light'],
  sorcerer: ['arcane'],
  wizard: ['arcane'],
  monk: ['arcane'],
};

export const SHIELD_PROFICIENT: ClassId[] = [
  'fighter',
  'paladin',
  'barbarian',
  'cleric',
  'druid',
  'ranger',
];

/**
 * The shop's stock for a floor: a deterministic-by-construction slice of the
 * catalogue (3 potion stacks, 2 armors, 2 weapons, 1 trinket, 1 shield). Only
 * items the floor can reach (minFloor <= floor + 1) are eligible; per kind the
 * highest-tier eligible items are stocked first, so deeper floors carry the
 * best gear and never run dry. Always non-empty for floors 1..20.
 */
export function buildShopStock(floor: number): { itemId: string; qty: number }[] {
  const hi = floor + 1;
  const stock: { itemId: string; qty: number }[] = [];

  const pickByKind = (kind: ItemKind, limit: number, qty: number): void => {
    const matches = Object.values(ITEMS)
      .filter((item) => item.kind === kind && item.minFloor <= hi)
      // highest-tier first so a floor stocks its best available options;
      // id tiebreaker keeps the result deterministic
      .sort((a, b) => b.minFloor - a.minFloor || (a.id < b.id ? -1 : 1))
      .slice(0, limit);
    for (const item of matches) stock.push({ itemId: item.id, qty });
  };

  pickByKind('potion', 3, 5);
  pickByKind('armor', 2, 1);
  pickByKind('weapon', 2, 1);
  pickByKind('trinket', 1, 1);
  pickByKind('shield', 1, 1);

  return stock;
}
