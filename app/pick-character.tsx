import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PRESET_CHARACTERS, presetAC } from 'src/data/presetCharacters';
import { useCharacterStore } from 'src/store/characterStore';
import { getModifier } from 'src/engine/character';
import { colors, typography, spacing } from 'src/theme/theme';
import { CharacterStats } from 'src/engine/character';

const FLAVORS: Record<string, string> = {
  thorin: 'A stout Dwarf Fighter with axe, shield, and the unbreakable resolve of the mountain.',
  lyra: 'A nimble Halfling Rogue who strikes from the shadows with deadly precision.',
  aldwin: 'A Human Cleric of the Dawn, blessed by light and steeled by faith.',
};

const ICONS: Record<string, string> = {
  thorin: '🛡️',
  lyra: '🗡️',
  aldwin: '⚜️',
};

export default function PickCharacter() {
  const router = useRouter();
  const select = useCharacterStore((s) => s.selectCharacter);
  const [pickedId, setPickedId] = useState<string | null>(PRESET_CHARACTERS[0].id);

  function confirm() {
    if (!pickedId) return;
    select(pickedId);
    router.push('/combat');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Hero</Text>
        <Text style={styles.subtitle}>Each is forged for a different style of war.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.cardList}>
        {PRESET_CHARACTERS.map((c) => (
          <CharacterCard
            key={c.id}
            character={c}
            picked={c.id === pickedId}
            onPick={() => setPickedId(c.id)}
          />
        ))}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.confirm,
          !pickedId && styles.disabled,
          pressed && pickedId && styles.pressed,
        ]}
        onPress={confirm}
        disabled={!pickedId}
      >
        <Text style={styles.confirmText}>Enter the Fray</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function CharacterCard({
  character,
  picked,
  onPick,
}: {
  character: CharacterStats;
  picked: boolean;
  onPick: () => void;
}) {
  const ac = presetAC(character);
  const a = character.abilityScores;
  return (
    <Pressable
      onPress={onPick}
      style={({ pressed }) => [styles.card, picked && styles.cardPicked, pressed && styles.pressed]}
    >
      <View style={styles.cardHead}>
        <Text style={styles.cardIcon}>{ICONS[character.id]}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{character.name}</Text>
          <Text style={styles.cardClass}>
            Level {character.level} {capitalize(character.race)} {capitalize(character.classId)}
          </Text>
        </View>
      </View>

      <Text style={styles.flavor}>{FLAVORS[character.id]}</Text>

      <View style={styles.statRow}>
        <Stat label="HP" value={character.maxHP} />
        <Stat label="AC" value={ac} />
        <Stat label="Weapon" value={character.mainHand.name} small />
      </View>

      <View style={styles.abilityRow}>
        <AbilityChip name="STR" score={a.strength} />
        <AbilityChip name="DEX" score={a.dexterity} />
        <AbilityChip name="CON" score={a.constitution} />
        <AbilityChip name="INT" score={a.intelligence} />
        <AbilityChip name="WIS" score={a.wisdom} />
        <AbilityChip name="CHA" score={a.charisma} />
      </View>
    </Pressable>
  );
}

function Stat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, small && styles.statValueSmall]}>{value}</Text>
    </View>
  );
}

function AbilityChip({ name, score }: { name: string; score: number }) {
  const mod = getModifier(score);
  const sign = mod >= 0 ? '+' : '';
  return (
    <View style={styles.ability}>
      <Text style={styles.abilityName}>{name}</Text>
      <Text style={styles.abilityScore}>{score}</Text>
      <Text style={styles.abilityMod}>
        ({sign}
        {mod})
      </Text>
    </View>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    color: colors.accent.gold,
    fontFamily: typography.fontFamily.serif,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  cardList: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: 10,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.background.elevated,
  },
  cardPicked: {
    borderColor: colors.accent.gold,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardName: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.serif,
    fontWeight: '700',
  },
  cardClass: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  flavor: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    backgroundColor: colors.background.elevated,
    borderRadius: 4,
  },
  statLabel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  statValue: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  statValueSmall: {
    fontSize: typography.fontSize.sm,
  },
  abilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  ability: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    backgroundColor: colors.background.secondary,
    borderRadius: 4,
  },
  abilityName: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  abilityScore: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  abilityMod: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
  },
  confirm: {
    margin: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent.crimson,
    borderWidth: 2,
    borderColor: colors.accent.gold,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    letterSpacing: 1,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
