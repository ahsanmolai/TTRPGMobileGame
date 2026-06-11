import { WeaponData, WeaponCategory } from 'src/data/weapons';
import { SpellId } from 'src/data/spellbook';
import { ClassId, CLASSES } from 'src/data/classes';
export type { ClassId };

export type RaceId = 'human' | 'elf' | 'dwarf' | 'halfling' | 'half-orc';

export type AbilityName =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma';

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export type ArmorCategory = 'light' | 'medium' | 'heavy';

export interface ArmorData {
  id: string;
  name: string;
  baseAC: number;
  category: ArmorCategory;
  dexCap: number | null;
  strRequirement?: number;
}

export interface CharacterStats {
  id: string;
  name: string;
  race: RaceId;
  classId: ClassId;
  level: number;
  abilityScores: AbilityScores;
  maxHP: number;
  currentHP: number;
  speed: number;
  proficientWeapons: WeaponCategory[];
  proficientSaves: AbilityName[];
  savingThrowProficiencies: AbilityName[];
  armor: ArmorData | null;
  shield: boolean;
  mainHand: WeaponData;
  classFeatures: ClassFeatureId[];
  /** Weapon attacks allowed per action (Extra Attack). */
  attacksPerAction: number;
  portrait?: string;
  spellcastingAbility?: AbilityName;
  spellSlots?: SpellSlotState;
  knownSpells?: SpellId[];
}

export interface SpellSlotState {
  [level: number]: { max: number; remaining: number };
}

export type ClassFeatureId =
  | 'sneak_attack'
  | 'second_wind'
  | 'fighting_style_dueling'
  | 'fighting_style_defense'
  | 'channel_divinity'
  | 'dwarven_toughness'
  | 'halfling_lucky';

export function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function getProficiencyBonus(level: number): number {
  if (level < 1) return 2;
  if (level <= 4) return 2;
  if (level <= 8) return 3;
  if (level <= 12) return 4;
  if (level <= 16) return 5;
  return 6;
}

export function calculateMaxHP(classId: ClassId, level: number, conModifier: number): number {
  const cls = CLASSES[classId];
  const hitDie = cls?.hitDie ?? 8;
  const avgPerLevel = cls?.averageHPPerLevel ?? 5;
  const firstLevel = hitDie + conModifier;
  if (level <= 1) return Math.max(1, firstLevel);
  const remaining = (level - 1) * (avgPerLevel + conModifier);
  return Math.max(1, firstLevel + remaining);
}

export function calculateAC(character: CharacterStats): number {
  const dexMod = getModifier(character.abilityScores.dexterity);
  let ac: number;
  if (!character.armor) {
    ac = 10 + dexMod;
  } else {
    const cap = character.armor.dexCap;
    const effectiveDex = cap === null ? dexMod : Math.min(dexMod, cap);
    ac = character.armor.baseAC + effectiveDex;
  }
  if (character.shield) ac += 2;
  if (character.classFeatures.includes('fighting_style_defense') && character.armor) ac += 1;
  return ac;
}

export function getAttackBonus(character: CharacterStats, weapon: WeaponData): number {
  const isFinesse = weapon.properties.includes('finesse');
  const isRanged = weapon.properties.includes('ranged');
  const strMod = getModifier(character.abilityScores.strength);
  const dexMod = getModifier(character.abilityScores.dexterity);
  let abilityMod: number;
  if (isRanged) abilityMod = dexMod;
  else if (isFinesse) abilityMod = Math.max(strMod, dexMod);
  else abilityMod = strMod;
  const proficient = character.proficientWeapons.includes(weapon.category);
  const prof = proficient ? getProficiencyBonus(character.level) : 0;
  return abilityMod + prof;
}

export function getWeaponDamageAbilityMod(
  character: CharacterStats,
  weapon: WeaponData,
): number {
  const isFinesse = weapon.properties.includes('finesse');
  const isRanged = weapon.properties.includes('ranged');
  const strMod = getModifier(character.abilityScores.strength);
  const dexMod = getModifier(character.abilityScores.dexterity);
  if (isRanged) return dexMod;
  if (isFinesse) return Math.max(strMod, dexMod);
  return strMod;
}

export function getSavingThrowBonus(
  character: CharacterStats,
  ability: AbilityName,
): number {
  const score = character.abilityScores[ability];
  const mod = getModifier(score);
  const proficient = character.proficientSaves.includes(ability);
  return mod + (proficient ? getProficiencyBonus(character.level) : 0);
}

export function getInitiativeBonus(character: CharacterStats): number {
  return getModifier(character.abilityScores.dexterity);
}

export function getSpellcastingAbility(classId: ClassId): AbilityName {
  const ability = CLASSES[classId]?.spellcastingAbility;
  if (!ability) throw new Error(`${classId} is not a spellcaster`);
  return ability as AbilityName;
}

export function isSpellcaster(classId: ClassId): boolean {
  return CLASSES[classId]?.spellcastingAbility != null;
}

export function getSpellSaveDC(character: CharacterStats): number {
  const ability = getSpellcastingAbility(character.classId);
  return 8 + getProficiencyBonus(character.level) + getModifier(character.abilityScores[ability]);
}

export function getSpellAttackBonus(character: CharacterStats): number {
  const ability = getSpellcastingAbility(character.classId);
  return getProficiencyBonus(character.level) + getModifier(character.abilityScores[ability]);
}

export function getSpellDamageAbilityMod(character: CharacterStats): number {
  const ability = getSpellcastingAbility(character.classId);
  return getModifier(character.abilityScores[ability]);
}

export function spendSpellSlot(slots: SpellSlotState, level: number): SpellSlotState {
  const current = slots[level];
  if (!current || current.remaining <= 0) throw new Error(`No level-${level} slots remaining`);
  return { ...slots, [level]: { ...current, remaining: current.remaining - 1 } };
}
