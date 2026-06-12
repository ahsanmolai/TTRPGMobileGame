import { CharacterStats, calculateAC } from 'src/engine/character';
import { CharacterBuild, buildCharacter } from 'src/engine/leveling';

// Level-1 quick-start builds using the standard array (15, 14, 13, 12, 10, 8)
// before racial bonuses. Stats, equipment, slots, and spells all derive from
// buildCharacter, the same path as custom-created characters.
export const PRESET_BUILDS: CharacterBuild[] = [
  {
    id: 'thorin',
    name: 'Thorin',
    race: 'dwarf',
    classId: 'fighter',
    abilityScores: {
      strength: 15,
      dexterity: 12,
      constitution: 14,
      intelligence: 10,
      wisdom: 13,
      charisma: 8,
    },
    portrait: 'dwarf_fighter',
  },
  {
    id: 'lyra',
    name: 'Lyra',
    race: 'halfling',
    classId: 'rogue',
    abilityScores: {
      strength: 10,
      dexterity: 15,
      constitution: 14,
      intelligence: 12,
      wisdom: 8,
      charisma: 13,
    },
    portrait: 'halfling_rogue',
  },
  {
    id: 'aldwin',
    name: 'Brother Aldwin',
    race: 'human',
    classId: 'cleric',
    abilityScores: {
      strength: 13,
      dexterity: 10,
      constitution: 14,
      intelligence: 8,
      wisdom: 15,
      charisma: 12,
    },
    portrait: 'human_cleric',
  },
  {
    id: 'zara',
    name: 'Zara',
    race: 'elf',
    classId: 'wizard',
    abilityScores: {
      strength: 8,
      dexterity: 13,
      constitution: 14,
      intelligence: 15,
      wisdom: 12,
      charisma: 10,
    },
    portrait: 'elf_wizard',
  },
];

export const PRESET_CHARACTERS: CharacterStats[] = PRESET_BUILDS.map(buildCharacter);

export function getPresetBuild(id: string): CharacterBuild {
  const b = PRESET_BUILDS.find((c) => c.id === id);
  if (!b) throw new Error(`Unknown preset: ${id}`);
  return b;
}

export function getPreset(id: string): CharacterStats {
  return buildCharacter(getPresetBuild(id));
}

export function presetAC(c: CharacterStats): number {
  return calculateAC(c);
}
