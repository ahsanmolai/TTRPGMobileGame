// Racial traits per SRD 5.1 (CC-BY-4.0), simplified to the stats this engine models.
import { AbilityScores, ClassFeatureId, RaceId } from 'src/engine/character';

export interface RaceData {
  id: RaceId;
  name: string;
  abilityBonuses: Partial<AbilityScores>;
  speed: number;
  features: ClassFeatureId[];
  description: string;
}

export const RACES: Record<RaceId, RaceData> = {
  human: {
    id: 'human',
    name: 'Human',
    abilityBonuses: {
      strength: 1,
      dexterity: 1,
      constitution: 1,
      intelligence: 1,
      wisdom: 1,
      charisma: 1,
    },
    speed: 30,
    features: [],
    description: '+1 to every ability score',
  },
  elf: {
    id: 'elf',
    name: 'Elf',
    abilityBonuses: { dexterity: 2, intelligence: 1 },
    speed: 30,
    features: [],
    description: '+2 DEX, +1 INT',
  },
  dwarf: {
    id: 'dwarf',
    name: 'Dwarf',
    abilityBonuses: { constitution: 2, wisdom: 1 },
    speed: 25,
    features: ['dwarven_toughness'],
    description: '+2 CON, +1 WIS, +1 HP per level',
  },
  halfling: {
    id: 'halfling',
    name: 'Halfling',
    abilityBonuses: { dexterity: 2, charisma: 1 },
    speed: 25,
    features: ['halfling_lucky'],
    description: '+2 DEX, +1 CHA',
  },
  'half-orc': {
    id: 'half-orc',
    name: 'Half-Orc',
    abilityBonuses: { strength: 2, constitution: 1 },
    speed: 30,
    features: [],
    description: '+2 STR, +1 CON',
  },
};

export function getRace(id: RaceId): RaceData {
  return RACES[id];
}
