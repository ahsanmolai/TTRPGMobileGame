import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CharacterStats, SpellSlotState } from 'src/engine/character';
import { Condition } from 'src/engine/combat';
import { applyLevelUp, applyLongRest, applyShortRest } from 'src/engine/leveling';
import { getPreset } from 'src/data/presetCharacters';

interface CharacterState {
  character: CharacterStats | null;
  selectedPresetId: string | null;
  _hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
  setCharacter: (character: CharacterStats) => void;
  selectCharacter: (presetId: string) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  applyCondition: (c: Condition) => void;
  removeCondition: (c: Condition) => void;
  levelUp: () => void;
  shortRest: () => void;
  longRest: () => void;
  /** Write the player's post-combat HP and remaining slots back to the character. */
  syncFromCombat: (currentHP: number, spellSlots?: SpellSlotState) => void;
  resetCharacter: () => void;
  clearCharacter: () => void;
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    immer((set, get) => ({
      character: null,
      selectedPresetId: null,
      _hasHydrated: false,
      setHasHydrated: (val) =>
        set((state) => {
          state._hasHydrated = val;
        }),
      setCharacter: (character) =>
        set((state) => {
          state.character = character;
          state.selectedPresetId = null;
        }),
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
      levelUp: () =>
        set((state) => {
          if (!state.character) return;
          state.character = applyLevelUp(state.character);
        }),
      shortRest: () =>
        set((state) => {
          if (!state.character) return;
          state.character = applyShortRest(state.character);
        }),
      longRest: () =>
        set((state) => {
          if (!state.character) return;
          state.character = applyLongRest(state.character);
        }),
      syncFromCombat: (currentHP, spellSlots) =>
        set((state) => {
          if (!state.character) return;
          state.character.currentHP = Math.max(0, Math.min(state.character.maxHP, currentHP));
          if (spellSlots && state.character.spellSlots) {
            state.character.spellSlots = spellSlots;
          }
        }),
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
    {
      name: 'ttrpg-character',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) =>
        ({
          character: state.character,
          selectedPresetId: state.selectedPresetId,
        }) as CharacterState,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
