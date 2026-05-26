// Generated from vitusventure/5thSRD (SRD 5.1, CC-BY-4.0)
// Run `npm run generate:classes` to regenerate.

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
  barbarian: {
    id: 'barbarian',
    name: 'Barbarian',
    hitDie: 12,
    averageHPPerLevel: 7,
    spellcastingAbility: null,
    savingThrowProficiencies: ["strength","constitution"],
    progression: [
      { level: 1, proficiencyBonus: 2, features: ["Rage","Unarmored Defense"], spellSlots: {}, extra: { rages: 2, rageDamage: "+2" } },
      { level: 2, proficiencyBonus: 2, features: ["Reckless Attack","Danger Sense"], spellSlots: {}, extra: { rages: 2, rageDamage: "+2" } },
      { level: 3, proficiencyBonus: 2, features: ["Primal Path"], spellSlots: {}, extra: { rages: 3, rageDamage: "+2" } },
      { level: 4, proficiencyBonus: 2, features: ["Ability Score Improvement"], spellSlots: {}, extra: { rages: 3, rageDamage: "+2" } },
      { level: 5, proficiencyBonus: 3, features: ["Extra Attack","Fast Movement"], spellSlots: {}, extra: { rages: 3, rageDamage: "+2" } },
      { level: 6, proficiencyBonus: 3, features: ["Path feature"], spellSlots: {}, extra: { rages: 4, rageDamage: "+2" } },
      { level: 7, proficiencyBonus: 3, features: ["Feral Instinct"], spellSlots: {}, extra: { rages: 4, rageDamage: "+2" } },
      { level: 8, proficiencyBonus: 3, features: ["Ability Score Improvement"], spellSlots: {}, extra: { rages: 4, rageDamage: "+2" } },
      { level: 9, proficiencyBonus: 4, features: ["Brutal Critical (1 die)"], spellSlots: {}, extra: { rages: 4, rageDamage: "+3" } },
      { level: 10, proficiencyBonus: 4, features: ["Path feature"], spellSlots: {}, extra: { rages: 4, rageDamage: "+3" } },
      { level: 11, proficiencyBonus: 4, features: ["Relentless"], spellSlots: {}, extra: { rages: 4, rageDamage: "+3" } },
      { level: 12, proficiencyBonus: 4, features: ["Ability Score Improvement"], spellSlots: {}, extra: { rages: 5, rageDamage: "+3" } },
      { level: 13, proficiencyBonus: 5, features: ["Brutal Critical (2 dice)"], spellSlots: {}, extra: { rages: 5, rageDamage: "+3" } },
      { level: 14, proficiencyBonus: 5, features: ["Path Feature"], spellSlots: {}, extra: { rages: 5, rageDamage: "+3" } },
      { level: 15, proficiencyBonus: 5, features: ["Persistent Rage"], spellSlots: {}, extra: { rages: 5, rageDamage: "+3" } },
      { level: 16, proficiencyBonus: 5, features: ["Ability Score Improvement"], spellSlots: {}, extra: { rages: 5, rageDamage: "+4" } },
      { level: 17, proficiencyBonus: 6, features: ["Brutal Critical (3 dice)"], spellSlots: {}, extra: { rages: 6, rageDamage: "+4" } },
      { level: 18, proficiencyBonus: 6, features: ["Indomitable Might"], spellSlots: {}, extra: { rages: 6, rageDamage: "+4" } },
      { level: 19, proficiencyBonus: 6, features: ["Ability Score Improvement"], spellSlots: {}, extra: { rages: 6, rageDamage: "+4" } },
      { level: 20, proficiencyBonus: 6, features: ["Primal Champion"], spellSlots: {}, extra: { rages: "unlimited", rageDamage: "+4" } }
    ],
  },
  bard: {
    id: 'bard',
    name: 'Bard',
    hitDie: 8,
    averageHPPerLevel: 5,
    spellcastingAbility: 'charisma',
    savingThrowProficiencies: ["dexterity","charisma"],
    progression: [
      { level: 1, proficiencyBonus: 2, features: ["Spellcasting","Bardic Inspiration (d6)"], spellSlots: { 1: 2 }, cantripsKnown: 2, spellsKnown: 4 },
      { level: 2, proficiencyBonus: 2, features: ["Jack of All Trades","Song of Rest (d6)"], spellSlots: { 1: 3 }, cantripsKnown: 2, spellsKnown: 5 },
      { level: 3, proficiencyBonus: 2, features: ["Bard College","Expertise"], spellSlots: { 1: 4, 2: 2 }, cantripsKnown: 2, spellsKnown: 6 },
      { level: 4, proficiencyBonus: 2, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3 }, cantripsKnown: 3, spellsKnown: 7 },
      { level: 5, proficiencyBonus: 3, features: ["Bardic Inspiration (d8)","Font of Inspiration"], spellSlots: { 1: 4, 2: 3, 3: 2 }, cantripsKnown: 3, spellsKnown: 8 },
      { level: 6, proficiencyBonus: 3, features: ["Countercharm","Bard College feature"], spellSlots: { 1: 4, 2: 3, 3: 3 }, cantripsKnown: 3, spellsKnown: 9 },
      { level: 7, proficiencyBonus: 3, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 1 }, cantripsKnown: 3, spellsKnown: 10 },
      { level: 8, proficiencyBonus: 3, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 2 }, cantripsKnown: 3, spellsKnown: 11 },
      { level: 9, proficiencyBonus: 4, features: ["Song of Rest (d8)"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, cantripsKnown: 3, spellsKnown: 12 },
      { level: 10, proficiencyBonus: 4, features: ["Bardic Inspiration (d10)","Expertise","Magical Secrets"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, cantripsKnown: 4, spellsKnown: 14 },
      { level: 11, proficiencyBonus: 4, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }, cantripsKnown: 4, spellsKnown: 15 },
      { level: 12, proficiencyBonus: 4, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }, cantripsKnown: 4, spellsKnown: 15 },
      { level: 13, proficiencyBonus: 5, features: ["Song of Rest (d10)"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, cantripsKnown: 4, spellsKnown: 16 },
      { level: 14, proficiencyBonus: 5, features: ["Magical Secrets","Bard College feature"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, cantripsKnown: 4, spellsKnown: 18 },
      { level: 15, proficiencyBonus: 5, features: ["Bardic Inspiration (d12)"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, cantripsKnown: 4, spellsKnown: 19 },
      { level: 16, proficiencyBonus: 5, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, cantripsKnown: 4, spellsKnown: 19 },
      { level: 17, proficiencyBonus: 6, features: ["Song of Rest (d12)"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 }, cantripsKnown: 4, spellsKnown: 20 },
      { level: 18, proficiencyBonus: 6, features: ["Magical Secrets"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 }, cantripsKnown: 4, spellsKnown: 22 },
      { level: 19, proficiencyBonus: 6, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 }, cantripsKnown: 4, spellsKnown: 22 },
      { level: 20, proficiencyBonus: 6, features: ["Superior Inspiration"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, cantripsKnown: 4, spellsKnown: 22 }
    ],
  },
  cleric: {
    id: 'cleric',
    name: 'Cleric',
    hitDie: 8,
    averageHPPerLevel: 5,
    spellcastingAbility: 'wisdom',
    savingThrowProficiencies: ["wisdom","charisma"],
    progression: [
      { level: 1, proficiencyBonus: 2, features: ["Spellcasting","Divine Domain"], spellSlots: { 1: 2 }, cantripsKnown: 3 },
      { level: 2, proficiencyBonus: 2, features: ["Channel Divinity (1/rest)","Divine Domain feature"], spellSlots: { 1: 3 }, cantripsKnown: 3 },
      { level: 3, proficiencyBonus: 2, features: [], spellSlots: { 1: 4, 2: 2 }, cantripsKnown: 3 },
      { level: 4, proficiencyBonus: 2, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3 }, cantripsKnown: 4 },
      { level: 5, proficiencyBonus: 3, features: ["Destroy Undead (CR 1/2)"], spellSlots: { 1: 4, 2: 3, 3: 2 }, cantripsKnown: 4 },
      { level: 6, proficiencyBonus: 3, features: ["Channel Divinity (2/rest)","Divine Domain feature"], spellSlots: { 1: 4, 2: 3, 3: 3 }, cantripsKnown: 4 },
      { level: 7, proficiencyBonus: 3, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 1 }, cantripsKnown: 4 },
      { level: 8, proficiencyBonus: 3, features: ["Ability Score Improvement","Destroy Undead (CR 1)","Divine Domain feature"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 2 }, cantripsKnown: 4 },
      { level: 9, proficiencyBonus: 4, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, cantripsKnown: 4 },
      { level: 10, proficiencyBonus: 4, features: ["Divine Intervention"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, cantripsKnown: 5 },
      { level: 11, proficiencyBonus: 4, features: ["Destroy Undead (CR 2)"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }, cantripsKnown: 5 },
      { level: 12, proficiencyBonus: 4, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }, cantripsKnown: 5 },
      { level: 13, proficiencyBonus: 5, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, cantripsKnown: 5 },
      { level: 14, proficiencyBonus: 5, features: ["Destroy Undead (CR 3)"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, cantripsKnown: 5 },
      { level: 15, proficiencyBonus: 5, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, cantripsKnown: 5 },
      { level: 16, proficiencyBonus: 5, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, cantripsKnown: 5 },
      { level: 17, proficiencyBonus: 6, features: ["Destroy Undead (CR 4)","Divine Domain feature"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 }, cantripsKnown: 5 },
      { level: 18, proficiencyBonus: 6, features: ["Channel Divinity (3/rest)"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 }, cantripsKnown: 5 },
      { level: 19, proficiencyBonus: 6, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 }, cantripsKnown: 5 },
      { level: 20, proficiencyBonus: 6, features: ["Divine Intervention improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, cantripsKnown: 5 }
    ],
  },
  druid: {
    id: 'druid',
    name: 'Druid',
    hitDie: 8,
    averageHPPerLevel: 5,
    spellcastingAbility: 'wisdom',
    savingThrowProficiencies: ["intelligence","wisdom"],
    progression: [
      { level: 1, proficiencyBonus: 2, features: ["Druidic","Spellcasting"], spellSlots: { 1: 2 }, cantripsKnown: 2 },
      { level: 2, proficiencyBonus: 2, features: ["Wild Shape","Druid Circle"], spellSlots: { 1: 3 }, cantripsKnown: 2 },
      { level: 3, proficiencyBonus: 2, features: [], spellSlots: { 1: 4, 2: 2 }, cantripsKnown: 2 },
      { level: 4, proficiencyBonus: 2, features: ["Wild Shape Improvement","Ability Score Improvement"], spellSlots: { 1: 4, 2: 3 }, cantripsKnown: 3 },
      { level: 5, proficiencyBonus: 3, features: [], spellSlots: { 1: 4, 2: 3, 3: 2 }, cantripsKnown: 3 },
      { level: 6, proficiencyBonus: 3, features: ["Druid Circle feature"], spellSlots: { 1: 4, 2: 3, 3: 3 }, cantripsKnown: 3 },
      { level: 7, proficiencyBonus: 3, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 1 }, cantripsKnown: 3 },
      { level: 8, proficiencyBonus: 3, features: ["Wild Shape Improvement","Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 2 }, cantripsKnown: 3 },
      { level: 9, proficiencyBonus: 4, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, cantripsKnown: 3 },
      { level: 10, proficiencyBonus: 4, features: ["Druid Circle feature"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, cantripsKnown: 4 },
      { level: 11, proficiencyBonus: 4, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }, cantripsKnown: 4 },
      { level: 12, proficiencyBonus: 4, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }, cantripsKnown: 4 },
      { level: 13, proficiencyBonus: 5, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, cantripsKnown: 4 },
      { level: 14, proficiencyBonus: 5, features: ["Druid Circle feature"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, cantripsKnown: 4 },
      { level: 15, proficiencyBonus: 5, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, cantripsKnown: 4 },
      { level: 16, proficiencyBonus: 5, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, cantripsKnown: 4 },
      { level: 17, proficiencyBonus: 6, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 }, cantripsKnown: 4 },
      { level: 18, proficiencyBonus: 6, features: ["Timeless Body","Beast Spells"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 }, cantripsKnown: 4 },
      { level: 19, proficiencyBonus: 6, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 }, cantripsKnown: 4 },
      { level: 20, proficiencyBonus: 6, features: ["Archdruid"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, cantripsKnown: 4 }
    ],
  },
  fighter: {
    id: 'fighter',
    name: 'Fighter',
    hitDie: 10,
    averageHPPerLevel: 6,
    spellcastingAbility: null,
    savingThrowProficiencies: ["strength","constitution"],
    progression: [
      { level: 1, proficiencyBonus: 2, features: ["Fighting Style","Second Wind"], spellSlots: {} },
      { level: 2, proficiencyBonus: 2, features: ["Action Surge (one use)"], spellSlots: {} },
      { level: 3, proficiencyBonus: 2, features: ["Martial Archetype"], spellSlots: {} },
      { level: 4, proficiencyBonus: 2, features: ["Ability Score Improvement"], spellSlots: {} },
      { level: 5, proficiencyBonus: 3, features: ["Extra Attack"], spellSlots: {} },
      { level: 6, proficiencyBonus: 3, features: ["Ability Score Improvement"], spellSlots: {} },
      { level: 7, proficiencyBonus: 3, features: ["Martial Archetype feature"], spellSlots: {} },
      { level: 8, proficiencyBonus: 3, features: ["Ability Score Improvement"], spellSlots: {} },
      { level: 9, proficiencyBonus: 4, features: ["Indomitable (one use)"], spellSlots: {} },
      { level: 10, proficiencyBonus: 4, features: ["Martial Archetype feature"], spellSlots: {} },
      { level: 11, proficiencyBonus: 4, features: ["Extra Attack (2)"], spellSlots: {} },
      { level: 12, proficiencyBonus: 4, features: ["Ability Score Improvement"], spellSlots: {} },
      { level: 13, proficiencyBonus: 5, features: ["Indomitable (two uses)"], spellSlots: {} },
      { level: 14, proficiencyBonus: 5, features: ["Ability Score Improvement"], spellSlots: {} },
      { level: 15, proficiencyBonus: 5, features: ["Martial Archetype feature"], spellSlots: {} },
      { level: 16, proficiencyBonus: 5, features: ["Ability Score Improvement"], spellSlots: {} },
      { level: 17, proficiencyBonus: 6, features: ["Action Surge (two uses)","Indomitable (three uses)"], spellSlots: {} },
      { level: 18, proficiencyBonus: 6, features: ["Martial Archetype Feature"], spellSlots: {} },
      { level: 19, proficiencyBonus: 6, features: ["Ability Score Improvement"], spellSlots: {} },
      { level: 20, proficiencyBonus: 6, features: ["Extra Attack (3)"], spellSlots: {} }
    ],
  },
  monk: {
    id: 'monk',
    name: 'Monk',
    hitDie: 8,
    averageHPPerLevel: 5,
    spellcastingAbility: null,
    savingThrowProficiencies: ["strength","dexterity"],
    progression: [
      { level: 1, proficiencyBonus: 2, features: ["Unarmored Defense","Martial Arts"], spellSlots: {}, extra: { martialArts: "1d4" } },
      { level: 2, proficiencyBonus: 2, features: ["Ki","Unarmored Movement"], spellSlots: {}, extra: { kiPoints: 2, martialArts: "1d4", unarmoredMovement: "+10 ft." } },
      { level: 3, proficiencyBonus: 2, features: ["Monastic Tradition","Deflect Missiles"], spellSlots: {}, extra: { kiPoints: 3, martialArts: "1d4", unarmoredMovement: "+10 ft." } },
      { level: 4, proficiencyBonus: 2, features: ["Ability Score Improvement","Slow Fall"], spellSlots: {}, extra: { kiPoints: 4, martialArts: "1d4", unarmoredMovement: "+10 ft." } },
      { level: 5, proficiencyBonus: 3, features: ["Extra Attack","Stunning Strike"], spellSlots: {}, extra: { kiPoints: 5, martialArts: "1d6", unarmoredMovement: "+10 ft." } },
      { level: 6, proficiencyBonus: 3, features: ["Ki-Empowered Strikes","Monastic Tradition feature"], spellSlots: {}, extra: { kiPoints: 6, martialArts: "1d6", unarmoredMovement: "+15 ft." } },
      { level: 7, proficiencyBonus: 3, features: ["Evasion","Stillness of Mind"], spellSlots: {}, extra: { kiPoints: 7, martialArts: "1d6", unarmoredMovement: "+15 ft." } },
      { level: 8, proficiencyBonus: 3, features: ["Ability Score Improvement"], spellSlots: {}, extra: { kiPoints: 8, martialArts: "1d6", unarmoredMovement: "+15 ft." } },
      { level: 9, proficiencyBonus: 4, features: ["Unarmored Movement improvement"], spellSlots: {}, extra: { kiPoints: 9, martialArts: "1d6", unarmoredMovement: "+15 ft." } },
      { level: 10, proficiencyBonus: 4, features: ["Purity of Body"], spellSlots: {}, extra: { kiPoints: 10, martialArts: "1d6", unarmoredMovement: "+20 ft." } },
      { level: 11, proficiencyBonus: 4, features: ["Monastic Tradition feature"], spellSlots: {}, extra: { kiPoints: 11, martialArts: "1d8", unarmoredMovement: "+20 ft." } },
      { level: 12, proficiencyBonus: 4, features: ["Ability Score Improvement"], spellSlots: {}, extra: { kiPoints: 12, martialArts: "1d8", unarmoredMovement: "+20 ft." } },
      { level: 13, proficiencyBonus: 5, features: ["Tongue of the Sun and Moon"], spellSlots: {}, extra: { kiPoints: 13, martialArts: "1d8", unarmoredMovement: "+20 ft." } },
      { level: 14, proficiencyBonus: 5, features: ["Diamond Soul"], spellSlots: {}, extra: { kiPoints: 14, martialArts: "1d8", unarmoredMovement: "+25 ft." } },
      { level: 15, proficiencyBonus: 5, features: ["Timeless Body"], spellSlots: {}, extra: { kiPoints: 15, martialArts: "1d8", unarmoredMovement: "+25 ft." } },
      { level: 16, proficiencyBonus: 5, features: ["Ability Score Improvement"], spellSlots: {}, extra: { kiPoints: 16, martialArts: "1d8", unarmoredMovement: "+25 ft." } },
      { level: 17, proficiencyBonus: 6, features: ["Monastic Tradition feature"], spellSlots: {}, extra: { kiPoints: 17, martialArts: "1d10", unarmoredMovement: "+25 ft." } },
      { level: 18, proficiencyBonus: 6, features: ["Empty Body"], spellSlots: {}, extra: { kiPoints: 18, martialArts: "1d10", unarmoredMovement: "+30 ft." } },
      { level: 19, proficiencyBonus: 6, features: ["Ability Score Improvement"], spellSlots: {}, extra: { kiPoints: 19, martialArts: "1d10", unarmoredMovement: "+30 ft." } },
      { level: 20, proficiencyBonus: 6, features: ["Perfect Self"], spellSlots: {}, extra: { kiPoints: 20, martialArts: "1d10", unarmoredMovement: "+30 ft." } }
    ],
  },
  paladin: {
    id: 'paladin',
    name: 'Paladin',
    hitDie: 10,
    averageHPPerLevel: 6,
    spellcastingAbility: 'charisma',
    savingThrowProficiencies: ["wisdom","charisma"],
    progression: [
      { level: 1, proficiencyBonus: 2, features: ["Divine Sense","Lay on Hands"], spellSlots: {} },
      { level: 2, proficiencyBonus: 2, features: ["Fighting Style","Spellcasting","Divine Smite"], spellSlots: { 1: 2 } },
      { level: 3, proficiencyBonus: 2, features: ["Divine Health","Sacred Oath"], spellSlots: { 1: 3 } },
      { level: 4, proficiencyBonus: 2, features: ["Ability Score Improvement"], spellSlots: { 1: 3 } },
      { level: 5, proficiencyBonus: 3, features: ["Extra Attack"], spellSlots: { 1: 4, 2: 2 } },
      { level: 6, proficiencyBonus: 3, features: ["Aura of Protection"], spellSlots: { 1: 4, 2: 2 } },
      { level: 7, proficiencyBonus: 3, features: ["Sacred Oath feature"], spellSlots: { 1: 4, 2: 3 } },
      { level: 8, proficiencyBonus: 3, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3 } },
      { level: 9, proficiencyBonus: 4, features: [], spellSlots: { 1: 4, 2: 3, 3: 2 } },
      { level: 10, proficiencyBonus: 4, features: ["Aura of Courage"], spellSlots: { 1: 4, 2: 3, 3: 2 } },
      { level: 11, proficiencyBonus: 4, features: ["Improved Divine Smite"], spellSlots: { 1: 4, 2: 3, 3: 3 } },
      { level: 12, proficiencyBonus: 4, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3 } },
      { level: 13, proficiencyBonus: 5, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 1 } },
      { level: 14, proficiencyBonus: 5, features: ["Cleansing Touch"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 1 } },
      { level: 15, proficiencyBonus: 5, features: ["Sacred Oath feature"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 2 } },
      { level: 16, proficiencyBonus: 5, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 2 } },
      { level: 17, proficiencyBonus: 6, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 } },
      { level: 18, proficiencyBonus: 6, features: ["Aura improvements"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 } },
      { level: 19, proficiencyBonus: 6, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 } },
      { level: 20, proficiencyBonus: 6, features: ["Sacred Oath feature"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 } }
    ],
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    hitDie: 10,
    averageHPPerLevel: 6,
    spellcastingAbility: 'wisdom',
    savingThrowProficiencies: ["strength","dexterity"],
    progression: [
      { level: 1, proficiencyBonus: 2, features: ["Favored Enemy","Natural Explorer"], spellSlots: {} },
      { level: 2, proficiencyBonus: 2, features: ["Fighting Style","Spellcasting"], spellSlots: { 1: 2 }, spellsKnown: 2 },
      { level: 3, proficiencyBonus: 2, features: ["Ranger Archetype","Primeval Awareness"], spellSlots: { 1: 3 }, spellsKnown: 3 },
      { level: 4, proficiencyBonus: 2, features: ["Ability Score Improvement"], spellSlots: { 1: 3 }, spellsKnown: 3 },
      { level: 5, proficiencyBonus: 3, features: ["Extra Attack"], spellSlots: { 1: 4, 2: 2 }, spellsKnown: 4 },
      { level: 6, proficiencyBonus: 3, features: ["Favored Enemy and Natural Explorer improvements"], spellSlots: { 1: 4, 2: 2 }, spellsKnown: 4 },
      { level: 7, proficiencyBonus: 3, features: ["Ranger Archetype feature"], spellSlots: { 1: 4, 2: 3 }, spellsKnown: 5 },
      { level: 8, proficiencyBonus: 3, features: ["Ability Score Improvement","Land's Stride"], spellSlots: { 1: 4, 2: 3 }, spellsKnown: 5 },
      { level: 9, proficiencyBonus: 4, features: [], spellSlots: { 1: 4, 2: 3, 3: 2 }, spellsKnown: 6 },
      { level: 10, proficiencyBonus: 4, features: ["Natural Explorer Improvement","Hide in Plain Sight"], spellSlots: { 1: 4, 2: 3, 3: 2 }, spellsKnown: 6 },
      { level: 11, proficiencyBonus: 4, features: ["Ranger Archetype feature"], spellSlots: { 1: 4, 2: 3, 3: 3 }, spellsKnown: 7 },
      { level: 12, proficiencyBonus: 4, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3 }, spellsKnown: 7 },
      { level: 13, proficiencyBonus: 5, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 1 }, spellsKnown: 8 },
      { level: 14, proficiencyBonus: 5, features: ["Favored Enemy improvement","Vanish"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 1 }, spellsKnown: 8 },
      { level: 15, proficiencyBonus: 5, features: ["Ranger Archetype feature"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 2 }, spellsKnown: 9 },
      { level: 16, proficiencyBonus: 5, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 2 }, spellsKnown: 9 },
      { level: 17, proficiencyBonus: 6, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, spellsKnown: 10 },
      { level: 18, proficiencyBonus: 6, features: ["Feral Senses"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, spellsKnown: 10 },
      { level: 19, proficiencyBonus: 6, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, spellsKnown: 11 },
      { level: 20, proficiencyBonus: 6, features: ["Foe Slayer"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, spellsKnown: 11 }
    ],
  },
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    hitDie: 8,
    averageHPPerLevel: 5,
    spellcastingAbility: null,
    savingThrowProficiencies: ["dexterity","intelligence"],
    progression: [
      { level: 1, proficiencyBonus: 2, features: ["Expertise","Sneak Attack","Thieves' Cant"], spellSlots: {}, extra: { sneakAttack: "1d6" } },
      { level: 2, proficiencyBonus: 2, features: ["Cunning Action"], spellSlots: {}, extra: { sneakAttack: "1d6" } },
      { level: 3, proficiencyBonus: 2, features: ["Roguish Archetype"], spellSlots: {}, extra: { sneakAttack: "2d6" } },
      { level: 4, proficiencyBonus: 2, features: ["Ability Score Improvement"], spellSlots: {}, extra: { sneakAttack: "2d6" } },
      { level: 5, proficiencyBonus: 3, features: ["Uncanny Dodge"], spellSlots: {}, extra: { sneakAttack: "3d6" } },
      { level: 6, proficiencyBonus: 3, features: ["Expertise"], spellSlots: {}, extra: { sneakAttack: "3d6" } },
      { level: 7, proficiencyBonus: 3, features: ["Evasion"], spellSlots: {}, extra: { sneakAttack: "4d6" } },
      { level: 8, proficiencyBonus: 3, features: ["Ability Score Improvement"], spellSlots: {}, extra: { sneakAttack: "4d6" } },
      { level: 9, proficiencyBonus: 4, features: ["Roguish Archetype feature"], spellSlots: {}, extra: { sneakAttack: "5d6" } },
      { level: 10, proficiencyBonus: 4, features: ["Ability Score Improvement"], spellSlots: {}, extra: { sneakAttack: "5d6" } },
      { level: 11, proficiencyBonus: 4, features: ["Reliable Talent"], spellSlots: {}, extra: { sneakAttack: "6d6" } },
      { level: 12, proficiencyBonus: 4, features: ["Ability Score Improvement"], spellSlots: {}, extra: { sneakAttack: "6d6" } },
      { level: 13, proficiencyBonus: 5, features: ["Roguish Archetype Feature"], spellSlots: {}, extra: { sneakAttack: "7d6" } },
      { level: 14, proficiencyBonus: 5, features: ["Blindsense"], spellSlots: {}, extra: { sneakAttack: "7d6" } },
      { level: 15, proficiencyBonus: 5, features: ["Slippery Mind"], spellSlots: {}, extra: { sneakAttack: "8d6" } },
      { level: 16, proficiencyBonus: 5, features: ["Ability Score Improvement"], spellSlots: {}, extra: { sneakAttack: "8d6" } },
      { level: 17, proficiencyBonus: 6, features: ["Roguish Archetype feature"], spellSlots: {}, extra: { sneakAttack: "9d6" } },
      { level: 18, proficiencyBonus: 6, features: ["Elusive"], spellSlots: {}, extra: { sneakAttack: "9d6" } },
      { level: 19, proficiencyBonus: 6, features: ["Ability Score Improvement"], spellSlots: {}, extra: { sneakAttack: "10d6" } },
      { level: 20, proficiencyBonus: 6, features: ["Stroke of Luck"], spellSlots: {}, extra: { sneakAttack: "10d6" } }
    ],
  },
  sorcerer: {
    id: 'sorcerer',
    name: 'Sorcerer',
    hitDie: 6,
    averageHPPerLevel: 4,
    spellcastingAbility: 'charisma',
    savingThrowProficiencies: ["constitution","charisma"],
    progression: [
      { level: 1, proficiencyBonus: 2, features: ["Spellcasting","Sorcerous Origin"], spellSlots: { 1: 2 }, cantripsKnown: 4, spellsKnown: 2 },
      { level: 2, proficiencyBonus: 2, features: ["Font of Magic"], spellSlots: { 1: 3 }, cantripsKnown: 4, spellsKnown: 3, extra: { sorceryPoints: 2 } },
      { level: 3, proficiencyBonus: 2, features: ["Metamagic"], spellSlots: { 1: 4, 2: 2 }, cantripsKnown: 4, spellsKnown: 4, extra: { sorceryPoints: 3 } },
      { level: 4, proficiencyBonus: 2, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3 }, cantripsKnown: 5, spellsKnown: 5, extra: { sorceryPoints: 4 } },
      { level: 5, proficiencyBonus: 3, features: [], spellSlots: { 1: 4, 2: 3, 3: 2 }, cantripsKnown: 5, spellsKnown: 6, extra: { sorceryPoints: 5 } },
      { level: 6, proficiencyBonus: 3, features: ["Sorcerous Origin feature"], spellSlots: { 1: 4, 2: 3, 3: 3 }, cantripsKnown: 5, spellsKnown: 7, extra: { sorceryPoints: 6 } },
      { level: 7, proficiencyBonus: 3, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 1 }, cantripsKnown: 5, spellsKnown: 8, extra: { sorceryPoints: 7 } },
      { level: 8, proficiencyBonus: 3, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 2 }, cantripsKnown: 5, spellsKnown: 9, extra: { sorceryPoints: 8 } },
      { level: 9, proficiencyBonus: 4, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, cantripsKnown: 5, spellsKnown: 10, extra: { sorceryPoints: 9 } },
      { level: 10, proficiencyBonus: 4, features: ["Metamagic"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, cantripsKnown: 6, spellsKnown: 11, extra: { sorceryPoints: 10 } },
      { level: 11, proficiencyBonus: 4, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }, cantripsKnown: 6, spellsKnown: 12, extra: { sorceryPoints: 11 } },
      { level: 12, proficiencyBonus: 4, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }, cantripsKnown: 6, spellsKnown: 12, extra: { sorceryPoints: 12 } },
      { level: 13, proficiencyBonus: 5, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, cantripsKnown: 6, spellsKnown: 13, extra: { sorceryPoints: 13 } },
      { level: 14, proficiencyBonus: 5, features: ["Sorcerous Origin feature"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, cantripsKnown: 6, spellsKnown: 13, extra: { sorceryPoints: 14 } },
      { level: 15, proficiencyBonus: 5, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, cantripsKnown: 6, spellsKnown: 14, extra: { sorceryPoints: 15 } },
      { level: 16, proficiencyBonus: 5, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, cantripsKnown: 6, spellsKnown: 14, extra: { sorceryPoints: 16 } },
      { level: 17, proficiencyBonus: 6, features: ["Metamagic"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 }, cantripsKnown: 6, spellsKnown: 15, extra: { sorceryPoints: 17 } },
      { level: 18, proficiencyBonus: 6, features: ["Sorcerous Origin feature"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 }, cantripsKnown: 6, spellsKnown: 15, extra: { sorceryPoints: 18 } },
      { level: 19, proficiencyBonus: 6, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 }, cantripsKnown: 6, spellsKnown: 15, extra: { sorceryPoints: 19 } },
      { level: 20, proficiencyBonus: 6, features: ["Sorcerous Restoration"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, cantripsKnown: 6, spellsKnown: 15, extra: { sorceryPoints: 20 } }
    ],
  },
  warlock: {
    id: 'warlock',
    name: 'Warlock',
    hitDie: 8,
    averageHPPerLevel: 5,
    spellcastingAbility: 'charisma',
    savingThrowProficiencies: ["wisdom","charisma"],
    progression: [
      { level: 1, proficiencyBonus: 2, features: ["Otherworldly Patron","Pact Magic"], spellSlots: { 1: 1 }, cantripsKnown: 2, spellsKnown: 2, extra: { warlockSlotCount: 1, warlockSlotLevel: 1 } },
      { level: 2, proficiencyBonus: 2, features: ["Eldritch Invocations"], spellSlots: { 1: 2 }, cantripsKnown: 2, spellsKnown: 3, extra: { invocationsKnown: 2, warlockSlotCount: 2, warlockSlotLevel: 1 } },
      { level: 3, proficiencyBonus: 2, features: ["Pact Boon"], spellSlots: { 2: 2 }, cantripsKnown: 2, spellsKnown: 4, extra: { invocationsKnown: 2, warlockSlotCount: 2, warlockSlotLevel: 2 } },
      { level: 4, proficiencyBonus: 2, features: ["Ability Score Improvement"], spellSlots: { 2: 2 }, cantripsKnown: 3, spellsKnown: 5, extra: { invocationsKnown: 2, warlockSlotCount: 2, warlockSlotLevel: 2 } },
      { level: 5, proficiencyBonus: 3, features: [], spellSlots: { 3: 2 }, cantripsKnown: 3, spellsKnown: 6, extra: { invocationsKnown: 3, warlockSlotCount: 2, warlockSlotLevel: 3 } },
      { level: 6, proficiencyBonus: 3, features: ["Otherworldly Patron feature"], spellSlots: { 3: 2 }, cantripsKnown: 3, spellsKnown: 7, extra: { invocationsKnown: 3, warlockSlotCount: 2, warlockSlotLevel: 3 } },
      { level: 7, proficiencyBonus: 3, features: [], spellSlots: { 4: 2 }, cantripsKnown: 3, spellsKnown: 8, extra: { invocationsKnown: 4, warlockSlotCount: 2, warlockSlotLevel: 4 } },
      { level: 8, proficiencyBonus: 3, features: ["Ability Score Improvement"], spellSlots: { 4: 2 }, cantripsKnown: 3, spellsKnown: 9, extra: { invocationsKnown: 4, warlockSlotCount: 2, warlockSlotLevel: 4 } },
      { level: 9, proficiencyBonus: 4, features: [], spellSlots: { 5: 2 }, cantripsKnown: 3, spellsKnown: 10, extra: { invocationsKnown: 5, warlockSlotCount: 2, warlockSlotLevel: 5 } },
      { level: 10, proficiencyBonus: 4, features: ["Otherworldly Patron feature"], spellSlots: { 5: 2 }, cantripsKnown: 4, spellsKnown: 10, extra: { invocationsKnown: 5, warlockSlotCount: 2, warlockSlotLevel: 5 } },
      { level: 11, proficiencyBonus: 4, features: ["Mystic Arcanum (6th level)"], spellSlots: { 5: 3 }, cantripsKnown: 4, spellsKnown: 11, extra: { invocationsKnown: 5, warlockSlotCount: 3, warlockSlotLevel: 5 } },
      { level: 12, proficiencyBonus: 4, features: ["Ability Score Improvement"], spellSlots: { 5: 3 }, cantripsKnown: 4, spellsKnown: 11, extra: { invocationsKnown: 6, warlockSlotCount: 3, warlockSlotLevel: 5 } },
      { level: 13, proficiencyBonus: 5, features: ["Mystic Arcanum (7th level)"], spellSlots: { 5: 3 }, cantripsKnown: 4, spellsKnown: 12, extra: { invocationsKnown: 6, warlockSlotCount: 3, warlockSlotLevel: 5 } },
      { level: 14, proficiencyBonus: 5, features: ["Otherworldly Patron feature"], spellSlots: { 5: 3 }, cantripsKnown: 4, spellsKnown: 12, extra: { invocationsKnown: 6, warlockSlotCount: 3, warlockSlotLevel: 5 } },
      { level: 15, proficiencyBonus: 5, features: ["Mystic Arcanum (8th level)"], spellSlots: { 5: 3 }, cantripsKnown: 4, spellsKnown: 13, extra: { invocationsKnown: 7, warlockSlotCount: 3, warlockSlotLevel: 5 } },
      { level: 16, proficiencyBonus: 5, features: ["Ability Score Improvement"], spellSlots: { 5: 3 }, cantripsKnown: 4, spellsKnown: 13, extra: { invocationsKnown: 7, warlockSlotCount: 3, warlockSlotLevel: 5 } },
      { level: 17, proficiencyBonus: 6, features: ["Mystic Arcanum (9th level)"], spellSlots: { 5: 4 }, cantripsKnown: 4, spellsKnown: 14, extra: { invocationsKnown: 7, warlockSlotCount: 4, warlockSlotLevel: 5 } },
      { level: 18, proficiencyBonus: 6, features: [], spellSlots: { 5: 4 }, cantripsKnown: 4, spellsKnown: 14, extra: { invocationsKnown: 8, warlockSlotCount: 4, warlockSlotLevel: 5 } },
      { level: 19, proficiencyBonus: 6, features: ["Ability Score Improvement"], spellSlots: { 5: 4 }, cantripsKnown: 4, spellsKnown: 15, extra: { invocationsKnown: 8, warlockSlotCount: 4, warlockSlotLevel: 5 } },
      { level: 20, proficiencyBonus: 6, features: ["Eldritch Master"], spellSlots: { 5: 4 }, cantripsKnown: 4, spellsKnown: 15, extra: { invocationsKnown: 8, warlockSlotCount: 4, warlockSlotLevel: 5 } }
    ],
  },
  wizard: {
    id: 'wizard',
    name: 'Wizard',
    hitDie: 6,
    averageHPPerLevel: 4,
    spellcastingAbility: 'intelligence',
    savingThrowProficiencies: ["intelligence","wisdom"],
    progression: [
      { level: 1, proficiencyBonus: 2, features: ["Spellcasting","Arcane Recovery"], spellSlots: { 1: 2 }, cantripsKnown: 3 },
      { level: 2, proficiencyBonus: 2, features: ["Arcane Tradition"], spellSlots: { 1: 3 }, cantripsKnown: 3 },
      { level: 3, proficiencyBonus: 2, features: [], spellSlots: { 1: 4, 2: 2 }, cantripsKnown: 3 },
      { level: 4, proficiencyBonus: 2, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3 }, cantripsKnown: 4 },
      { level: 5, proficiencyBonus: 3, features: [], spellSlots: { 1: 4, 2: 3, 3: 2 }, cantripsKnown: 4 },
      { level: 6, proficiencyBonus: 3, features: ["Arcane Tradition feature"], spellSlots: { 1: 4, 2: 3, 3: 3 }, cantripsKnown: 4 },
      { level: 7, proficiencyBonus: 3, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 1 }, cantripsKnown: 4 },
      { level: 8, proficiencyBonus: 3, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 2 }, cantripsKnown: 4 },
      { level: 9, proficiencyBonus: 4, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, cantripsKnown: 4 },
      { level: 10, proficiencyBonus: 4, features: ["Arcane Tradition feature"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, cantripsKnown: 5 },
      { level: 11, proficiencyBonus: 4, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }, cantripsKnown: 5 },
      { level: 12, proficiencyBonus: 4, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }, cantripsKnown: 5 },
      { level: 13, proficiencyBonus: 5, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, cantripsKnown: 5 },
      { level: 14, proficiencyBonus: 5, features: ["Arcane Tradition feature"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, cantripsKnown: 5 },
      { level: 15, proficiencyBonus: 5, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, cantripsKnown: 5 },
      { level: 16, proficiencyBonus: 5, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, cantripsKnown: 5 },
      { level: 17, proficiencyBonus: 6, features: [], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 }, cantripsKnown: 5 },
      { level: 18, proficiencyBonus: 6, features: ["Spell Mastery"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 }, cantripsKnown: 5 },
      { level: 19, proficiencyBonus: 6, features: ["Ability Score Improvement"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 }, cantripsKnown: 5 },
      { level: 20, proficiencyBonus: 6, features: ["Signature Spell"], spellSlots: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, cantripsKnown: 5 }
    ],
  }
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
