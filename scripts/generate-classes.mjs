/**
 * Reads all 12 class markdown files from the vitusventure/5thSRD archive and
 * generates src/data/classes.ts with full level-progression tables.
 *
 * Usage: node scripts/generate-classes.mjs [path-to-classes-dir]
 * Default dir: /tmp/5thSRD-master/docs/character/classes
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'src', 'data', 'classes.ts');
const CLASSES_DIR =
  process.argv[2] ?? '/tmp/5thSRD-master/docs/character/classes';

// Ordinal names → slot level number (1st → 1, 2nd → 2, etc.)
const ORDINAL_TO_NUM = {
  '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5,
  '6th': 6, '7th': 7, '8th': 8, '9th': 9,
};

// Spellcasting ability per class (from SRD)
const SPELLCASTING_ABILITY = {
  barbarian: null,
  bard: 'charisma',
  cleric: 'wisdom',
  druid: 'wisdom',
  fighter: null,
  monk: null,
  paladin: 'charisma',
  ranger: 'wisdom',
  rogue: null,
  sorcerer: 'charisma',
  warlock: 'charisma',
  wizard: 'intelligence',
};

// ── Parsing helpers ──────────────────────────────────────────────────────────

function parseHitDie(md) {
  const m = md.match(/\*\*Hit Dice:\*\*\s+1d(\d+)/);
  return m ? parseInt(m[1], 10) : 8;
}

function parseSavingThrows(md) {
  const m = md.match(/\*\*Saving Throws:\*\*\s+([^\n]+)/);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function parseTable(md) {
  // Find the first markdown table (header | separator | rows)
  const tableRe = /(\|[^\n]+\|\s*\n\|[-| :]+\|\s*\n(?:\|[^\n]+\|\s*\n?)+)/;
  const tableMatch = md.match(tableRe);
  if (!tableMatch) return { headers: [], rows: [] };

  const lines = tableMatch[1].split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 3) return { headers: [], rows: [] };

  const headerLine = lines[0];
  // lines[1] is separator
  const dataLines = lines.slice(2);

  const parseRow = (line) =>
    line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());

  const headers = parseRow(headerLine).map((h) => h.toLowerCase().replace(/\s+/g, ' '));
  const rows = dataLines.map(parseRow).filter((r) => r.length === headers.length);

  return { headers, rows };
}

function parseOrdinalLevel(s) {
  return parseInt(s.replace(/[a-zA-Z]+$/, ''), 10);
}

function parseProfBonus(s) {
  return parseInt(s.replace('+', ''), 10) || 2;
}

function parseOptionalInt(s) {
  if (!s || s === '-' || s === '—') return undefined;
  const n = parseInt(s, 10);
  return isNaN(n) ? undefined : n;
}

function parseFeatures(s) {
  if (!s || s === '-' || s === '—') return [];
  return s
    .split(',')
    .map((f) => f.trim())
    .filter((f) => f && f !== '-' && f !== '—');
}

function parseClassTable(id, md) {
  const { headers, rows } = parseTable(md);
  if (!headers.length) return [];

  // Identify which column index each header maps to
  const idx = {};
  headers.forEach((h, i) => { idx[h] = i; });

  // Spell slot columns: ordinal headers like "1st", "2nd", etc.
  const slotCols = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => ORDINAL_TO_NUM[h] !== undefined);

  // Warlock special: has "spell slots" (count) and "slot level" columns
  const isWarlock = id === 'warlock';

  return rows.map((cells) => {
    const level = parseOrdinalLevel(cells[idx['level']] ?? '1st');
    const proficiencyBonus = parseProfBonus(cells[idx['proficiency bonus']] ?? '+2');
    const features = parseFeatures(cells[idx['features']] ?? '');

    // Spell slots
    const spellSlots = {};
    if (isWarlock) {
      const slotCount = parseOptionalInt(cells[idx['spell slots']]);
      const slotLevelStr = cells[idx['slot level']];
      const slotLevel = ORDINAL_TO_NUM[slotLevelStr?.trim()];
      if (slotCount && slotLevel) {
        spellSlots[slotLevel] = slotCount;
      }
    } else {
      for (const { h, i } of slotCols) {
        const n = parseOptionalInt(cells[i]);
        if (n != null) spellSlots[ORDINAL_TO_NUM[h]] = n;
      }
    }

    const entry = { level, proficiencyBonus, features, spellSlots };

    const cantripsKnown = parseOptionalInt(cells[idx['cantrips known']]);
    if (cantripsKnown != null) entry.cantripsKnown = cantripsKnown;

    const spellsKnown = parseOptionalInt(cells[idx['spells known']]);
    if (spellsKnown != null) entry.spellsKnown = spellsKnown;

    // Class-specific extra columns
    const extra = {};

    // Rogue: sneak attack
    const sneakAttack = cells[idx['sneak attack']];
    if (sneakAttack && sneakAttack !== '-') extra.sneakAttack = sneakAttack;

    // Barbarian: rages, rage damage
    const rages = cells[idx['rages']];
    if (rages) extra.rages = rages === 'Unlimited' || rages === 'unlimited' ? 'unlimited' : parseInt(rages, 10) || rages;
    const rageDamage = cells[idx['rage damage']];
    if (rageDamage && rageDamage !== '-') extra.rageDamage = rageDamage;

    // Monk: ki points, martial arts, unarmored movement
    const kiPoints = parseOptionalInt(cells[idx['ki points']]);
    if (kiPoints != null) extra.kiPoints = kiPoints;
    const martialArts = cells[idx['martial arts']];
    if (martialArts && martialArts !== '-') extra.martialArts = martialArts;
    const unarmoredMovement = cells[idx['unarmored movement']];
    if (unarmoredMovement && unarmoredMovement !== '-') extra.unarmoredMovement = unarmoredMovement;

    // Sorcerer: sorcery points
    const sorceryPoints = parseOptionalInt(cells[idx['sorcery points']]);
    if (sorceryPoints != null) extra.sorceryPoints = sorceryPoints;

    // Warlock: invocations known, slot count/level stored in extra too
    const invocationsKnown = parseOptionalInt(cells[idx['invocations known']]);
    if (invocationsKnown != null) extra.invocationsKnown = invocationsKnown;
    if (isWarlock) {
      const slotCount = parseOptionalInt(cells[idx['spell slots']]);
      const slotLevelStr = cells[idx['slot level']];
      const slotLevel = ORDINAL_TO_NUM[slotLevelStr?.trim()];
      if (slotCount != null) extra.warlockSlotCount = slotCount;
      if (slotLevel != null) extra.warlockSlotLevel = slotLevel;
    }

    if (Object.keys(extra).length) entry.extra = extra;

    return entry;
  });
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderSpellSlots(ss) {
  const entries = Object.entries(ss)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${k}: ${v}`);
  return entries.length ? `{ ${entries.join(', ')} }` : '{}';
}

function renderEntry(e) {
  const lines = [
    `level: ${e.level}`,
    `proficiencyBonus: ${e.proficiencyBonus}`,
    `features: ${JSON.stringify(e.features)}`,
    `spellSlots: ${renderSpellSlots(e.spellSlots)}`,
  ];
  if (e.cantripsKnown != null) lines.push(`cantripsKnown: ${e.cantripsKnown}`);
  if (e.spellsKnown != null) lines.push(`spellsKnown: ${e.spellsKnown}`);
  if (e.extra && Object.keys(e.extra).length) {
    const extraStr = Object.entries(e.extra)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? JSON.stringify(v) : v}`)
      .join(', ');
    lines.push(`extra: { ${extraStr} }`);
  }
  return `      { ${lines.join(', ')} }`;
}

function renderClass(c) {
  const progressionStr = c.progression.map(renderEntry).join(',\n');
  return `  ${c.id}: {
    id: '${c.id}',
    name: '${c.name}',
    hitDie: ${c.hitDie},
    averageHPPerLevel: ${c.averageHPPerLevel},
    spellcastingAbility: ${c.spellcastingAbility == null ? 'null' : `'${c.spellcastingAbility}'`},
    savingThrowProficiencies: ${JSON.stringify(c.savingThrowProficiencies)},
    progression: [\n${progressionStr}\n    ],
  }`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log(`Reading classes from: ${CLASSES_DIR}`);

  const CLASS_ORDER = [
    'barbarian', 'bard', 'cleric', 'druid',
    'fighter', 'monk', 'paladin', 'ranger',
    'rogue', 'sorcerer', 'warlock', 'wizard',
  ];

  const classes = [];

  for (const id of CLASS_ORDER) {
    const filePath = join(CLASSES_DIR, `${id}.md`);
    let md;
    try {
      md = readFileSync(filePath, 'utf8');
    } catch {
      console.warn(`  Skipping ${id}: file not found at ${filePath}`);
      continue;
    }

    const hitDie = parseHitDie(md);
    const savingThrowProficiencies = parseSavingThrows(md);
    const progression = parseClassTable(id, md);
    const spellcastingAbility = SPELLCASTING_ABILITY[id] ?? null;

    // Average HP per level = ceil(hitDie / 2) + 1, but for d6 = 4, d8 = 5, d10 = 6, d12 = 7
    const averageHPPerLevel = Math.floor(hitDie / 2) + 1;

    const nameMatch = md.match(/^#\s+The\s+(.+)$/m);
    const name = nameMatch ? nameMatch[1].trim() : id.charAt(0).toUpperCase() + id.slice(1);

    classes.push({ id, name, hitDie, averageHPPerLevel, spellcastingAbility, savingThrowProficiencies, progression });
    console.log(`  ${id}: hitDie=d${hitDie}, ${progression.length} levels, ${savingThrowProficiencies.join('/')} saves`);
  }

  const ts = `// Generated from vitusventure/5thSRD (SRD 5.1, CC-BY-4.0)
// Run \`npm run generate:classes\` to regenerate.

export type ClassId =
  | 'barbarian' | 'bard' | 'cleric' | 'druid'
  | 'fighter' | 'monk' | 'paladin' | 'ranger'
  | 'rogue' | 'sorcerer' | 'warlock' | 'wizard';

export interface SpellSlots {
  1?: number; 2?: number; 3?: number; 4?: number; 5?: number;
  6?: number; 7?: number; 8?: number; 9?: number;
}

export interface ClassLevelEntry {
  level: number;
  proficiencyBonus: number;
  features: string[];
  spellSlots: SpellSlots;
  cantripsKnown?: number;
  spellsKnown?: number;
  extra?: Record<string, string | number>;
}

export interface ClassData {
  id: ClassId;
  name: string;
  /** Size of the class hit die (6, 8, 10, or 12). */
  hitDie: number;
  /** Average HP gained per level after 1st (hitDie / 2 + 1). */
  averageHPPerLevel: number;
  spellcastingAbility: 'intelligence' | 'wisdom' | 'charisma' | null;
  savingThrowProficiencies: string[];
  /** 20 entries — index 0 is level 1, index 19 is level 20. */
  progression: ClassLevelEntry[];
}

export const CLASSES: Record<ClassId, ClassData> = {
${classes.map(renderClass).join(',\n')}
};

export function getClassData(id: ClassId): ClassData {
  return CLASSES[id];
}

/** Returns the spell slots available at the given character level. */
export function getSpellSlotsAtLevel(id: ClassId, level: number): SpellSlots {
  const entry = CLASSES[id]?.progression[level - 1];
  return entry?.spellSlots ?? {};
}

/** Returns the proficiency bonus for a given character level (any class). */
export function getProficiencyBonusFromLevel(level: number): number {
  return Math.ceil(level / 4) + 1;
}
`;

  writeFileSync(OUTPUT_PATH, ts, 'utf8');
  console.log(`\nWrote ${OUTPUT_PATH}`);
}

main();
