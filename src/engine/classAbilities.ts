// Signature per-class combat abilities. Resource values (rage damage, ki,
// sneak attack dice, martial arts die) come from the SRD progression tables
// in src/data/classes.ts (`extra` fields) — never hardcoded here.
import { CharacterStats, getModifier } from 'src/engine/character';
import { CLASSES, ClassId } from 'src/data/classes';

export type ClassAbilityId = 'rage' | 'second_wind' | 'aim' | 'flurry_of_blows' | 'divine_smite';

export interface ClassAbility {
  id: ClassAbilityId;
  name: string;
  description: string;
  /** 'bonus_action' abilities spend the bonus action; 'toggle' (smite) is free. */
  kind: 'bonus_action' | 'toggle';
  /** Uses per fight; Infinity = limited only by the bonus action. */
  usesPerFight: number;
}

function progressionExtra(classId: ClassId, level: number): Record<string, string | number> {
  return CLASSES[classId].progression[Math.max(0, Math.min(19, level - 1))].extra ?? {};
}

/** Barbarian rage flat damage bonus at this level, e.g. "+2" → 2. */
export function getRageDamageBonus(level: number): number {
  const raw = progressionExtra('barbarian', level).rageDamage;
  return typeof raw === 'string' ? parseInt(raw.replace('+', ''), 10) || 2 : 2;
}

/** Rogue sneak attack dice at this level, e.g. "3d6". */
export function getSneakAttackDice(level: number): string {
  const raw = progressionExtra('rogue', level).sneakAttack;
  return typeof raw === 'string' ? raw : '1d6';
}

/** Monk martial arts die at this level, e.g. "1d6". */
export function getMartialArtsDice(level: number): string {
  const raw = progressionExtra('monk', level).martialArts;
  return typeof raw === 'string' ? raw : '1d4';
}

/** Monk ki points at this level (0 before level 2 — flurry unavailable). */
export function getKiPoints(level: number): number {
  const raw = progressionExtra('monk', level).kiPoints;
  return typeof raw === 'number' ? raw : 0;
}

export function getClassAbility(classId: ClassId, level: number): ClassAbility | null {
  switch (classId) {
    case 'barbarian':
      return {
        id: 'rage',
        name: 'Rage',
        description: `+${getRageDamageBonus(level)} melee damage, halve weapon damage taken — lasts the fight`,
        kind: 'bonus_action',
        usesPerFight: 1,
      };
    case 'fighter':
      return {
        id: 'second_wind',
        name: 'Second Wind',
        description: `Heal 1d10 + ${level} HP`,
        kind: 'bonus_action',
        usesPerFight: 1,
      };
    case 'rogue':
      return {
        id: 'aim',
        name: 'Aim',
        description: `Next attack this turn has advantage — sneak attack adds ${getSneakAttackDice(level)}`,
        kind: 'bonus_action',
        usesPerFight: Infinity,
      };
    case 'monk': {
      const ki = getKiPoints(level);
      if (ki <= 0) return null; // ki unlocks at level 2
      return {
        id: 'flurry_of_blows',
        name: 'Flurry of Blows',
        description: `Two extra strikes at ${getMartialArtsDice(level)} + DEX (1 ki)`,
        kind: 'bonus_action',
        usesPerFight: ki,
      };
    }
    case 'paladin':
      return {
        id: 'divine_smite',
        name: 'Divine Smite',
        description: 'Arm: next melee hit spends a slot for +2d8 radiant (+1d8 per slot level, max 5d8)',
        kind: 'toggle',
        usesPerFight: Infinity,
      };
    default:
      return null;
  }
}

/** Smite dice for a spent slot level: 2d8 base +1d8 per level above 1, capped at 5d8. */
export function getSmiteDice(slotLevel: number): string {
  const dice = Math.min(5, 1 + slotLevel);
  return `${dice}d8`;
}

/** Monk unarmed/flurry damage bonus (DEX mod, monks are DEX-primary here). */
export function getFlurryDamageBonus(character: CharacterStats): number {
  return getModifier(character.abilityScores.dexterity);
}
