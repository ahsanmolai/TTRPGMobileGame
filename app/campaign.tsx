import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from 'src/theme/theme';
import { useCharacterStore } from 'src/store/characterStore';
import { useCampaignStore } from 'src/store/campaignStore';
import { calculateAC } from 'src/engine/character';
import { CLASSES } from 'src/data/classes';
import { ENEMIES } from 'src/data/enemies';
import { FIGHTS_PER_FLOOR } from 'src/data/floors';
import { HPBar } from 'src/components/HPBar';

export default function CampaignScreen() {
  const router = useRouter();
  const character = useCharacterStore((s) => s.character);
  const clearCharacter = useCharacterStore((s) => s.clearCharacter);
  const run = useCampaignStore((s) => s.run);
  const abandonRun = useCampaignStore((s) => s.abandonRun);

  useEffect(() => {
    if (!run || !character) {
      router.replace('/');
    }
  }, [run, character, router]);

  if (!run || !character) return null;

  function newCampaign() {
    abandonRun();
    clearCharacter();
    router.replace('/pick-character');
  }

  if (run.status === 'complete') {
    return (
      <EndScreen
        title="The Tower Falls"
        titleColor={colors.accent.gold}
        body={`${character.name} has conquered all twenty floors.\n\n${run.xpTotal.toLocaleString()} XP earned. A legend is written.`}
        onNewCampaign={newCampaign}
        onMenu={() => router.replace('/')}
      />
    );
  }

  if (run.status === 'defeated') {
    return (
      <EndScreen
        title="The Run Ends"
        titleColor={colors.accent.crimson}
        body={`${character.name} fell on Floor ${run.floor}, fight ${run.fightIndex + 1}.\n\n${run.xpTotal.toLocaleString()} XP earned before the end. The tower keeps its dead.`}
        onNewCampaign={newCampaign}
        onMenu={() => router.replace('/')}
      />
    );
  }

  const encounter = run.floorEncounters[run.fightIndex];
  const enemyNames = describeEnemies(encounter.enemyIds);
  const xpRatio = run.floorXPRequirement > 0 ? run.floorXP / run.floorXPRequirement : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.floorLabel}>FLOOR</Text>
        <Text style={styles.floorNumber}>{run.floor}</Text>
        <Text style={styles.floorSub}>of 20</Text>

        <View style={styles.nodeRow}>
          {Array.from({ length: FIGHTS_PER_FLOOR }, (_, i) => {
            const cleared = i < run.fightIndex;
            const current = i === run.fightIndex;
            const isBoss = i === FIGHTS_PER_FLOOR - 1;
            return (
              <React.Fragment key={i}>
                {i > 0 && <View style={[styles.nodeLink, cleared && styles.nodeLinkCleared]} />}
                <View
                  style={[
                    styles.node,
                    cleared && styles.nodeCleared,
                    current && styles.nodeCurrent,
                    isBoss && styles.nodeBoss,
                  ]}
                >
                  <Text style={styles.nodeText}>{cleared ? '✓' : isBoss ? '💀' : i + 1}</Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>

        <View style={styles.xpBlock}>
          <View style={styles.xpHead}>
            <Text style={styles.xpLabel}>Floor XP</Text>
            <Text style={styles.xpValue}>
              {run.floorXP.toLocaleString()} / {run.floorXPRequirement.toLocaleString()}
            </Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.min(100, xpRatio * 100)}%` }]} />
          </View>
          <Text style={styles.xpHint}>Slay the floor boss to fill the bar and gain a level.</Text>
        </View>

        <View style={styles.encounterCard}>
          <Text style={styles.encounterLabel}>
            {encounter.isBoss ? '💀 BOSS FIGHT' : `Fight ${run.fightIndex + 1} of ${FIGHTS_PER_FLOOR}`}
          </Text>
          <Text style={styles.encounterEnemies}>{enemyNames}</Text>
          <Text style={styles.encounterXP}>Worth {encounter.xp.toLocaleString()} XP</Text>
        </View>

        <View style={styles.charCard}>
          <View style={styles.charHead}>
            <Text style={styles.charName}>{character.name}</Text>
            <Text style={styles.charLevel}>
              Lv {character.level} {CLASSES[character.classId].name}
            </Text>
          </View>
          <HPBar current={character.currentHP} max={character.maxHP} height={14} />
          <View style={styles.charStats}>
            <Text style={styles.charStat}>AC {calculateAC(character)}</Text>
            <Text style={styles.charStat}>
              {character.attacksPerAction > 1 ? `${character.attacksPerAction} attacks` : '1 attack'}
            </Text>
            {character.spellSlots && <Text style={styles.charStat}>{slotSummary(character.spellSlots)}</Text>}
            <Text style={styles.charStat}>{run.xpTotal.toLocaleString()} XP</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.battleBtn, pressed && styles.pressed]}
          onPress={() => router.push('/combat')}
        >
          <Text style={styles.battleText}>{encounter.isBoss ? 'Face the Boss' : 'Enter Battle'}</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.menuBtn, pressed && styles.pressed]} onPress={() => router.replace('/')}>
          <Text style={styles.menuText}>Retreat to Menu</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function describeEnemies(enemyIds: string[]): string {
  const counts = new Map<string, number>();
  for (const id of enemyIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()]
    .map(([id, n]) => (n > 1 ? `${n}× ${ENEMIES[id].name}` : ENEMIES[id].name))
    .join(' and ');
}

function slotSummary(slots: { [level: number]: { max: number; remaining: number } }): string {
  const parts = Object.entries(slots).map(([lvl, s]) => `L${lvl}: ${s.remaining}/${s.max}`);
  return parts.length > 0 ? `Slots ${parts.join(' ')}` : '';
}

function EndScreen({
  title,
  titleColor,
  body,
  onNewCampaign,
  onMenu,
}: {
  title: string;
  titleColor: string;
  body: string;
  onNewCampaign: () => void;
  onMenu: () => void;
}) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.endContent}>
        <Text style={[styles.endTitle, { color: titleColor }]}>{title}</Text>
        <Text style={styles.endBody}>{body}</Text>
        <Pressable style={({ pressed }) => [styles.battleBtn, pressed && styles.pressed]} onPress={onNewCampaign}>
          <Text style={styles.battleText}>New Campaign</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.menuBtn, pressed && styles.pressed]} onPress={onMenu}>
          <Text style={styles.menuText}>Return to Menu</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scroll: {
    padding: spacing.md,
    alignItems: 'center',
  },
  floorLabel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    letterSpacing: 4,
    marginTop: spacing.sm,
  },
  floorNumber: {
    color: colors.accent.gold,
    fontSize: 64,
    fontFamily: typography.fontFamily.serif,
    fontWeight: '700',
    lineHeight: 70,
  },
  floorSub: {
    color: colors.text.dim,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.md,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  node: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.card,
    borderWidth: 2,
    borderColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCleared: {
    borderColor: colors.accent.gold,
    backgroundColor: colors.background.elevated,
  },
  nodeCurrent: {
    borderColor: colors.accent.crimson,
    transform: [{ scale: 1.15 }],
  },
  nodeBoss: {
    borderStyle: 'solid',
  },
  nodeText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  nodeLink: {
    width: 16,
    height: 2,
    backgroundColor: colors.background.elevated,
  },
  nodeLinkCleared: {
    backgroundColor: colors.accent.gold,
  },
  xpBlock: {
    width: '100%',
    marginVertical: spacing.md,
    gap: spacing.xs,
  },
  xpHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpLabel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  xpValue: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  xpTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.background.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.background.elevated,
  },
  xpFill: {
    height: '100%',
    backgroundColor: colors.accent.gold,
  },
  xpHint: {
    color: colors.text.dim,
    fontSize: typography.fontSize.xs,
    fontStyle: 'italic',
  },
  encounterCard: {
    width: '100%',
    backgroundColor: colors.background.card,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.accent.crimson,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  encounterLabel: {
    color: colors.accent.crimson,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
    letterSpacing: 2,
  },
  encounterEnemies: {
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.serif,
    fontWeight: '700',
    textAlign: 'center',
  },
  encounterXP: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
  },
  charCard: {
    width: '100%',
    backgroundColor: colors.background.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.background.elevated,
    padding: spacing.md,
    gap: spacing.sm,
  },
  charHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charName: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.serif,
    fontWeight: '700',
  },
  charLevel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  charStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  charStat: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    backgroundColor: colors.background.elevated,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 3,
  },
  footer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  battleBtn: {
    paddingVertical: spacing.md,
    backgroundColor: colors.accent.crimson,
    borderWidth: 2,
    borderColor: colors.accent.gold,
    borderRadius: 8,
    alignItems: 'center',
  },
  battleText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    letterSpacing: 1,
  },
  menuBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  menuText: {
    color: colors.text.dim,
    fontSize: typography.fontSize.sm,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  endContent: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  endTitle: {
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.serif,
    fontWeight: '700',
    textAlign: 'center',
  },
  endBody: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
});
