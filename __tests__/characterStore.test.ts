import { useCharacterStore } from 'src/store/characterStore';
import { buildCharacter } from 'src/engine/leveling';

function freshFighter() {
  return buildCharacter({
    id: 'test',
    name: 'Test',
    race: 'human',
    classId: 'fighter',
    abilityScores: {
      strength: 15,
      dexterity: 12,
      constitution: 14,
      intelligence: 10,
      wisdom: 12,
      charisma: 10,
    },
  });
}

beforeEach(() => {
  useCharacterStore.setState({ character: null, selectedPresetId: null });
});

describe('characterStore.syncFromCombat', () => {
  it('writes the provided inventory back to the persisted character', () => {
    useCharacterStore.getState().setCharacter(freshFighter());
    const consumed = [{ itemId: 'potion_healing', qty: 1 }];
    useCharacterStore.getState().syncFromCombat(5, undefined, consumed);
    const c = useCharacterStore.getState().character!;
    expect(c.currentHP).toBe(5);
    expect(c.inventory).toEqual(consumed);
  });

  it('leaves the existing inventory unchanged when no inventory is passed', () => {
    useCharacterStore.getState().setCharacter(freshFighter());
    const before = useCharacterStore.getState().character!.inventory;
    useCharacterStore.getState().syncFromCombat(4);
    const c = useCharacterStore.getState().character!;
    expect(c.currentHP).toBe(4);
    // starter bag (2 healing potions) survives a sync that omits inventory
    expect(c.inventory).toEqual(before);
  });
});
