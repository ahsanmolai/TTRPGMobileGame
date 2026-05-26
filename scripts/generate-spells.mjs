/**
 * Reads all 320 spell markdown files from the vitusventure/5thSRD archive and
 * generates src/data/spellMetadata.ts with spell metadata and class spell lists.
 *
 * Usage: node scripts/generate-spells.mjs [path-to-spells-dir]
 * Default dir: /tmp/5thSRD-master/docs/spellcasting/spells
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'src', 'data', 'spellMetadata.ts');
const SPELLS_DIR =
  process.argv[2] ?? '/tmp/5thSRD-master/docs/spellcasting/spells';

const KNOWN_CLASSES = new Set([
  'barbarian', 'bard', 'cleric', 'druid',
  'fighter', 'monk', 'paladin', 'ranger',
  'rogue', 'sorcerer', 'warlock', 'wizard',
]);

const SCHOOL_NAMES = new Set([
  'abjuration', 'conjuration', 'divination', 'enchantment',
  'evocation', 'illusion', 'necromancy', 'transmutation',
]);

// ── Parsing helpers ──────────────────────────────────────────────────────────

function parseFrontMatter(md) {
  // YAML-like front matter at the top: key: value, possibly multi-line for classes
  const result = {};

  // name
  const nameM = md.match(/^name:\s*(.+)$/m);
  if (nameM) result.name = nameM[1].trim();

  // level
  const levelM = md.match(/^level:\s*(\d+)$/m);
  if (levelM) result.level = parseInt(levelM[1], 10);

  // school
  const schoolM = md.match(/^school:\s*(\w+)$/m);
  if (schoolM) result.school = schoolM[1].trim().toLowerCase();

  // classes — may be on one line ("classes: sorcerer wizard") or multi-line
  // Multi-line format:
  //   classes: sorcerer
  //            wizard
  const classesM = md.match(/^classes:\s*([\s\S]*?)(?=\n\S|\n#|\Z)/m);
  if (classesM) {
    result.classes = classesM[1]
      .split(/[\s,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => KNOWN_CLASSES.has(s));
  }

  return result;
}

function parseName(md) {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function parseCastingTime(md) {
  const m = md.match(/\*\*Casting Time:\*\*\s+([^\n]+)/);
  if (!m) return 'action';
  const val = m[1].toLowerCase();
  if (val.includes('bonus action')) return 'bonus_action';
  if (val.includes('reaction')) return 'reaction';
  if (val.includes('minute') || val.includes('hour')) return 'ritual_long';
  return 'action';
}

function parseConcentration(md) {
  return /\*\*Duration:\*\*.*Concentration/i.test(md);
}

function parseRange(md) {
  const m = md.match(/\*\*Range:\*\*\s+([^\n]+)/);
  return m ? m[1].trim() : 'varies';
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log(`Reading spells from: ${SPELLS_DIR}`);

  const files = readdirSync(SPELLS_DIR).filter(
    (f) => f.endsWith('.md') && f !== 'index.md'
  );
  console.log(`Found ${files.length} spell files.`);

  const spells = [];
  let skipped = 0;

  for (const file of files) {
    const id = file.replace('.md', '');
    const md = readFileSync(join(SPELLS_DIR, file), 'utf8');
    const fm = parseFrontMatter(md);

    // Fall back to parsing the markdown heading if front matter name missing
    const name = fm.name ?? parseName(md);
    if (!name) { skipped++; continue; }

    const level = fm.level ?? 0;
    const school = SCHOOL_NAMES.has(fm.school ?? '') ? fm.school : 'evocation';
    const classes = fm.classes ?? [];
    const castingTime = parseCastingTime(md);
    const concentration = parseConcentration(md);
    const range = parseRange(md);

    spells.push({ id, name, level, school, classes, castingTime, concentration, range });
  }

  spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  console.log(`Parsed ${spells.length} spells (${skipped} skipped).`);

  // Build class spell lists
  const CLASS_ORDER = [
    'barbarian', 'bard', 'cleric', 'druid',
    'fighter', 'monk', 'paladin', 'ranger',
    'rogue', 'sorcerer', 'warlock', 'wizard',
  ];
  const classLists = {};
  for (const cls of CLASS_ORDER) classLists[cls] = [];
  for (const spell of spells) {
    for (const cls of spell.classes) {
      if (classLists[cls]) classLists[cls].push(spell.id);
    }
  }

  // Stats
  const byLevel = {};
  for (const s of spells) byLevel[s.level] = (byLevel[s.level] ?? 0) + 1;
  console.log('Spell count by level:');
  Object.keys(byLevel).sort((a, b) => +a - +b).forEach((l) =>
    console.log(`  Level ${l}: ${byLevel[l]}`)
  );

  const spellEntries = spells.map((s) => {
    return `  ${JSON.stringify(s.id)}: {
    id: ${JSON.stringify(s.id)},
    name: ${JSON.stringify(s.name)},
    level: ${s.level},
    school: '${s.school}',
    castingTime: '${s.castingTime}',
    concentration: ${s.concentration},
    range: ${JSON.stringify(s.range)},
    classes: ${JSON.stringify(s.classes)},
  }`;
  });

  const classListEntries = CLASS_ORDER.map(
    (cls) => `  ${cls}: ${JSON.stringify(classLists[cls])}`
  );

  const ts = `// Generated from vitusventure/5thSRD (SRD 5.1, CC-BY-4.0)
// Run \`npm run generate:spells\` to regenerate.
import { ClassId } from 'src/data/classes';

export type SpellSchool =
  | 'abjuration' | 'conjuration' | 'divination' | 'enchantment'
  | 'evocation' | 'illusion' | 'necromancy' | 'transmutation';

export type CastingTime = 'action' | 'bonus_action' | 'reaction' | 'ritual_long';

export interface SpellMeta {
  id: string;
  name: string;
  /** 0 = cantrip, 1–9 = spell level. */
  level: number;
  school: SpellSchool;
  castingTime: CastingTime;
  concentration: boolean;
  range: string;
  /** Classes that have this spell on their spell list. */
  classes: ClassId[];
}

// ${spells.length} SRD spells indexed by id (filename without .md)
export const SPELL_METADATA: Record<string, SpellMeta> = {
${spellEntries.join(',\n')}
};

/** Spell ids available to each class, sorted by level then name. */
export const CLASS_SPELL_LISTS: Record<ClassId, string[]> = {
${classListEntries.join(',\n')}
};

export function getSpellMeta(id: string): SpellMeta | undefined {
  return SPELL_METADATA[id];
}

export function getClassSpellList(classId: ClassId, maxLevel?: number): SpellMeta[] {
  const ids = CLASS_SPELL_LISTS[classId] ?? [];
  const spells = ids.map((id) => SPELL_METADATA[id]).filter(Boolean);
  return maxLevel != null ? spells.filter((s) => s.level <= maxLevel) : spells;
}

export function cantripsForClass(classId: ClassId): SpellMeta[] {
  return getClassSpellList(classId, 0);
}
`;

  writeFileSync(OUTPUT_PATH, ts, 'utf8');
  console.log(`\nWrote ${OUTPUT_PATH}`);
}

main();
