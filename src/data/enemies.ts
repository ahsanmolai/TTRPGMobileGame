import { AbilityScores, AbilityName } from 'src/engine/character';
import { DamageType } from 'src/data/weapons';
import { SRD_ENEMIES } from 'src/data/srdEnemies';

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

// SRD_ENEMIES is auto-generated from vitusventure/5thSRD via `npm run srd:sync`.
// Add hand-crafted entries here to override or supplement SRD data.
export const ENEMIES: Record<string, EnemyStatBlock> = {
  ...SRD_ENEMIES,
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
  // CR 1/8
  { id: 'lone_bandit', enemyIds: ['bandit'], description: 'A lone bandit on the road' },
  { id: 'lone_kobold', enemyIds: ['kobold'], description: 'A kobold scout' },
  // CR 1/4
  { id: 'lone_goblin', enemyIds: ['goblin'], description: 'A lone goblin scout' },
  { id: 'two_goblins', enemyIds: ['goblin', 'goblin'], description: 'A pair of goblins' },
  { id: 'skeleton_patrol', enemyIds: ['skeleton'], description: 'A wandering skeleton' },
  { id: 'lone_zombie', enemyIds: ['zombie'], description: 'A shambling zombie' },
  // CR 1/2
  { id: 'orc_warband', enemyIds: ['orc'], description: 'A brutish orc warrior' },
  { id: 'lone_hobgoblin', enemyIds: ['hobgoblin'], description: 'A disciplined hobgoblin soldier' },
  { id: 'lizardfolk_guard', enemyIds: ['lizardfolk'], description: 'A lizardfolk warrior' },
  // Mixed CR 1/4
  { id: 'goblin_skeleton', enemyIds: ['goblin', 'skeleton'], description: 'A goblin and its undead pet' },
  { id: 'zombie_horde', enemyIds: ['zombie', 'zombie'], description: 'Two shambling zombies' },
  // CR 1
  { id: 'lone_ghoul', enemyIds: ['ghoul'], description: 'A hungry ghoul' },
  { id: 'bugbear_lair', enemyIds: ['bugbear'], description: 'A bugbear in its lair' },
  { id: 'lone_specter', enemyIds: ['specter'], description: 'A haunting specter' },
  // CR 2
  { id: 'ghast_crypt', enemyIds: ['ghast'], description: 'A ghast lurking in a crypt' },
  { id: 'ogre_cave', enemyIds: ['ogre'], description: 'An ogre guarding its cave' },
  // CR 3
  { id: 'doppelganger_trap', enemyIds: ['doppelganger'], description: 'A doppelganger in disguise' },
  // CR 4
  { id: 'ettin_lair', enemyIds: ['ettin'], description: 'A two-headed ettin' },
  // CR 5
  { id: 'troll_bridge', enemyIds: ['troll'], description: 'A troll under the bridge' },
];

export function randomEncounter(): EncounterTemplate {
  const idx = Math.floor(Math.random() * ENCOUNTERS.length);
  return ENCOUNTERS[idx];
}

export function encountersByCR(maxCR: number): EncounterTemplate[] {
  return ENCOUNTERS.filter((enc) =>
    enc.enemyIds.every((id) => (ENEMIES[id]?.cr ?? 99) <= maxCR)
  );
}
