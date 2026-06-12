import {
  FLOOR_TABLE,
  FIGHTS_PER_FLOOR,
  buildFloorEncounters,
  encounterXP,
  getFloorDef,
  monstersInBand,
  pairFightPool,
} from 'src/data/floors';
import { ENEMIES } from 'src/data/enemies';

describe('floors.FLOOR_TABLE', () => {
  it('defines exactly 20 floors in order', () => {
    expect(FLOOR_TABLE).toHaveLength(20);
    FLOOR_TABLE.forEach((def, i) => expect(def.floor).toBe(i + 1));
  });

  // Guards against monster-data regeneration silently emptying a band.
  it.each(FLOOR_TABLE.map((def) => [def.floor, def] as const))(
    'floor %i has non-empty trash, pair-fight, and boss pools',
    (floor, def) => {
      const trash = monstersInBand(def.trashCR[0], def.trashCR[1]);
      const boss = monstersInBand(def.bossCR[0], def.bossCR[1]);
      expect(trash.length).toBeGreaterThan(0);
      expect(pairFightPool(floor).length).toBeGreaterThan(0);
      expect(boss.length).toBeGreaterThan(0);
    },
  );

  it('no band ever includes the tarrasque', () => {
    for (const def of FLOOR_TABLE) {
      expect(def.trashCR[1]).toBeLessThan(30);
      expect(def.bossCR[1]).toBeLessThan(30);
    }
  });
});

describe('floors.buildFloorEncounters', () => {
  it.each(FLOOR_TABLE.map((def) => [def.floor] as const))(
    'floor %i: 5 fights, correct shapes, all within band',
    (floor) => {
      const def = getFloorDef(floor);
      const encounters = buildFloorEncounters(floor);
      expect(encounters).toHaveLength(FIGHTS_PER_FLOOR);

      encounters.forEach((enc, i) => {
        const isBoss = i === FIGHTS_PER_FLOOR - 1;
        expect(enc.isBoss).toBe(isBoss);
        expect(enc.enemyIds.length).toBe(i < 2 ? 2 : 1);
        expect(enc.xp).toBe(encounterXP(enc.enemyIds));
        for (const id of enc.enemyIds) {
          const cr = ENEMIES[id].cr;
          // pair fights (i < 2) draw from below the trash band
          const [min, max] = isBoss
            ? def.bossCR
            : i < 2
              ? [Math.max(0, def.trashCR[0] - 2), def.trashCR[1]]
              : def.trashCR;
          expect(cr).toBeGreaterThanOrEqual(min);
          expect(cr).toBeLessThanOrEqual(max);
        }
      });
    },
  );

  it('every encounter is worth XP', () => {
    for (const def of FLOOR_TABLE) {
      for (const enc of buildFloorEncounters(def.floor)) {
        expect(enc.xp).toBeGreaterThan(0);
      }
    }
  });
});

describe('monster data integrity', () => {
  it('every attack damage notation parses (guards SRD regeneration)', () => {
    const { parseDamageNotation } = require('src/engine/dice');
    for (const enemy of Object.values(ENEMIES)) {
      for (const attack of enemy.attacks) {
        expect(() => parseDamageNotation(attack.damageDice)).not.toThrow();
      }
    }
  });
});

describe('floors.encounterXP', () => {
  it('sums SRD XP values', () => {
    const goblin = ENEMIES.goblin;
    expect(encounterXP(['goblin', 'goblin'])).toBe(goblin.xp * 2);
  });
});
