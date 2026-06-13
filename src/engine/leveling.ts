// Character creation and level progression, driven by the SRD progression
// tables in src/data/classes.ts.
import {
  AbilityName,
  AbilityScores,
  CharacterStats,
  ClassFeatureId,
  RaceId,
  SpellSlotState,
  calculateMaxHP,
  getModifier,
  getSpellcastingAbility,
  isSpellcaster,
} from 'src/engine/character';
import { CLASSES, ClassId, getSpellSlotsAtLevel } from 'src/data/classes';
import { SpellId, getSpellsForClass } from 'src/data/spellbook';
import { SPELLCASTING_RULES } from 'src/data/spellcastingRules';
import { getRace } from 'src/data/races';
import { STARTING_EQUIPMENT } from 'src/data/startingEquipment';
import { getArmor } from 'src/data/armor';
import { getWeapon } from 'src/data/weapons';

export interface CharacterBuild {
  id: string;
  name: string;
  race: RaceId;
  classId: ClassId;
  /** Base scores before racial bonuses (standard array assignment). */
  abilityScores: AbilityScores;
  portrait?: string;
}

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export const PRIMARY_ABILITY: Record<ClassId, AbilityName> = {
  barbarian: 'strength',
  fighter: 'strength',
  paladin: 'strength',
  monk: 'dexterity',
  ranger: 'dexterity',
  rogue: 'dexterity',
  cleric: 'wisdom',
  druid: 'wisdom',
  wizard: 'intelligence',
  bard: 'charisma',
  sorcerer: 'charisma',
  warlock: 'charisma',
};

const STARTING_CLASS_FEATURES: Record<ClassId, ClassFeatureId[]> = {
  barbarian: [],
  bard: [],
  cleric: ['channel_divinity'],
  druid: [],
  fighter: ['second_wind', 'fighting_style_defense'],
  monk: [],
  paladin: [],
  ranger: [],
  rogue: ['sneak_attack'],
  sorcerer: [],
  warlock: [],
  wizard: [],
};

function maxSlotLevelAt(classId: ClassId, level: number): number {
  const slots = getSpellSlotsAtLevel(classId, level);
  return Object.keys(slots).reduce((max, k) => Math.max(max, Number(k)), 0);
}

/**
 * Every implemented spell the class can cast at this level: all cantrips on
 * its list, plus levelled spells it has slots for. With only a handful of
 * implemented spells there is no choice to make — characters learn them all.
 */
export function getKnownSpells(classId: ClassId, level: number): SpellId[] {
  const maxSlot = maxSlotLevelAt(classId, level);
  return getSpellsForClass(classId)
    .filter((s) => s.level === 0 || s.level <= maxSlot)
    .map((s) => s.id);
}

export function getAttacksPerAction(classId: ClassId, level: number): number {
  if (classId === 'fighter') {
    if (level >= 20) return 4;
    if (level >= 11) return 3;
    if (level >= 5) return 2;
    return 1;
  }
  const extraAttackClasses: ClassId[] = ['barbarian', 'monk', 'paladin', 'ranger'];
  return extraAttackClasses.includes(classId) && level >= 5 ? 2 : 1;
}

function buildSpellSlotState(classId: ClassId, level: number): SpellSlotState | undefined {
  const slots = getSpellSlotsAtLevel(classId, level);
  const entries = Object.entries(slots);
  if (entries.length === 0) return undefined;
  const state: SpellSlotState = {};
  for (const [slotLevel, max] of entries) {
    state[Number(slotLevel)] = { max: max as number, remaining: max as number };
  }
  return state;
}

function computeMaxHP(classId: ClassId, level: number, abilityScores: AbilityScores, features: ClassFeatureId[]): number {
  const conMod = getModifier(abilityScores.constitution);
  const toughness = features.includes('dwarven_toughness') ? level : 0;
  return calculateMaxHP(classId, level, conMod) + toughness;
}

export function buildCharacter(build: CharacterBuild): CharacterStats {
  const race = getRace(build.race);
  const equipment = STARTING_EQUIPMENT[build.classId];
  const classData = CLASSES[build.classId];

  const abilityScores = { ...build.abilityScores };
  for (const [ability, bonus] of Object.entries(race.abilityBonuses)) {
    abilityScores[ability as AbilityName] += bonus;
  }

  const classFeatures = [...STARTING_CLASS_FEATURES[build.classId], ...race.features];
  const saves = classData.savingThrowProficiencies as AbilityName[];
  const caster = isSpellcaster(build.classId);

  const maxHP = computeMaxHP(build.classId, 1, abilityScores, classFeatures);
  return {
    id: build.id,
    name: build.name,
    race: build.race,
    classId: build.classId,
    level: 1,
    abilityScores,
    maxHP,
    currentHP: maxHP,
    speed: race.speed,
    proficientWeapons: [...equipment.proficientWeapons],
    proficientSaves: [...saves],
    savingThrowProficiencies: [...saves],
    armor: equipment.armorId ? getArmor(equipment.armorId) : null,
    shield: equipment.shield,
    mainHand: getWeapon(equipment.weaponId),
    classFeatures,
    attacksPerAction: getAttacksPerAction(build.classId, 1),
    gold: 25,
    inventory: [{ itemId: 'potion_healing', qty: 2 }],
    trinketId: null,
    portrait: build.portrait,
    ...(caster
      ? {
          spellcastingAbility: getSpellcastingAbility(build.classId),
          spellSlots: buildSpellSlotState(build.classId, 1),
          knownSpells: getKnownSpells(build.classId, 1),
        }
      : {}),
  };
}

/**
 * Advance the character one level: ASI (when the progression grants one),
 * recomputed max HP, rebuilt spell slots, refreshed known spells, and Extra
 * Attack. Pure — returns a new CharacterStats. No-op at level 20.
 */
export function applyLevelUp(character: CharacterStats): CharacterStats {
  if (character.level >= 20) return character;
  const level = character.level + 1;
  const classData = CLASSES[character.classId];

  const abilityScores = { ...character.abilityScores };
  const entry = classData.progression[level - 1];
  if (entry.features.includes('Ability Score Improvement')) {
    const primary = PRIMARY_ABILITY[character.classId];
    abilityScores[primary] = Math.min(20, abilityScores[primary] + 1);
    abilityScores.constitution = Math.min(20, abilityScores.constitution + 1);
  }

  const maxHP = computeMaxHP(character.classId, level, abilityScores, character.classFeatures);
  const hpGained = maxHP - character.maxHP;
  const caster = isSpellcaster(character.classId);

  return {
    ...character,
    level,
    abilityScores,
    maxHP,
    currentHP: Math.min(maxHP, character.currentHP + hpGained),
    attacksPerAction: getAttacksPerAction(character.classId, level),
    ...(caster
      ? {
          spellSlots: buildSpellSlotState(character.classId, level),
          knownSpells: getKnownSpells(character.classId, level),
        }
      : {}),
  };
}

/** Heal half of missing HP; warlocks also recover their pact slots. */
export function applyShortRest(character: CharacterStats): CharacterStats {
  const healed = Math.floor((character.maxHP - character.currentHP) / 2);
  const recoversSlots = SPELLCASTING_RULES[character.classId].slotRecovery === 'short_rest';
  return {
    ...character,
    currentHP: Math.min(character.maxHP, character.currentHP + healed),
    ...(recoversSlots && character.spellSlots
      ? { spellSlots: buildSpellSlotState(character.classId, character.level) }
      : {}),
  };
}

/** Full HP and all spell slots restored. */
export function applyLongRest(character: CharacterStats): CharacterStats {
  return {
    ...character,
    currentHP: character.maxHP,
    ...(character.spellSlots
      ? { spellSlots: buildSpellSlotState(character.classId, character.level) }
      : {}),
  };
}
