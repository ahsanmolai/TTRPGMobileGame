import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, spacing } from 'src/theme/theme';

interface ActionBarProps {
  isPlayerTurn: boolean;
  isAnimating: boolean;
  actionUsed: boolean;
  bonusActionUsed: boolean;
  hasLiveEnemies: boolean;
  hasSpells: boolean;
  onAttack: () => void;
  onCastSpell: () => void;
  onEndTurn: () => void;
}

export function ActionBar({
  isPlayerTurn,
  isAnimating,
  actionUsed,
  bonusActionUsed,
  hasLiveEnemies,
  hasSpells,
  onAttack,
  onCastSpell,
  onEndTurn,
}: ActionBarProps) {
  const disabled = !isPlayerTurn || isAnimating;
  const attackDisabled = disabled || actionUsed || !hasLiveEnemies;
  const spellDisabled = disabled || (actionUsed && bonusActionUsed);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onAttack}
        disabled={attackDisabled}
        style={({ pressed }) => [
          styles.button,
          styles.attack,
          attackDisabled && styles.disabled,
          pressed && !attackDisabled && styles.pressed,
        ]}
      >
        <Text style={styles.buttonText}>⚔ Attack</Text>
        <View style={[styles.pip, actionUsed ? styles.pipUsed : styles.pipAvailable]} />
      </Pressable>
      {hasSpells && (
        <Pressable
          onPress={onCastSpell}
          disabled={spellDisabled}
          style={({ pressed }) => [
            styles.button,
            styles.spells,
            spellDisabled && styles.disabled,
            pressed && !spellDisabled && styles.pressed,
          ]}
        >
          <Text style={styles.buttonText}>✨ Spells</Text>
          <View style={[styles.pip, bonusActionUsed && actionUsed ? styles.pipUsed : styles.pipAvailable]} />
        </Pressable>
      )}
      <Pressable
        onPress={onEndTurn}
        disabled={disabled}
        style={({ pressed }) => [
          styles.button,
          styles.endTurn,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <Text style={styles.buttonText}>End Turn</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.background.elevated,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  attack: {
    backgroundColor: colors.accent.crimson,
    borderColor: colors.accent.gold,
  },
  spells: {
    backgroundColor: colors.accent.sapphire,
    borderColor: colors.accent.gold,
  },
  endTurn: {
    backgroundColor: colors.background.elevated,
    borderColor: colors.accent.silver,
  },
  buttonText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  pip: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pipAvailable: {
    backgroundColor: colors.text.success,
  },
  pipUsed: {
    backgroundColor: colors.text.dim,
  },
});
