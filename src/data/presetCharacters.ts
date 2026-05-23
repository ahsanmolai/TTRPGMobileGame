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
  return { ...stats, maxHP, currentHP: maxHP };
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
    spellcastingAbility: 'wisdom',
    spellSlots: { 1: { max: 4, remaining: 4 }, 2: { max: 2, remaining: 2 } },
    knownSpells: ['sacred_flame', 'cure_wounds', 'healing_word', 'inflict_wounds', 'hold_person'],
  }),
  finalize({
    id: 'zara',
    name: 'Zara',
    race: 'elf',
    classId: 'wizard',
    level: 3,
    abilityScores: {
      strength: 8,
      dexterity: 14,
      constitution: 12,
      intelligence: 17,
      wisdom: 12,
      charisma: 10,
    },
    speed: 30,
    proficientWeapons: ['simple'],
    proficientSaves: ['intelligence', 'wisdom'],
    savingThrowProficiencies: ['intelligence', 'wisdom'],
    armor: null,
    shield: false,
    mainHand: WEAPONS.dagger,
    classFeatures: [],
    portrait: 'elf_wizard',
    spellcastingAbility: 'intelligence',
    spellSlots: { 1: { max: 4, remaining: 4 }, 2: { max: 2, remaining: 2 } },
    knownSpells: ['fire_bolt', 'magic_missile', 'scorching_ray', 'hold_person'],
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
