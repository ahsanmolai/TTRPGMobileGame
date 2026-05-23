import { AbilityScores, AbilityName } from 'src/engine/character';
import { DamageType } from 'src/data/weapons';

export interface EnemyAttack {
  name: string;
  attackBonus: number;
  damageDice: string; // e.g. "1d6+2"
  damageType: DamageType;
  range: 'melee' | 'ranged';
}

export interface EnemyStatBlock {
  id: string;
  name: string;
  cr: number;
  ac: number;
  maxHP: number;
  speed: number;
  abilityScores: AbilityScores;
  initiativeBonus: number;
  attacks: EnemyAttack[];
  multiattackCount: number; // number of attacks per action
  xp: number;
  flavor: string;
  iconHint: string;
}

export const ENEMIES: Record<string, EnemyStatBlock> = {
  goblin: {
    id: 'goblin',
    name: 'Goblin',
    cr: 0.25,
    ac: 15,
    maxHP: 7,
    speed: 30,
    abilityScores: {
      strength: 8,
      dexterity: 14,
      constitution: 10,
      intelligence: 10,
      wisdom: 8,
      charisma: 8,
    },
    initiativeBonus: 2,
    attacks: [
      {
        name: 'Scimitar',
        attackBonus: 4,
        damageDice: '1d6+2',
        damageType: 'slashing',
        range: 'melee',
      },
    ],
    multiattackCount: 1,
    xp: 50,
    flavor: 'A small, sneaky humanoid with a cruel grin.',
    iconHint: 'goblin',
  },
  skeleton: {
    id: 'skeleton',
    name: 'Skeleton',
    cr: 0.25,
    ac: 13,
    maxHP: 13,
    speed: 30,
    abilityScores: {
      strength: 10,
      dexterity: 14,
      constitution: 15,
      intelligence: 6,
      wisdom: 8,
      charisma: 5,
    },
    initiativeBonus: 2,
    attacks: [
      {
        name: 'Shortsword',
        attackBonus: 4,
        damageDice: '1d6+2',
        damageType: 'piercing',
        range: 'melee',
      },
    ],
    multiattackCount: 1,
    xp: 50,
    flavor: 'Animated bones held together by dark magic.',
    iconHint: 'skeleton',
  },
  orc: {
    id: 'orc',
    name: 'Orc',
    cr: 0.5,
    ac: 13,
    maxHP: 15,
    speed: 30,
    abilityScores: {
      strength: 16,
      dexterity: 12,
      constitution: 16,
      intelligence: 7,
      wisdom: 11,
      charisma: 10,
    },
    initiativeBonus: 1,
    attacks: [
      {
        name: 'Greataxe',
        attackBonus: 5,
        damageDice: '1d12+3',
        damageType: 'slashing',
        range: 'melee',
      },
    ],
    multiattackCount: 1,
    xp: 100,
    flavor: 'A brutish warrior wielding a massive axe.',
    iconHint: 'orc',
  },
  ghoul: {
    id: 'ghoul',
    name: 'Ghoul',
    cr: 1,
    ac: 12,
    maxHP: 22,
    speed: 30,
    abilityScores: {
      strength: 13,
      dexterity: 15,
      constitution: 10,
      intelligence: 7,
      wisdom: 10,
      charisma: 6,
    },
    initiativeBonus: 2,
    attacks: [
      {
        name: 'Claws',
        attackBonus: 4,
        damageDice: '2d4+2',
        damageType: 'slashing',
        range: 'melee',
      },
    ],
    multiattackCount: 1,
    xp: 200,
    flavor: 'A pale, hungry undead with razor-sharp claws.',
    iconHint: 'ghoul',
  },
  bugbear: {
    id: 'bugbear',
    name: 'Bugbear',
    cr: 1,
    ac: 16,
    maxHP: 27,
    speed: 30,
    abilityScores: {
      strength: 15,
      dexterity: 14,
      constitution: 13,
      intelligence: 8,
      wisdom: 11,
      charisma: 9,
    },
    initiativeBonus: 2,
    attacks: [
      {
        name: 'Morningstar',
        attackBonus: 4,
        damageDice: '2d8+2',
        damageType: 'piercing',
        range: 'melee',
      },
    ],
    multiattackCount: 1,
    xp: 200,
    flavor: 'A massive goblinoid brute, terror of dark forests.',
    iconHint: 'bugbear',
  },
};

export function getEnemy(id: string): EnemyStatBlock {
  const e = ENEMIES[id];
  if (!e) throw new Error(`Unknown enemy: ${id}`);
  return e;
}

export interface EncounterTemplate {
  id: string;
  enemyIds: string[];
  description: string;
}

export const ENCOUNTERS: EncounterTemplate[] = [
  { id: 'lone_goblin', enemyIds: ['goblin'], description: 'A lone goblin scout' },
  { id: 'two_goblins', enemyIds: ['goblin', 'goblin'], description: 'A pair of goblins' },
  { id: 'skeleton_patrol', enemyIds: ['skeleton'], description: 'A wandering skeleton' },
  { id: 'orc_warband', enemyIds: ['orc'], description: 'A brutish orc warrior' },
  { id: 'goblin_skeleton', enemyIds: ['goblin', 'skeleton'], description: 'A goblin and its undead pet' },
  { id: 'lone_ghoul', enemyIds: ['ghoul'], description: 'A hungry ghoul' },
  { id: 'bugbear_lair', enemyIds: ['bugbear'], description: 'A bugbear in its lair' },
];

export function randomEncounter(): EncounterTemplate {
  const idx = Math.floor(Math.random() * ENCOUNTERS.length);
  return ENCOUNTERS[idx];
}
