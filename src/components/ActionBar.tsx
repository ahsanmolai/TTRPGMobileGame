import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, spacing } from 'src/theme/theme';

export interface AbilityButtonState {
  name: string;
  disabled: boolean;
  /** Highlighted state, e.g. smite armed or rage active. */
  active: boolean;
  /** Remaining uses to display, if the ability is limited. */
  usesLeft?: number;
}

interface ActionBarProps {
  isPlayerTurn: boolean;
  isAnimating: boolean;
  actionUsed: boolean;
  bonusActionUsed: boolean;
  hasLiveEnemies: boolean;
  hasSpells: boolean;
  ability?: AbilityButtonState | null;
  onAttack: () => void;
  onCastSpell: () => void;
  onUseAbility?: () => void;
  onEndTurn: () => void;
}

export function ActionBar({
  isPlayerTurn,
  isAnimating,
  actionUsed,
  bonusActionUsed,
  hasLiveEnemies,
  hasSpells,
  ability,
  onAttack,
  onCastSpell,
  onUseAbility,
  onEndTurn,
}: ActionBarProps) {
  const disabled = !isPlayerTurn || isAnimating;
  const attackDisabled = disabled || actionUsed || !hasLiveEnemies;
  const spellDisabled = disabled || (actionUsed && bonusActionUsed);
  const abilityDisabled = disabled || !!ability?.disabled;

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
      {ability && (
        <Pressable
          onPress={onUseAbility}
          disabled={abilityDisabled}
          style={({ pressed }) => [
            styles.button,
            styles.abilityBtn,
            ability.active && styles.abilityActive,
            abilityDisabled && styles.disabled,
            pressed && !abilityDisabled && styles.pressed,
          ]}
        >
          <Text style={styles.abilityText} numberOfLines={1}>
            {ability.name}
          </Text>
          {ability.usesLeft !== undefined && (
            <Text style={styles.usesText}>×{ability.usesLeft}</Text>
          )}
        </Pressable>
      )}
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
  abilityBtn: {
    backgroundColor: colors.accent.emerald,
    borderColor: colors.accent.gold,
  },
  abilityActive: {
    backgroundColor: colors.accent.gold,
    borderColor: colors.text.primary,
  },
  abilityText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  usesText: {
    position: 'absolute',
    bottom: 2,
    right: 6,
    color: colors.text.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    opacity: 0.85,
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
