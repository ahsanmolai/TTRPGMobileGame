// Auto-plays floors with naive policies to smoke-test that the campaign is
// survivable after the multiattack/spell/ability changes. Prints a win-rate
// table for manual FLOOR_TABLE tuning; assertion thresholds are deliberately
// loose to stay non-flaky.
import { buildCharacter, applyLevelUp, applyShortRest, CharacterBuild } from 'src/engine/leveling';
import { CharacterStats, SpellSlotState } from 'src/engine/character';
import { ClassId } from 'src/data/classes';
import { buildFloorEncounters } from 'src/data/floors';
import { currentActor } from 'src/engine/combat';
import { getClassAbility } from 'src/engine/classAbilities';
import { getSpell, SpellDefinition } from 'src/data/spellbook';
import { useCombatStore } from 'src/store/combatStore';

jest.setTimeout(120000);

const FLOORS = [1, 5, 10, 15, 20];
const CLASSES_UNDER_TEST: ClassId[] = ['fighter', 'wizard'];
const TRIALS = 20;

function makeCharacter(classId: ClassId, level: number): CharacterStats {
  const build: CharacterBuild = {
    id: `sim_${classId}`,
    name: `Sim ${classId}`,
    race: 'human',
    classId,
    abilityScores: {
      strength: classId === 'fighter' ? 15 : 8,
      dexterity: 13,
      constitution: 14,
      intelligence: classId === 'wizard' ? 15 : 10,
      wisdom: 12,
      charisma: classId === 'fighter' ? 8 : 10,
    },
  };
  let c = buildCharacter(build);
  while (c.level < level) c = applyLevelUp(c);
  return c;
}

function hasSlot(slots: SpellSlotState | undefined, level: number, cap = 9): boolean {
  if (!slots) return false;
  for (let lvl = level; lvl <= cap; lvl++) {
    if ((slots[lvl]?.remaining ?? 0) > 0) return true;
  }
  return false;
}

function lowestSlot(slots: SpellSlotState | undefined, level: number, cap = 9): number {
  for (let lvl = level; lvl <= cap; lvl++) {
    if ((slots?.[lvl]?.remaining ?? 0) > 0) return lvl;
  }
  return level;
}

function playPlayerTurn(character: CharacterStats, isBossFight: boolean) {
  const store = useCombatStore;
  const get = () => store.getState().state;
  const liveEnemies = () => get()!.participants.filter((p) => !p.isPlayer && p.currentHP > 0);

  let actor = currentActor(get()!)!;
  const ability = getClassAbility(character.classId, character.level);
  if (ability && !actor.actionsUsed.includes('bonus_action')) {
    if (ability.id === 'second_wind') {
      if (actor.currentHP < actor.maxHP / 2) store.getState().playerUseAbility();
    } else if (ability.id === 'rage') {
      if (!actor.raging) store.getState().playerUseAbility();
    } else if (ability.id === 'divine_smite') {
      if (!actor.smiteArmed) store.getState().playerUseAbility();
    } else if (ability.id === 'aim') {
      store.getState().playerUseAbility();
    } else if (ability.id === 'flurry_of_blows') {
      const t = liveEnemies()[0];
      if (t) store.getState().playerUseAbility(t.id);
    }
  }
  if (!get() || get()!.phase !== 'in_progress') return;

  // Cast: heal when hurt, otherwise the biggest damaging action spell
  actor = currentActor(get()!)!;
  if (actor.knownSpells && actor.knownSpells.length > 0 && !actor.actionsUsed.includes('action') && (actor.attacksUsedThisTurn ?? 0) === 0) {
    const spells = actor.knownSpells.map((id) => getSpell(id)).filter((sp) => sp.castingTime === 'action');
    // slot discipline: trash fights spend up to half-tier slots (and never
    // burn higher slots via upcast), bosses get everything
    const maxKnownSlot = Object.keys(actor.spellSlots ?? {}).reduce((m, k) => Math.max(m, Number(k)), 0);
    const maxSpendLevel = isBossFight ? 9 : Math.max(1, maxKnownSlot - 2);
    const castable = (sp: SpellDefinition) =>
      sp.level === 0 || (sp.level <= maxSpendLevel && hasSlot(actor.spellSlots, sp.level, maxSpendLevel));
    const heal = spells
      .filter((sp) => sp.effect.kind === 'heal' && castable(sp))
      .sort((a, b) => b.level - a.level)[0];
    const hold = spells
      .filter((sp) => sp.effect.kind === 'condition' && castable(sp))
      .sort((a, b) => a.level - b.level)[0];
    const nuke = spells
      .filter((sp) => sp.effect.kind !== 'heal' && sp.effect.kind !== 'condition' && castable(sp))
      .sort((a, b) => b.level - a.level)[0];

    const player = get()!.participants.find((p) => p.isPlayer)!;
    const enemies = liveEnemies();
    const unheldEnemy = enemies.find((e) => !e.conditions.includes('paralyzed'));
    if (heal && player.currentHP < player.maxHP * 0.4) {
      store.getState().playerCastSpell(heal.id, heal.level === 0 ? 0 : lowestSlot(actor.spellSlots, heal.level, maxSpendLevel), [player.id]);
    } else if (hold && unheldEnemy && enemies.length === 1 && !actor.concentrating) {
      // lock down a lone tough enemy before nuking it
      store.getState().playerCastSpell(hold.id, lowestSlot(actor.spellSlots, hold.level, maxSpendLevel), [unheldEnemy.id]);
    } else if (nuke) {
      const targets = nuke.targeting === 'all_enemies' ? enemies.map((e) => e.id) : [enemies[0]?.id].filter(Boolean) as string[];
      if (targets.length > 0) {
        store.getState().playerCastSpell(nuke.id, nuke.level === 0 ? 0 : lowestSlot(actor.spellSlots, nuke.level, maxSpendLevel), targets);
      }
    }
  }

  // Attack until the action is spent (Extra Attack loops here)
  let guard = 0;
  while (get() && get()!.phase === 'in_progress' && guard++ < 10) {
    const a = currentActor(get()!);
    if (!a || !a.isPlayer || a.actionsUsed.includes('action')) break;
    const t = liveEnemies()[0];
    if (!t) break;
    const before = a.attacksUsedThisTurn ?? 0;
    useCombatStore.getState().playerAttack(t.id);
    const after = currentActor(get()!);
    if (!after || (after.attacksUsedThisTurn ?? 0) === before) break;
  }

  if (get() && get()!.phase === 'in_progress') {
    const a = currentActor(get()!);
    if (a?.isPlayer) store.getState().playerEndTurn();
  }
}

/** Plays one fight; returns victory + the character carrying its post-fight HP/slots. */
function playFight(character: CharacterStats, enemyIds: string[], isBossFight: boolean): { won: boolean; char: CharacterStats } {
  const store = useCombatStore;
  store.getState().startCombat(character, enemyIds);
  let safety = 0;
  while (store.getState().state?.phase === 'in_progress' && safety++ < 400) {
    const cs = store.getState().state!;
    const actor = currentActor(cs);
    if (!actor) break;
    if (actor.isPlayer) playPlayerTurn(character, isBossFight);
    else store.getState().resolveEnemyTurn();
  }
  const st = store.getState().state!;
  const won = st.phase === 'victory';
  const playerP = st.participants.find((p) => p.isPlayer)!;
  const char: CharacterStats = {
    ...character,
    currentHP: Math.max(0, Math.min(character.maxHP, playerP.currentHP)),
    ...(playerP.spellSlots ? { spellSlots: playerP.spellSlots } : {}),
  };
  store.getState().clearCombat();
  return { won, char };
}

interface FloorStats {
  trashWins: number;
  trashFights: number;
  bossWins: number;
  bossFights: number;
  floorsCleared: number;
}

function simulateFloor(classId: ClassId, floor: number, stats: FloorStats) {
  let char = makeCharacter(classId, floor);
  const encounters = buildFloorEncounters(floor);
  for (let i = 0; i < encounters.length; i++) {
    const enc = encounters[i];
    if (enc.isBoss) stats.bossFights++;
    else stats.trashFights++;
    const { won, char: after } = playFight(char, enc.enemyIds, enc.isBoss);
    if (!won) return;
    if (enc.isBoss) stats.bossWins++;
    else stats.trashWins++;
    char = applyShortRest(after);
  }
  stats.floorsCleared++;
}

describe('balance smoke simulation', () => {
  it('floors 1/5/10/15/20 are survivable for a martial and a caster', () => {
    const rows: string[] = [];
    for (const classId of CLASSES_UNDER_TEST) {
      for (const floor of FLOORS) {
        const stats: FloorStats = { trashWins: 0, trashFights: 0, bossWins: 0, bossFights: 0, floorsCleared: 0 };
        for (let t = 0; t < TRIALS; t++) simulateFloor(classId, floor, stats);
        const trashRate = stats.trashFights ? stats.trashWins / stats.trashFights : 0;
        const bossRate = stats.bossFights ? stats.bossWins / stats.bossFights : 0;
        const clearRate = stats.floorsCleared / TRIALS;
        rows.push(
          `${classId.padEnd(8)} floor ${String(floor).padStart(2)}: trash ${(trashRate * 100).toFixed(0).padStart(3)}% (${stats.trashWins}/${stats.trashFights})  boss ${(bossRate * 100).toFixed(0).padStart(3)}% (${stats.bossWins}/${stats.bossFights})  floor cleared ${(clearRate * 100).toFixed(0)}%`,
        );
        // Loose, anti-flake bounds — the printed table is the real deliverable.
        // The martial holds the floor-clear bar; the caster (AC 12, no
        // defensive layer yet — loot/defensive spells are the next milestone)
        // is asserted on trash survivability only.
        if (classId === 'fighter') {
          expect(trashRate).toBeGreaterThanOrEqual(0.6);
          expect(clearRate).toBeGreaterThanOrEqual(0.2);
        } else {
          expect(trashRate).toBeGreaterThanOrEqual(0.35);
        }
      }
    }
    // eslint-disable-next-line no-console
    console.log('\n=== Balance smoke sim ===\n' + rows.join('\n') + '\n');
  });
});
