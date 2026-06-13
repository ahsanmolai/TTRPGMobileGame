import { useCampaignStore } from 'src/store/campaignStore';
import { useCharacterStore } from 'src/store/characterStore';
import { buildCharacter } from 'src/engine/leveling';
import { FIGHTS_PER_FLOOR } from 'src/data/floors';
import { getItem } from 'src/data/items';
import { CharacterStats } from 'src/engine/character';

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

  it('a full 20-floor campaign: level 20 on the last floor, then complete', () => {
    useCharacterStore.getState().setCharacter(freshDwarfFighter());
    useCampaignStore.getState().startRun();

    for (let floor = 1; floor <= 20; floor++) {
      const run = useCampaignStore.getState().run!;
      const character = useCharacterStore.getState().character!;
      expect(run.floor).toBe(floor);
      expect(character.level).toBe(floor); // level always equals the floor
      for (let fight = 0; fight < FIGHTS_PER_FLOOR; fight++) {
        expect(useCampaignStore.getState().recordFightVictory()).not.toBeNull();
      }
    }

    expect(useCampaignStore.getState().run!.status).toBe('complete');
    const finalCharacter = useCharacterStore.getState().character!;
    expect(finalCharacter.level).toBe(20);
    expect(finalCharacter.attacksPerAction).toBe(4); // fighter capstone
    expect(finalCharacter.currentHP).toBe(finalCharacter.maxHP);
    // no level 21: there is nothing past the final floor
    expect(useCampaignStore.getState().recordFightVictory()).toBeNull();
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

  it('a fight victory credits gold to the character', () => {
    useCharacterStore.getState().setCharacter(freshDwarfFighter());
    useCampaignStore.getState().startRun();
    const goldBefore = useCharacterStore.getState().character!.gold;

    const result = useCampaignStore.getState().recordFightVictory()!;
    expect(result.goldGained).toBeGreaterThan(0);
    expect(useCharacterStore.getState().character!.gold).toBe(goldBefore + result.goldGained);
  });

  it('a fight victory that rolls a drop adds the item to the bag', () => {
    useCharacterStore.getState().setCharacter(freshDwarfFighter());
    useCampaignStore.getState().startRun();
    // Force the trash drop branch (rollDrop draws Math.random() < 0.2 for trash).
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const result = useCampaignStore.getState().recordFightVictory()!;
      expect(result.droppedItemId).toBeDefined();
      const dropped = result.droppedItemId!;
      expect(() => getItem(dropped)).not.toThrow();
      const bag = useCharacterStore.getState().character!.inventory;
      const entry = bag.find((e) => e.itemId === dropped);
      expect(entry).toBeDefined();
      expect(entry!.qty).toBeGreaterThan(0);
    } finally {
      spy.mockRestore();
    }
  });

  it('the run shopStock survives a persist -> rehydrate round trip', async () => {
    useCharacterStore.getState().setCharacter(freshDwarfFighter());
    useCampaignStore.getState().startRun();
    const stockBefore = useCampaignStore.getState().run!.shopStock;
    expect(stockBefore.length).toBeGreaterThan(0);
    await new Promise((r) => setTimeout(r, 0)); // flush the async setItem

    await useCampaignStore.persist.rehydrate();
    expect(useCampaignStore.getState().run!.shopStock).toEqual(stockBefore);
  });
});

describe('store migrations v1 -> v2', () => {
  it('characterStore backfills gold/inventory/trinketId for a legacy character', () => {
    const migrate = useCharacterStore.persist.getOptions().migrate!;
    // A v1 blob: a character with none of the economy fields.
    const legacy = {
      character: { id: 'old', name: 'Old', classId: 'wizard' } as Partial<CharacterStats>,
      selectedPresetId: null,
    };
    const migrated = migrate(legacy, 1) as { character: CharacterStats };
    expect(migrated.character.gold).toBe(0);
    expect(migrated.character.inventory).toEqual([]);
    expect(migrated.character.trinketId).toBeNull();
  });

  it('characterStore migration is a no-op when there is no persisted character', () => {
    const migrate = useCharacterStore.persist.getOptions().migrate!;
    const migrated = migrate({ character: null, selectedPresetId: null }, 1) as {
      character: CharacterStats | null;
    };
    expect(migrated.character).toBeNull();
  });

  it('campaignStore backfills shopStock for the run floor on a legacy run', () => {
    const migrate = useCampaignStore.persist.getOptions().migrate!;
    // A v1 run blob lacking shopStock, mid-tower.
    const legacy = { run: { floor: 5, fightIndex: 2, status: 'active' } };
    const migrated = migrate(legacy, 1) as { run: { floor: number; shopStock: { itemId: string }[] } };
    expect(Array.isArray(migrated.run.shopStock)).toBe(true);
    expect(migrated.run.shopStock.length).toBeGreaterThan(0);
    for (const { itemId } of migrated.run.shopStock) {
      expect(getItem(itemId).minFloor).toBeLessThanOrEqual(migrated.run.floor + 1);
    }
  });

  it('campaignStore migration is a no-op when there is no persisted run', () => {
    const migrate = useCampaignStore.persist.getOptions().migrate!;
    const migrated = migrate({ run: null }, 1) as { run: unknown };
    expect(migrated.run).toBeNull();
  });
});
