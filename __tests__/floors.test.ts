import {
  FLOOR_TABLE,
  FIGHTS_PER_FLOOR,
  buildFloorEncounters,
  encounterXP,
  getFloorDef,
  monstersInBand,
} from 'src/data/floors';
import { ENEMIES } from 'src/data/enemies';

describe('floors.FLOOR_TABLE', () => {
  it('defines exactly 20 floors in order', () => {
    expect(FLOOR_TABLE).toHaveLength(20);
    FLOOR_TABLE.forEach((def, i) => expect(def.floor).toBe(i + 1));
  });

  // Guards against monster-data regeneration silently emptying a band.
  it.each(FLOOR_TABLE.map((def) => [def.floor, def] as const))(
    'floor %i has non-empty trash, easy-trash, and boss pools',
    (_floor, def) => {
      const trash = monstersInBand(def.trashCR[0], def.trashCR[1]);
      const boss = monstersInBand(def.bossCR[0], def.bossCR[1]);
      const midpoint = (def.trashCR[0] + def.trashCR[1]) / 2;
      const easy = trash.filter((e) => e.cr <= midpoint);
      expect(trash.length).toBeGreaterThan(0);
      expect(easy.length).toBeGreaterThan(0);
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
          const [min, max] = isBoss ? def.bossCR : def.trashCR;
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

describe('floors.encounterXP', () => {
  it('sums SRD XP values', () => {
    const goblin = ENEMIES.goblin;
    expect(encounterXP(['goblin', 'goblin'])).toBe(goblin.xp * 2);
  });
});
