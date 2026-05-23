import { rollDamage, rollWithModifier } from 'src/engine/dice';
import {
  CharacterStats,
  getSpellSaveDC,
  getSpellAttackBonus,
  getSpellDamageAbilityMod,
  getModifier,
  spendSpellSlot,
} from 'src/engine/character';
import {
  CombatParticipant,
  CombatState,
  CombatLogEntry,
  LogEntryType,
  applyDamage,
  applyHeal,
  applyCondition,
  resolveAttack,
  makeLogEntry,
} from 'src/engine/combat';
import { SpellDefinition, SpellId } from 'src/data/spellbook';

export interface ParticipantUpdate {
  id: string;
  updated: CombatParticipant;
}

export interface SpellResolutionResult {
  logEntries: Omit<CombatLogEntry, 'id' | 'timestamp'>[];
  participantUpdates: ParticipantUpdate[];
  slotSpent: boolean; // false for cantrips
}

function log(
  round: number,
  type: LogEntryType,
  actorName: string,
  text: string,
  extras: Partial<CombatLogEntry> = {},
): Omit<CombatLogEntry, 'id' | 'timestamp'> {
  return { round, type, actorName, text, ...extras };
}

export function resolveSpell(
  spell: SpellDefinition,
  caster: CombatParticipant,
  targets: CombatParticipant[],
  slotLevel: number,
  state: CombatState,
): SpellResolutionResult {
  if (!caster.playerStats) throw new Error('Only player can cast spells');
  const character = caster.playerStats;
  const dc = getSpellSaveDC(character);
  const attackBonus = getSpellAttackBonus(character);
  const abilityMod = getSpellDamageAbilityMod(character);
  const round = state.round;
  const logs: Omit<CombatLogEntry, 'id' | 'timestamp'>[] = [];
  const updates: ParticipantUpdate[] = [];

  logs.push(log(round, 'system', caster.name, `${caster.name} casts ${spell.name}!`));

  const effect = spell.effect;

  switch (effect.kind) {
    case 'damage_save': {
      const target = targets[0];
      if (!target) break;
      const saveScore = target.playerStats?.abilityScores[effect.saveAbility]
        ?? target.enemyStats?.abilityScores[effect.saveAbility]
        ?? 10;
      const saveRoll = rollWithModifier(20, getModifier(saveScore));
      // Saving throws: no auto-fail on natural 1 (PHB rule — only attack rolls auto-fail)
      const saved = saveRoll.total >= dc;
      const dmgRoll = rollDamage(effect.damageDice, 0, false);
      const finalDmg = saved && effect.onSaveSuccess === 'half' ? Math.floor(dmgRoll.total / 2) : saved ? 0 : dmgRoll.total;

      logs.push(log(round, 'system', caster.name,
        `${target.name} makes a ${effect.saveAbility.toUpperCase()} save: rolled ${saveRoll.total} vs DC ${dc} — ${saved ? 'Saved!' : 'Failed!'}`,
      ));

      if (finalDmg > 0) {
        const updated = applyDamage(target, finalDmg);
        updates.push({ id: target.id, updated });
        logs.push(log(round, 'damage', caster.name,
          `${target.name} takes ${finalDmg} ${effect.damageType} damage. (${updated.currentHP}/${updated.maxHP} HP)`,
          { targetName: target.name },
        ));
        if (updated.currentHP <= 0) {
          logs.push(log(round, 'death', target.name, `${target.name} falls!`));
        }
      } else {
        logs.push(log(round, 'system', caster.name, `${target.name} takes no damage.`));
      }
      break;
    }

    case 'damage_attack': {
      const target = targets[0];
      if (!target) break;
      const atk = resolveAttack({
        attacker: caster,
        target,
        attackBonus,
        damageDice: effect.damageDice,
        damageBonus: 0,
        range: effect.attackRange,
      });
      if (atk.criticalFail) {
        logs.push(log(round, 'critical_fail', caster.name,
          `${caster.name} casts ${spell.name} at ${target.name}: natural 1 — the spell fizzles!`,
        ));
      } else if (!atk.hit) {
        logs.push(log(round, 'attack_miss', caster.name,
          `${caster.name} casts ${spell.name} at ${target.name}: rolled ${atk.attackTotal} vs AC ${atk.targetAC} — Miss.`,
        ));
      } else {
        const type: LogEntryType = atk.critical ? 'critical_hit' : 'attack_hit';
        logs.push(log(round, type, caster.name,
          atk.critical
            ? `${caster.name} casts ${spell.name}: natural 20! Critical hit for ${atk.damage} ${effect.damageType} damage.`
            : `${caster.name} casts ${spell.name} at ${target.name}: ${atk.attackTotal} vs AC ${atk.targetAC} — Hit for ${atk.damage} ${effect.damageType} damage.`,
          { targetName: target.name },
        ));
        const updated = applyDamage(target, atk.damage!);
        updates.push({ id: target.id, updated });
        logs.push(log(round, 'damage', caster.name,
          `${target.name} takes ${atk.damage} damage. (${updated.currentHP}/${updated.maxHP} HP)`,
        ));
        if (updated.currentHP <= 0) {
          logs.push(log(round, 'death', target.name, `${target.name} falls!`));
        }
      }
      break;
    }

    case 'multi_attack': {
      const target = targets[0];
      if (!target) break;
      let currentTarget = target;
      let totalDamage = 0;
      for (let i = 0; i < effect.hits; i++) {
        const atk = resolveAttack({
          attacker: caster,
          target: currentTarget,
          attackBonus,
          damageDice: effect.damageDice,
          damageBonus: 0,
          range: 'ranged',
        });
        if (atk.hit && atk.damage) {
          totalDamage += atk.damage;
          logs.push(log(round, atk.critical ? 'critical_hit' : 'attack_hit', caster.name,
            `Ray ${i + 1}: ${atk.attackTotal} vs AC ${atk.targetAC} — ${atk.damage} ${effect.damageType} damage.`,
          ));
          currentTarget = applyDamage(currentTarget, atk.damage);
        } else {
          logs.push(log(round, 'attack_miss', caster.name, `Ray ${i + 1}: ${atk.attackTotal} vs AC ${atk.targetAC} — Miss.`));
        }
      }
      if (currentTarget.currentHP !== target.currentHP) {
        updates.push({ id: target.id, updated: currentTarget });
        logs.push(log(round, 'damage', caster.name,
          `${target.name} takes ${target.currentHP - currentTarget.currentHP} total damage. (${currentTarget.currentHP}/${currentTarget.maxHP} HP)`,
        ));
        if (currentTarget.currentHP <= 0) {
          logs.push(log(round, 'death', target.name, `${target.name} falls!`));
        }
      }
      break;
    }

    case 'auto_hit_multi': {
      // Magic Missile — auto hit, 1d4+1 per dart
      const target = targets[0];
      if (!target) break;
      let runningTarget = target;
      let totalDamage = 0;
      const dartDmgs: number[] = [];
      for (let i = 0; i < effect.hits; i++) {
        const dmg = rollDamage(effect.damageDice, 1, false); // +1 per dart
        dartDmgs.push(dmg.total);
        totalDamage += dmg.total;
        runningTarget = applyDamage(runningTarget, dmg.total);
      }
      logs.push(log(round, 'attack_hit', caster.name,
        `Magic Missile strikes ${target.name} with ${effect.hits} darts: [${dartDmgs.join(', ')}] = ${totalDamage} force damage.`,
        { targetName: target.name },
      ));
      updates.push({ id: target.id, updated: runningTarget });
      logs.push(log(round, 'damage', caster.name,
        `${target.name} takes ${totalDamage} damage. (${runningTarget.currentHP}/${runningTarget.maxHP} HP)`,
      ));
      if (runningTarget.currentHP <= 0) {
        logs.push(log(round, 'death', target.name, `${target.name} falls!`));
      }
      break;
    }

    case 'heal': {
      // Target is the player (self-heal) — but allow targeting any participant
      const target = targets[0];
      if (!target) break;
      const healRoll = rollDamage(effect.healDice, abilityMod, false);
      const healed = applyHeal(target, healRoll.total);
      updates.push({ id: target.id, updated: healed });
      logs.push(log(round, 'heal', caster.name,
        `${caster.name} heals ${target.name} for ${healRoll.total} HP. (${healed.currentHP}/${healed.maxHP} HP)`,
        { targetName: target.name },
      ));
      break;
    }

    case 'condition': {
      const target = targets[0];
      if (!target) break;
      const saveScore = target.playerStats?.abilityScores[effect.saveAbility]
        ?? target.enemyStats?.abilityScores[effect.saveAbility]
        ?? 10;
      const saveRoll = rollWithModifier(20, getModifier(saveScore));
      const saved = saveRoll.total >= dc;
      logs.push(log(round, 'system', caster.name,
        `${target.name} makes a ${effect.saveAbility.toUpperCase()} save: rolled ${saveRoll.total} vs DC ${dc} — ${saved ? 'Saved!' : 'Failed!'}`,
      ));
      if (!saved) {
        const updated = applyCondition(target, effect.condition);
        updates.push({ id: target.id, updated });
        logs.push(log(round, 'condition_applied', caster.name,
          `${target.name} is ${effect.condition}!`,
          { targetName: target.name },
        ));
      }
      break;
    }
  }

  return {
    logEntries: logs,
    participantUpdates: updates,
    slotSpent: spell.level > 0,
  };
}
