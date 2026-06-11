import {
  buildCharacter,
  applyLevelUp,
  applyShortRest,
  applyLongRest,
  getKnownSpells,
  getAttacksPerAction,
  CharacterBuild,
  PRIMARY_ABILITY,
} from 'src/engine/leveling';
import { calculateMaxHP, getModifier, isSpellcaster, CharacterStats } from 'src/engine/character';
import { CLASSES, ClassId, getSpellSlotsAtLevel } from 'src/data/classes';
import { STARTING_EQUIPMENT } from 'src/data/startingEquipment';
import { RACES } from 'src/data/races';

const ALL_CLASSES = Object.keys(CLASSES) as ClassId[];

function makeBuild(classId: ClassId, race: CharacterBuild['race'] = 'human'): CharacterBuild {
  return {
    id: `test_${classId}`,
    name: 'Test',
    race,
    classId,
    abilityScores: {
      strength: 15,
      dexterity: 14,
      constitution: 13,
      intelligence: 12,
      wisdom: 10,
      charisma: 8,
    },
  };
}

describe('leveling.buildCharacter', () => {
  it.each(ALL_CLASSES)('%s builds a valid level-1 character', (classId) => {
    const c = buildCharacter(makeBuild(classId));
    expect(c.level).toBe(1);
    expect(c.currentHP).toBe(c.maxHP);
    expect(c.maxHP).toBeGreaterThan(0);
    expect(c.attacksPerAction).toBe(1);
    const equipment = STARTING_EQUIPMENT[classId];
    expect(c.mainHand.id).toBe(equipment.weaponId);
    expect(c.armor?.id ?? null).toBe(equipment.armorId);
    expect(c.shield).toBe(equipment.shield);
    expect(c.proficientWeapons).toEqual(equipment.proficientWeapons);
    expect(c.proficientSaves).toEqual(CLASSES[classId].savingThrowProficiencies);
  });

  it.each(ALL_CLASSES)('%s level-1 spell state matches the progression table', (classId) => {
    const c = buildCharacter(makeBuild(classId));
    if (!isSpellcaster(classId)) {
      expect(c.spellSlots).toBeUndefined();
      expect(c.knownSpells).toBeUndefined();
      return;
    }
    expect(c.spellcastingAbility).toBe(CLASSES[classId].spellcastingAbility);
    const expected = getSpellSlotsAtLevel(classId, 1);
    for (const [lvl, max] of Object.entries(expected)) {
      expect(c.spellSlots?.[Number(lvl)]).toEqual({ max, remaining: max });
    }
    expect(c.knownSpells).toEqual(getKnownSpells(classId, 1));
  });

  it('applies racial ability bonuses', () => {
    const human = buildCharacter(makeBuild('fighter', 'human'));
    expect(human.abilityScores).toEqual({
      strength: 16,
      dexterity: 15,
      constitution: 14,
      intelligence: 13,
      wisdom: 11,
      charisma: 9,
    });

    const halfOrc = buildCharacter(makeBuild('fighter', 'half-orc'));
    expect(halfOrc.abilityScores.strength).toBe(17); // 15 + 2
    expect(halfOrc.abilityScores.constitution).toBe(14); // 13 + 1
    expect(halfOrc.abilityScores.dexterity).toBe(14); // unchanged
  });

  it('uses racial speed and features', () => {
    const dwarf = buildCharacter(makeBuild('fighter', 'dwarf'));
    expect(dwarf.speed).toBe(25);
    expect(dwarf.classFeatures).toContain('dwarven_toughness');

    const halfling = buildCharacter(makeBuild('rogue', 'halfling'));
    expect(halfling.speed).toBe(25);
    expect(halfling.classFeatures).toContain('halfling_lucky');
  });

  it('dwarven toughness adds +1 HP per level', () => {
    const dwarf = buildCharacter(makeBuild('fighter', 'dwarf'));
    const conMod = getModifier(dwarf.abilityScores.constitution);
    expect(dwarf.maxHP).toBe(calculateMaxHP('fighter', 1, conMod) + 1);
  });
});

describe('leveling.getAttacksPerAction', () => {
  it('fighter gains extra attacks at 5, 11, and 20', () => {
    expect(getAttacksPerAction('fighter', 4)).toBe(1);
    expect(getAttacksPerAction('fighter', 5)).toBe(2);
    expect(getAttacksPerAction('fighter', 10)).toBe(2);
    expect(getAttacksPerAction('fighter', 11)).toBe(3);
    expect(getAttacksPerAction('fighter', 19)).toBe(3);
    expect(getAttacksPerAction('fighter', 20)).toBe(4);
  });

  it('other martials gain one extra attack at 5', () => {
    for (const classId of ['barbarian', 'monk', 'paladin', 'ranger'] as ClassId[]) {
      expect(getAttacksPerAction(classId, 4)).toBe(1);
      expect(getAttacksPerAction(classId, 5)).toBe(2);
      expect(getAttacksPerAction(classId, 20)).toBe(2);
    }
  });

  it('casters and rogue never gain extra attacks', () => {
    for (const classId of ['rogue', 'cleric', 'wizard', 'sorcerer', 'warlock', 'bard', 'druid'] as ClassId[]) {
      expect(getAttacksPerAction(classId, 20)).toBe(1);
    }
  });
});

describe('leveling.applyLevelUp', () => {
  function levelTo(classId: ClassId, target: number, race: CharacterBuild['race'] = 'human'): CharacterStats {
    let c = buildCharacter(makeBuild(classId, race));
    while (c.level < target) c = applyLevelUp(c);
    return c;
  }

  it.each(['fighter', 'cleric', 'wizard', 'warlock'] as ClassId[])(
    '%s: HP and slots track the progression at every level 1-20',
    (classId) => {
      let c = buildCharacter(makeBuild(classId));
      for (let level = 2; level <= 20; level++) {
        c = applyLevelUp(c);
        expect(c.level).toBe(level);
        const conMod = getModifier(c.abilityScores.constitution);
        expect(c.maxHP).toBe(calculateMaxHP(classId, level, conMod));
        if (isSpellcaster(classId)) {
          const expected = getSpellSlotsAtLevel(classId, level);
          for (const [lvl, max] of Object.entries(expected)) {
            expect(c.spellSlots?.[Number(lvl)]).toEqual({ max, remaining: max });
          }
          expect(c.knownSpells).toEqual(getKnownSpells(classId, level));
        }
        expect(c.attacksPerAction).toBe(getAttacksPerAction(classId, level));
      }
    },
  );

  it('applies ASI (+1 primary, +1 CON) exactly at ASI levels', () => {
    let c = buildCharacter(makeBuild('cleric'));
    const primary = PRIMARY_ABILITY['cleric'];
    for (let level = 2; level <= 20; level++) {
      const before = { ...c.abilityScores };
      c = applyLevelUp(c);
      const isASI = CLASSES.cleric.progression[level - 1].features.includes('Ability Score Improvement');
      const expectedPrimary = isASI ? Math.min(20, before[primary] + 1) : before[primary];
      const expectedCon = isASI ? Math.min(20, before.constitution + 1) : before.constitution;
      expect(c.abilityScores[primary]).toBe(expectedPrimary);
      expect(c.abilityScores.constitution).toBe(expectedCon);
    }
  });

  it('caps ability scores at 20', () => {
    const c = levelTo('fighter', 20);
    expect(c.abilityScores.strength).toBeLessThanOrEqual(20);
    expect(c.abilityScores.constitution).toBeLessThanOrEqual(20);
  });

  it('is a no-op at level 20', () => {
    const c = levelTo('fighter', 20);
    expect(applyLevelUp(c)).toBe(c);
  });

  it('wizard learns hold_person when a level-2 slot appears (level 3)', () => {
    const l2 = levelTo('wizard', 2);
    expect(l2.knownSpells).not.toContain('hold_person');
    const l3 = applyLevelUp(l2);
    expect(l3.knownSpells).toContain('hold_person');
  });

  it('dwarf keeps the toughness HP bonus while leveling', () => {
    const c = levelTo('fighter', 5, 'dwarf');
    const conMod = getModifier(c.abilityScores.constitution);
    expect(c.maxHP).toBe(calculateMaxHP('fighter', 5, conMod) + 5);
  });

  it('warlock plays as weapon user until level 3, then learns hold_person', () => {
    const l1 = buildCharacter(makeBuild('warlock'));
    expect(l1.knownSpells).toEqual([]);
    const l3 = levelTo('warlock', 3);
    expect(l3.knownSpells).toContain('hold_person');
  });
});

describe('leveling.rests', () => {
  it('short rest heals half of missing HP', () => {
    const c = { ...buildCharacter(makeBuild('fighter')), currentHP: 2, maxHP: 12 };
    const rested = applyShortRest(c);
    expect(rested.currentHP).toBe(2 + Math.floor((12 - 2) / 2));
  });

  it('short rest refills warlock pact slots but not wizard slots', () => {
    let warlock = buildCharacter(makeBuild('warlock'));
    warlock = { ...warlock, spellSlots: { 1: { max: 1, remaining: 0 } } };
    expect(applyShortRest(warlock).spellSlots?.[1].remaining).toBe(1);

    let wizard = buildCharacter(makeBuild('wizard'));
    wizard = { ...wizard, spellSlots: { 1: { max: 2, remaining: 0 } } };
    expect(applyShortRest(wizard).spellSlots?.[1].remaining).toBe(0);
  });

  it('long rest restores full HP and all slots', () => {
    let c = buildCharacter(makeBuild('cleric'));
    c = { ...c, currentHP: 1, spellSlots: { 1: { max: 2, remaining: 0 } } };
    const rested = applyLongRest(c);
    expect(rested.currentHP).toBe(rested.maxHP);
    expect(rested.spellSlots?.[1].remaining).toBe(rested.spellSlots?.[1].max);
  });
});

describe('leveling racial data sanity', () => {
  it('every race exists with a positive speed', () => {
    for (const race of Object.values(RACES)) {
      expect(race.speed).toBeGreaterThan(0);
    }
  });
});
