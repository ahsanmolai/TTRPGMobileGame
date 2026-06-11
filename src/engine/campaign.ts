// Pure campaign-run state transitions. The XP requirement for a floor is the
// total SRD XP of its five frozen encounters, so the bar fills exactly when
// the boss (fight 5) dies — one guaranteed level-up per floor.
import { FIGHTS_PER_FLOOR, FloorEncounter, buildFloorEncounters } from 'src/data/floors';

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
  status: CampaignStatus;
}

export interface VictoryResult {
  run: CampaignRun;
  xpGained: number;
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
    status: 'active',
  };
}

export function getCurrentEncounter(run: CampaignRun): FloorEncounter {
  return run.floorEncounters[run.fightIndex];
}

export function recordVictory(run: CampaignRun): VictoryResult {
  if (run.status !== 'active') throw new Error(`Run is not active (${run.status})`);
  const xpGained = getCurrentEncounter(run).xp;
  const xpTotal = run.xpTotal + xpGained;
  const floorXP = run.floorXP + xpGained;

  if (run.fightIndex < FIGHTS_PER_FLOOR - 1) {
    return {
      run: { ...run, fightIndex: run.fightIndex + 1, xpTotal, floorXP },
      xpGained,
      leveledUp: false,
      floorCleared: false,
      campaignComplete: false,
    };
  }

  if (run.floor >= FINAL_FLOOR) {
    return {
      run: { ...run, xpTotal, floorXP, status: 'complete' },
      xpGained,
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
      status: 'active',
    },
    xpGained,
    leveledUp: true,
    floorCleared: true,
    campaignComplete: false,
  };
}

export function recordDefeat(run: CampaignRun): CampaignRun {
  return { ...run, status: 'defeated' };
}
