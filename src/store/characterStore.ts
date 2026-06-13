import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CharacterStats, SpellSlotState } from 'src/engine/character';
import { Condition } from 'src/engine/combat';
import { applyLevelUp, applyLongRest, applyShortRest } from 'src/engine/leveling';
import { addItem, canEquip, equipItem, sellItem, drinkPotion, bestPotion } from 'src/engine/inventory';
import { rollDamage } from 'src/engine/dice';
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
  /** Credit gold from a fight reward. No-op without a character. */
  gainGold: (amount: number) => void;
  /** Add a dropped/bought item to the bag. No-op without a character. */
  gainItem: (itemId: string, qty?: number) => void;
  /** Write the player's post-combat HP, remaining slots, and bag back to the character. */
  syncFromCombat: (
    currentHP: number,
    spellSlots?: SpellSlotState,
    inventory?: { itemId: string; qty: number }[],
  ) => void;
  /** Equip an item from the bag. No-op if canEquip fails. */
  equip: (itemId: string) => void;
  /** Sell one of an item from the bag (credits half price). No-op if not owned. */
  sell: (itemId: string) => void;
  /** Drink the best potion out of combat. Rolls heal dice and applies HP. No-op if no potion or already at max HP. */
  drinkPotionOutOfCombat: () => void;
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
      gainGold: (amount) =>
        set((state) => {
          if (!state.character) return;
          state.character.gold += amount;
        }),
      gainItem: (itemId, qty = 1) =>
        set((state) => {
          if (!state.character) return;
          state.character = addItem(state.character, itemId, qty);
        }),
      syncFromCombat: (currentHP, spellSlots, inventory) =>
        set((state) => {
          if (!state.character) return;
          state.character.currentHP = Math.max(0, Math.min(state.character.maxHP, currentHP));
          if (spellSlots && state.character.spellSlots) {
            state.character.spellSlots = spellSlots;
          }
          // Persist potions consumed during the fight back to the bag.
          if (inventory) {
            state.character.inventory = inventory;
          }
        }),
      equip: (itemId) =>
        set((state) => {
          if (!state.character) return;
          const check = canEquip(state.character, itemId);
          if (!check.ok) return;
          state.character = equipItem(state.character, itemId);
        }),
      sell: (itemId) =>
        set((state) => {
          if (!state.character) return;
          state.character = sellItem(state.character, itemId);
        }),
      drinkPotionOutOfCombat: () =>
        set((state) => {
          if (!state.character) return;
          if (state.character.currentHP >= state.character.maxHP) return;
          const potion = bestPotion(state.character);
          if (!potion) return;
          const { character: afterDrink, healed } = drinkPotion(state.character);
          const healAmount = healed ? rollDamage(healed).total : 0;
          const newHP = Math.min(afterDrink.maxHP, afterDrink.currentHP + healAmount);
          state.character = { ...afterDrink, currentHP: newHP };
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
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) =>
        ({
          character: state.character,
          selectedPresetId: state.selectedPresetId,
        }) as CharacterState,
      // v1 predates the economy fields; backfill gold/inventory/trinketId so a
      // legacy character satisfies the now-required CharacterStats shape.
      migrate: (persistedState) => {
        const state = persistedState as CharacterState;
        const character = state?.character as Partial<CharacterStats> | null | undefined;
        if (character) {
          if (typeof character.gold !== 'number') character.gold = 0;
          if (!Array.isArray(character.inventory)) character.inventory = [];
          if (character.trinketId === undefined) character.trinketId = null;
        }
        return state;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
