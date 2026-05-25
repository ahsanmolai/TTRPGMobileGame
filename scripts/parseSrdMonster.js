'use strict';

const WORD_TO_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

const ALL_DAMAGE_TYPES =
  'slashing|piercing|bludgeoning|fire|cold|thunder|necrotic|radiant|poison|acid|lightning|force|psychic';

// The 5thSRD repo has no --- fences; frontmatter is bare key:value lines before the # heading.
function parseFrontmatter(markdown) {
  const headingIdx = markdown.search(/^#/m);
  const header = headingIdx > 0 ? markdown.slice(0, headingIdx) : markdown;
  const result = {};
  for (const line of header.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (key && val) result[key] = val;
  }
  return result;
}

// CR may be an integer ("5"), a bare decimal (".25", ".125"), or a fraction ("1/4").
function parseCR(raw) {
  if (!raw) return 0;
  const s = String(raw).trim();
  if (s.includes('/')) {
    const [n, d] = s.split('/');
    return parseInt(n, 10) / parseInt(d, 10);
  }
  return parseFloat(s) || 0;
}

function parseAC(markdown) {
  const m = markdown.match(/\*\*Armor Class\*\*\s+(\d+)/);
  return m ? parseInt(m[1], 10) : 10;
}

function parseHP(markdown) {
  const m = markdown.match(/\*\*Hit Points\*\*\s+(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

function parseSpeed(markdown) {
  const m = markdown.match(/\*\*Speed\*\*\s+(\d+)\s*ft/);
  return m ? parseInt(m[1], 10) : 30;
}

function parseAbilityScores(markdown) {
  // Header row then separator then value row, e.g.:
  // | STR     | DEX     | ...
  // |---------|---------|
  // | 8 (−1)  | 14 (+2) | ...
  const m = markdown.match(
    /\|\s*STR\s*\|[^\n]*\n[^\n]*\n\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|/
  );
  if (!m) return null;
  // parseInt stops at the first non-numeric character after optional whitespace, safely
  // extracting the score from " 8 (−1) " or " 14 (+2) ".
  const toScore = (cell) => parseInt(cell.trim(), 10) || 10;
  return {
    strength: toScore(m[1]),
    dexterity: toScore(m[2]),
    constitution: toScore(m[3]),
    intelligence: toScore(m[4]),
    wisdom: toScore(m[5]),
    charisma: toScore(m[6]),
  };
}

function getModifier(score) {
  return Math.floor((score - 10) / 2);
}

function parseXP(markdown) {
  const m = markdown.match(/\*\*Challenge\*\*[^(]*\(([0-9,]+)\s*XP\)/i);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : 0;
}

// Attack lines in 5thSRD use **double-bold** names and _underscore_ italics:
//   **Scimitar.** _Melee Weapon Attack:_ +4 to hit ... _Hit:_ 5 (1d6 + 2) slashing damage.
const ATTACK_RE = new RegExp(
  '\\*\\*([^*\\n]+?)\\.\\*\\*[^\\n]*_(Melee|Ranged)[^\\n]*Attack:_[^\\n]*?([+\\-]\\d+)\\s+to hit[^\\n]*_Hit:_[^\\n(]*\\(([^)\\n]+)\\)\\s*(' +
    ALL_DAMAGE_TYPES +
    ')',
  'gi'
);

function parseAttacks(markdown) {
  const attacks = [];
  ATTACK_RE.lastIndex = 0;
  let m;
  while ((m = ATTACK_RE.exec(markdown)) !== null) {
    const [, name, rangeWord, bonusStr, rawDice, damageType] = m;
    // Normalize dice: "1d6 + 2" → "1d6+2"; replace Unicode minus with ASCII minus
    const damageDice = rawDice.replace(/\s+/g, '').replace(/−/g, '-');
    attacks.push({
      name: name.trim(),
      attackBonus: parseInt(bonusStr, 10),
      damageDice,
      damageType: damageType.toLowerCase(),
      range: rangeWord.toLowerCase() === 'melee' ? 'melee' : 'ranged',
    });
  }
  return attacks;
}

// Multiattack line: **Multiattack.** The X makes three attacks...
function parseMultiattackCount(markdown) {
  const m = markdown.match(
    /\*\*Multiattack\.\*\*[^\n]*?makes\s+(\w+)(?:\s+(?:melee|ranged|weapon))?\s+attacks?/i
  );
  if (!m) return 1;
  const word = m[1].toLowerCase();
  return WORD_TO_NUM[word] || parseInt(word, 10) || 1;
}

// Flavor is the first _italic_ or *italic* line after the # heading.
function parseFlavor(markdown) {
  const m = markdown.match(/^#[^\n]+\n+[_*]([^_*\n]+)[_*]/m);
  return m ? m[1].trim() : '';
}

// Map the SRD creature type field (may include subtype like "humanoid (goblinoid)")
// to a short iconHint string.
function typeToIconHint(type) {
  const known = [
    'humanoid', 'undead', 'beast', 'giant', 'fiend', 'aberration',
    'dragon', 'fey', 'monstrosity', 'construct', 'elemental', 'ooze',
    'plant', 'celestial',
  ];
  const base = (type || '').split(/[\s(]/)[0].toLowerCase();
  return known.includes(base) ? base : base || 'monster';
}

/**
 * Parse one SRD monster Markdown file into an EnemyStatBlock-shaped plain object.
 * Returns null if critical fields (ability scores) cannot be parsed.
 */
function parseMonster(slug, markdown) {
  const fm = parseFrontmatter(markdown);
  const name = fm.name || slug;
  const cr = parseCR(fm.cr);
  const type = fm.type || '';

  const ac = parseAC(markdown);
  const maxHP = parseHP(markdown);
  const speed = parseSpeed(markdown);
  const xp = parseXP(markdown);

  const abilityScores = parseAbilityScores(markdown);
  if (!abilityScores) return null;

  const initiativeBonus = getModifier(abilityScores.dexterity);

  let attacks = parseAttacks(markdown);
  if (attacks.length === 0) {
    // Fallback unarmed strike derived from STR
    const strMod = getModifier(abilityScores.strength);
    const bonus = strMod + 2; // assume proficiency +2
    const diceMod = strMod !== 0 ? `${strMod >= 0 ? '+' : ''}${strMod}` : '';
    attacks = [{
      name: 'Strike',
      attackBonus: bonus,
      damageDice: `1d6${diceMod}`,
      damageType: 'bludgeoning',
      range: 'melee',
    }];
  }

  const multiattackCount = parseMultiattackCount(markdown);
  const flavor = parseFlavor(markdown) || `A ${typeToIconHint(type)}.`;

  return {
    id: slug,
    name,
    cr,
    ac,
    maxHP,
    speed,
    abilityScores,
    initiativeBonus,
    attacks,
    multiattackCount,
    xp,
    flavor,
    iconHint: typeToIconHint(type),
  };
}

module.exports = { parseMonster };
