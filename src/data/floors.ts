// The 20-floor tower: CR bands per floor and encounter generation.
// Floor number always equals the player's level on that floor.
import { ENEMIES, EnemyStatBlock } from 'src/data/enemies';

export interface FloorDef {
  floor: number;
  /** Inclusive CR range for the four regular fights. */
  trashCR: [number, number];
  /** Inclusive CR range for the fifth (boss) fight. */
  bossCR: [number, number];
}

export interface FloorEncounter {
  enemyIds: string[];
  isBoss: boolean;
  /** Total SRD XP awarded for winning this fight. */
  xp: number;
}

// Hand-tuned for a solo player against monsters that use their full
// multiattack: trash sits near CR ≈ level/3, bosses near CR ≈ level/2.
// Rates validated by __tests__/balance.sim.test.ts. CRs 18 and 25–29 have
// no SRD monsters, so bands skip them. The tarrasque (CR 30) falls outside
// every band — unwinnable solo.
export const FLOOR_TABLE: FloorDef[] = [
  { floor: 1, trashCR: [0, 0.125], bossCR: [0.125, 0.25] },
  { floor: 2, trashCR: [0.125, 0.25], bossCR: [0.5, 0.5] },
  { floor: 3, trashCR: [0.25, 0.5], bossCR: [1, 1] },
  { floor: 4, trashCR: [0.5, 1], bossCR: [2, 2] },
  { floor: 5, trashCR: [1, 2], bossCR: [3, 3] },
  { floor: 6, trashCR: [1, 2], bossCR: [3, 4] },
  { floor: 7, trashCR: [2, 3], bossCR: [4, 4] },
  { floor: 8, trashCR: [2, 3], bossCR: [4, 5] },
  { floor: 9, trashCR: [3, 4], bossCR: [5, 5] },
  { floor: 10, trashCR: [3, 4], bossCR: [5, 6] },
  { floor: 11, trashCR: [4, 5], bossCR: [6, 6] },
  { floor: 12, trashCR: [4, 5], bossCR: [6, 7] },
  { floor: 13, trashCR: [5, 6], bossCR: [7, 8] },
  { floor: 14, trashCR: [5, 6], bossCR: [8, 8] },
  { floor: 15, trashCR: [5, 6], bossCR: [7, 8] },
  { floor: 16, trashCR: [6, 7], bossCR: [8, 9] },
  { floor: 17, trashCR: [6, 7], bossCR: [9, 10] },
  { floor: 18, trashCR: [7, 8], bossCR: [10, 11] },
  { floor: 19, trashCR: [8, 9], bossCR: [11, 12] },
  { floor: 20, trashCR: [8, 10], bossCR: [12, 13] },
];

export const FIGHTS_PER_FLOOR = 5;

export function getFloorDef(floor: number): FloorDef {
  const def = FLOOR_TABLE[floor - 1];
  if (!def) throw new Error(`No such floor: ${floor}`);
  return def;
}

export function monstersInBand(minCR: number, maxCR: number): EnemyStatBlock[] {
  // xp > 0 keeps harmless SRD critters (frog, sea horse) out of encounters
  // and preserves the boss-fills-the-XP-bar invariant.
  return Object.values(ENEMIES).filter((e) => e.cr >= minCR && e.cr <= maxCR && e.xp > 0);
}

export function encounterXP(enemyIds: string[]): number {
  return enemyIds.reduce((sum, id) => sum + ENEMIES[id].xp, 0);
}

function pick<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Pool for the two-monster pair fights: noticeably below the solo trash band,
 * since two monsters acting every round nearly double incoming damage.
 */
export function pairFightPool(floor: number): EnemyStatBlock[] {
  const def = getFloorDef(floor);
  const pool = monstersInBand(Math.max(0, def.trashCR[0] - 2), def.trashCR[0]);
  return pool.length > 0 ? pool : monstersInBand(def.trashCR[0], def.trashCR[1]);
}

/**
 * Generate the floor's five fights. Fights 1–2 pit two monsters from below
 * the trash band; fights 3–4 one monster from the full band; fight 5 the
 * boss. Results are meant to be frozen in the campaign store so a floor
 * never rerolls.
 */
export function buildFloorEncounters(floor: number): FloorEncounter[] {
  const def = getFloorDef(floor);
  const trashPool = monstersInBand(def.trashCR[0], def.trashCR[1]);
  const bossPool = monstersInBand(def.bossCR[0], def.bossCR[1]);
  const easyPool = pairFightPool(floor);

  const encounters: FloorEncounter[] = [];
  for (let fight = 0; fight < FIGHTS_PER_FLOOR; fight++) {
    let enemyIds: string[];
    let isBoss = false;
    if (fight < 2) {
      enemyIds = [pick(easyPool).id, pick(easyPool).id];
    } else if (fight < 4) {
      enemyIds = [pick(trashPool).id];
    } else {
      enemyIds = [pick(bossPool).id];
      isBoss = true;
    }
    encounters.push({ enemyIds, isBoss, xp: encounterXP(enemyIds) });
  }
  return encounters;
}
