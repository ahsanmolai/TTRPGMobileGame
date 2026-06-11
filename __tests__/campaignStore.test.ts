import { useCampaignStore } from 'src/store/campaignStore';
import { useCharacterStore } from 'src/store/characterStore';
import { buildCharacter } from 'src/engine/leveling';
import { FIGHTS_PER_FLOOR } from 'src/data/floors';

function freshDwarfFighter() {
  return buildCharacter({
    id: 'test',
    name: 'Test',
    race: 'dwarf',
    classId: 'fighter',
    abilityScores: {
      strength: 15,
      dexterity: 12,
      constitution: 14,
      intelligence: 10,
      wisdom: 13,
      charisma: 8,
    },
  });
}

beforeEach(() => {
  useCampaignStore.setState({ run: null });
  useCharacterStore.setState({ character: null, selectedPresetId: null });
});

describe('campaignStore', () => {
  it('startRun creates an active floor-1 run with a current encounter', () => {
    useCampaignStore.getState().startRun();
    const run = useCampaignStore.getState().run!;
    expect(run.floor).toBe(1);
    expect(run.status).toBe('active');
    expect(useCampaignStore.getState().getCurrentEncounter()).toBe(run.floorEncounters[0]);
  });

  it('a full floor: short rests after trash, level-up + long rest after the boss', () => {
    useCharacterStore.getState().setCharacter(freshDwarfFighter());
    useCampaignStore.getState().startRun();

    // trash fight with some damage taken
    useCharacterStore.getState().syncFromCombat(4);
    const result1 = useCampaignStore.getState().recordFightVictory()!;
    expect(result1.leveledUp).toBe(false);
    const afterTrash = useCharacterStore.getState().character!;
    // short rest: healed half of missing HP
    expect(afterTrash.currentHP).toBe(4 + Math.floor((afterTrash.maxHP - 4) / 2));

    for (let fight = 1; fight < FIGHTS_PER_FLOOR - 1; fight++) {
      expect(useCampaignStore.getState().recordFightVictory()!.leveledUp).toBe(false);
    }

    const bossResult = useCampaignStore.getState().recordFightVictory()!;
    expect(bossResult.leveledUp).toBe(true);
    expect(bossResult.floorCleared).toBe(true);
    expect(useCampaignStore.getState().run!.floor).toBe(2);

    const leveled = useCharacterStore.getState().character!;
    expect(leveled.level).toBe(2);
    expect(leveled.currentHP).toBe(leveled.maxHP); // long rest
  });

  it('recordDefeat marks the run defeated and blocks further victories', () => {
    useCampaignStore.getState().startRun();
    useCampaignStore.getState().recordDefeat();
    expect(useCampaignStore.getState().run!.status).toBe('defeated');
    expect(useCampaignStore.getState().recordFightVictory()).toBeNull();
    expect(useCampaignStore.getState().getCurrentEncounter()).toBeNull();
  });

  it('abandonRun clears the run', () => {
    useCampaignStore.getState().startRun();
    useCampaignStore.getState().abandonRun();
    expect(useCampaignStore.getState().run).toBeNull();
  });

  it('persists the run to AsyncStorage and rehydrates it', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    useCharacterStore.getState().setCharacter(freshDwarfFighter());
    useCampaignStore.getState().startRun();
    useCampaignStore.getState().recordFightVictory();
    const before = useCampaignStore.getState().run!;
    await new Promise((r) => setTimeout(r, 0)); // let the async setItem flush

    const raw = await AsyncStorage.getItem('ttrpg-campaign');
    expect(JSON.parse(raw!).state.run).toEqual(before);

    await useCampaignStore.persist.rehydrate();
    expect(useCampaignStore.getState().run).toEqual(before);
    expect(useCampaignStore.getState().run!.fightIndex).toBe(1);
  });
});
