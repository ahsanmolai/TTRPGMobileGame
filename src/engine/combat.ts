import {
  rollD20,
  rollAdvantage,
  rollDisadvantage,
  rollDamage,
  RollResult,
  rollWithModifier,
} from 'src/engine/dice';
import {
  CharacterStats,
  getAttackBonus,
  getWeaponDamageAbilityMod,
  getInitiativeBonus,
  getModifier,
} from 'src/engine/character';
import { WeaponData } from 'src/data/weapons';
import { EnemyStatBlock, EnemyAttack } from 'src/data/enemies';

export type Condition =
  | 'poisoned'
  | 'stunned'
  | 'prone'
  | 'grappled'
  | 'frightened'
  | 'blinded'
  | 'paralyzed'
  | 'unconscious'
  | 'dead';

export type ActionType = 'action' | 'bonus_action' | 'reaction';

export interface CombatParticipant {
  id: string;
  name: string;
  isPlayer: boolean;
  currentHP: number;
  maxHP: number;
  ac: number;
  initiativeRoll: number;
  initiativeBonus: number;
  dexterity: number;
  conditions: Condition[];
  actionsUsed: ActionType[];
  playerStats?: CharacterStats;
  enemyStats?: EnemyStatBlock;
}

export type LogEntryType =
  | 'attack_hit'
  | 'attack_miss'
  | 'critical_hit'
  | 'critical_fail'
  | 'damage'
  | 'heal'
  | 'condition_applied'
  | 'condition_removed'
  | 'death'
  | 'turn_start'
  | 'initiative'
  | 'system';

export interface CombatLogEntry {
  id: string;
  round: number;
  type: LogEntryType;
  actorName: string;
  text: string;
  timestamp: number;
  roll?: number;
  targetName?: string;
}

export type CombatPhase =
  | 'rolling_initiative'
  | 'in_progress'
  | 'victory'
  | 'defeat';

export interface CombatState {
  participants: CombatParticipant[];
  initiativeOrder: string[];
  currentTurnIndex: number;
  round: number;
  log: CombatLogEntry[];
  phase: CombatPhase;
}

export interface AttackResult {
  hit: boolean;
  critical: boolean;
  criticalFail: boolean;
  attackRoll: number;
  attackTotal: number;
  attackBonus: number;
  targetAC: number;
  damage?: number;
  damageRolls?: number[];
}

let _logCounter = 0;
export function makeLogEntry(
  round: number,
  type: LogEntryType,
  actorName: string,
  text: string,
  extras: Partial<CombatLogEntry> = {},
): CombatLogEntry {
  _logCounter += 1;
  return {
    id: `log_${Date.now()}_${_logCounter}`,
    round,
    type,
    actorName,
    text,
    timestamp: Date.now(),
    ...extras,
  };
}

export function makePlayerParticipant(character: CharacterStats): CombatParticipant {
  return {
    id: character.id,
    name: character.name,
    isPlayer: true,
    currentHP: character.currentHP,
    maxHP: character.maxHP,
    ac: 0, // recalculated at startCombat — depends on character
    initiativeRoll: 0,
    initiativeBonus: getInitiativeBonus(character),
    dexterity: character.abilityScores.dexterity,
    conditions: [],
    actionsUsed: [],
    playerStats: character,
  };
}

export function makeEnemyParticipant(stat: EnemyStatBlock, instanceSuffix: string): CombatParticipant {
  return {
    id: `${stat.id}_${instanceSuffix}`,
    name: stat.name,
    isPlayer: false,
    currentHP: stat.maxHP,
    maxHP: stat.maxHP,
    ac: stat.ac,
    initiativeRoll: 0,
    initiativeBonus: stat.initiativeBonus,
    dexterity: stat.abilityScores.dexterity,
    conditions: [],
    actionsUsed: [],
    enemyStats: stat,
  };
}

export function rollInitiative(
  participants: CombatParticipant[],
): CombatParticipant[] {
  return participants.map((p) => ({
    ...p,
    initiativeRoll: Math.floor(Math.random() * 20) + 1 + p.initiativeBonus,
  }));
}

export function sortInitiativeOrder(participants: CombatParticipant[]): string[] {
  return [...participants]
    .sort((a, b) => {
      if (b.initiativeRoll !== a.initiativeRoll) return b.initiativeRoll - a.initiativeRoll;
      // tiebreaker: player wins, then higher DEX
      if (a.isPlayer && !b.isPlayer) return -1;
      if (!a.isPlayer && b.isPlayer) return 1;
      return b.dexterity - a.dexterity;
    })
    .map((p) => p.id);
}

export function checkConditionModifiers(
  attacker: CombatParticipant,
  target: CombatParticipant,
  range: 'melee' | 'ranged' = 'melee',
): { advantage: boolean; disadvantage: boolean } {
  let advantage = false;
  let disadvantage = false;

  // attacker's conditions
  if (attacker.conditions.includes('poisoned')) disadvantage = true;
  if (attacker.conditions.includes('blinded')) disadvantage = true;
  if (attacker.conditions.includes('frightened')) disadvantage = true;
  if (attacker.conditions.includes('prone')) disadvantage = true;

  // target's conditions
  if (target.conditions.includes('blinded')) advantage = true;
  if (target.conditions.includes('stunned')) advantage = true;
  if (target.conditions.includes('paralyzed')) advantage = true;
  if (target.conditions.includes('unconscious')) advantage = true;
  if (target.conditions.includes('prone')) {
    if (range === 'melee') advantage = true;
    else disadvantage = true;
  }

  return { advantage, disadvantage };
}

export interface ResolveAttackParams {
  attacker: CombatParticipant;
  target: CombatParticipant;
  attackBonus: number;
  damageDice: string;
  damageBonus: number; // ability mod to add to damage
  range?: 'melee' | 'ranged';
  forceAdvantage?: boolean;
  forceDisadvantage?: boolean;
}

export function resolveAttack(params: ResolveAttackParams): AttackResult {
  const { attacker, target, attackBonus, damageDice, damageBonus } = params;
  const range = params.range ?? 'melee';
  const { advantage, disadvantage } = checkConditionModifiers(attacker, target, range);
  const advFinal = (advantage || !!params.forceAdvantage) && !(disadvantage || params.forceDisadvantage);
  const disFinal = (disadvantage || !!params.forceDisadvantage) && !(advantage || params.forceAdvantage);

  let rollData: RollResult;
  if (advFinal && !disFinal) rollData = rollAdvantage(attackBonus);
  else if (disFinal && !advFinal) rollData = rollDisadvantage(attackBonus);
  else rollData = rollWithModifier(20, attackBonus);

  const natural = rollData.naturalRoll ?? 0;
  const critical = natural === 20;
  const criticalFail = natural === 1;
  const hit = !criticalFail && (critical || rollData.total >= target.ac);

  const result: AttackResult = {
    hit,
    critical,
    criticalFail,
    attackRoll: natural,
    attackTotal: rollData.total,
    attackBonus,
    targetAC: target.ac,
  };

  if (hit) {
    const dmgRoll = rollDamage(damageDice, damageBonus, critical);
    result.damage = dmgRoll.total;
    result.damageRolls = dmgRoll.rolls;
  }

  return result;
}

export function resolvePlayerAttack(
  attacker: CombatParticipant,
  target: CombatParticipant,
  weapon: WeaponData,
  options: { forceAdvantage?: boolean; forceDisadvantage?: boolean } = {},
): AttackResult {
  if (!attacker.playerStats) throw new Error('Attacker is not a player');
  const character = attacker.playerStats;
  const attackBonus = getAttackBonus(character, weapon);
  const damageBonus = getWeaponDamageAbilityMod(character, weapon);
  const isRanged = weapon.properties.includes('ranged');
  return resolveAttack({
    attacker,
    target,
    attackBonus,
    damageDice: weapon.damageDice,
    damageBonus,
    range: isRanged ? 'ranged' : 'melee',
    ...options,
  });
}

export function resolveEnemyAttack(
  attacker: CombatParticipant,
  target: CombatParticipant,
  attack: EnemyAttack,
): AttackResult {
  return resolveAttack({
    attacker,
    target,
    attackBonus: attack.attackBonus,
    damageDice: attack.damageDice,
    damageBonus: 0, // enemy damage dice already include the ability mod in the data
    range: attack.range,
  });
}

export function applyDamage(participant: CombatParticipant, amount: number): CombatParticipant {
  const newHP = Math.max(0, participant.currentHP - amount);
  const conditions = [...participant.conditions];
  if (newHP === 0) {
    if (participant.isPlayer) {
      if (!conditions.includes('unconscious')) conditions.push('unconscious');
    } else {
      if (!conditions.includes('dead')) conditions.push('dead');
    }
  }
  return {
    ...participant,
    currentHP: newHP,
    conditions,
  };
}

export function applyHeal(participant: CombatParticipant, amount: number): CombatParticipant {
  const newHP = Math.min(participant.maxHP, participant.currentHP + amount);
  const conditions = participant.conditions.filter(
    (c) => !(newHP > 0 && (c === 'unconscious')),
  );
  return {
    ...participant,
    currentHP: newHP,
    conditions,
  };
}

export function applyCondition(participant: CombatParticipant, condition: Condition): CombatParticipant {
  if (participant.conditions.includes(condition)) return participant;
  return { ...participant, conditions: [...participant.conditions, condition] };
}

export function removeCondition(
  participant: CombatParticipant,
  condition: Condition,
): CombatParticipant {
  return {
    ...participant,
    conditions: participant.conditions.filter((c) => c !== condition),
  };
}

export function isIncapacitated(p: CombatParticipant): boolean {
  return (
    p.conditions.includes('dead') ||
    p.conditions.includes('unconscious') ||
    p.conditions.includes('paralyzed') ||
    p.conditions.includes('stunned')
  );
}

export function checkCombatEnd(state: CombatState): CombatPhase {
  const player = state.participants.find((p) => p.isPlayer);
  if (!player || player.currentHP <= 0) return 'defeat';
  const aliveEnemies = state.participants.filter((p) => !p.isPlayer && p.currentHP > 0);
  if (aliveEnemies.length === 0) return 'victory';
  return 'in_progress';
}

export function advanceTurn(state: CombatState): CombatState {
  const total = state.initiativeOrder.length;
  let nextIndex = state.currentTurnIndex;
  let round = state.round;
  // skip dead/unconscious participants
  for (let i = 0; i < total; i++) {
    nextIndex = (nextIndex + 1) % total;
    if (nextIndex === 0) round += 1;
    const candidateId = state.initiativeOrder[nextIndex];
    const candidate = state.participants.find((p) => p.id === candidateId);
    if (candidate && candidate.currentHP > 0 && !isIncapacitated(candidate)) {
      break;
    }
  }
  // reset actionsUsed for the actor whose turn just began
  const newActorId = state.initiativeOrder[nextIndex];
  const newParticipants = state.participants.map((p) =>
    p.id === newActorId ? { ...p, actionsUsed: [] as ActionType[] } : p,
  );
  return {
    ...state,
    currentTurnIndex: nextIndex,
    round,
    participants: newParticipants,
  };
}

export function currentActor(state: CombatState): CombatParticipant | null {
  const id = state.initiativeOrder[state.currentTurnIndex];
  return state.participants.find((p) => p.id === id) ?? null;
}

export function describeAttack(
  attacker: CombatParticipant,
  target: CombatParticipant,
  weaponOrAttack: string,
  result: AttackResult,
): string {
  if (result.criticalFail) {
    return `${attacker.name} swings ${weaponOrAttack} at ${target.name} — natural 1, critical miss!`;
  }
  if (!result.hit) {
    return `${attacker.name} attacks ${target.name} with ${weaponOrAttack}: rolled ${result.attackTotal} vs AC ${result.targetAC}. Miss.`;
  }
  if (result.critical) {
    return `${attacker.name} attacks ${target.name} with ${weaponOrAttack}: natural 20! Critical hit for ${result.damage} damage.`;
  }
  return `${attacker.name} attacks ${target.name} with ${weaponOrAttack}: ${result.attackTotal} vs AC ${result.targetAC} — Hit for ${result.damage} damage.`;
}

// Simple enemy AI: pick first available attack, target the player.
export function chooseEnemyAction(
  enemy: CombatParticipant,
  state: CombatState,
): { attack: EnemyAttack; targetId: string } | null {
  if (!enemy.enemyStats) return null;
  const player = state.participants.find((p) => p.isPlayer && p.currentHP > 0);
  if (!player) return null;
  // pick the highest expected-damage attack
  const attacks = enemy.enemyStats.attacks;
  if (attacks.length === 0) return null;
  // simple: first attack (could be expanded later)
  return { attack: attacks[0], targetId: player.id };
}
