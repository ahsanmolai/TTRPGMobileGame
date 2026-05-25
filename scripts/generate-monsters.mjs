/**
 * Parses all monster markdown files from the vitusventure/5thSRD repo and generates
 * src/data/enemies.ts with the full SRD monster roster.
 *
 * Usage:
 *   # First time — download the archive:
 *   curl -sL https://github.com/vitusventure/5thSRD/archive/refs/heads/master.zip -o /tmp/5thsrd.zip
 *   cd /tmp && unzip -q 5thsrd.zip
 *
 *   # Then run:
 *   node scripts/generate-monsters.mjs [path-to-monsters-dir]
 *
 *   # Default monsters dir: /tmp/5thSRD-master/docs/gamemaster_rules/monsters
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'src', 'data', 'enemies.ts');
const MONSTERS_DIR =
  process.argv[2] ?? '/tmp/5thSRD-master/docs/gamemaster_rules/monsters';

const KNOWN_DAMAGE_TYPES = new Set([
  'slashing', 'piercing', 'bludgeoning',
  'fire', 'cold', 'thunder', 'necrotic', 'radiant',
  'acid', 'lightning', 'poison', 'psychic', 'force',
]);

const CR_MAP = { '1/8': 0.125, '1/4': 0.25, '1/2': 0.5 };

// ── Parsing helpers ──────────────────────────────────────────────────────────

function parseName(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function parseFlavor(md) {
  const m = md.match(/^_([^_\n]+)_\s*$/m);
  return m ? m[1].trim() : '';
}

function parseStatNumber(md, label) {
  const re = new RegExp(`\\*\\*${label}\\*\\*\\s+(\\d+)`);
  const m = md.match(re);
  return m ? parseInt(m[1], 10) : 0;
}

function parseAbilityScores(md) {
  // Match the data row of the 6-column ability score table
  // e.g. | 8 (−1) | 14 (+2) | 10 (+0) | 10 (+0) | 8 (−1) | 8 (−1) |
  const tableRe =
    /\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|\s*(\d+)\s*\([^)]+\)\s*\|/;
  const m = md.match(tableRe);
  if (!m) {
    return { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 };
  }
  return {
    strength: parseInt(m[1], 10),
    dexterity: parseInt(m[2], 10),
    constitution: parseInt(m[3], 10),
    intelligence: parseInt(m[4], 10),
    wisdom: parseInt(m[5], 10),
    charisma: parseInt(m[6], 10),
  };
}

function parseCR(md) {
  const m = md.match(/\*\*Challenge\*\*\s+([\d/]+)\s+\(([\d,]+)\s+XP\)/);
  if (!m) return { cr: 0, xp: 0 };
  const crRaw = m[1];
  const cr = CR_MAP[crRaw] !== undefined ? CR_MAP[crRaw] : parseFloat(crRaw);
  const xp = parseInt(m[2].replace(/,/g, ''), 10);
  return { cr, xp };
}

function normaliseDamageDice(expr) {
  // "1d6 + 2" → "1d6+2", handles unicode minus "−"
  return expr.replace(/\s+/g, '').replace(/−/g, '-');
}

function parseDamageType(typeStr) {
  const lower = typeStr.toLowerCase();
  for (const known of KNOWN_DAMAGE_TYPES) {
    if (lower.includes(known)) return known;
  }
  return 'bludgeoning';
}

function parseAttacks(md) {
  const actionsMatch = md.match(/###\s+Actions([\s\S]*?)(?:###|$)/);
  if (!actionsMatch) return [];

  const actionsText = actionsMatch[1];
  const attacks = [];

  // Match weapon attacks with +N to hit and a (dice) damage expression.
  // Uses dotAll + .*? to skip over "reach 5 ft., one target." without stopping at the period.
  const attackRe =
    /\*\*([^*\n]+?)\.\*\*\s+_?(Melee|Ranged) Weapon Attack:_?\s+\+(\d+) to hit.*?_Hit:_\s+\d+\s+\(([^)]+)\)\s+([\w]+)\s+damage/gis;

  let match;
  while ((match = attackRe.exec(actionsText)) !== null) {
    const name = match[1].trim();
    const rangeType = match[2].toLowerCase() === 'melee' ? 'melee' : 'ranged';
    const attackBonus = parseInt(match[3], 10);
    const damageDice = normaliseDamageDice(match[4]);
    const damageType = parseDamageType(match[5]);
    attacks.push({ name, attackBonus, damageDice, damageType, range: rangeType });
  }

  return attacks;
}

function parseMultiattackCount(md, attackCount) {
  if (!/\*\*Multiattack\.\*\*/i.test(md)) return 1;

  // Try "makes N attacks", "makes one bite and two claws" style
  const numericM = md.match(/\*\*Multiattack\.\*\*[^.]*?(\d+)\s+attacks?/i);
  if (numericM) return parseInt(numericM[1], 10);

  const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  const wordM = md.match(/\*\*Multiattack\.\*\*[^.]*?\b(one|two|three|four|five)\b[^.]*?attacks?/i);
  if (wordM) return wordMap[wordM[1].toLowerCase()] ?? 2;

  return attackCount > 1 ? attackCount : 2;
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderMonster(m) {
  const as = m.abilityScores;
  const abilityScoresStr =
    `{\n      strength: ${as.strength},\n      dexterity: ${as.dexterity},\n      constitution: ${as.constitution},\n      intelligence: ${as.intelligence},\n      wisdom: ${as.wisdom},\n      charisma: ${as.charisma},\n    }`;

  const attacksStr =
    m.attacks.length === 0
      ? '[]'
      : `[\n${m.attacks
          .map(
            (a) =>
              `      { name: ${JSON.stringify(a.name)}, attackBonus: ${a.attackBonus}, damageDice: ${JSON.stringify(a.damageDice)}, damageType: '${a.damageType}', range: '${a.range}' }`
          )
          .join(',\n')},\n    ]`;

  return `  ${JSON.stringify(m.id)}: {
    id: ${JSON.stringify(m.id)},
    name: ${JSON.stringify(m.name)},
    cr: ${m.cr},
    ac: ${m.ac},
    maxHP: ${m.maxHP},
    speed: ${m.speed},
    abilityScores: ${abilityScoresStr},
    initiativeBonus: ${m.initiativeBonus},
    attacks: ${attacksStr},
    multiattackCount: ${m.multiattackCount},
    xp: ${m.xp},
    flavor: ${JSON.stringify(m.flavor)},
    iconHint: ${JSON.stringify(m.iconHint)},
  }`;
}

function buildEncounters(monsterIds) {
  const candidates = [
    { id: 'lone_goblin', enemyIds: ['goblin'], description: 'A lone goblin scout' },
    { id: 'two_goblins', enemyIds: ['goblin', 'goblin'], description: 'A pair of goblins' },
    { id: 'skeleton_patrol', enemyIds: ['skeleton'], description: 'A wandering skeleton' },
    { id: 'orc_warband', enemyIds: ['orc'], description: 'A brutish orc warrior' },
    { id: 'goblin_skeleton', enemyIds: ['goblin', 'skeleton'], description: 'A goblin and its undead pet' },
    { id: 'lone_ghoul', enemyIds: ['ghoul'], description: 'A hungry ghoul' },
    { id: 'bugbear_lair', enemyIds: ['bugbear'], description: 'A bugbear in its lair' },
    { id: 'troll_ambush', enemyIds: ['troll'], description: 'A regenerating troll' },
    { id: 'werewolf_hunt', enemyIds: ['werewolf'], description: 'A werewolf on the hunt' },
    { id: 'vampire_spawn_lair', enemyIds: ['vampire_spawn'], description: 'A ravenous vampire spawn' },
    { id: 'young_red_dragon_den', enemyIds: ['young_red_dragon'], description: 'A young red dragon in its den' },
    { id: 'hill_giant_camp', enemyIds: ['hill_giant'], description: 'A lumbering hill giant' },
    { id: 'lich_sanctum', enemyIds: ['lich'], description: 'A lich in its sanctum' },
    { id: 'bandit_ambush', enemyIds: ['bandit', 'bandit_captain'], description: 'Bandits with their captain' },
    { id: 'zombie_horde', enemyIds: ['zombie', 'zombie'], description: 'A shambling pair of zombies' },
  ];
  return candidates.filter((e) => e.enemyIds.every((id) => monsterIds.has(id)));
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log(`Reading monsters from: ${MONSTERS_DIR}`);

  const files = readdirSync(MONSTERS_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'index.md');

  console.log(`Found ${files.length} monster files.`);

  const monsters = [];
  let skipped = 0;

  for (const file of files) {
    const id = file.replace('.md', '');
    const md = readFileSync(join(MONSTERS_DIR, file), 'utf8');
    const name = parseName(md);
    if (!name) { skipped++; continue; }

    const ac = parseStatNumber(md, 'Armor Class');
    const maxHP = parseStatNumber(md, 'Hit Points');
    const speed = parseStatNumber(md, 'Speed');
    const abilityScores = parseAbilityScores(md);
    const { cr, xp } = parseCR(md);
    const attacks = parseAttacks(md);
    const multiattackCount = parseMultiattackCount(md, attacks.length);
    const initiativeBonus = Math.floor((abilityScores.dexterity - 10) / 2);
    const flavor = parseFlavor(md);

    monsters.push({
      id, name, cr,
      ac: ac || 10,
      maxHP: maxHP || 1,
      speed: speed || 30,
      abilityScores,
      initiativeBonus,
      attacks,
      multiattackCount,
      xp,
      flavor,
      iconHint: id,
    });
  }

  console.log(`Parsed ${monsters.length} monsters (${skipped} skipped).`);

  const monsterIdSet = new Set(monsters.map((m) => m.id));
  const encounters = buildEncounters(monsterIdSet);

  const ts = `import { AbilityScores, AbilityName } from 'src/engine/character';
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
  multiattackCount: number;
  xp: number;
  flavor: string;
  iconHint: string;
}

// Generated from vitusventure/5thSRD — ${monsters.length} monsters (SRD 5.1, CC-BY-4.0)
export const ENEMIES: Record<string, EnemyStatBlock> = {
${monsters.map(renderMonster).join(',\n')}
};

export function getEnemy(id: string): EnemyStatBlock {
  const e = ENEMIES[id];
  if (!e) throw new Error(\`Unknown enemy: \${id}\`);
  return e;
}

export interface EncounterTemplate {
  id: string;
  enemyIds: string[];
  description: string;
}

export const ENCOUNTERS: EncounterTemplate[] = ${JSON.stringify(encounters, null, 2)};

export function randomEncounter(): EncounterTemplate {
  const idx = Math.floor(Math.random() * ENCOUNTERS.length);
  return ENCOUNTERS[idx];
}
`;

  writeFileSync(OUTPUT_PATH, ts, 'utf8');
  console.log(`Wrote ${OUTPUT_PATH}`);

  // Spot-check
  const checks = ['goblin', 'troll', 'zombie', 'ancient_red_dragon', 'lich'];
  console.log('\nSpot-check:');
  for (const id of checks) {
    const m = monsters.find((x) => x.id === id);
    if (m) {
      console.log(`  ${id}: CR ${m.cr}, AC ${m.ac}, HP ${m.maxHP}, ${m.attacks.length} attack(s), multiattack: ${m.multiattackCount}`);
    } else {
      console.log(`  ${id}: NOT FOUND`);
    }
  }

  // CR distribution summary
  const byCR = {};
  for (const m of monsters) {
    byCR[m.cr] = (byCR[m.cr] ?? 0) + 1;
  }
  console.log('\nCR distribution:');
  Object.keys(byCR).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach((cr) => {
    console.log(`  CR ${cr}: ${byCR[cr]} monster(s)`);
  });
}

main();
