import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCharacterStore } from 'src/store/characterStore';
import { useCombatStore } from 'src/store/combatStore';
import { useCampaignStore } from 'src/store/campaignStore';
import { CombatParticipant, currentActor as getCurrentActor } from 'src/engine/combat';
import { CombatLog } from 'src/components/CombatLog';
import { InitiativeTracker } from 'src/components/InitiativeTracker';
import { ActionBar } from 'src/components/ActionBar';
import { SpellMenu } from 'src/components/SpellMenu';
import { HPBar } from 'src/components/HPBar';
import { colors, typography, spacing } from 'src/theme/theme';
import { SpellDefinition, SpellId, getSpell, SPELLS } from 'src/data/spellbook';
import { SpellSlotState } from 'src/engine/character';

const ENEMY_TURN_DELAY_MS = 1200;

export default function CombatScreen() {
  const router = useRouter();
  const character = useCharacterStore((s) => s.character);
  const state = useCombatStore((s) => s.state);
  const startCombat = useCombatStore((s) => s.startCombat);
  const playerAttack = useCombatStore((s) => s.playerAttack);
  const playerCastSpell = useCombatStore((s) => s.playerCastSpell);
  const playerEndTurn = useCombatStore((s) => s.playerEndTurn);
  const resolveEnemyTurn = useCombatStore((s) => s.resolveEnemyTurn);
  const clearCombat = useCombatStore((s) => s.clearCombat);
  const isAnimating = useCombatStore((s) => s.isAnimating);
  const syncFromCombat = useCharacterStore((s) => s.syncFromCombat);
  const recordFightVictory = useCampaignStore((s) => s.recordFightVictory);
  const recordDefeat = useCampaignStore((s) => s.recordDefeat);
  const currentEncounter = useCampaignStore((s) =>
    s.run && s.run.status === 'active' ? s.run.floorEncounters[s.run.fightIndex] : null,
  );
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [showSpellMenu, setShowSpellMenu] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!character) {
      router.replace('/');
      return;
    }
    if (!startedRef.current) {
      startedRef.current = true;
      const encounter = useCampaignStore.getState().getCurrentEncounter();
      if (!encounter) {
        router.replace('/');
        return;
      }
      startCombat(character, encounter.enemyIds);
    }
  }, [character, startCombat, router]);

  useEffect(() => {
    if (!state || state.phase !== 'in_progress') return;
    const actor = getCurrentActor(state);
    if (!actor || actor.isPlayer) return;
    if (actor.currentHP <= 0) return;
    const t = setTimeout(() => {
      resolveEnemyTurn();
    }, ENEMY_TURN_DELAY_MS);
    return () => clearTimeout(t);
  }, [state, resolveEnemyTurn]);

  if (!state) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Rolling for initiative…</Text>
      </SafeAreaView>
    );
  }

  const actor = getCurrentActor(state);
  const isPlayerTurn = !!actor?.isPlayer && state.phase === 'in_progress';
  const player = state.participants.find((p) => p.isPlayer);
  const enemies = state.participants.filter((p) => !p.isPlayer);
  const liveEnemies = enemies.filter((e) => e.currentHP > 0);
  const actionUsed = actor?.actionsUsed.includes('action') ?? false;
  const bonusActionUsed = actor?.actionsUsed.includes('bonus_action') ?? false;
  const knownSpellIds = player?.knownSpells ?? [];
  const knownSpells: SpellDefinition[] = knownSpellIds.map((id) => SPELLS[id]).filter(Boolean);
  const hasSpells = knownSpells.length > 0;
  const playerSpellSlots = player?.spellSlots ?? {};

  function handleAttackPressed() {
    if (liveEnemies.length === 1) {
      playerAttack(liveEnemies[0].id);
    } else if (liveEnemies.length > 1) {
      setShowTargetPicker(true);
    }
  }

  function handleTargetPicked(targetId: string) {
    setShowTargetPicker(false);
    playerAttack(targetId);
  }

  function handleSpellCast(spellId: SpellId, slotLevel: number) {
    setShowSpellMenu(false);
    const spell = getSpell(spellId);
    if (spell.effect.kind === 'heal') {
      if (player) {
        playerCastSpell(spellId, slotLevel, [player.id]);
      }
    } else {
      if (liveEnemies.length > 0) {
        playerCastSpell(spellId, slotLevel, [liveEnemies[0].id]);
      }
    }
  }

  function handleVictoryConfirm() {
    if (player) {
      syncFromCombat(player.currentHP, player.spellSlots);
    }
    const result = recordFightVictory();
    clearCombat();
    if (!result) {
      router.replace('/');
    } else if (result.leveledUp) {
      router.replace('/level-up');
    } else {
      // trash win or campaign complete — the campaign screen shows both
      router.replace('/campaign');
    }
  }

  function handleDefeatConfirm() {
    recordDefeat();
    clearCombat();
    router.replace('/campaign');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <InitiativeTracker
        participants={state.participants}
        order={state.initiativeOrder}
        currentIndex={state.currentTurnIndex}
      />

      <ScrollView
        style={styles.enemyPanel}
        contentContainerStyle={styles.enemyPanelContent}
        horizontal={enemies.length > 1}
        showsHorizontalScrollIndicator={false}
      >
        {enemies.map((e) => (
          <EnemyCard key={e.id} enemy={e} isCurrent={state.initiativeOrder[state.currentTurnIndex] === e.id} />
        ))}
      </ScrollView>

      <View style={styles.logArea}>
        <CombatLog entries={state.log} />
      </View>

      {player && <PlayerPanel player={player} />}

      <ActionBar
        isPlayerTurn={isPlayerTurn}
        isAnimating={isAnimating}
        actionUsed={actionUsed}
        bonusActionUsed={bonusActionUsed}
        hasLiveEnemies={liveEnemies.length > 0}
        hasSpells={hasSpells}
        onAttack={handleAttackPressed}
        onCastSpell={() => setShowSpellMenu(true)}
        onEndTurn={playerEndTurn}
      />

      <SpellMenu
        visible={showSpellMenu}
        spells={knownSpells}
        spellSlots={playerSpellSlots}
        actionUsed={actionUsed}
        bonusActionUsed={bonusActionUsed}
        onCast={handleSpellCast}
        onClose={() => setShowSpellMenu(false)}
      />

      <Modal visible={showTargetPicker} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Choose a Target</Text>
            {liveEnemies.map((e) => (
              <Pressable
                key={e.id}
                style={({ pressed }) => [styles.targetBtn, pressed && styles.pressed]}
                onPress={() => handleTargetPicked(e.id)}
              >
                <Text style={styles.targetName}>{e.name}</Text>
                <Text style={styles.targetSub}>
                  AC {e.ac} · {e.currentHP}/{e.maxHP} HP
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
              onPress={() => setShowTargetPicker(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={state.phase !== 'in_progress'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text
              style={[
                styles.endTitle,
                state.phase === 'victory' ? styles.victory : styles.defeat,
              ]}
            >
              {state.phase === 'victory' ? 'Victory!' : 'You have fallen…'}
            </Text>
            <Text style={styles.endText}>
              {state.phase === 'victory'
                ? `The dungeon is silent. For now.${currentEncounter ? `\n+${currentEncounter.xp.toLocaleString()} XP` : ''}`
                : 'Your run ends here. The tower keeps its dead.'}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed && styles.pressed]}
              onPress={state.phase === 'victory' ? handleVictoryConfirm : handleDefeatConfirm}
            >
              <Text style={styles.confirmText}>
                {state.phase === 'victory'
                  ? currentEncounter?.isBoss
                    ? 'Claim Your Level'
                    : 'Press On'
                  : 'Accept Your Fate'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function EnemyCard({ enemy, isCurrent }: { enemy: CombatParticipant; isCurrent: boolean }) {
  const dead = enemy.currentHP <= 0;
  const iconHint = enemy.enemyStats?.iconHint ?? '';
  return (
    <View
      style={[
        styles.enemyCard,
        isCurrent && styles.enemyCurrent,
        dead && styles.enemyDead,
      ]}
    >
      <Text style={styles.enemyIcon}>{enemyIcon(iconHint)}</Text>
      <Text style={[styles.enemyName, dead && styles.deadText]}>{enemy.name}</Text>
      <Text style={styles.enemyAc}>AC {enemy.ac}</Text>
      <HPBar current={enemy.currentHP} max={enemy.maxHP} height={12} />
      {enemy.conditions.length > 0 && (
        <View style={styles.conditionRow}>
          {enemy.conditions.map((c) => (
            <Text key={c} style={styles.condition}>
              {c}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function enemyIcon(hint: string): string {
  switch (hint) {
    case 'goblin':
      return '👺';
    case 'skeleton':
      return '💀';
    case 'orc':
      return '👹';
    case 'ghoul':
      return '🧟';
    case 'bugbear':
      return '🐻';
    default:
      return '❓';
  }
}

function PlayerPanel({ player }: { player: CombatParticipant }) {
  return (
    <View style={styles.playerPanel}>
      <View style={styles.playerHead}>
        <Text style={styles.playerName}>{player.name}</Text>
        <Text style={styles.playerAc}>AC {player.ac}</Text>
      </View>
      <HPBar current={player.currentHP} max={player.maxHP} height={18} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loading: {
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  enemyPanel: {
    maxHeight: 180,
    flexGrow: 0,
  },
  enemyPanelContent: {
    padding: spacing.md,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  enemyCard: {
    backgroundColor: colors.background.card,
    borderRadius: 8,
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: colors.accent.crimson,
    minWidth: 160,
    alignItems: 'center',
    gap: 4,
  },
  enemyCurrent: {
    borderColor: colors.accent.gold,
  },
  enemyDead: {
    opacity: 0.4,
  },
  enemyIcon: {
    fontSize: 32,
  },
  enemyName: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  enemyAc: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  conditionRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  condition: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.xs,
    backgroundColor: colors.background.elevated,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  deadText: {
    textDecorationLine: 'line-through',
    color: colors.text.dim,
  },
  logArea: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  playerPanel: {
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.background.elevated,
    gap: 4,
  },
  playerHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerName: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  playerAc: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.background.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.background.card,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.accent.gold,
    padding: spacing.lg,
    width: '90%',
    gap: spacing.sm,
  },
  modalTitle: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.serif,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  targetBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.elevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accent.crimson,
  },
  targetName: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  targetSub: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
  },
  cancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: colors.background.secondary,
  },
  cancelText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  endTitle: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.serif,
    fontWeight: '700',
    textAlign: 'center',
  },
  victory: {
    color: colors.accent.gold,
  },
  defeat: {
    color: colors.accent.crimson,
  },
  endText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginVertical: spacing.md,
    fontStyle: 'italic',
  },
  confirmBtn: {
    paddingVertical: spacing.md,
    backgroundColor: colors.accent.crimson,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent.gold,
  },
  confirmText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
