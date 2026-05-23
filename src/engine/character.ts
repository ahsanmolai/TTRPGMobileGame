import { WeaponData, WeaponCategory } from 'src/data/weapons';

export type ClassId = 'fighter' | 'rogue' | 'cleric' | 'wizard';
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
  portrait?: string;
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

const HIT_DIE_BY_CLASS: Record<ClassId, number> = {
  fighter: 10,
  rogue: 8,
  cleric: 8,
  wizard: 6,
};

const AVERAGE_HIT_DIE: Record<ClassId, number> = {
  fighter: 6, // (10/2 + 1)
  rogue: 5,
  cleric: 5,
  wizard: 4,
};

export function calculateMaxHP(classId: ClassId, level: number, conModifier: number): number {
  const firstLevel = HIT_DIE_BY_CLASS[classId] + conModifier;
  if (level <= 1) return Math.max(1, firstLevel);
  const remaining = (level - 1) * (AVERAGE_HIT_DIE[classId] + conModifier);
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
