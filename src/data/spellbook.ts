import { AbilityName } from 'src/engine/character';
import { ClassId } from 'src/engine/character';
import { Condition } from 'src/engine/combat';
import { DamageType } from 'src/data/weapons';

export type SpellId =
  | 'sacred_flame'
  | 'fire_bolt'
  | 'cure_wounds'
  | 'healing_word'
  | 'inflict_wounds'
  | 'magic_missile'
  | 'hold_person'
  | 'scorching_ray';

export type SpellCastingTime = 'action' | 'bonus_action';

export type SpellEffectDef =
  | { kind: 'damage_save'; damageDice: string; damageType: DamageType; saveAbility: AbilityName; onSaveSuccess: 'half' | 'none' }
  | { kind: 'damage_attack'; damageDice: string; damageType: DamageType; attackRange: 'melee' | 'ranged' }
  | { kind: 'multi_attack'; hits: number; damageDice: string; damageType: DamageType }
  | { kind: 'auto_hit_multi'; hits: number; damageDice: string; damageType: DamageType }
  | { kind: 'heal'; healDice: string }
  | { kind: 'condition'; condition: Condition; saveAbility: AbilityName; concentration: boolean };

export interface SpellDefinition {
  id: SpellId;
  name: string;
  level: number; // 0 = cantrip
  castingTime: SpellCastingTime;
  concentration: boolean;
  effect: SpellEffectDef;
  availableTo: ClassId[];
  description: string;
}

export const SPELLS: Record<SpellId, SpellDefinition> = {
  sacred_flame: {
    id: 'sacred_flame',
    name: 'Sacred Flame',
    level: 0,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '1d8', damageType: 'radiant', saveAbility: 'dexterity', onSaveSuccess: 'none' },
    availableTo: ['cleric'],
    description: 'DEX save or 1d8 radiant — no cover bonus',
  },
  fire_bolt: {
    id: 'fire_bolt',
    name: 'Fire Bolt',
    level: 0,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_attack', damageDice: '2d10', damageType: 'fire', attackRange: 'ranged' },
    availableTo: ['sorcerer', 'wizard'],
    description: 'Ranged spell attack — 2d10 fire damage',
  },
  cure_wounds: {
    id: 'cure_wounds',
    name: 'Cure Wounds',
    level: 1,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'heal', healDice: '1d8' },
    availableTo: ['bard', 'cleric', 'druid', 'paladin', 'ranger'],
    description: 'Restore 1d8 + WIS modifier HP (touch)',
  },
  healing_word: {
    id: 'healing_word',
    name: 'Healing Word',
    level: 1,
    castingTime: 'bonus_action',
    concentration: false,
    effect: { kind: 'heal', healDice: '1d4' },
    availableTo: ['bard', 'cleric', 'druid'],
    description: 'Bonus action — restore 1d4 + WIS modifier HP',
  },
  inflict_wounds: {
    id: 'inflict_wounds',
    name: 'Inflict Wounds',
    level: 1,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_attack', damageDice: '3d10', damageType: 'necrotic', attackRange: 'melee' },
    availableTo: ['cleric'],
    description: 'Melee spell attack — 3d10 necrotic damage',
  },
  magic_missile: {
    id: 'magic_missile',
    name: 'Magic Missile',
    level: 1,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'auto_hit_multi', hits: 3, damageDice: '1d4', damageType: 'piercing' },
    availableTo: ['sorcerer', 'wizard'],
    description: 'Auto-hit — 3 darts, each 1d4+1 force damage',
  },
  hold_person: {
    id: 'hold_person',
    name: 'Hold Person',
    level: 2,
    castingTime: 'action',
    concentration: true,
    effect: { kind: 'condition', condition: 'paralyzed', saveAbility: 'wisdom', concentration: true },
    availableTo: ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'],
    description: 'WIS save or paralyzed — concentration',
  },
  scorching_ray: {
    id: 'scorching_ray',
    name: 'Scorching Ray',
    level: 2,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'multi_attack', hits: 3, damageDice: '2d6', damageType: 'fire' },
    availableTo: ['sorcerer', 'wizard'],
    description: '3 ranged spell attacks — 2d6 fire each',
  },
};

export function getSpell(id: SpellId): SpellDefinition {
  return SPELLS[id];
}

export function getSpellsForClass(classId: ClassId): SpellDefinition[] {
  return Object.values(SPELLS).filter((s) => s.availableTo.includes(classId));
}
