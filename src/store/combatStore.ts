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
import { CharacterStats, calculateAC, spendSpellSlot } from 'src/engine/character';
import { ENEMIES } from 'src/data/enemies';
import { SpellId, getSpell } from 'src/data/spellbook';
import { resolveSpell } from 'src/engine/spells';

interface CombatStoreState {
  state: CombatState | null;
  isAnimating: boolean;
  pendingAttack: { attackerId: string; targetId: string } | null;

  startCombat: (character: CharacterStats, enemyIds: string[]) => void;
  playerAttack: (targetId: string) => void;
  playerCastSpell: (spellId: SpellId, slotLevel: number, targetIds: string[]) => void;
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

    playerCastSpell: (spellId, slotLevel, targetIds) => {
      const cs = get().state;
      if (!cs || cs.phase !== 'in_progress') return;
      const actor = currentActor(cs);
      if (!actor || !actor.isPlayer || !actor.playerStats) return;

      const spell = getSpell(spellId);

      if (spell.castingTime === 'action' && actor.actionsUsed.includes('action')) return;
      if (spell.castingTime === 'bonus_action' && actor.actionsUsed.includes('bonus_action')) return;

      if (spell.level > 0) {
        const slotData = actor.spellSlots?.[slotLevel];
        if (!slotData || slotData.remaining <= 0) return;
      }

      const targets = targetIds
        .map((id) => cs.participants.find((p) => p.id === id))
        .filter((p): p is CombatParticipant => !!p);
      if (targets.length === 0) return;

      const result = resolveSpell(spell, actor, targets, slotLevel, cs);

      set((s) => {
        if (!s.state) return;

        // Patch only the fields resolveSpell modifies (currentHP, conditions).
        // Wholesale replacement would assign a plain object with frozen arrays from
        // the snapshot, causing "can't define array index past end of non-writable array"
        // when we subsequently push to actionsUsed on the same participant.
        for (const update of result.participantUpdates) {
          const idx = s.state.participants.findIndex((p) => p.id === update.id);
          if (idx >= 0) {
            s.state.participants[idx].currentHP = update.updated.currentHP;
            s.state.participants[idx].conditions = [...update.updated.conditions];
          }
        }

        // Apply actor bookkeeping — participant is still an immer draft proxy here,
        // so actionsUsed.push is safe even when the actor was the heal target.
        const actorIdx = s.state.participants.findIndex((p) => p.id === actor.id);
        if (actorIdx >= 0) {
          s.state.participants[actorIdx].actionsUsed.push(spell.castingTime);
          if (result.slotSpent && s.state.participants[actorIdx].spellSlots) {
            s.state.participants[actorIdx].spellSlots = spendSpellSlot(
              s.state.participants[actorIdx].spellSlots!,
              slotLevel,
            );
          }
        }

        // Append log entries
        for (const entry of result.logEntries) {
          appendLog(
            s.state,
            makeLogEntry(entry.round, entry.type, entry.actorName, entry.text, {
              roll: entry.roll,
              targetName: entry.targetName,
            }),
          );
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
