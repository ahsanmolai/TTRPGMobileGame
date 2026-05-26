// Structured spellcasting rules derived from SRD 5.1 (CC-BY-4.0).
// Encodes the game-relevant mechanics for each class's relationship with spells.
import { ClassId } from 'src/data/classes';

/**
 * How a class determines which spells it can currently cast:
 * - known:    Fixed list of spells known; always available (Bard, Ranger, Sorcerer, Warlock)
 * - prepared: Choose a subset each long rest from a full class list (Cleric, Druid, Paladin, Wizard)
 * - none:     No spellcasting (Barbarian, Fighter, Monk, Rogue — unless subclass grants it)
 */
export type SpellPreparationStyle = 'known' | 'prepared' | 'none';

/**
 * When a class regains expended spell slots:
 * - long_rest:  All slots return after a long rest (most classes)
 * - short_rest: Pact Magic slots (Warlock only) return on a short OR long rest
 */
export type SlotRecovery = 'long_rest' | 'short_rest';

/**
 * Formula used to calculate the number of spells a 'prepared' class can prepare:
 * - ability_mod_plus_level:      spellcasting ability modifier + character level (Cleric, Druid, Wizard)
 * - ability_mod_plus_half_level: spellcasting ability modifier + floor(character level / 2) (Paladin)
 */
export type PreparationFormula =
  | 'ability_mod_plus_level'
  | 'ability_mod_plus_half_level';

export interface ClassSpellcastingRules {
  preparationStyle: SpellPreparationStyle;
  slotRecovery: SlotRecovery;
  /** Only set when preparationStyle === 'prepared'. */
  preparationFormula?: PreparationFormula;
  /**
   * Wizards can cast ritual spells directly from their spellbook without
   * having them prepared (other prepared casters still need the spell prepared).
   */
  ritualWithoutPreparing: boolean;
  /** True for Warlock (Pact Magic): all slots are the same level. */
  pactMagic: boolean;
}

export const SPELLCASTING_RULES: Record<ClassId, ClassSpellcastingRules> = {
  barbarian: {
    preparationStyle: 'none',
    slotRecovery: 'long_rest',
    ritualWithoutPreparing: false,
    pactMagic: false,
  },
  bard: {
    preparationStyle: 'known',
    slotRecovery: 'long_rest',
    ritualWithoutPreparing: false,
    pactMagic: false,
  },
  cleric: {
    preparationStyle: 'prepared',
    slotRecovery: 'long_rest',
    preparationFormula: 'ability_mod_plus_level',
    ritualWithoutPreparing: false,
    pactMagic: false,
  },
  druid: {
    preparationStyle: 'prepared',
    slotRecovery: 'long_rest',
    preparationFormula: 'ability_mod_plus_level',
    ritualWithoutPreparing: false,
    pactMagic: false,
  },
  fighter: {
    preparationStyle: 'none',
    slotRecovery: 'long_rest',
    ritualWithoutPreparing: false,
    pactMagic: false,
  },
  monk: {
    preparationStyle: 'none',
    slotRecovery: 'long_rest',
    ritualWithoutPreparing: false,
    pactMagic: false,
  },
  paladin: {
    preparationStyle: 'prepared',
    slotRecovery: 'long_rest',
    preparationFormula: 'ability_mod_plus_half_level',
    ritualWithoutPreparing: false,
    pactMagic: false,
  },
  ranger: {
    preparationStyle: 'known',
    slotRecovery: 'long_rest',
    ritualWithoutPreparing: false,
    pactMagic: false,
  },
  rogue: {
    preparationStyle: 'none',
    slotRecovery: 'long_rest',
    ritualWithoutPreparing: false,
    pactMagic: false,
  },
  sorcerer: {
    preparationStyle: 'known',
    slotRecovery: 'long_rest',
    ritualWithoutPreparing: false,
    pactMagic: false,
  },
  warlock: {
    preparationStyle: 'known',
    slotRecovery: 'short_rest',
    ritualWithoutPreparing: false,
    pactMagic: true,
  },
  wizard: {
    preparationStyle: 'prepared',
    slotRecovery: 'long_rest',
    preparationFormula: 'ability_mod_plus_level',
    ritualWithoutPreparing: true,
    pactMagic: false,
  },
};

/**
 * Returns the maximum number of spells a prepared-caster can have prepared.
 * Returns null for 'known' and 'none' classes.
 */
export function getMaxPreparedSpells(
  classId: ClassId,
  level: number,
  spellcastingAbilityModifier: number
): number | null {
  const rules = SPELLCASTING_RULES[classId];
  if (rules.preparationStyle !== 'prepared') return null;
  if (rules.preparationFormula === 'ability_mod_plus_half_level') {
    return Math.max(1, spellcastingAbilityModifier + Math.floor(level / 2));
  }
  return Math.max(1, spellcastingAbilityModifier + level);
}

/**
 * Key spellcasting concepts encoded as reference data.
 * Useful for displaying rules to the player in-app.
 */
export const SPELLCASTING_CONCEPTS = {
  cantrip: {
    name: 'Cantrip',
    summary: 'Level-0 spells cast at will — no spell slot required.',
  },
  concentration: {
    name: 'Concentration',
    summary:
      'Only one concentration spell can be active at a time. Taking damage requires a CON save (DC 10 or half damage taken, whichever is higher) to maintain it.',
  },
  higherLevel: {
    name: 'Casting at a Higher Level',
    summary:
      'You can expend a higher-level slot to cast a lower-level spell, gaining additional power if the spell has an upcast clause.',
  },
  ritual: {
    name: 'Ritual Casting',
    summary:
      'A spell with the ritual tag can be cast without a slot if you take 10 extra minutes. Clerics and druids need the spell prepared; wizards can ritual-cast any spell in their spellbook.',
  },
  shortRest: {
    name: 'Short Rest Recovery',
    summary:
      'Warlocks regain all Pact Magic slots on a short or long rest. Wizards can use Arcane Recovery once per day on a short rest to regain slots with combined level ≤ half wizard level (max 5th level slots).',
  },
  longRest: {
    name: 'Long Rest Recovery',
    summary:
      'All spell slots are fully restored after a long rest (except Warlock, which recovers on a short rest).',
  },
} as const;
