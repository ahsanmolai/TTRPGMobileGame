import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CampaignRun,
  VictoryResult,
  createRun,
  getCurrentEncounter,
  recordDefeat,
  recordVictory,
} from 'src/engine/campaign';
import { FloorEncounter } from 'src/data/floors';
import { buildShopStock, getItem } from 'src/data/items';
import { useCharacterStore } from 'src/store/characterStore';
import { CharacterStats } from 'src/engine/character';

export interface LevelUpSummary {
  before: CharacterStats;
  after: CharacterStats;
  newFloor: number;
}

interface CampaignState {
  run: CampaignRun | null;
  /** Snapshot of the latest boss level-up, for the level-up screen. Not persisted. */
  lastLevelUp: LevelUpSummary | null;
  _hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
  startRun: () => void;
  getCurrentEncounter: () => FloorEncounter | null;
  /**
   * Record the current fight as won. Applies the rest/level-up rules to the
   * character store (short rest after trash, level-up + long rest after a
   * boss) and returns the transition so the screen can route on it.
   */
  recordFightVictory: () => VictoryResult | null;
  recordDefeat: () => void;
  abandonRun: () => void;
  /** Purchase one item from the current floor's shop stock. No-op if out of stock, unaffordable, or no active run. */
  buyFromShop: (itemId: string) => void;
}

export const useCampaignStore = create<CampaignState>()(
  persist(
    immer((set, get) => ({
      run: null,
      lastLevelUp: null,
      _hasHydrated: false,
      setHasHydrated: (val) =>
        set((state) => {
          state._hasHydrated = val;
        }),
      startRun: () =>
        set((state) => {
          state.run = createRun();
          state.lastLevelUp = null;
        }),
      getCurrentEncounter: () => {
        const run = get().run;
        if (!run || run.status !== 'active') return null;
        return getCurrentEncounter(run);
      },
      recordFightVictory: () => {
        const run = get().run;
        if (!run || run.status !== 'active') return null;
        const result = recordVictory(run);
        set((state) => {
          state.run = result.run;
        });
        const characterStore = useCharacterStore.getState();
        if (result.leveledUp) {
          const before = characterStore.character;
          characterStore.levelUp();
          characterStore.longRest();
          const after = useCharacterStore.getState().character;
          if (before && after) {
            set((state) => {
              state.lastLevelUp = { before, after, newFloor: result.run.floor };
            });
          }
        } else if (result.campaignComplete) {
          characterStore.longRest();
        } else {
          characterStore.shortRest();
        }
        // Apply the fight's economy rewards after any rest (gold/drops survive
        // the rest's HP/slot reset). Read a fresh handle in case rest swapped state.
        const rewards = useCharacterStore.getState();
        rewards.gainGold(result.goldGained);
        if (result.droppedItemId) rewards.gainItem(result.droppedItemId);
        return result;
      },
      recordDefeat: () =>
        set((state) => {
          if (!state.run) return;
          state.run = recordDefeat(state.run);
        }),
      abandonRun: () =>
        set((state) => {
          state.run = null;
          state.lastLevelUp = null;
        }),
      buyFromShop: (itemId) => {
        const run = get().run;
        if (!run || run.status !== 'active') return;
        const stockEntry = run.shopStock.find((e) => e.itemId === itemId);
        if (!stockEntry || stockEntry.qty <= 0) return;
        const item = getItem(itemId);
        const character = useCharacterStore.getState().character;
        if (!character || character.gold < item.price) return;
        // Deduct gold and add item to character atomically.
        useCharacterStore.getState().gainGold(-item.price);
        useCharacterStore.getState().gainItem(itemId, 1);
        // Decrement shop stock (remove entry when qty hits 0).
        set((state) => {
          if (!state.run) return;
          state.run.shopStock = state.run.shopStock
            .map((e) => (e.itemId === itemId ? { ...e, qty: e.qty - 1 } : e))
            .filter((e) => e.qty > 0);
        });
      },
    })),
    {
      name: 'ttrpg-campaign',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ run: state.run }) as CampaignState,
      // v1 runs predate shopStock; backfill the current floor's merchant
      // inventory so the in-flight run has a stocked shop after rehydrate.
      migrate: (persistedState) => {
        const state = persistedState as CampaignState;
        const run = state?.run as (CampaignRun & { shopStock?: unknown }) | null | undefined;
        if (run && !Array.isArray(run.shopStock)) {
          run.shopStock = buildShopStock(run.floor);
        }
        return state;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
