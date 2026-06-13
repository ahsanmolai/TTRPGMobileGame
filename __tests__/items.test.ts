import {
  ITEMS,
  getItem,
  buildShopStock,
  ARMOR_PROFICIENCY,
  SHIELD_PROFICIENT,
} from 'src/data/items';
import { parseDamageNotation } from 'src/engine/dice';
import { CLASSES, ClassId } from 'src/data/classes';

const ALL_ITEMS = Object.values(ITEMS);
const ALL_CLASSES = Object.keys(CLASSES) as ClassId[];

describe('items.ITEMS catalogue', () => {
  it('prices every item above zero', () => {
    for (const item of ALL_ITEMS) {
      expect(item.price).toBeGreaterThan(0);
    }
  });

  it('keeps every minFloor within 1..20', () => {
    for (const item of ALL_ITEMS) {
      expect(item.minFloor).toBeGreaterThanOrEqual(1);
      expect(item.minFloor).toBeLessThanOrEqual(20);
    }
  });

  it('ids match their record key', () => {
    for (const [key, item] of Object.entries(ITEMS)) {
      expect(item.id).toBe(key);
    }
  });

  it('getItem throws for an unknown id', () => {
    expect(() => getItem('not_a_real_item')).toThrow();
  });

  it('weapon items embed a weapon with parseable damage dice', () => {
    for (const item of ALL_ITEMS) {
      if (item.kind !== 'weapon') continue;
      expect(item.weapon).toBeDefined();
      expect(() => parseDamageNotation(item.weapon!.damageDice)).not.toThrow();
    }
  });

  it('potion items carry parseable heal dice', () => {
    for (const item of ALL_ITEMS) {
      if (item.kind !== 'potion') continue;
      expect(item.healDice).toBeDefined();
      expect(() => parseDamageNotation(item.healDice!)).not.toThrow();
    }
  });

  it('magic weapon magicBonus matches its tier id', () => {
    for (const item of ALL_ITEMS) {
      if (item.kind !== 'weapon') continue;
      const match = /_plus_(\d)$/.exec(item.id);
      expect(match).not.toBeNull();
      const tier = Number(match![1]);
      expect(item.weapon!.magicBonus).toBe(tier);
      // minFloor follows the +1/+2/+3 progression
      expect(item.minFloor).toBe(tier === 1 ? 4 : tier === 2 ? 10 : 16);
    }
  });

  it('shields carry a shieldBonus', () => {
    expect(ITEMS.shield.shieldBonus).toBe(2);
    expect(ITEMS.shield_plus_1.shieldBonus).toBe(3);
  });
});

describe('items.ARMOR_PROFICIENCY / SHIELD_PROFICIENT', () => {
  it('defines a proficiency list for every class', () => {
    for (const classId of ALL_CLASSES) {
      expect(ARMOR_PROFICIENCY[classId].length).toBeGreaterThan(0);
    }
  });

  it('grants casters arcane vestments only', () => {
    expect(ARMOR_PROFICIENCY.wizard).toEqual(['arcane']);
    expect(ARMOR_PROFICIENCY.sorcerer).toEqual(['arcane']);
    expect(ARMOR_PROFICIENCY.monk).toEqual(['arcane']);
  });

  it('lets fighters and paladins wear everything', () => {
    expect(ARMOR_PROFICIENCY.fighter).toEqual(['light', 'medium', 'heavy']);
    expect(ARMOR_PROFICIENCY.paladin).toEqual(['light', 'medium', 'heavy']);
  });

  it('only lists martial classes as shield-proficient', () => {
    expect(SHIELD_PROFICIENT).toContain('fighter');
    expect(SHIELD_PROFICIENT).not.toContain('wizard');
    expect(SHIELD_PROFICIENT).not.toContain('rogue');
  });
});

describe('items.buildShopStock', () => {
  it('returns a non-empty, tier-appropriate stock for every floor 1..20', () => {
    for (let floor = 1; floor <= 20; floor++) {
      const stock = buildShopStock(floor);
      expect(stock.length).toBeGreaterThan(0);
      for (const entry of stock) {
        const item = getItem(entry.itemId);
        expect(item.minFloor).toBeLessThanOrEqual(floor + 1);
        expect(entry.qty).toBeGreaterThan(0);
      }
    }
  });

  it('is deterministic for a given floor', () => {
    for (let floor = 1; floor <= 20; floor++) {
      expect(buildShopStock(floor)).toEqual(buildShopStock(floor));
    }
  });

  it('stocks the full slot budget once the catalogue is deep enough', () => {
    // A mid/late floor can reach every kind, so the budget is fully spent:
    // 3 potions + 2 armors + 2 weapons + 1 trinket + 1 shield = 9 entries.
    expect(buildShopStock(15).length).toBe(9);
  });

  it('offers higher-tier gear on deeper floors', () => {
    const early = buildShopStock(1).map((e) => e.itemId);
    const late = buildShopStock(20).map((e) => e.itemId);
    // floor 1 cannot reach the +3 weapons; a late floor stocks them.
    expect(early.some((id) => /_plus_3$/.test(id))).toBe(false);
    expect(late.some((id) => /_plus_3$/.test(id))).toBe(true);
  });
});
