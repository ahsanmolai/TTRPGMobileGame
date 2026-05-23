import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  CombatState,
  CombatParticipant,
  makePlayerParticipant,
  makeEnemyParticipant,
  rollInitiative,
  sortInitiativeOrder,
  resolvePlayerAttack,
  resolveEnemyAttack,
  applyDamage,
  advanceTurn,
  checkCombatEnd,
  currentActor,
  describeAttack,
  makeLogEntry,
  chooseEnemyAction,
  CombatLogEntry,
} from 'src/engine/combat';
import { CharacterStats, calculateAC } from 'src/engine/character';
import { ENEMIES } from 'src/data/enemies';

interface CombatStoreState {
  state: CombatState | null;
  isAnimating: boolean;
  pendingAttack: { attackerId: string; targetId: string } | null;

  startCombat: (character: CharacterStats, enemyIds: string[]) => void;
  playerAttack: (targetId: string) => void;
  playerEndTurn: () => void;
  resolveEnemyTurn: () => void;
  setAnimating: (val: boolean) => void;
  clearCombat: () => void;
}

function appendLog(s: CombatState, entry: CombatLogEntry) {
  s.log.push(entry);
}

export const useCombatStore = create<CombatStoreState>()(
  immer((set, get) => ({
    state: null,
    isAnimating: false,
    pendingAttack: null,

    startCombat: (character, enemyIds) => {
      const playerParticipant = makePlayerParticipant(character);
      playerParticipant.ac = calculateAC(character);
      const enemyParticipants = enemyIds.map((eid, i) =>
        makeEnemyParticipant(ENEMIES[eid], String(i + 1)),
      );
      const allRolled = rollInitiative([playerParticipant, ...enemyParticipants]);
      const order = sortInitiativeOrder(allRolled);
      const initialLog: CombatLogEntry[] = [
        makeLogEntry(1, 'system', 'System', 'Combat begins!'),
        ...allRolled.map((p) =>
          makeLogEntry(1, 'initiative', p.name, `${p.name} rolled ${p.initiativeRoll} for initiative.`),
        ),
        makeLogEntry(1, 'turn_start', allRolled.find((p) => p.id === order[0])!.name, `${allRolled.find((p) => p.id === order[0])!.name}'s turn.`),
      ];
      set((s) => {
        s.state = {
          participants: allRolled,
          initiativeOrder: order,
          currentTurnIndex: 0,
          round: 1,
          log: initialLog,
          phase: 'in_progress',
        };
        s.isAnimating = false;
        s.pendingAttack = null;
      });
    },

    playerAttack: (targetId) => {
      const cs = get().state;
      if (!cs) return;
      const actor = currentActor(cs);
      if (!actor || !actor.isPlayer) return;
      const target = cs.participants.find((p) => p.id === targetId);
      if (!target || target.currentHP <= 0) return;
      if (actor.actionsUsed.includes('action')) return;
      if (!actor.playerStats) return;
      const weapon = actor.playerStats.mainHand;
      const result = resolvePlayerAttack(actor, target, weapon);

      set((s) => {
        if (!s.state) return;
        const round = s.state.round;
        // mark action used
        const actorIdx = s.state.participants.findIndex((p) => p.id === actor.id);
        if (actorIdx >= 0) {
          s.state.participants[actorIdx].actionsUsed.push('action');
        }

        appendLog(
          s.state,
          makeLogEntry(round, result.hit ? (result.critical ? 'critical_hit' : 'attack_hit') : (result.criticalFail ? 'critical_fail' : 'attack_miss'), actor.name, describeAttack(actor, target, weapon.name, result), {
            roll: result.attackRoll,
            targetName: target.name,
          }),
        );

        if (result.hit && result.damage) {
          const tIdx = s.state.participants.findIndex((p) => p.id === target.id);
          if (tIdx >= 0) {
            s.state.participants[tIdx] = applyDamage(s.state.participants[tIdx], result.damage);
            appendLog(
              s.state,
              makeLogEntry(round, 'damage', actor.name, `${target.name} takes ${result.damage} damage. (${s.state.participants[tIdx].currentHP}/${s.state.participants[tIdx].maxHP} HP)`),
            );
            if (s.state.participants[tIdx].currentHP <= 0) {
              appendLog(
                s.state,
                makeLogEntry(round, 'death', target.name, `${target.name} falls!`),
              );
            }
          }
        }

        const end = checkCombatEnd(s.state);
        if (end !== 'in_progress') {
          s.state.phase = end;
        }
      });
    },

    playerEndTurn: () => {
      const cs = get().state;
      if (!cs || cs.phase !== 'in_progress') return;
      const actor = currentActor(cs);
      if (!actor || !actor.isPlayer) return;
      set((s) => {
        if (!s.state) return;
        s.state = advanceTurn(s.state);
        const next = currentActor(s.state);
        if (next) {
          appendLog(
            s.state,
            makeLogEntry(s.state.round, 'turn_start', next.name, `${next.name}'s turn.`),
          );
        }
      });
    },

    resolveEnemyTurn: () => {
      const cs = get().state;
      if (!cs || cs.phase !== 'in_progress') return;
      const actor = currentActor(cs);
      if (!actor || actor.isPlayer) return;
      if (actor.currentHP <= 0) {
        set((s) => {
          if (!s.state) return;
          s.state = advanceTurn(s.state);
        });
        return;
      }

      const choice = chooseEnemyAction(actor, cs);
      if (!choice) {
        set((s) => {
          if (!s.state) return;
          s.state = advanceTurn(s.state);
        });
        return;
      }

      const target = cs.participants.find((p) => p.id === choice.targetId);
      if (!target) return;

      const result = resolveEnemyAttack(actor, target, choice.attack);
      set((s) => {
        if (!s.state) return;
        const round = s.state.round;
        appendLog(
          s.state,
          makeLogEntry(round, result.hit ? (result.critical ? 'critical_hit' : 'attack_hit') : (result.criticalFail ? 'critical_fail' : 'attack_miss'), actor.name, describeAttack(actor, target, choice.attack.name, result), {
            roll: result.attackRoll,
            targetName: target.name,
          }),
        );
        if (result.hit && result.damage) {
          const tIdx = s.state.participants.findIndex((p) => p.id === target.id);
          if (tIdx >= 0) {
            s.state.participants[tIdx] = applyDamage(s.state.participants[tIdx], result.damage);
            appendLog(
              s.state,
              makeLogEntry(round, 'damage', actor.name, `${target.name} takes ${result.damage} damage. (${s.state.participants[tIdx].currentHP}/${s.state.participants[tIdx].maxHP} HP)`),
            );
            if (s.state.participants[tIdx].currentHP <= 0) {
              appendLog(
                s.state,
                makeLogEntry(round, 'death', target.name, `${target.name} falls!`),
              );
            }
          }
        }
        const end = checkCombatEnd(s.state);
        if (end !== 'in_progress') {
          s.state.phase = end;
          return;
        }
        // advance to next turn
        s.state = advanceTurn(s.state);
        const next = currentActor(s.state);
        if (next) {
          appendLog(
            s.state,
            makeLogEntry(s.state.round, 'turn_start', next.name, `${next.name}'s turn.`),
          );
        }
      });
    },

    setAnimating: (val) =>
      set((s) => {
        s.isAnimating = val;
      }),

    clearCombat: () =>
      set((s) => {
        s.state = null;
        s.isAnimating = false;
        s.pendingAttack = null;
      }),
  })),
);

export function selectCurrentActor(s: CombatStoreState): CombatParticipant | null {
  if (!s.state) return null;
  return currentActor(s.state);
}
