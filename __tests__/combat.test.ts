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
  chooseEnemyAction,
  averageAttackDamage,
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
      gold: 0,
      inventory: [],
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

describe('combat.chooseEnemyAction', () => {
  it('picks the attack with the highest average damage', () => {
    const enemy = makeEnemy({
      enemyStats: {
        ...ENEMIES.goblin,
        attacks: [
          { name: 'Weak Jab', attackBonus: 4, damageDice: '1d4', damageType: 'bludgeoning', range: 'melee' },
          { name: 'Heavy Slam', attackBonus: 4, damageDice: '3d10+5', damageType: 'bludgeoning', range: 'melee' },
          { name: 'Bite', attackBonus: 4, damageDice: '2d6+2', damageType: 'piercing', range: 'melee' },
        ],
      },
    });
    const state: CombatState = {
      participants: [makePlayer(), enemy],
      initiativeOrder: ['goblin', 'player'],
      currentTurnIndex: 0,
      round: 1,
      log: [],
      phase: 'in_progress',
    };
    const choice = chooseEnemyAction(enemy, state)!;
    expect(choice.attack.name).toBe('Heavy Slam');
    expect(choice.targetId).toBe('player');
  });

  it('averageAttackDamage computes NdS+B expectation', () => {
    expect(averageAttackDamage({ name: 'x', attackBonus: 0, damageDice: '2d6+2', damageType: 'slashing', range: 'melee' })).toBe(9);
    expect(averageAttackDamage({ name: 'x', attackBonus: 0, damageDice: '1d4', damageType: 'slashing', range: 'melee' })).toBe(2.5);
  });
});

describe('combat.enemy multiattack', () => {
  function seedEnemyTurn(multiattackCount: number, playerHP = 10000) {
    const { useCombatStore } = require('src/store/combatStore');
    const player = makePlayer({ currentHP: playerHP, maxHP: playerHP });
    const enemy = makeEnemy({
      id: 'wolf_1',
      currentHP: 10000,
      maxHP: 10000,
      enemyStats: { ...ENEMIES.goblin, multiattackCount },
    });
    useCombatStore.setState({
      state: {
        participants: [player, enemy],
        initiativeOrder: ['wolf_1', 'player'],
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

  const ATTACK_TYPES = ['attack_hit', 'attack_miss', 'critical_hit', 'critical_fail'];

  it('makes multiattackCount attacks in a single turn', () => {
    const store = seedEnemyTurn(3);
    store.getState().resolveEnemyTurn();
    const log = store.getState().state!.log;
    const attackEntries = log.filter((e: { type: string }) => ATTACK_TYPES.includes(e.type));
    expect(attackEntries).toHaveLength(3);
  });

  it('makes one attack when multiattackCount is 1', () => {
    const store = seedEnemyTurn(1);
    store.getState().resolveEnemyTurn();
    const log = store.getState().state!.log;
    expect(log.filter((e: { type: string }) => ATTACK_TYPES.includes(e.type))).toHaveLength(1);
  });

  it('stops attacking once the player falls', () => {
    // 1 HP player, 4 attacks that always hit hard enough to kill (unless nat 1):
    // after the death log there must never be another attack entry.
    for (let trial = 0; trial < 20; trial++) {
      const store = seedEnemyTurn(4, 1);
      const state = store.getState().state!;
      const enemy = state.participants.find((p: { id: string }) => p.id === 'wolf_1')!;
      enemy.enemyStats = {
        ...enemy.enemyStats!,
        attacks: [{ name: 'Doom', attackBonus: 100, damageDice: '10d10+100', damageType: 'bludgeoning', range: 'melee' as const }],
      };
      store.setState({ state: { ...state } });
      store.getState().resolveEnemyTurn();
      const log = store.getState().state!.log;
      const deathIdx = log.findIndex((e: { type: string }) => e.type === 'death');
      if (deathIdx >= 0) {
        const after = log.slice(deathIdx + 1);
        expect(after.filter((e: { type: string }) => ATTACK_TYPES.includes(e.type))).toHaveLength(0);
        expect(store.getState().state!.phase).toBe('defeat');
      }
    }
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
      gold: 0,
      inventory: [],
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

describe('combat.playerUsePotion', () => {
  function potionFighter(): CharacterStats {
    return {
      id: 'player',
      name: 'Fighter',
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
      maxHP: 30,
      currentHP: 30,
      speed: 30,
      proficientWeapons: ['simple', 'martial'],
      proficientSaves: ['strength', 'constitution'],
      savingThrowProficiencies: ['strength', 'constitution'],
      armor: null,
      shield: false,
      mainHand: WEAPONS.longsword,
      classFeatures: [],
      attacksPerAction: 1,
      gold: 0,
      inventory: [],
    };
  }

  // Seed the real combatStore with a wounded player holding `potionQty` healing
  // potions (2d4+2, heal 4..10). currentHP defaults below maxHP so a heal sticks.
  function seedPotionFight(potionQty: number, currentHP = 10, maxHP = 30) {
    const { useCombatStore } = require('src/store/combatStore');
    const stats: CharacterStats = {
      ...potionFighter(),
      maxHP,
      currentHP,
      inventory: potionQty > 0 ? [{ itemId: 'potion_healing', qty: potionQty }] : [],
    };
    const player = makePlayerParticipant(stats);
    player.ac = 15;
    player.currentHP = currentHP;
    player.maxHP = maxHP;
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

  it('heals within the potion dice bounds, decrements the stack, and spends the bonus action', () => {
    const store = seedPotionFight(2, 10, 30);
    store.getState().playerUsePotion();
    const p = store.getState().state!.participants[0];
    // 2d4+2 heals 4..10 from a base of 10
    expect(p.currentHP).toBeGreaterThanOrEqual(14);
    expect(p.currentHP).toBeLessThanOrEqual(20);
    expect(p.playerStats!.inventory.find((e: { itemId: string }) => e.itemId === 'potion_healing')!.qty).toBe(1);
    expect(p.actionsUsed).toContain('bonus_action');
  });

  it('refuses a second potion in the same turn (bonus action already spent)', () => {
    const store = seedPotionFight(2, 10, 30);
    store.getState().playerUsePotion();
    store.getState().playerUsePotion();
    const p = store.getState().state!.participants[0];
    // only one potion was consumed
    expect(p.playerStats!.inventory.find((e: { itemId: string }) => e.itemId === 'potion_healing')!.qty).toBe(1);
  });

  it('removes the stack entirely when the last potion is drunk', () => {
    const store = seedPotionFight(1, 10, 30);
    store.getState().playerUsePotion();
    const p = store.getState().state!.participants[0];
    expect(p.playerStats!.inventory.find((e: { itemId: string }) => e.itemId === 'potion_healing')).toBeUndefined();
  });

  it('is a no-op when the player holds no potion', () => {
    const store = seedPotionFight(0, 10, 30);
    store.getState().playerUsePotion();
    const p = store.getState().state!.participants[0];
    expect(p.currentHP).toBe(10);
    expect(p.actionsUsed).not.toContain('bonus_action');
  });

  it('never heals past maxHP', () => {
    const store = seedPotionFight(2, 29, 30);
    store.getState().playerUsePotion();
    const p = store.getState().state!.participants[0];
    expect(p.currentHP).toBe(30);
  });
});
