import {
  getSpellSaveDC,
  getSpellAttackBonus,
  spendSpellSlot,
  SpellSlotState,
  CharacterStats,
} from 'src/engine/character';
import { resolveSpell, cantripTier, scaledDice, scaledHits } from 'src/engine/spells';
import { parseDamageNotation } from 'src/engine/dice';
import { CombatParticipant, CombatState } from 'src/engine/combat';
import { SPELLS } from 'src/data/spellbook';
import { WEAPONS } from 'src/data/weapons';

function makeCleric(): CharacterStats {
  return {
    id: 'aldwin',
    name: 'Brother Aldwin',
    race: 'human',
    classId: 'cleric',
    level: 3,
    abilityScores: {
      strength: 14, dexterity: 10, constitution: 14,
      intelligence: 10, wisdom: 16, charisma: 12,
    },
    maxHP: 24,
    currentHP: 24,
    speed: 30,
    proficientWeapons: ['simple'],
    proficientSaves: ['wisdom', 'charisma'],
    savingThrowProficiencies: ['wisdom', 'charisma'],
    armor: null,
    shield: false,
    mainHand: WEAPONS.mace,
    classFeatures: ['channel_divinity'],
    attacksPerAction: 1,
    gold: 0,
    inventory: [],
    spellcastingAbility: 'wisdom',
    spellSlots: { 1: { max: 4, remaining: 4 }, 2: { max: 2, remaining: 2 } },
    knownSpells: ['sacred_flame', 'cure_wounds', 'healing_word', 'inflict_wounds', 'hold_person'],
  };
}

function makeWizard(): CharacterStats {
  return {
    id: 'zara',
    name: 'Zara',
    race: 'elf',
    classId: 'wizard',
    level: 3,
    abilityScores: {
      strength: 8, dexterity: 14, constitution: 12,
      intelligence: 17, wisdom: 12, charisma: 10,
    },
    maxHP: 16,
    currentHP: 16,
    speed: 30,
    proficientWeapons: ['simple'],
    proficientSaves: ['intelligence', 'wisdom'],
    savingThrowProficiencies: ['intelligence', 'wisdom'],
    armor: null,
    shield: false,
    mainHand: WEAPONS.dagger,
    classFeatures: [],
    attacksPerAction: 1,
    gold: 0,
    inventory: [],
    spellcastingAbility: 'intelligence',
    spellSlots: { 1: { max: 4, remaining: 4 }, 2: { max: 2, remaining: 2 } },
    knownSpells: ['fire_bolt', 'magic_missile', 'scorching_ray', 'hold_person'],
  };
}

function makeCasterParticipant(char: CharacterStats): CombatParticipant {
  return {
    id: char.id,
    name: char.name,
    isPlayer: true,
    currentHP: char.currentHP,
    maxHP: char.maxHP,
    ac: 12,
    initiativeRoll: 15,
    initiativeBonus: 0,
    dexterity: char.abilityScores.dexterity,
    conditions: [],
    actionsUsed: [],
    playerStats: char,
    spellSlots: char.spellSlots ? { ...char.spellSlots } : undefined,
    knownSpells: char.knownSpells ? [...char.knownSpells] : undefined,
    concentrating: null,
  };
}

function makeEnemyParticipant(overrides: Partial<CombatParticipant> = {}): CombatParticipant {
  return {
    id: 'goblin_1',
    name: 'Goblin',
    isPlayer: false,
    currentHP: 20,
    maxHP: 20,
    ac: 13,
    initiativeRoll: 10,
    initiativeBonus: 2,
    dexterity: 14,
    conditions: [],
    actionsUsed: [],
    ...overrides,
  };
}

function makeState(caster: CombatParticipant, enemy: CombatParticipant): CombatState {
  return {
    participants: [caster, enemy],
    initiativeOrder: [caster.id, enemy.id],
    currentTurnIndex: 0,
    round: 1,
    log: [],
    phase: 'in_progress',
  };
}

describe('spells.getSpellSaveDC', () => {
  it('Cleric WIS 16 level 3: DC = 8 + 2 + 3 = 13', () => {
    expect(getSpellSaveDC(makeCleric())).toBe(13);
  });

  it('Wizard INT 17 level 3: DC = 8 + 2 + 3 = 13', () => {
    expect(getSpellSaveDC(makeWizard())).toBe(13);
  });
});

describe('spells.getSpellAttackBonus', () => {
  it('Cleric WIS 16 level 3: +5', () => {
    expect(getSpellAttackBonus(makeCleric())).toBe(5);
  });

  it('Wizard INT 17 level 3: +5', () => {
    expect(getSpellAttackBonus(makeWizard())).toBe(5);
  });
});

describe('spells.spendSpellSlot', () => {
  it('decrements remaining slots', () => {
    const slots: SpellSlotState = { 1: { max: 4, remaining: 4 } };
    const after = spendSpellSlot(slots, 1);
    expect(after[1].remaining).toBe(3);
    expect(after[1].max).toBe(4);
  });

  it('throws when no slots remain', () => {
    const slots: SpellSlotState = { 1: { max: 4, remaining: 0 } };
    expect(() => spendSpellSlot(slots, 1)).toThrow();
  });
});

describe('spells.resolveSpell — Magic Missile (auto_hit_multi)', () => {
  it('always hits for 3 darts, total in range 6-15', () => {
    const caster = makeCasterParticipant(makeWizard());
    const enemy = makeEnemyParticipant({ ac: 100 }); // impossible to hit with attack
    const state = makeState(caster, enemy);
    for (let i = 0; i < 50; i++) {
      const result = resolveSpell(SPELLS.magic_missile, caster, [enemy], 1, state);
      const dmgLog = result.logEntries.find((l) => l.type === 'damage');
      expect(dmgLog).toBeDefined();
      // 3 darts, each 1d4+1 = 2-5, so total 6-15
      const totalDmg = enemy.currentHP - (result.participantUpdates[0]?.updated.currentHP ?? enemy.currentHP);
      expect(totalDmg).toBeGreaterThanOrEqual(6);
      expect(totalDmg).toBeLessThanOrEqual(15);
    }
  });

  it('produces slotSpent = true (level 1 spell)', () => {
    const caster = makeCasterParticipant(makeWizard());
    const enemy = makeEnemyParticipant();
    const state = makeState(caster, enemy);
    const result = resolveSpell(SPELLS.magic_missile, caster, [enemy], 1, state);
    expect(result.slotSpent).toBe(true);
  });
});

describe('spells.resolveSpell — Sacred Flame (damage_save)', () => {
  it('deals 0 damage on a successful save (onSaveSuccess: none)', () => {
    const caster = makeCasterParticipant(makeCleric());
    // High DEX enemy saves easily every time
    const enemy = makeEnemyParticipant({ dexterity: 30 });
    const state = makeState(caster, enemy);
    let someZero = false;
    for (let i = 0; i < 200; i++) {
      const result = resolveSpell(SPELLS.sacred_flame, caster, [enemy], 0, state);
      const hasUpdate = result.participantUpdates.length > 0;
      if (!hasUpdate) { someZero = true; break; }
    }
    expect(someZero).toBe(true);
  });

  it('is a cantrip — slotSpent = false', () => {
    const caster = makeCasterParticipant(makeCleric());
    const enemy = makeEnemyParticipant();
    const state = makeState(caster, enemy);
    const result = resolveSpell(SPELLS.sacred_flame, caster, [enemy], 0, state);
    expect(result.slotSpent).toBe(false);
  });
});

describe('spells.resolveSpell — Cure Wounds (heal)', () => {
  it('restores HP and never exceeds maxHP', () => {
    const char = makeCleric();
    const caster = makeCasterParticipant({ ...char, currentHP: 5, maxHP: 24 } as CharacterStats);
    if (caster.playerStats) caster.playerStats = { ...caster.playerStats, currentHP: 5 };
    const target = { ...caster, currentHP: 5 };
    const state = makeState(caster, makeEnemyParticipant());
    for (let i = 0; i < 50; i++) {
      const freshTarget = { ...caster, currentHP: 5 };
      const result = resolveSpell(SPELLS.cure_wounds, caster, [freshTarget], 1, state);
      const update = result.participantUpdates[0];
      if (update) {
        expect(update.updated.currentHP).toBeGreaterThan(5);
        expect(update.updated.currentHP).toBeLessThanOrEqual(24);
      }
      expect(result.logEntries.some((l) => l.type === 'heal')).toBe(true);
    }
  });
});

describe('spells.scaling — cantripTier / scaledDice / scaledHits', () => {
  it('cantrip tiers at 1/5/11/17', () => {
    expect(cantripTier(1)).toBe(1);
    expect(cantripTier(4)).toBe(1);
    expect(cantripTier(5)).toBe(2);
    expect(cantripTier(10)).toBe(2);
    expect(cantripTier(11)).toBe(3);
    expect(cantripTier(16)).toBe(3);
    expect(cantripTier(17)).toBe(4);
    expect(cantripTier(20)).toBe(4);
  });

  it('fire bolt dice scale with character level', () => {
    expect(scaledDice('1d10', SPELLS.fire_bolt, 0, 1)).toBe('1d10');
    expect(scaledDice('1d10', SPELLS.fire_bolt, 0, 5)).toBe('2d10');
    expect(scaledDice('1d10', SPELLS.fire_bolt, 0, 11)).toBe('3d10');
    expect(scaledDice('1d10', SPELLS.fire_bolt, 0, 17)).toBe('4d10');
  });

  it('eldritch blast beams scale with character level', () => {
    expect(scaledHits(1, SPELLS.eldritch_blast, 0, 1)).toBe(1);
    expect(scaledHits(1, SPELLS.eldritch_blast, 0, 5)).toBe(2);
    expect(scaledHits(1, SPELLS.eldritch_blast, 0, 17)).toBe(4);
  });

  it('fireball upcasts +1d6 per slot above 3rd', () => {
    expect(scaledDice('8d6', SPELLS.fireball, 3, 10)).toBe('8d6');
    expect(scaledDice('8d6', SPELLS.fireball, 5, 10)).toBe('10d6');
    expect(scaledDice('8d6', SPELLS.fireball, 9, 10)).toBe('14d6');
  });

  it('disintegrate keeps its flat bonus while upcasting', () => {
    expect(scaledDice('10d6+40', SPELLS.disintegrate, 6, 12)).toBe('10d6+40');
    expect(scaledDice('10d6+40', SPELLS.disintegrate, 8, 12)).toBe('16d6+40');
  });

  it('magic missile gains a dart per slot level', () => {
    expect(scaledHits(3, SPELLS.magic_missile, 1, 5)).toBe(3);
    expect(scaledHits(3, SPELLS.magic_missile, 4, 5)).toBe(6);
  });

  it('cure wounds heals more from higher slots', () => {
    expect(scaledDice('1d8', SPELLS.cure_wounds, 1, 3)).toBe('1d8');
    expect(scaledDice('1d8', SPELLS.cure_wounds, 3, 3)).toBe('3d8');
  });

  it('every upcast die in the book matches its base die size', () => {
    for (const spell of Object.values(SPELLS)) {
      if (!spell.upcast?.extraDicePerSlot) continue;
      const base =
        spell.effect.kind === 'heal' ? spell.effect.healDice :
        'damageDice' in spell.effect ? spell.effect.damageDice : null;
      expect(base).not.toBeNull();
      const baseSides = parseDamageNotation(base!).sides;
      const extraSides = parseDamageNotation(spell.upcast.extraDicePerSlot).sides;
      expect(extraSides).toBe(baseSides);
    }
  });
});

describe('spells.resolveSpell — AOE (Fireball)', () => {
  it('hits every target with an individual save', () => {
    const caster = makeCasterParticipant({ ...makeWizard(), level: 5 } as CharacterStats);
    const enemyA = makeEnemyParticipant({ id: 'a', currentHP: 500, maxHP: 500 });
    const enemyB = makeEnemyParticipant({ id: 'b', currentHP: 500, maxHP: 500 });
    const state: CombatState = {
      participants: [caster, enemyA, enemyB],
      initiativeOrder: [caster.id, 'a', 'b'],
      currentTurnIndex: 0,
      round: 1,
      log: [],
      phase: 'in_progress',
    };
    for (let i = 0; i < 20; i++) {
      const result = resolveSpell(SPELLS.fireball, caster, [enemyA, enemyB], 3, state);
      const saveLogs = result.logEntries.filter((l) => l.text.includes('DEXTERITY save'));
      expect(saveLogs).toHaveLength(2);
      // half-on-save means both always take damage (8d6 min 8, half ≥ 4)
      expect(result.participantUpdates.map((u) => u.id).sort()).toEqual(['a', 'b']);
      for (const u of result.participantUpdates) {
        const dmg = 500 - u.updated.currentHP;
        expect(dmg).toBeGreaterThanOrEqual(4); // floor(8/2)
        expect(dmg).toBeLessThanOrEqual(48); // 8d6 max
      }
    }
  });

  it('upcast fireball at 5th can exceed the base 8d6 maximum', () => {
    const caster = makeCasterParticipant({ ...makeWizard(), level: 10 } as CharacterStats);
    // DEX 1 enemy: almost always fails the save → takes the full roll
    const enemy = makeEnemyParticipant({
      currentHP: 500, maxHP: 500,
      enemyStats: {
        id: 'slug', name: 'Slug', cr: 1, ac: 10, maxHP: 500, speed: 5,
        abilityScores: { strength: 10, dexterity: 1, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
        initiativeBonus: -5, attacks: [], multiattackCount: 1, xp: 10, flavor: '', iconHint: '',
      },
    });
    const state = makeState(caster, enemy);
    // Upcast to 5th: 10d6 (avg 35) vs base 8d6 (avg 28). The sample mean over
    // 300 nearly-always-failed saves separates the two distributions cleanly.
    let total = 0;
    const n = 300;
    for (let i = 0; i < n; i++) {
      const result = resolveSpell(SPELLS.fireball, caster, [enemy], 5, state);
      const dmg = 500 - (result.participantUpdates[0]?.updated.currentHP ?? 500);
      expect(dmg).toBeLessThanOrEqual(60); // 10d6 max
      total += dmg;
    }
    expect(total / n).toBeGreaterThan(30);
  });
});

describe('spells.resolveSpell — Hold Person (condition)', () => {
  it('applies paralyzed on a failed save', () => {
    const caster = makeCasterParticipant(makeCleric());
    // WIS 1 = modifier -5, save total will almost always be negative
    const enemy = makeEnemyParticipant();
    const state = makeState(caster, enemy);
    let appliedOnce = false;
    for (let i = 0; i < 200; i++) {
      const result = resolveSpell(SPELLS.hold_person, caster, [enemy], 2, state);
      const condLog = result.logEntries.find((l) => l.type === 'condition_applied');
      if (condLog) { appliedOnce = true; break; }
    }
    expect(appliedOnce).toBe(true);
  });

  it('does not apply condition when save succeeds', () => {
    const caster = makeCasterParticipant(makeCleric());
    // WIS 30 enemy: modifier +10, will always save vs DC 13
    const strongMindedEnemy = makeEnemyParticipant({
      enemyStats: {
        id: 'strong', name: 'Strong', cr: 1, ac: 10, maxHP: 20, speed: 30,
        // WIS 40 → modifier +15 → minimum save 1+15=16 > DC 13, always succeeds
        abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 40, charisma: 10 },
        initiativeBonus: 0, attacks: [], multiattackCount: 1, xp: 0, flavor: '', iconHint: '',
      },
    });
    const state = makeState(caster, strongMindedEnemy);
    for (let i = 0; i < 100; i++) {
      const result = resolveSpell(SPELLS.hold_person, caster, [strongMindedEnemy], 2, state);
      const condLog = result.logEntries.find((l) => l.type === 'condition_applied');
      expect(condLog).toBeUndefined();
    }
  });
});
