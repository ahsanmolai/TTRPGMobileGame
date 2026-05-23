import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { CombatParticipant } from 'src/engine/combat';
import { colors, typography, spacing } from 'src/theme/theme';

interface InitiativeTrackerProps {
  participants: CombatParticipant[];
  order: string[];
  currentIndex: number;
}

export function InitiativeTracker({
  participants,
  order,
  currentIndex,
}: InitiativeTrackerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {order.map((id, idx) => {
        const p = participants.find((x) => x.id === id);
        if (!p) return null;
        const isActive = idx === currentIndex;
        const isDead = p.currentHP <= 0;
        return (
          <View
            key={id}
            style={[
              styles.chip,
              isActive && styles.active,
              isDead && styles.dead,
              p.isPlayer ? styles.playerChip : styles.enemyChip,
            ]}
          >
            <Text style={[styles.name, isDead && styles.deadText]} numberOfLines={1}>
              {p.name}
            </Text>
            <Text style={styles.initiative}>init {p.initiativeRoll}</Text>
            <Text style={[styles.hp, isDead && styles.deadText]}>
              {p.currentHP}/{p.maxHP}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    minWidth: 84,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.background.elevated,
    backgroundColor: colors.background.card,
    alignItems: 'center',
  },
  playerChip: {
    borderColor: colors.accent.sapphire,
  },
  enemyChip: {
    borderColor: colors.accent.crimson,
  },
  active: {
    borderColor: colors.accent.gold,
    borderWidth: 2,
    backgroundColor: colors.background.elevated,
  },
  dead: {
    opacity: 0.4,
  },
  name: {
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  initiative: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
  },
  hp: {
    color: colors.text.danger,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  deadText: {
    textDecorationLine: 'line-through',
    color: colors.text.dim,
  },
});
