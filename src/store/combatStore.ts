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
  checkConditionModifiers,
  resolveAttack,
  currentActor,
  describeAttack,
  makeLogEntry,
  chooseEnemyAction,
  CombatLogEntry,
} from 'src/engine/combat';
import { CharacterStats, calculateAC, getModifier, getProficiencyBonus, spendSpellSlot } from 'src/engine/character';
import { bestPotion, drinkPotion } from 'src/engine/inventory';
import { ENEMIES } from 'src/data/enemies';
import { SpellId, getSpell } from 'src/data/spellbook';
import { resolveSpell } from 'src/engine/spells';
import { rollDamage } from 'src/engine/dice';
import {
  getClassAbility,
  getMartialArtsDice,
  getRageDamageBonus,
  getSmiteDice,
  getSneakAttackDice,
} from 'src/engine/classAbilities';

interface CombatStoreState {
  state: CombatState | null;
  isAnimating: boolean;
  pendingAttack: { attackerId: string; targetId: string } | null;

  startCombat: (character: CharacterStats, enemyIds: string[]) => void;
  playerAttack: (targetId: string) => void;
  playerCastSpell: (spellId: SpellId, slotLevel: number, targetIds: string[]) => void;
  playerUseAbility: (targetId?: string) => void;
  playerUsePotion: () => void;
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
      const character = actor.playerStats;
      const weapon = character.mainHand;
      const isMelee = !weapon.properties.includes('ranged');

      // Rage: flat melee damage rider while raging
      const rageBonus = actor.raging && isMelee ? getRageDamageBonus(character.level) : 0;
      const result = resolvePlayerAttack(actor, target, weapon, {
        forceAdvantage: actor.aimAdvantage,
        bonusDamage: rageBonus,
      });

      // Sneak Attack: once per turn, on a hit made with advantage
      let sneakDamage = 0;
      let sneakDice = '';
      if (result.hit && character.classFeatures.includes('sneak_attack') && !actor.sneakAttackUsedThisTurn) {
        const mods = checkConditionModifiers(actor, target, isMelee ? 'melee' : 'ranged');
        const hadAdvantage = (mods.advantage || !!actor.aimAdvantage) && !mods.disadvantage;
        if (hadAdvantage) {
          sneakDice = getSneakAttackDice(character.level);
          sneakDamage = rollDamage(sneakDice, 0, result.critical).total;
        }
      }

      // Divine Smite: armed melee hit spends the lowest available slot
      let smiteDamage = 0;
      let smiteSlot = 0;
      if (result.hit && actor.smiteArmed && isMelee && actor.spellSlots) {
        for (let lvl = 1; lvl <= 9; lvl++) {
          if ((actor.spellSlots[lvl]?.remaining ?? 0) > 0) {
            smiteSlot = lvl;
            break;
          }
        }
        if (smiteSlot > 0) {
          smiteDamage = rollDamage(getSmiteDice(smiteSlot), 0, result.critical).total;
        }
      }

      const totalDamage = (result.damage ?? 0) + sneakDamage + smiteDamage;

      set((s) => {
        if (!s.state) return;
        const round = s.state.round;
        // count the attack; the action is spent once all Extra Attacks are used
        const actorIdx = s.state.participants.findIndex((p) => p.id === actor.id);
        if (actorIdx >= 0) {
          const draft = s.state.participants[actorIdx];
          const attacksPerAction = draft.playerStats?.attacksPerAction ?? 1;
          draft.attacksUsedThisTurn = (draft.attacksUsedThisTurn ?? 0) + 1;
          if (draft.attacksUsedThisTurn >= attacksPerAction) {
            draft.actionsUsed.push('action');
          }
          // Aim is spent by the attack, whatever the outcome
          draft.aimAdvantage = false;
          if (sneakDamage > 0) draft.sneakAttackUsedThisTurn = true;
          if (smiteDamage > 0 && smiteSlot > 0 && draft.spellSlots) {
            draft.spellSlots = spendSpellSlot(draft.spellSlots, smiteSlot);
            draft.smiteArmed = false;
          }
        }

        appendLog(
          s.state,
          makeLogEntry(round, result.hit ? (result.critical ? 'critical_hit' : 'attack_hit') : (result.criticalFail ? 'critical_fail' : 'attack_miss'), actor.name, describeAttack(actor, target, weapon.name, result), {
            roll: result.attackRoll,
            targetName: target.name,
          }),
        );
        if (sneakDamage > 0) {
          appendLog(
            s.state,
            makeLogEntry(round, 'attack_hit', actor.name, `Sneak Attack! +${sneakDamage} damage (${sneakDice}).`),
          );
        }
        if (smiteDamage > 0) {
          appendLog(
            s.state,
            makeLogEntry(round, 'attack_hit', actor.name, `Divine Smite! +${smiteDamage} radiant damage (level-${smiteSlot} slot).`),
          );
        }

        if (result.hit && totalDamage > 0) {
          const tIdx = s.state.participants.findIndex((p) => p.id === target.id);
          if (tIdx >= 0) {
            s.state.participants[tIdx] = applyDamage(s.state.participants[tIdx], totalDamage);
            appendLog(
              s.state,
              makeLogEntry(round, 'damage', actor.name, `${target.name} takes ${totalDamage} damage. (${s.state.participants[tIdx].currentHP}/${s.state.participants[tIdx].maxHP} HP)`),
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

      // an action spell needs the whole action — attacking first forfeits it
      if (spell.castingTime === 'action' && (actor.actionsUsed.includes('action') || (actor.attacksUsedThisTurn ?? 0) > 0)) return;
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

    playerUseAbility: (targetId) => {
      const cs = get().state;
      if (!cs || cs.phase !== 'in_progress') return;
      const actor = currentActor(cs);
      if (!actor || !actor.isPlayer || !actor.playerStats) return;
      const character = actor.playerStats;
      const ability = getClassAbility(character.classId, character.level);
      if (!ability) return;
      if (ability.kind === 'bonus_action' && actor.actionsUsed.includes('bonus_action')) return;
      if (ability.kind !== 'toggle' && actor.abilityUsesRemaining !== undefined && actor.abilityUsesRemaining <= 0) return;

      set((s) => {
        if (!s.state) return;
        const round = s.state.round;
        const actorIdx = s.state.participants.findIndex((p) => p.id === actor.id);
        if (actorIdx < 0) return;
        const draft = s.state.participants[actorIdx];

        switch (ability.id) {
          case 'rage': {
            if (draft.raging) return;
            draft.raging = true;
            if (draft.abilityUsesRemaining !== undefined) draft.abilityUsesRemaining -= 1;
            draft.actionsUsed.push('bonus_action');
            appendLog(
              s.state,
              makeLogEntry(round, 'condition_applied', actor.name, `${actor.name} flies into a RAGE! (+${getRageDamageBonus(character.level)} melee damage, weapon damage halved)`),
            );
            break;
          }
          case 'second_wind': {
            const heal = rollDamage('1d10', character.level, false).total;
            draft.currentHP = Math.min(draft.maxHP, draft.currentHP + heal);
            if (draft.abilityUsesRemaining !== undefined) draft.abilityUsesRemaining -= 1;
            draft.actionsUsed.push('bonus_action');
            appendLog(
              s.state,
              makeLogEntry(round, 'heal', actor.name, `${actor.name} catches a Second Wind — heals ${heal} HP. (${draft.currentHP}/${draft.maxHP} HP)`),
            );
            break;
          }
          case 'aim': {
            draft.aimAdvantage = true;
            draft.actionsUsed.push('bonus_action');
            appendLog(
              s.state,
              makeLogEntry(round, 'system', actor.name, `${actor.name} takes careful aim — the next attack has advantage.`),
            );
            break;
          }
          case 'divine_smite': {
            draft.smiteArmed = !draft.smiteArmed;
            appendLog(
              s.state,
              makeLogEntry(round, 'system', actor.name,
                draft.smiteArmed
                  ? `${actor.name} channels divine power — the next melee hit will smite.`
                  : `${actor.name} lowers the divine power.`),
            );
            break;
          }
          case 'flurry_of_blows': {
            const target = s.state.participants.find(
              (p) => (targetId ? p.id === targetId : !p.isPlayer && p.currentHP > 0),
            );
            if (!target || target.currentHP <= 0) return;
            if (draft.abilityUsesRemaining !== undefined) draft.abilityUsesRemaining -= 1;
            draft.actionsUsed.push('bonus_action');
            appendLog(
              s.state,
              makeLogEntry(round, 'system', actor.name, `${actor.name} unleashes a Flurry of Blows! (1 ki)`),
            );
            const dexMod = getModifier(character.abilityScores.dexterity);
            const attackBonus = getProficiencyBonus(character.level) + dexMod;
            const dice = getMartialArtsDice(character.level);
            const tIdx = s.state.participants.findIndex((p) => p.id === target.id);
            for (let strike = 0; strike < 2; strike++) {
              const liveTarget = s.state.participants[tIdx];
              if (liveTarget.currentHP <= 0) break;
              const atk = resolveAttack({
                attacker: actor,
                target: liveTarget,
                attackBonus,
                damageDice: dice,
                damageBonus: dexMod,
                range: 'melee',
              });
              appendLog(
                s.state,
                makeLogEntry(round, atk.hit ? (atk.critical ? 'critical_hit' : 'attack_hit') : (atk.criticalFail ? 'critical_fail' : 'attack_miss'), actor.name, describeAttack(actor, liveTarget, 'a flurry strike', atk), {
                  roll: atk.attackRoll,
                  targetName: liveTarget.name,
                }),
              );
              if (atk.hit && atk.damage) {
                s.state.participants[tIdx] = applyDamage(s.state.participants[tIdx], atk.damage);
                appendLog(
                  s.state,
                  makeLogEntry(round, 'damage', actor.name, `${liveTarget.name} takes ${atk.damage} damage. (${s.state.participants[tIdx].currentHP}/${s.state.participants[tIdx].maxHP} HP)`),
                );
                if (s.state.participants[tIdx].currentHP <= 0) {
                  appendLog(s.state, makeLogEntry(round, 'death', liveTarget.name, `${liveTarget.name} falls!`));
                }
              }
            }
            break;
          }
        }

        const end = checkCombatEnd(s.state);
        if (end !== 'in_progress') {
          s.state.phase = end;
        }
      });
    },

    playerUsePotion: () => {
      const cs = get().state;
      if (!cs || cs.phase !== 'in_progress') return;
      const actor = currentActor(cs);
      if (!actor || !actor.isPlayer || !actor.playerStats) return;
      // Drinking a potion is a bonus action — refuse if one is already spent.
      if (actor.actionsUsed.includes('bonus_action')) return;

      const potion = bestPotion(actor.playerStats);
      if (!potion) return;

      // drinkPotion is pure: it decrements the stack and hands back the heal
      // dice, but never rolls or applies HP — the store does that here.
      const { character: newStats, healed } = drinkPotion(actor.playerStats);
      if (!healed) return;
      const heal = rollDamage(healed).total;

      set((s) => {
        if (!s.state) return;
        const round = s.state.round;
        const actorIdx = s.state.participants.findIndex((p) => p.id === actor.id);
        if (actorIdx < 0) return;
        const draft = s.state.participants[actorIdx];

        // Patch individual fields on the draft. newStats.inventory is a fresh
        // (frozen) array, so reassigning playerStats.inventory to it is safe;
        // wholesale-replacing playerStats would import its frozen arrays and
        // break later index writes — same gotcha as playerCastSpell.
        draft.currentHP = Math.min(draft.maxHP, draft.currentHP + heal);
        if (draft.playerStats) draft.playerStats.inventory = newStats.inventory;
        draft.actionsUsed.push('bonus_action');

        appendLog(
          s.state,
          makeLogEntry(round, 'heal', actor.name, `${actor.name} drinks a ${potion.name} and recovers ${heal} HP. (${draft.currentHP}/${draft.maxHP} HP)`),
        );
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

      const attackCount = Math.max(1, actor.enemyStats?.multiattackCount ?? 1);

      set((s) => {
        if (!s.state) return;
        const round = s.state.round;
        const tIdx = s.state.participants.findIndex((p) => p.id === choice.targetId);
        if (tIdx < 0) return;

        // Multiattack: resolve each attack against the target's live state,
        // stopping as soon as the target drops.
        for (let i = 0; i < attackCount; i++) {
          const target = s.state.participants[tIdx];
          if (target.currentHP <= 0) break;
          const result = resolveEnemyAttack(actor, target, choice.attack);
          appendLog(
            s.state,
            makeLogEntry(round, result.hit ? (result.critical ? 'critical_hit' : 'attack_hit') : (result.criticalFail ? 'critical_fail' : 'attack_miss'), actor.name, describeAttack(actor, target, choice.attack.name, result), {
              roll: result.attackRoll,
              targetName: target.name,
            }),
          );
          if (result.hit && result.damage) {
            // Rage: the raging barbarian shrugs off half of all weapon damage
            const raging = !!s.state.participants[tIdx].raging;
            const damage = raging ? Math.max(1, Math.floor(result.damage / 2)) : result.damage;
            s.state.participants[tIdx] = applyDamage(s.state.participants[tIdx], damage);
            appendLog(
              s.state,
              makeLogEntry(round, 'damage', actor.name, `${target.name} takes ${damage} damage${raging ? ' (rage halves it)' : ''}. (${s.state.participants[tIdx].currentHP}/${s.state.participants[tIdx].maxHP} HP)`),
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
