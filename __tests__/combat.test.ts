import {
  CombatParticipant,
  CombatState,
  applyDamage,
  applyCondition,
  removeCondition,
  checkConditionModifiers,
  resolveAttack,
  rollInitiative,
  sortInitiativeOrder,
  advanceTurn,
  checkCombatEnd,
  makePlayerParticipant,
  makeEnemyParticipant,
} from 'src/engine/combat';
import { CharacterStats } from 'src/engine/character';
import { WEAPONS } from 'src/data/weapons';
import { ENEMIES } from 'src/data/enemies';

function makePlayer(overrides: Partial<CombatParticipant> = {}): CombatParticipant {
  return {
    id: 'player',
    name: 'Player',
    isPlayer: true,
    currentHP: 20,
    maxHP: 20,
    ac: 15,
    initiativeRoll: 0,
    initiativeBonus: 2,
    dexterity: 14,
    conditions: [],
    actionsUsed: [],
    ...overrides,
  };
}

function makeEnemy(overrides: Partial<CombatParticipant> = {}): CombatParticipant {
  return {
    id: 'goblin',
    name: 'Goblin',
    isPlayer: false,
    currentHP: 7,
    maxHP: 7,
    ac: 15,
    initiativeRoll: 0,
    initiativeBonus: 2,
    dexterity: 14,
    conditions: [],
    actionsUsed: [],
    ...overrides,
  };
}

describe('combat.applyDamage', () => {
  it('reduces HP', () => {
    const p = makePlayer();
    const updated = applyDamage(p, 5);
    expect(updated.currentHP).toBe(15);
  });

  it('does not reduce below 0', () => {
    const p = makePlayer({ currentHP: 3 });
    const updated = applyDamage(p, 10);
    expect(updated.currentHP).toBe(0);
  });

  it('marks player unconscious at 0 HP', () => {
    const p = makePlayer({ currentHP: 1 });
    const updated = applyDamage(p, 5);
    expect(updated.conditions).toContain('unconscious');
  });

  it('marks enemy dead at 0 HP', () => {
    const e = makeEnemy({ currentHP: 1 });
    const updated = applyDamage(e, 5);
    expect(updated.conditions).toContain('dead');
  });
});

describe('combat.condition modifiers', () => {
  it('poisoned attacker has disadvantage', () => {
    const a = makePlayer({ conditions: ['poisoned'] });
    const t = makeEnemy();
    expect(checkConditionModifiers(a, t)).toEqual({ advantage: false, disadvantage: true });
  });

  it('prone target + melee = advantage', () => {
    const a = makePlayer();
    const t = makeEnemy({ conditions: ['prone'] });
    expect(checkConditionModifiers(a, t, 'melee')).toEqual({ advantage: true, disadvantage: false });
  });

  it('prone target + ranged = disadvantage', () => {
    const a = makePlayer();
    const t = makeEnemy({ conditions: ['prone'] });
    expect(checkConditionModifiers(a, t, 'ranged')).toEqual({ advantage: false, disadvantage: true });
  });

  it('stunned target = advantage', () => {
    const a = makePlayer();
    const t = makeEnemy({ conditions: ['stunned'] });
    expect(checkConditionModifiers(a, t)).toEqual({ advantage: true, disadvantage: false });
  });
});

describe('combat.resolveAttack', () => {
  it('natural 20 always crits and hits regardless of AC', () => {
    // Run many iterations until we see a natural 20
    const a = makePlayer();
    const t = makeEnemy({ ac: 100 });
    let foundCrit = false;
    for (let i = 0; i < 2000; i++) {
      const r = resolveAttack({
        attacker: a,
        target: t,
        attackBonus: 0,
        damageDice: '1d8',
        damageBonus: 0,
      });
      if (r.attackRoll === 20) {
        expect(r.critical).toBe(true);
        expect(r.hit).toBe(true);
        expect(r.damageRolls?.length).toBe(2); // doubled dice
        foundCrit = true;
        break;
      }
    }
    expect(foundCrit).toBe(true);
  });

  it('natural 1 always misses regardless of bonus', () => {
    const a = makePlayer();
    const t = makeEnemy({ ac: 1 });
    let foundFail = false;
    for (let i = 0; i < 2000; i++) {
      const r = resolveAttack({
        attacker: a,
        target: t,
        attackBonus: 100,
        damageDice: '1d8',
        damageBonus: 0,
      });
      if (r.attackRoll === 1) {
        expect(r.criticalFail).toBe(true);
        expect(r.hit).toBe(false);
        expect(r.damage).toBeUndefined();
        foundFail = true;
        break;
      }
    }
    expect(foundFail).toBe(true);
  });
});

describe('combat.initiative', () => {
  it('rolls initiative for all participants', () => {
    const ps = [makePlayer(), makeEnemy()];
    const rolled = rollInitiative(ps);
    expect(rolled[0].initiativeRoll).toBeGreaterThanOrEqual(1 + ps[0].initiativeBonus);
    expect(rolled[0].initiativeRoll).toBeLessThanOrEqual(20 + ps[0].initiativeBonus);
  });

  it('sorts descending by initiative', () => {
    const ps = [
      makePlayer({ initiativeRoll: 10 }),
      makeEnemy({ initiativeRoll: 18 }),
      makeEnemy({ id: 'orc', initiativeRoll: 15 }),
    ];
    const order = sortInitiativeOrder(ps);
    expect(order).toEqual(['goblin', 'orc', 'player']);
  });

  it('player wins ties over enemies', () => {
    const ps = [
      makePlayer({ initiativeRoll: 15 }),
      makeEnemy({ initiativeRoll: 15 }),
    ];
    expect(sortInitiativeOrder(ps)).toEqual(['player', 'goblin']);
  });
});

describe('combat.advanceTurn', () => {
  function makeState(): CombatState {
    const a = makePlayer({ initiativeRoll: 18 });
    const b = makeEnemy({ initiativeRoll: 12 });
    return {
      participants: [a, b],
      initiativeOrder: ['player', 'goblin'],
      currentTurnIndex: 0,
      round: 1,
      log: [],
      phase: 'in_progress',
    };
  }

  it('moves to next participant', () => {
    const s = makeState();
    const next = advanceTurn(s);
    expect(next.currentTurnIndex).toBe(1);
    expect(next.round).toBe(1);
  });

  it('wraps around and increments round', () => {
    const s = { ...makeState(), currentTurnIndex: 1 };
    const next = advanceTurn(s);
    expect(next.currentTurnIndex).toBe(0);
    expect(next.round).toBe(2);
  });

  it('skips dead participants', () => {
    const s = makeState();
    s.participants[1] = { ...s.participants[1], currentHP: 0, conditions: ['dead'] };
    const next = advanceTurn(s);
    // skips goblin, wraps to player again
    expect(next.currentTurnIndex).toBe(0);
    expect(next.round).toBe(2);
  });
});

describe('combat.checkCombatEnd', () => {
  function makeState(player: CombatParticipant, enemies: CombatParticipant[]): CombatState {
    return {
      participants: [player, ...enemies],
      initiativeOrder: [player.id, ...enemies.map((e) => e.id)],
      currentTurnIndex: 0,
      round: 1,
      log: [],
      phase: 'in_progress',
    };
  }

  it('victory when all enemies dead', () => {
    const s = makeState(makePlayer(), [
      makeEnemy({ currentHP: 0, conditions: ['dead'] }),
    ]);
    expect(checkCombatEnd(s)).toBe('victory');
  });

  it('defeat when player at 0 HP', () => {
    const s = makeState(
      makePlayer({ currentHP: 0, conditions: ['unconscious'] }),
      [makeEnemy()],
    );
    expect(checkCombatEnd(s)).toBe('defeat');
  });

  it('in_progress when both sides have HP', () => {
    const s = makeState(makePlayer(), [makeEnemy()]);
    expect(checkCombatEnd(s)).toBe('in_progress');
  });
});

describe('combat.makePlayerParticipant + makeEnemyParticipant', () => {
  it('creates a player participant with init bonus from DEX', () => {
    const char: CharacterStats = {
      id: 'p1',
      name: 'Lyra',
      race: 'halfling',
      classId: 'rogue',
      level: 3,
      abilityScores: {
        strength: 10,
        dexterity: 16,
        constitution: 14,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      maxHP: 21,
      currentHP: 21,
      speed: 25,
      proficientWeapons: ['simple', 'martial'],
      proficientSaves: ['dexterity', 'intelligence'],
      savingThrowProficiencies: ['dexterity', 'intelligence'],
      armor: null,
      shield: false,
      mainHand: WEAPONS.shortsword,
      classFeatures: ['sneak_attack'],
      attacksPerAction: 1,
    };
    const p = makePlayerParticipant(char);
    expect(p.isPlayer).toBe(true);
    expect(p.maxHP).toBe(21);
    expect(p.initiativeBonus).toBe(3); // DEX 16 mod
  });

  it('creates an enemy participant from a stat block', () => {
    const p = makeEnemyParticipant(ENEMIES.goblin, '1');
    expect(p.isPlayer).toBe(false);
    expect(p.ac).toBe(15);
    expect(p.maxHP).toBe(7);
    expect(p.id).toBe('goblin_1');
  });
});

describe('combat.extra attack', () => {
  function makeFighter(attacksPerAction: number): CharacterStats {
    return {
      id: 'player',
      name: 'Fighter',
      race: 'human',
      classId: 'fighter',
      level: 5,
      abilityScores: {
        strength: 16,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      maxHP: 44,
      currentHP: 44,
      speed: 30,
      proficientWeapons: ['simple', 'martial'],
      proficientSaves: ['strength', 'constitution'],
      savingThrowProficiencies: ['strength', 'constitution'],
      armor: null,
      shield: false,
      mainHand: WEAPONS.longsword,
      classFeatures: [],
      attacksPerAction,
    };
  }

  function seedCombat(attacksPerAction: number) {
    const { useCombatStore } = require('src/store/combatStore');
    const player = makePlayerParticipant(makeFighter(attacksPerAction));
    player.ac = 15;
    // huge HP so the fight never ends mid-test
    const enemy = makeEnemyParticipant({ ...ENEMIES.goblin, maxHP: 10000 }, '1');
    useCombatStore.setState({
      state: {
        participants: [player, enemy],
        initiativeOrder: [player.id, enemy.id],
        currentTurnIndex: 0,
        round: 1,
        log: [],
        phase: 'in_progress' as const,
      },
      isAnimating: false,
      pendingAttack: null,
    });
    return useCombatStore;
  }

  it('with attacksPerAction 2, the action is spent on the second attack', () => {
    const store = seedCombat(2);
    store.getState().playerAttack('goblin_1');
    let p = store.getState().state!.participants[0];
    expect(p.attacksUsedThisTurn).toBe(1);
    expect(p.actionsUsed).not.toContain('action');

    store.getState().playerAttack('goblin_1');
    p = store.getState().state!.participants[0];
    expect(p.attacksUsedThisTurn).toBe(2);
    expect(p.actionsUsed).toContain('action');

    // a third attack is refused
    store.getState().playerAttack('goblin_1');
    p = store.getState().state!.participants[0];
    expect(p.attacksUsedThisTurn).toBe(2);
  });

  it('with attacksPerAction 1, a single attack spends the action', () => {
    const store = seedCombat(1);
    store.getState().playerAttack('goblin_1');
    const p = store.getState().state!.participants[0];
    expect(p.actionsUsed).toContain('action');
  });

  it('advanceTurn resets the attack counter', () => {
    const player = makePlayerParticipant(makeFighter(2));
    const enemy = makeEnemyParticipant(ENEMIES.goblin, '1');
    const state: CombatState = {
      participants: [{ ...player, attacksUsedThisTurn: 2, actionsUsed: ['action'] }, enemy],
      initiativeOrder: [player.id, enemy.id],
      currentTurnIndex: 1, // enemy's turn; advancing wraps back to the player
      round: 1,
      log: [],
      phase: 'in_progress',
    };
    const next = advanceTurn(state);
    const refreshed = next.participants.find((p) => p.id === player.id)!;
    expect(refreshed.attacksUsedThisTurn).toBe(0);
    expect(refreshed.actionsUsed).toEqual([]);
  });
});
