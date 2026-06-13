// Pure campaign-run state transitions. The XP requirement for a floor is the
// total SRD XP of its five frozen encounters, so the bar fills exactly when
// the boss (fight 5) dies — one guaranteed level-up per floor.
import { FIGHTS_PER_FLOOR, FloorEncounter, buildFloorEncounters } from 'src/data/floors';
import { buildShopStock, getItem } from 'src/data/items';
import { roll } from 'src/engine/dice';

export const FINAL_FLOOR = 20;

export type CampaignStatus = 'active' | 'defeated' | 'complete';

export interface CampaignRun {
  floor: number;
  /** 0-based index of the next fight on this floor (0–4; 4 is the boss). */
  fightIndex: number;
  /** Lifetime SRD XP earned, for display. */
  xpTotal: number;
  /** SRD XP earned on the current floor. */
  floorXP: number;
  /** Total SRD XP of the current floor's five encounters. */
  floorXPRequirement: number;
  floorEncounters: FloorEncounter[];
  /** The current floor's frozen merchant inventory. Regenerated each floor. */
  shopStock: { itemId: string; qty: number }[];
  status: CampaignStatus;
}

export interface VictoryResult {
  run: CampaignRun;
  xpGained: number;
  /** Gold awarded for this fight (scales with encounter XP; ×1.5 on bosses). */
  goldGained: number;
  /** Item id dropped by this fight, when one rolled (trash potion / boss gear). */
  droppedItemId?: string;
  leveledUp: boolean;
  floorCleared: boolean;
  campaignComplete: boolean;
}

function floorRequirement(encounters: FloorEncounter[]): number {
  return encounters.reduce((sum, e) => sum + e.xp, 0);
}

export function createRun(): CampaignRun {
  const floorEncounters = buildFloorEncounters(1);
  return {
    floor: 1,
    fightIndex: 0,
    xpTotal: 0,
    floorXP: 0,
    floorXPRequirement: floorRequirement(floorEncounters),
    floorEncounters,
    shopStock: buildShopStock(1),
    status: 'active',
  };
}

export function getCurrentEncounter(run: CampaignRun): FloorEncounter {
  return run.floorEncounters[run.fightIndex];
}

// Gold reward for a fight: scales with the encounter's XP, plus a 1d6 jitter,
// then ×1.5 (rounded) on boss fights. Floored at 5 so trivial fights still pay.
function rollGold(encounterXP: number, isBoss: boolean): number {
  const base = Math.max(5, Math.round(encounterXP / 8)) + roll(6);
  return isBoss ? Math.round(base * 1.5) : base;
}

// Roll the fight's item drop. Trash: 20% chance of the best floor-tier healing
// potion. Boss: 50% chance of a random non-potion gear item the floor can reach.
function rollDrop(encounter: FloorEncounter, floor: number): string | undefined {
  if (encounter.isBoss) {
    if (Math.random() >= 0.5) return undefined;
    const gear = buildShopStock(floor)
      .map((s) => s.itemId)
      .filter((id) => getItem(id).kind !== 'potion');
    if (gear.length === 0) return undefined;
    return gear[Math.floor(Math.random() * gear.length)];
  }
  if (Math.random() >= 0.2) return undefined;
  // Best healing potion the floor can field (highest minFloor ≤ floor).
  const potions = buildShopStock(floor)
    .map((s) => getItem(s.itemId))
    .filter((item) => item.kind === 'potion' && item.minFloor <= floor)
    .sort((a, b) => b.minFloor - a.minFloor);
  return potions[0]?.id;
}

export function recordVictory(run: CampaignRun): VictoryResult {
  if (run.status !== 'active') throw new Error(`Run is not active (${run.status})`);
  const encounter = getCurrentEncounter(run);
  const xpGained = encounter.xp;
  const xpTotal = run.xpTotal + xpGained;
  const floorXP = run.floorXP + xpGained;
  const goldGained = rollGold(xpGained, encounter.isBoss);
  const droppedItemId = rollDrop(encounter, run.floor);

  if (run.fightIndex < FIGHTS_PER_FLOOR - 1) {
    return {
      run: { ...run, fightIndex: run.fightIndex + 1, xpTotal, floorXP },
      xpGained,
      goldGained,
      droppedItemId,
      leveledUp: false,
      floorCleared: false,
      campaignComplete: false,
    };
  }

  if (run.floor >= FINAL_FLOOR) {
    return {
      run: { ...run, xpTotal, floorXP, status: 'complete' },
      xpGained,
      goldGained,
      droppedItemId,
      leveledUp: false,
      floorCleared: true,
      campaignComplete: true,
    };
  }

  const nextFloor = run.floor + 1;
  const floorEncounters = buildFloorEncounters(nextFloor);
  return {
    run: {
      floor: nextFloor,
      fightIndex: 0,
      xpTotal,
      floorXP: 0,
      floorXPRequirement: floorRequirement(floorEncounters),
      floorEncounters,
      shopStock: buildShopStock(nextFloor),
      status: 'active',
    },
    xpGained,
    goldGained,
    droppedItemId,
    leveledUp: true,
    floorCleared: true,
    campaignComplete: false,
  };
}

export function recordDefeat(run: CampaignRun): CampaignRun {
  return { ...run, status: 'defeated' };
}
