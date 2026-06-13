import { AbilityName } from 'src/engine/character';
import { ClassId } from 'src/engine/character';
import { Condition } from 'src/engine/combat';
import { DamageType } from 'src/data/weapons';

export type SpellId =
  | 'sacred_flame'
  | 'fire_bolt'
  | 'eldritch_blast'
  | 'produce_flame'
  | 'vicious_mockery'
  | 'cure_wounds'
  | 'healing_word'
  | 'inflict_wounds'
  | 'magic_missile'
  | 'hold_person'
  | 'scorching_ray'
  | 'fireball'
  | 'lightning_bolt'
  | 'mass_healing_word'
  | 'blight'
  | 'phantasmal_killer'
  | 'cone_of_cold'
  | 'flame_strike'
  | 'hold_monster'
  | 'mass_cure_wounds'
  | 'chain_lightning'
  | 'disintegrate'
  | 'harm'
  | 'finger_of_death'
  | 'fire_storm'
  | 'sunburst'
  | 'meteor_swarm';

export type SpellCastingTime = 'action' | 'bonus_action';

/** Who the spell hits. 'all_enemies' = every live enemy (fireball). Default: 'single'. */
export type SpellTargeting = 'single' | 'all_enemies' | 'self';

export type SpellEffectDef =
  | { kind: 'damage_save'; damageDice: string; damageType: DamageType; saveAbility: AbilityName; onSaveSuccess: 'half' | 'none' }
  | { kind: 'damage_attack'; damageDice: string; damageType: DamageType; attackRange: 'melee' | 'ranged' }
  | { kind: 'multi_attack'; hits: number; damageDice: string; damageType: DamageType }
  | { kind: 'auto_hit_multi'; hits: number; damageDice: string; damageType: DamageType }
  | { kind: 'heal'; healDice: string }
  | { kind: 'condition'; condition: Condition; saveAbility: AbilityName; concentration: boolean };

export interface SpellUpcast {
  /** Extra damage/heal dice per slot level above the spell's level (same die size as base). */
  extraDicePerSlot?: string;
  /** Extra hits/darts/rays per slot level above the spell's level. */
  extraHitsPerSlot?: number;
}

export interface SpellDefinition {
  id: SpellId;
  name: string;
  level: number; // 0 = cantrip
  castingTime: SpellCastingTime;
  concentration: boolean;
  effect: SpellEffectDef;
  availableTo: ClassId[];
  description: string;
  targeting?: SpellTargeting;
  upcast?: SpellUpcast;
  /** Cantrips: damage dice (or hits for multi-kinds) scale at character levels 5/11/17. */
  cantripScaling?: boolean;
}

export const SPELLS: Record<SpellId, SpellDefinition> = {
  // ——— Cantrips ———
  sacred_flame: {
    id: 'sacred_flame',
    name: 'Sacred Flame',
    level: 0,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '1d8', damageType: 'radiant', saveAbility: 'dexterity', onSaveSuccess: 'none' },
    availableTo: ['cleric'],
    description: 'DEX save or 1d8 radiant — no cover bonus',
    cantripScaling: true,
  },
  fire_bolt: {
    id: 'fire_bolt',
    name: 'Fire Bolt',
    level: 0,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_attack', damageDice: '1d10', damageType: 'fire', attackRange: 'ranged' },
    availableTo: ['sorcerer', 'wizard'],
    description: 'Ranged spell attack — 1d10 fire damage',
    cantripScaling: true,
  },
  eldritch_blast: {
    id: 'eldritch_blast',
    name: 'Eldritch Blast',
    level: 0,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'multi_attack', hits: 1, damageDice: '1d10', damageType: 'force' },
    availableTo: ['warlock'],
    description: 'Beams of crackling force — 1d10 each, more beams as you level',
    cantripScaling: true,
  },
  produce_flame: {
    id: 'produce_flame',
    name: 'Produce Flame',
    level: 0,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_attack', damageDice: '1d8', damageType: 'fire', attackRange: 'ranged' },
    availableTo: ['druid'],
    description: 'Hurl a palm of flame — 1d8 fire damage',
    cantripScaling: true,
  },
  vicious_mockery: {
    id: 'vicious_mockery',
    name: 'Vicious Mockery',
    level: 0,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '1d4', damageType: 'psychic', saveAbility: 'wisdom', onSaveSuccess: 'none' },
    availableTo: ['bard'],
    description: 'WIS save or 1d4 psychic from a string of insults',
    cantripScaling: true,
  },

  // ——— Level 1–2 ———
  cure_wounds: {
    id: 'cure_wounds',
    name: 'Cure Wounds',
    level: 1,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'heal', healDice: '1d8' },
    availableTo: ['bard', 'cleric', 'druid', 'paladin', 'ranger'],
    description: 'Restore 1d8 + WIS modifier HP (touch)',
    targeting: 'self',
    upcast: { extraDicePerSlot: '1d8' },
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
    targeting: 'self',
    upcast: { extraDicePerSlot: '1d4' },
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
    upcast: { extraDicePerSlot: '1d10' },
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
    upcast: { extraHitsPerSlot: 1 },
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
    upcast: { extraHitsPerSlot: 1 },
  },

  // ——— Level 3 ———
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    level: 3,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '8d6', damageType: 'fire', saveAbility: 'dexterity', onSaveSuccess: 'half' },
    availableTo: ['sorcerer', 'wizard'],
    description: 'All enemies: DEX save or 8d6 fire, half on save',
    targeting: 'all_enemies',
    upcast: { extraDicePerSlot: '1d6' },
  },
  lightning_bolt: {
    id: 'lightning_bolt',
    name: 'Lightning Bolt',
    level: 3,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '8d6', damageType: 'lightning', saveAbility: 'dexterity', onSaveSuccess: 'half' },
    availableTo: ['sorcerer', 'wizard'],
    description: 'All enemies: DEX save or 8d6 lightning, half on save',
    targeting: 'all_enemies',
    upcast: { extraDicePerSlot: '1d6' },
  },
  mass_healing_word: {
    id: 'mass_healing_word',
    name: 'Mass Healing Word',
    level: 3,
    castingTime: 'bonus_action',
    concentration: false,
    effect: { kind: 'heal', healDice: '1d4' },
    availableTo: ['bard', 'cleric'],
    description: 'Bonus action — restore 1d4 + ability modifier HP',
    targeting: 'self',
    upcast: { extraDicePerSlot: '1d4' },
  },

  // ——— Level 4 ———
  blight: {
    id: 'blight',
    name: 'Blight',
    level: 4,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '8d8', damageType: 'necrotic', saveAbility: 'constitution', onSaveSuccess: 'half' },
    availableTo: ['druid', 'sorcerer', 'warlock', 'wizard'],
    description: 'CON save or 8d8 necrotic, half on save',
    upcast: { extraDicePerSlot: '1d8' },
  },
  phantasmal_killer: {
    id: 'phantasmal_killer',
    name: 'Phantasmal Killer',
    level: 4,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '4d10', damageType: 'psychic', saveAbility: 'wisdom', onSaveSuccess: 'none' },
    availableTo: ['wizard'],
    description: 'WIS save or 4d10 psychic from manifest nightmares',
    upcast: { extraDicePerSlot: '1d10' },
  },

  // ——— Level 5 ———
  cone_of_cold: {
    id: 'cone_of_cold',
    name: 'Cone of Cold',
    level: 5,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '8d8', damageType: 'cold', saveAbility: 'constitution', onSaveSuccess: 'half' },
    availableTo: ['sorcerer', 'wizard'],
    description: 'All enemies: CON save or 8d8 cold, half on save',
    targeting: 'all_enemies',
    upcast: { extraDicePerSlot: '1d8' },
  },
  flame_strike: {
    id: 'flame_strike',
    name: 'Flame Strike',
    level: 5,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '8d6', damageType: 'radiant', saveAbility: 'dexterity', onSaveSuccess: 'half' },
    availableTo: ['cleric'],
    description: 'All enemies: a column of divine fire — DEX save or 8d6, half on save',
    targeting: 'all_enemies',
    upcast: { extraDicePerSlot: '1d6' },
  },
  hold_monster: {
    id: 'hold_monster',
    name: 'Hold Monster',
    level: 5,
    castingTime: 'action',
    concentration: true,
    effect: { kind: 'condition', condition: 'paralyzed', saveAbility: 'wisdom', concentration: true },
    availableTo: ['bard', 'sorcerer', 'warlock', 'wizard'],
    description: 'WIS save or paralyzed (any creature) — concentration',
  },
  mass_cure_wounds: {
    id: 'mass_cure_wounds',
    name: 'Mass Cure Wounds',
    level: 5,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'heal', healDice: '3d8' },
    availableTo: ['bard', 'cleric', 'druid'],
    description: 'A wave of healing — restore 3d8 + ability modifier HP',
    targeting: 'self',
    upcast: { extraDicePerSlot: '1d8' },
  },

  // ——— Level 6 ———
  chain_lightning: {
    id: 'chain_lightning',
    name: 'Chain Lightning',
    level: 6,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '10d8', damageType: 'lightning', saveAbility: 'dexterity', onSaveSuccess: 'half' },
    availableTo: ['sorcerer', 'wizard'],
    description: 'All enemies: arcing bolts — DEX save or 10d8, half on save',
    targeting: 'all_enemies',
    upcast: { extraDicePerSlot: '1d8' },
  },
  disintegrate: {
    id: 'disintegrate',
    name: 'Disintegrate',
    level: 6,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '10d6+40', damageType: 'force', saveAbility: 'dexterity', onSaveSuccess: 'none' },
    availableTo: ['sorcerer', 'wizard'],
    description: 'DEX save or 10d6+40 force — dust on a failed save',
    upcast: { extraDicePerSlot: '3d6' },
  },
  harm: {
    id: 'harm',
    name: 'Harm',
    level: 6,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '14d6', damageType: 'necrotic', saveAbility: 'constitution', onSaveSuccess: 'half' },
    availableTo: ['cleric'],
    description: 'CON save or 14d6 necrotic — a virulent affliction',
  },

  // ——— Level 7 ———
  finger_of_death: {
    id: 'finger_of_death',
    name: 'Finger of Death',
    level: 7,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '7d8+30', damageType: 'necrotic', saveAbility: 'constitution', onSaveSuccess: 'half' },
    availableTo: ['sorcerer', 'warlock', 'wizard'],
    description: 'CON save or 7d8+30 necrotic, half on save',
  },
  fire_storm: {
    id: 'fire_storm',
    name: 'Fire Storm',
    level: 7,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '7d10', damageType: 'fire', saveAbility: 'dexterity', onSaveSuccess: 'half' },
    availableTo: ['cleric', 'druid', 'sorcerer'],
    description: 'All enemies: sheets of roaring flame — DEX save or 7d10, half on save',
    targeting: 'all_enemies',
  },

  // ——— Level 8 ———
  sunburst: {
    id: 'sunburst',
    name: 'Sunburst',
    level: 8,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '12d6', damageType: 'radiant', saveAbility: 'constitution', onSaveSuccess: 'half' },
    availableTo: ['druid', 'sorcerer', 'wizard'],
    description: 'All enemies: brilliant sunlight — CON save or 12d6 radiant, half on save',
    targeting: 'all_enemies',
  },

  // ——— Level 9 ———
  meteor_swarm: {
    id: 'meteor_swarm',
    name: 'Meteor Swarm',
    level: 9,
    castingTime: 'action',
    concentration: false,
    effect: { kind: 'damage_save', damageDice: '40d6', damageType: 'fire', saveAbility: 'dexterity', onSaveSuccess: 'half' },
    availableTo: ['sorcerer', 'wizard'],
    description: 'All enemies: blazing orbs fall from the sky — DEX save or 40d6, half on save',
    targeting: 'all_enemies',
  },
};

export function getSpell(id: SpellId): SpellDefinition {
  return SPELLS[id];
}

export function getSpellsForClass(classId: ClassId): SpellDefinition[] {
  return Object.values(SPELLS).filter((s) => s.availableTo.includes(classId));
}
