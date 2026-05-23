import {
  CharacterStats,
  ArmorData,
  calculateAC,
  calculateMaxHP,
  getModifier,
} from 'src/engine/character';
import { WEAPONS } from 'src/data/weapons';

const CHAIN_MAIL: ArmorData = {
  id: 'chainmail',
  name: 'Chain Mail',
  baseAC: 16,
  category: 'medium',
  dexCap: 2,
};

const LEATHER: ArmorData = {
  id: 'leather',
  name: 'Leather Armor',
  baseAC: 11,
  category: 'light',
  dexCap: null,
};

function finalize(stats: Omit<CharacterStats, 'maxHP' | 'currentHP'>): CharacterStats {
  const conMod = getModifier(stats.abilityScores.constitution);
  const maxHP = calculateMaxHP(stats.classId, stats.level, conMod);
  const draft: CharacterStats = { ...stats, maxHP, currentHP: maxHP };
  // AC was a placeholder; recompute now using calculateAC on the full object
  // but we never store derived AC on the character — combatStore reads it via calculateAC
  return draft;
}

export const PRESET_CHARACTERS: CharacterStats[] = [
  finalize({
    id: 'thorin',
    name: 'Thorin',
    race: 'dwarf',
    classId: 'fighter',
    level: 3,
    abilityScores: {
      strength: 16,
      dexterity: 12,
      constitution: 16,
      intelligence: 10,
      wisdom: 12,
      charisma: 8,
    },
    speed: 25,
    proficientWeapons: ['simple', 'martial'],
    proficientSaves: ['strength', 'constitution'],
    savingThrowProficiencies: ['strength', 'constitution'],
    armor: CHAIN_MAIL,
    shield: true,
    mainHand: WEAPONS.longsword,
    classFeatures: ['second_wind', 'fighting_style_defense', 'dwarven_toughness'],
    portrait: 'dwarf_fighter',
  }),
  finalize({
    id: 'lyra',
    name: 'Lyra',
    race: 'halfling',
    classId: 'rogue',
    level: 3,
    abilityScores: {
      strength: 10,
      dexterity: 16,
      constitution: 14,
      intelligence: 12,
      wisdom: 10,
      charisma: 14,
    },
    speed: 25,
    proficientWeapons: ['simple', 'martial'],
    proficientSaves: ['dexterity', 'intelligence'],
    savingThrowProficiencies: ['dexterity', 'intelligence'],
    armor: LEATHER,
    shield: false,
    mainHand: WEAPONS.shortsword,
    classFeatures: ['sneak_attack', 'halfling_lucky'],
    portrait: 'halfling_rogue',
  }),
  finalize({
    id: 'aldwin',
    name: 'Brother Aldwin',
    race: 'human',
    classId: 'cleric',
    level: 3,
    abilityScores: {
      strength: 14,
      dexterity: 10,
      constitution: 14,
      intelligence: 10,
      wisdom: 16,
      charisma: 12,
    },
    speed: 30,
    proficientWeapons: ['simple'],
    proficientSaves: ['wisdom', 'charisma'],
    savingThrowProficiencies: ['wisdom', 'charisma'],
    armor: CHAIN_MAIL,
    shield: true,
    mainHand: WEAPONS.mace,
    classFeatures: ['channel_divinity'],
    portrait: 'human_cleric',
  }),
];

export function getPreset(id: string): CharacterStats {
  const p = PRESET_CHARACTERS.find((c) => c.id === id);
  if (!p) throw new Error(`Unknown preset: ${id}`);
  return p;
}

export function presetAC(c: CharacterStats): number {
  return calculateAC(c);
}
