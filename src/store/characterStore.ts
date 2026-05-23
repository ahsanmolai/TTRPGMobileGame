import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { CharacterStats } from 'src/engine/character';
import { Condition } from 'src/engine/combat';
import { getPreset } from 'src/data/presetCharacters';

interface CharacterState {
  character: CharacterStats | null;
  selectedPresetId: string | null;
  selectCharacter: (presetId: string) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  applyCondition: (c: Condition) => void;
  removeCondition: (c: Condition) => void;
  resetCharacter: () => void;
  clearCharacter: () => void;
}

export const useCharacterStore = create<CharacterState>()(
  immer((set, get) => ({
    character: null,
    selectedPresetId: null,
    selectCharacter: (presetId) => {
      const preset = getPreset(presetId);
      set((state) => {
        state.character = { ...preset };
        state.selectedPresetId = presetId;
      });
    },
    takeDamage: (amount) =>
      set((state) => {
        if (!state.character) return;
        state.character.currentHP = Math.max(0, state.character.currentHP - amount);
      }),
    heal: (amount) =>
      set((state) => {
        if (!state.character) return;
        state.character.currentHP = Math.min(
          state.character.maxHP,
          state.character.currentHP + amount,
        );
      }),
    applyCondition: () => {
      // conditions are tracked per participant in combat store, not stored on character itself in MVP
    },
    removeCondition: () => {},
    resetCharacter: () => {
      const id = get().selectedPresetId;
      if (!id) return;
      const preset = getPreset(id);
      set((state) => {
        state.character = { ...preset };
      });
    },
    clearCharacter: () =>
      set((state) => {
        state.character = null;
        state.selectedPresetId = null;
      }),
  })),
);
