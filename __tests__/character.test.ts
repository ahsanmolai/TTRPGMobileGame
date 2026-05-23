import {
  getModifier,
  getProficiencyBonus,
  calculateMaxHP,
  calculateAC,
  getAttackBonus,
  getSavingThrowBonus,
  CharacterStats,
} from 'src/engine/character';
import { WEAPONS } from 'src/data/weapons';

function makeCharacter(overrides: Partial<CharacterStats> = {}): CharacterStats {
  const base: CharacterStats = {
    id: 'test',
    name: 'Test',
    race: 'human',
    classId: 'fighter',
    level: 1,
    abilityScores: {
      strength: 16,
      dexterity: 12,
      constitution: 14,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    maxHP: 12,
    currentHP: 12,
    speed: 30,
    proficientWeapons: ['simple', 'martial'],
    proficientSaves: ['strength', 'constitution'],
    savingThrowProficiencies: ['strength', 'constitution'],
    armor: null,
    shield: false,
    mainHand: WEAPONS.longsword,
    classFeatures: [],
  };
  return { ...base, ...overrides };
}

describe('character.getModifier', () => {
  const cases: [number, number][] = [
    [1, -5],
    [3, -4],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [14, 2],
    [16, 3],
    [18, 4],
    [20, 5],
    [30, 10],
  ];
  it.each(cases)('score %i -> mod %i', (score, expected) => {
    expect(getModifier(score)).toBe(expected);
  });
});

describe('character.getProficiencyBonus', () => {
  const cases: [number, number][] = [
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [12, 4],
    [13, 5],
    [16, 5],
    [17, 6],
    [20, 6],
  ];
  it.each(cases)('level %i -> prof +%i', (lvl, expected) => {
    expect(getProficiencyBonus(lvl)).toBe(expected);
  });
});

describe('character.calculateMaxHP', () => {
  it('level 1 fighter with CON 14 has 12 HP', () => {
    expect(calculateMaxHP('fighter', 1, 2)).toBe(12);
  });
  it('level 3 fighter with CON 14 has 24 HP (12 + 2 * (6+2))', () => {
    expect(calculateMaxHP('fighter', 3, 2)).toBe(28);
  });
  it('level 1 wizard with CON 10 has 6 HP', () => {
    expect(calculateMaxHP('wizard', 1, 0)).toBe(6);
  });
});

describe('character.calculateAC', () => {
  it('unarmored: 10 + DEX', () => {
    const c = makeCharacter({ abilityScores: { ...makeCharacter().abilityScores, dexterity: 16 } });
    expect(calculateAC(c)).toBe(13);
  });

  it('plate armor ignores DEX above 0', () => {
    const c = makeCharacter({
      armor: { id: 'plate', name: 'Plate', baseAC: 18, category: 'heavy', dexCap: 0 },
      abilityScores: { ...makeCharacter().abilityScores, dexterity: 18 },
    });
    expect(calculateAC(c)).toBe(18);
  });

  it('chain mail caps DEX at 2', () => {
    const c = makeCharacter({
      armor: { id: 'chainmail', name: 'Chain Mail', baseAC: 16, category: 'medium', dexCap: 2 },
      abilityScores: { ...makeCharacter().abilityScores, dexterity: 18 },
    });
    expect(calculateAC(c)).toBe(18);
  });

  it('shield adds +2', () => {
    const c = makeCharacter({
      armor: { id: 'chainmail', name: 'Chain Mail', baseAC: 16, category: 'medium', dexCap: 2 },
      shield: true,
      abilityScores: { ...makeCharacter().abilityScores, dexterity: 12 },
    });
    expect(calculateAC(c)).toBe(19);
  });

  it('defense fighting style adds +1 when wearing armor', () => {
    const c = makeCharacter({
      armor: { id: 'chainmail', name: 'Chain Mail', baseAC: 16, category: 'medium', dexCap: 2 },
      classFeatures: ['fighting_style_defense'],
    });
    // chain mail 16 + DEX 1 (capped) + 1 defense = 18
    expect(calculateAC(c)).toBe(18);
  });
});

describe('character.getAttackBonus', () => {
  it('STR-based melee with proficiency', () => {
    const c = makeCharacter(); // STR 16, level 1
    expect(getAttackBonus(c, WEAPONS.longsword)).toBe(3 + 2); // +3 STR + 2 prof
  });

  it('finesse weapon picks higher of STR/DEX', () => {
    const c = makeCharacter({
      abilityScores: {
        strength: 10,
        dexterity: 18,
        constitution: 14,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
    });
    expect(getAttackBonus(c, WEAPONS.dagger)).toBe(4 + 2); // DEX 4 + prof 2
  });

  it('ranged weapon uses DEX', () => {
    const c = makeCharacter({
      abilityScores: {
        strength: 16,
        dexterity: 14,
        constitution: 14,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
    });
    expect(getAttackBonus(c, WEAPONS.shortbow)).toBe(2 + 2); // DEX 2 + prof 2
  });

  it('non-proficient weapon does not add proficiency', () => {
    const c = makeCharacter({ proficientWeapons: ['simple'] });
    expect(getAttackBonus(c, WEAPONS.longsword)).toBe(3); // STR 3 only
  });
});

describe('character.getSavingThrowBonus', () => {
  it('proficient save: adds prof', () => {
    const c = makeCharacter(); // STR 16, prof in STR, level 1
    expect(getSavingThrowBonus(c, 'strength')).toBe(3 + 2);
  });

  it('non-proficient save: ability mod only', () => {
    const c = makeCharacter(); // INT 10
    expect(getSavingThrowBonus(c, 'intelligence')).toBe(0);
  });
});
