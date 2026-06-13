import {
  CampaignRun,
  createRun,
  getCurrentEncounter,
  recordDefeat,
  recordVictory,
  FINAL_FLOOR,
} from 'src/engine/campaign';
import { FIGHTS_PER_FLOOR } from 'src/data/floors';
import { getItem } from 'src/data/items';

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

  it('seeds a non-empty merchant stock of real, floor-appropriate items', () => {
    const run = createRun();
    expect(run.shopStock.length).toBeGreaterThan(0);
    for (const { itemId, qty } of run.shopStock) {
      expect(qty).toBeGreaterThan(0);
      const item = getItem(itemId); // throws on a bad id
      expect(item.minFloor).toBeLessThanOrEqual(run.floor + 1);
    }
  });
});

describe('campaign.recordVictory — gold', () => {
  it('always awards gold, at least the trash floor of 5', () => {
    let run = createRun();
    for (let fight = 0; fight < FIGHTS_PER_FLOOR; fight++) {
      const result = recordVictory(run);
      expect(result.goldGained).toBeGreaterThanOrEqual(5);
      run = result.run;
    }
  });

  it('boss fights pay a premium over comparable trash gold', () => {
    // The boss closes the floor (fight 5) and carries the highest encounter XP,
    // and is scaled ×1.5 — so over many draws its gold floor beats trash.
    let trashMin = Infinity;
    let bossMax = 0;
    for (let trial = 0; trial < 200; trial++) {
      let run = createRun();
      for (let fight = 0; fight < FIGHTS_PER_FLOOR; fight++) {
        const result = recordVictory(run);
        if (getCurrentEncounter(run).isBoss) {
          bossMax = Math.max(bossMax, result.goldGained);
        } else {
          trashMin = Math.min(trashMin, result.goldGained);
        }
        run = result.run;
      }
    }
    expect(bossMax).toBeGreaterThan(trashMin);
  });
});

describe('campaign.recordVictory — drops', () => {
  it('trash drops are always real floor-tier healing potions, within the ~20% rate', () => {
    const run = createRun();
    let drops = 0;
    const trials = 4000;
    for (let i = 0; i < trials; i++) {
      const result = recordVictory(run); // fight 0 (trash) on floor 1
      if (result.droppedItemId) {
        drops++;
        const item = getItem(result.droppedItemId);
        expect(item.kind).toBe('potion');
        expect(item.minFloor).toBeLessThanOrEqual(run.floor);
      }
    }
    const rate = drops / trials;
    expect(rate).toBeGreaterThan(0.1);
    expect(rate).toBeLessThan(0.3);
  });

  it('boss drops are always real, equippable-tier gear, within the ~50% rate', () => {
    // Advance a floor-1 run to its boss (fight 5) once, then re-roll that frozen
    // boss many times. Use floor 6 so several non-potion tiers are reachable.
    let run = createRun();
    while (run.floor < 6) {
      run = recordVictory(run).run;
    }
    // run is now at floor 6, fight 0; step to its boss.
    const boss: CampaignRun = { ...run, fightIndex: FIGHTS_PER_FLOOR - 1 };
    expect(getCurrentEncounter(boss).isBoss).toBe(true);

    let drops = 0;
    const trials = 4000;
    for (let i = 0; i < trials; i++) {
      const result = recordVictory(boss);
      if (result.droppedItemId) {
        drops++;
        const item = getItem(result.droppedItemId);
        expect(item.kind).not.toBe('potion');
        expect(item.minFloor).toBeLessThanOrEqual(boss.floor + 1);
      }
    }
    const rate = drops / trials;
    expect(rate).toBeGreaterThan(0.4);
    expect(rate).toBeLessThan(0.6);
  });
});

describe('campaign.recordVictory — shopStock lifecycle', () => {
  it('refreshes the merchant stock to the new floor when a boss clears the floor', () => {
    let run = createRun();
    const floor1Stock = run.shopStock;
    // win through to (and including) the floor-1 boss
    for (let fight = 0; fight < FIGHTS_PER_FLOOR; fight++) {
      const result = recordVictory(run);
      run = result.run;
    }
    expect(run.floor).toBe(2);
    // a fresh stock for floor 2, distinct from the floor-1 reference
    expect(run.shopStock).not.toBe(floor1Stock);
    expect(run.shopStock.length).toBeGreaterThan(0);
    for (const { itemId } of run.shopStock) {
      expect(getItem(itemId).minFloor).toBeLessThanOrEqual(run.floor + 1);
    }
  });

  it('keeps the same merchant stock across non-advancing (trash) victories', () => {
    const run = createRun();
    const result = recordVictory(run); // a mid-floor trash win
    expect(result.floorCleared).toBe(false);
    expect(result.run.shopStock).toBe(run.shopStock);
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
