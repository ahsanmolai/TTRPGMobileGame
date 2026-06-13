import {
  getClassAbility,
  getRageDamageBonus,
  getSneakAttackDice,
  getMartialArtsDice,
  getKiPoints,
  getSmiteDice,
} from 'src/engine/classAbilities';
import { buildCharacter, applyLevelUp, CharacterBuild } from 'src/engine/leveling';
import { makePlayerParticipant, makeEnemyParticipant, CombatState, advanceTurn } from 'src/engine/combat';
import { CharacterStats } from 'src/engine/character';
import { ClassId } from 'src/data/classes';
import { ENEMIES } from 'src/data/enemies';
import { useCombatStore } from 'src/store/combatStore';

function makeBuild(classId: ClassId): CharacterBuild {
  return {
    id: `test_${classId}`,
    name: 'Test',
    race: 'human',
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

function levelTo(classId: ClassId, target: number): CharacterStats {
  let c = buildCharacter(makeBuild(classId));
  while (c.level < target) c = applyLevelUp(c);
  return c;
}

function seedCombat(character: CharacterStats, enemyOverrides: Record<string, unknown> = {}) {
  const player = makePlayerParticipant(character);
  player.ac = 15;
  const enemy = makeEnemyParticipant({ ...ENEMIES.goblin, maxHP: 100000 }, '1');
  Object.assign(enemy, enemyOverrides);
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
  return { store: useCombatStore, playerId: player.id, enemyId: enemy.id };
}

describe('classAbilities.progression data', () => {
  it('reads SRD resources from the progression tables', () => {
    expect(getRageDamageBonus(1)).toBe(2);
    expect(getRageDamageBonus(16)).toBe(4);
    expect(getSneakAttackDice(1)).toBe('1d6');
    expect(getSneakAttackDice(5)).toBe('3d6');
    expect(getMartialArtsDice(1)).toBe('1d4');
    expect(getMartialArtsDice(5)).toBe('1d6');
    expect(getKiPoints(1)).toBe(0);
    expect(getKiPoints(5)).toBe(5);
  });

  it('smite dice scale with slot level and cap at 5d8', () => {
    expect(getSmiteDice(1)).toBe('2d8');
    expect(getSmiteDice(3)).toBe('4d8');
    expect(getSmiteDice(4)).toBe('5d8');
    expect(getSmiteDice(9)).toBe('5d8');
  });

  it('assigns the right ability per class', () => {
    expect(getClassAbility('barbarian', 1)?.id).toBe('rage');
    expect(getClassAbility('fighter', 1)?.id).toBe('second_wind');
    expect(getClassAbility('rogue', 1)?.id).toBe('aim');
    expect(getClassAbility('paladin', 1)?.id).toBe('divine_smite');
    expect(getClassAbility('monk', 1)).toBeNull(); // no ki until level 2
    expect(getClassAbility('monk', 2)?.id).toBe('flurry_of_blows');
    expect(getClassAbility('wizard', 20)).toBeNull();
    expect(getClassAbility('cleric', 20)).toBeNull();
  });
});

describe('classAbilities.rage', () => {
  it('activates once, spends the bonus action, and halves incoming weapon damage', () => {
    const { store, playerId } = seedCombat(levelTo('barbarian', 5));
    store.getState().playerUseAbility();
    let player = store.getState().state!.participants.find((p) => p.id === playerId)!;
    expect(player.raging).toBe(true);
    expect(player.abilityUsesRemaining).toBe(0);
    expect(player.actionsUsed).toContain('bonus_action');

    // second activation refused
    store.getState().playerUseAbility();
    player = store.getState().state!.participants.find((p) => p.id === playerId)!;
    expect(store.getState().state!.log.filter((l) => l.text.includes('RAGE'))).toHaveLength(1);

    // incoming weapon damage is halved: give the enemy a flat, always-hitting attack
    const state = store.getState().state!;
    const participants = state.participants.map((p) =>
      p.isPlayer
        ? p
        : {
            ...p,
            enemyStats: {
              ...p.enemyStats!,
              multiattackCount: 1,
              attacks: [{ name: 'Slam', attackBonus: 100, damageDice: '1d1+9', damageType: 'bludgeoning' as const, range: 'melee' as const }],
            },
          },
    );
    store.setState({ state: { ...state, participants, currentTurnIndex: 1 } });
    const hpBefore = player.currentHP;
    store.getState().resolveEnemyTurn();
    const after = store.getState().state!.participants.find((p) => p.id === playerId)!;
    const taken = hpBefore - after.currentHP;
    if (taken > 0) {
      expect(taken).toBe(5); // floor(10 / 2)
      expect(store.getState().state!.log.some((l) => l.text.includes('rage halves it'))).toBe(true);
    }
  });
});

describe('classAbilities.second wind', () => {
  it('heals 1d10+level once per fight', () => {
    const fighter = levelTo('fighter', 5);
    const wounded = { ...fighter, currentHP: 1 };
    const { store, playerId } = seedCombat(wounded);
    store.getState().playerUseAbility();
    const player = store.getState().state!.participants.find((p) => p.id === playerId)!;
    const healed = player.currentHP - 1;
    expect(healed).toBeGreaterThanOrEqual(6); // 1 + 5
    expect(healed).toBeLessThanOrEqual(15); // 10 + 5
    expect(player.abilityUsesRemaining).toBe(0);

    store.getState().playerUseAbility();
    const again = store.getState().state!.participants.find((p) => p.id === playerId)!;
    expect(again.currentHP).toBe(player.currentHP); // refused
  });
});

describe('classAbilities.aim + sneak attack', () => {
  it('aim grants advantage and the hit adds sneak attack dice once per turn', () => {
    // Enemy AC 0-ish so attacks always hit: sneak damage shows up reliably.
    const rogue = levelTo('rogue', 5); // 3d6 sneak
    const { store, enemyId } = seedCombat(rogue, { ac: 1 });
    store.getState().playerUseAbility(); // aim
    const aimed = store.getState().state!.participants[0];
    expect(aimed.aimAdvantage).toBe(true);

    store.getState().playerAttack(enemyId);
    const log = store.getState().state!.log;
    const sneakLog = log.find((l) => l.text.includes('Sneak Attack'));
    expect(sneakLog).toBeDefined();
    expect(sneakLog!.text).toContain('3d6');
    const after = store.getState().state!.participants[0];
    expect(after.aimAdvantage).toBe(false);
    expect(after.sneakAttackUsedThisTurn).toBe(true);
  });

  it('no sneak attack without advantage', () => {
    const rogue = levelTo('rogue', 5);
    const { store, enemyId } = seedCombat(rogue, { ac: 1 });
    store.getState().playerAttack(enemyId); // no aim, clean target: no advantage
    const log = store.getState().state!.log;
    expect(log.find((l) => l.text.includes('Sneak Attack'))).toBeUndefined();
  });

  it('sneak attack also triggers against debilitated targets', () => {
    const rogue = levelTo('rogue', 3);
    const { store, enemyId } = seedCombat(rogue, { ac: 1, conditions: ['stunned'] });
    store.getState().playerAttack(enemyId);
    const log = store.getState().state!.log;
    expect(log.find((l) => l.text.includes('Sneak Attack'))).toBeDefined();
  });

  it('the per-turn flag resets when the turn comes around', () => {
    const rogue = levelTo('rogue', 3);
    const player = makePlayerParticipant(rogue);
    const enemy = makeEnemyParticipant(ENEMIES.goblin, '1');
    const state: CombatState = {
      participants: [{ ...player, sneakAttackUsedThisTurn: true, aimAdvantage: true }, enemy],
      initiativeOrder: [player.id, enemy.id],
      currentTurnIndex: 1,
      round: 1,
      log: [],
      phase: 'in_progress',
    };
    const next = advanceTurn(state);
    const refreshed = next.participants.find((p) => p.id === player.id)!;
    expect(refreshed.sneakAttackUsedThisTurn).toBe(false);
    expect(refreshed.aimAdvantage).toBe(false);
  });
});

describe('classAbilities.divine smite', () => {
  it('arming smite spends the lowest slot on the next melee hit, with capped dice', () => {
    const paladin = levelTo('paladin', 5); // slots {1:4, 2:2}
    const { store, enemyId } = seedCombat(paladin, { ac: 1 });
    store.getState().playerUseAbility(); // arm (toggle, no bonus action)
    let player = store.getState().state!.participants[0];
    expect(player.smiteArmed).toBe(true);
    expect(player.actionsUsed).not.toContain('bonus_action');

    store.getState().playerAttack(enemyId);
    player = store.getState().state!.participants[0];
    const log = store.getState().state!.log;
    const smiteLog = log.find((l) => l.text.includes('Divine Smite'));
    if (smiteLog) {
      // hit: slot spent, disarmed
      expect(smiteLog.text).toContain('level-1 slot');
      expect(player.spellSlots![1].remaining).toBe(3);
      expect(player.smiteArmed).toBe(false);
    } else {
      // natural-1 miss: stays armed, slot kept
      expect(player.spellSlots![1].remaining).toBe(4);
      expect(player.smiteArmed).toBe(true);
    }
  });

  it('toggling twice disarms without cost', () => {
    const { store } = seedCombat(levelTo('paladin', 3));
    store.getState().playerUseAbility();
    store.getState().playerUseAbility();
    const player = store.getState().state!.participants[0];
    expect(player.smiteArmed).toBe(false);
  });
});

describe('classAbilities.flurry of blows', () => {
  it('spends 1 ki and a bonus action for two extra strikes', () => {
    const monk = levelTo('monk', 5); // 5 ki, 1d6 martial arts
    const { store, enemyId } = seedCombat(monk, { ac: 1 });
    store.getState().playerUseAbility(enemyId);
    const player = store.getState().state!.participants[0];
    expect(player.abilityUsesRemaining).toBe(4);
    expect(player.actionsUsed).toContain('bonus_action');
    const log = store.getState().state!.log;
    expect(log.some((l) => l.text.includes('Flurry of Blows'))).toBe(true);
    const strikes = log.filter((l) => l.text.includes('flurry strike'));
    expect(strikes).toHaveLength(2);
  });

  it('refused with no ki remaining', () => {
    const monk = levelTo('monk', 2); // 2 ki
    const { store, enemyId } = seedCombat(monk, { ac: 1 });
    const turnReset = () => {
      const s = store.getState().state!;
      store.setState({
        state: {
          ...s,
          participants: s.participants.map((p, i) => (i === 0 ? { ...p, actionsUsed: [] } : p)),
        },
      });
    };
    store.getState().playerUseAbility(enemyId);
    turnReset();
    store.getState().playerUseAbility(enemyId);
    turnReset();
    store.getState().playerUseAbility(enemyId); // out of ki — refused
    const log = store.getState().state!.log;
    expect(log.filter((l) => l.text.includes('Flurry of Blows'))).toHaveLength(2);
  });
});

describe('classAbilities.participant initialization', () => {
  it('initializes per-fight resources from the class', () => {
    expect(makePlayerParticipant(levelTo('barbarian', 1)).abilityUsesRemaining).toBe(1);
    expect(makePlayerParticipant(levelTo('fighter', 1)).abilityUsesRemaining).toBe(1);
    expect(makePlayerParticipant(levelTo('monk', 5)).abilityUsesRemaining).toBe(5);
    expect(makePlayerParticipant(levelTo('rogue', 1)).abilityUsesRemaining).toBeUndefined(); // unlimited
    expect(makePlayerParticipant(levelTo('wizard', 1)).abilityUsesRemaining).toBe(0); // no ability
  });
});
