import {
  CampaignRun,
  createRun,
  getCurrentEncounter,
  recordDefeat,
  recordVictory,
  FINAL_FLOOR,
} from 'src/engine/campaign';
import { FIGHTS_PER_FLOOR } from 'src/data/floors';

describe('campaign.createRun', () => {
  it('starts on floor 1 with frozen encounters and the floor XP requirement', () => {
    const run = createRun();
    expect(run.floor).toBe(1);
    expect(run.fightIndex).toBe(0);
    expect(run.xpTotal).toBe(0);
    expect(run.floorXP).toBe(0);
    expect(run.status).toBe('active');
    expect(run.floorEncounters).toHaveLength(FIGHTS_PER_FLOOR);
    expect(run.floorXPRequirement).toBe(run.floorEncounters.reduce((s, e) => s + e.xp, 0));
  });
});

describe('campaign.recordVictory — XP invariant', () => {
  // The level-up must fire exactly on the boss kill, for any random draw.
  it('over 50 random full runs, the floor bar fills only on fight 5', () => {
    for (let trial = 0; trial < 50; trial++) {
      let run = createRun();
      for (let floor = 1; floor <= FINAL_FLOOR; floor++) {
        expect(run.floor).toBe(floor);
        for (let fight = 0; fight < FIGHTS_PER_FLOOR; fight++) {
          const isBoss = fight === FIGHTS_PER_FLOOR - 1;
          expect(getCurrentEncounter(run).isBoss).toBe(isBoss);
          const beforeRequirement = run.floorXPRequirement;
          const willHave = run.floorXP + getCurrentEncounter(run).xp;
          const result = recordVictory(run);

          if (isBoss) {
            expect(willHave).toBe(beforeRequirement);
            expect(result.floorCleared).toBe(true);
            if (floor === FINAL_FLOOR) {
              expect(result.campaignComplete).toBe(true);
              expect(result.leveledUp).toBe(false);
              expect(result.run.status).toBe('complete');
            } else {
              expect(result.leveledUp).toBe(true);
              expect(result.run.floor).toBe(floor + 1);
              expect(result.run.fightIndex).toBe(0);
              expect(result.run.floorXP).toBe(0);
            }
          } else {
            expect(willHave).toBeLessThan(beforeRequirement);
            expect(result.leveledUp).toBe(false);
            expect(result.floorCleared).toBe(false);
            expect(result.run.fightIndex).toBe(fight + 1);
          }
          run = result.run;
        }
      }
      expect(run.status).toBe('complete');
    }
  });

  it('accumulates lifetime XP across floors', () => {
    let run = createRun();
    let expected = 0;
    for (let fight = 0; fight < FIGHTS_PER_FLOOR; fight++) {
      expected += getCurrentEncounter(run).xp;
      run = recordVictory(run).run;
    }
    expect(run.xpTotal).toBe(expected);
    expect(run.floor).toBe(2);
  });

  it('throws when the run is not active', () => {
    const run: CampaignRun = { ...createRun(), status: 'defeated' };
    expect(() => recordVictory(run)).toThrow();
  });
});

describe('campaign.recordDefeat', () => {
  it('marks the run defeated', () => {
    expect(recordDefeat(createRun()).status).toBe('defeated');
  });
});
