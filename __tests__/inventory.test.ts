import {
  addItem,
  removeItem,
  canEquip,
  equipItem,
  sellPrice,
  buyItem,
  sellItem,
  bestPotion,
  drinkPotion,
} from 'src/engine/inventory';
import { calculateAC, CharacterStats } from 'src/engine/character';
import { getItem } from 'src/data/items';
import { buildCharacter, CharacterBuild } from 'src/engine/leveling';
import { ClassId } from 'src/data/classes';

function make(classId: ClassId): CharacterStats {
  const build: CharacterBuild = {
    id: `inv_${classId}`,
    name: 'Test',
    race: 'human',
    classId,
    abilityScores: {
      strength: 14,
      dexterity: 14,
      constitution: 14,
      intelligence: 12,
      wisdom: 12,
      charisma: 10,
    },
  };
  return buildCharacter(build);
}

describe('inventory.addItem / removeItem', () => {
  it('stacks added items and never mutates the input', () => {
    const c = make('fighter');
    const before = c.inventory;
    const next = addItem(c, 'potion_healing', 3);
    expect(c.inventory).toBe(before); // input untouched
    expect(next.inventory.find((e) => e.itemId === 'potion_healing')!.qty).toBe(5);
  });

  it('adds a new stack for an unowned item', () => {
    const c = make('fighter');
    const next = addItem(c, 'shield', 1);
    expect(next.inventory.find((e) => e.itemId === 'shield')!.qty).toBe(1);
  });

  it('drops a stack once removed to zero', () => {
    const c = addItem(make('fighter'), 'shield', 1);
    const next = removeItem(c, 'shield', 1);
    expect(next.inventory.find((e) => e.itemId === 'shield')).toBeUndefined();
  });
});

describe('inventory.canEquip', () => {
  it('refuses a wizard plate (heavy) but allows the mage robe (arcane)', () => {
    const wiz = make('wizard');
    expect(canEquip(wiz, 'plate').ok).toBe(false);
    expect(canEquip(wiz, 'mage_robe').ok).toBe(true);
  });

  it('refuses a wizard a shield, allows a fighter', () => {
    expect(canEquip(make('wizard'), 'shield').ok).toBe(false);
    expect(canEquip(make('fighter'), 'shield').ok).toBe(true);
  });

  it('refuses potions as equipment', () => {
    expect(canEquip(make('fighter'), 'potion_healing').ok).toBe(false);
  });
});

describe('inventory.equipItem', () => {
  it('throws when the class lacks proficiency', () => {
    const wiz = addItem(make('wizard'), 'plate', 1);
    expect(() => equipItem(wiz, 'plate')).toThrow();
  });

  it('equips arcane armor for a wizard and consumes the bag copy', () => {
    let wiz = addItem(make('wizard'), 'mage_robe', 1);
    wiz = equipItem(wiz, 'mage_robe');
    expect(wiz.armor?.id).toBe('mage_robe');
    expect(wiz.inventory.find((e) => e.itemId === 'mage_robe')).toBeUndefined();
  });

  it('swaps a magic weapon and returns the old magic weapon to the bag', () => {
    let fighter = make('fighter');
    fighter = addItem(fighter, 'longsword_plus_1', 1);
    fighter = addItem(fighter, 'longsword_plus_2', 1);
    fighter = equipItem(fighter, 'longsword_plus_1');
    expect(fighter.mainHand.magicBonus).toBe(1);
    fighter = equipItem(fighter, 'longsword_plus_2');
    expect(fighter.mainHand.magicBonus).toBe(2);
    // the +1 swapped back into the bag
    expect(fighter.inventory.find((e) => e.itemId === 'longsword_plus_1')!.qty).toBe(1);
  });

  it('equips a shield with the right bonus', () => {
    let fighter = addItem(make('fighter'), 'shield_plus_1', 1);
    fighter = equipItem(fighter, 'shield_plus_1');
    expect(fighter.shield).toBe(true);
    expect(fighter.shieldBonus).toBe(3);
  });
});

describe('inventory trinkets and AC', () => {
  it('bracers add AC only when unarmored', () => {
    let wiz = make('wizard'); // wizard starts with no armor
    wiz = addItem(wiz, 'bracers_of_defense', 1);
    const unarmoredBase = calculateAC(wiz);
    wiz = equipItem(wiz, 'bracers_of_defense');
    expect(calculateAC(wiz)).toBe(unarmoredBase + 2);

    // now wearing a robe — bracers no longer apply
    let armored = addItem(wiz, 'mage_robe', 1);
    armored = equipItem(armored, 'mage_robe');
    const robeOnly = calculateAC({ ...armored, trinketId: null });
    expect(calculateAC(armored)).toBe(robeOnly);
  });

  it('ring of protection always grants +1 AC', () => {
    let wiz = make('wizard');
    const base = calculateAC(wiz);
    wiz = addItem(wiz, 'ring_of_protection', 1);
    wiz = equipItem(wiz, 'ring_of_protection');
    expect(calculateAC(wiz)).toBe(base + 1);
  });

  it('amulet of vitality raises maxHP by 15 on equip and lowers it on unequip', () => {
    let c = make('fighter');
    const baseMax = c.maxHP;
    const baseCur = c.currentHP;
    c = addItem(c, 'amulet_of_vitality', 1);
    c = equipItem(c, 'amulet_of_vitality');
    expect(c.maxHP).toBe(baseMax + 15);
    expect(c.currentHP).toBe(baseCur + 15);

    // equipping a different trinket unequips the amulet, removing the bonus
    c = addItem(c, 'ring_of_protection', 1);
    c = equipItem(c, 'ring_of_protection');
    expect(c.maxHP).toBe(baseMax);
    expect(c.currentHP).toBe(baseCur);
    expect(c.inventory.find((e) => e.itemId === 'amulet_of_vitality')!.qty).toBe(1);
  });

  it('clamps currentHP when unequipping the amulet while wounded', () => {
    let c = make('fighter');
    c = addItem(c, 'amulet_of_vitality', 1);
    c = equipItem(c, 'amulet_of_vitality');
    c = { ...c, currentHP: 3 }; // hurt below the bonus amount
    c = addItem(c, 'ring_of_protection', 1);
    c = equipItem(c, 'ring_of_protection');
    expect(c.currentHP).toBeGreaterThanOrEqual(0);
    expect(c.currentHP).toBeLessThanOrEqual(c.maxHP);
  });
});

describe('inventory.buy / sell economy', () => {
  it('sellPrice is floor(price / 2)', () => {
    expect(sellPrice(getItem('potion_healing'))).toBe(12);
    expect(sellPrice(getItem('shield'))).toBe(5);
  });

  it('buyItem deducts gold and adds to the bag', () => {
    let c = { ...make('fighter'), gold: 100 };
    c = buyItem(c, 'shield');
    expect(c.gold).toBe(90);
    expect(c.inventory.find((e) => e.itemId === 'shield')!.qty).toBe(1);
  });

  it('buyItem is a no-op when gold is insufficient', () => {
    const c = { ...make('fighter'), gold: 5 };
    const next = buyItem(c, 'shield'); // costs 10
    expect(next).toBe(c);
  });

  it('sellItem credits half price and removes the item', () => {
    let c = { ...make('fighter'), gold: 0 };
    c = addItem(c, 'shield', 1);
    c = sellItem(c, 'shield');
    expect(c.gold).toBe(5);
    expect(c.inventory.find((e) => e.itemId === 'shield')).toBeUndefined();
  });

  it('buy -> sell round trip returns half the purchase price', () => {
    let c = { ...make('fighter'), gold: 100 };
    c = buyItem(c, 'shield'); // -10 -> 90
    c = sellItem(c, 'shield'); // +5 -> 95
    expect(c.gold).toBe(95);
  });

  it('sellItem is a no-op for an unowned item', () => {
    const c = { ...make('fighter'), gold: 0, inventory: [] };
    expect(sellItem(c, 'shield')).toBe(c);
  });
});

describe('inventory.bestPotion / drinkPotion', () => {
  it('picks the strongest potion in the bag', () => {
    let c = make('fighter'); // starts with 2 healing potions
    c = addItem(c, 'potion_superior_healing', 1);
    expect(bestPotion(c)!.id).toBe('potion_superior_healing');
  });

  it('returns null when no potion is held', () => {
    const c = { ...make('fighter'), inventory: [] };
    expect(bestPotion(c)).toBeNull();
  });

  it('drinkPotion decrements the chosen stack and returns its heal dice', () => {
    const c = make('fighter');
    const startQty = c.inventory.find((e) => e.itemId === 'potion_healing')!.qty;
    const { character, healed } = drinkPotion(c);
    expect(healed).toBe('2d4+2');
    expect(character.inventory.find((e) => e.itemId === 'potion_healing')!.qty).toBe(startQty - 1);
  });

  it('drinkPotion is a no-op with an empty bag', () => {
    const c = { ...make('fighter'), inventory: [] };
    const { character, healed } = drinkPotion(c);
    expect(healed).toBeNull();
    expect(character).toBe(c);
  });
});
