import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from 'src/theme/theme';
import { useCampaignStore } from 'src/store/campaignStore';
import { AbilityName, CharacterStats } from 'src/engine/character';
import { SPELLS } from 'src/data/spellbook';
import { CLASSES } from 'src/data/classes';

const ABILITY_LABELS: Record<AbilityName, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
};

export default function LevelUpScreen() {
  const router = useRouter();
  const summary = useCampaignStore((s) => s.lastLevelUp);

  useEffect(() => {
    if (!summary) router.replace('/campaign');
  }, [summary, router]);

  if (!summary) return null;
  const { before, after, newFloor } = summary;

  const gains = collectGains(before, after);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.banner}>LEVEL UP</Text>
        <Text style={styles.levelText}>
          {after.name} reaches Level {after.level}
        </Text>
        <Text style={styles.classText}>{CLASSES[after.classId].name}</Text>

        <View style={styles.gainList}>
          {gains.map((g, i) => (
            <View key={i} style={styles.gainRow}>
              <Text style={styles.gainIcon}>{g.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.gainTitle}>{g.title}</Text>
                {g.detail ? <Text style={styles.gainDetail}>{g.detail}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.restNote}>
          You rest in the stairwell — hit points and spell slots fully restored.
        </Text>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.confirm, pressed && styles.pressed]}
        onPress={() => router.replace('/campaign')}
      >
        <Text style={styles.confirmText}>Descend to Floor {newFloor}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

interface Gain {
  icon: string;
  title: string;
  detail?: string;
}

function collectGains(before: CharacterStats, after: CharacterStats): Gain[] {
  const gains: Gain[] = [];

  const hpGain = after.maxHP - before.maxHP;
  if (hpGain > 0) {
    gains.push({ icon: '❤️', title: `+${hpGain} max HP`, detail: `${before.maxHP} → ${after.maxHP}` });
  }

  const asiParts: string[] = [];
  for (const key of Object.keys(ABILITY_LABELS) as AbilityName[]) {
    const diff = after.abilityScores[key] - before.abilityScores[key];
    if (diff > 0) asiParts.push(`${ABILITY_LABELS[key]} ${before.abilityScores[key]} → ${after.abilityScores[key]}`);
  }
  if (asiParts.length > 0) {
    gains.push({ icon: '💪', title: 'Ability Score Improvement', detail: asiParts.join(' · ') });
  }

  if (after.attacksPerAction > before.attacksPerAction) {
    gains.push({
      icon: '⚔️',
      title: 'Extra Attack',
      detail: `${after.attacksPerAction} weapon attacks per action`,
    });
  }

  const newSpells = (after.knownSpells ?? []).filter((id) => !(before.knownSpells ?? []).includes(id));
  if (newSpells.length > 0) {
    gains.push({
      icon: '✨',
      title: newSpells.length === 1 ? 'New spell learned' : 'New spells learned',
      detail: newSpells.map((id) => SPELLS[id].name).join(', '),
    });
  }

  const slotChanges = describeSlotChanges(before, after);
  if (slotChanges) {
    gains.push({ icon: '🔮', title: 'Spell slots', detail: slotChanges });
  }

  const newFeatures = CLASSES[after.classId].progression[after.level - 1].features.filter(
    (f) => f !== 'Ability Score Improvement',
  );
  if (newFeatures.length > 0) {
    gains.push({ icon: '📜', title: 'Class features', detail: newFeatures.join(', ') });
  }

  if (gains.length === 0) {
    gains.push({ icon: '🛡️', title: 'You grow tougher', detail: 'Onward and upward.' });
  }
  return gains;
}

function describeSlotChanges(before: CharacterStats, after: CharacterStats): string | null {
  if (!after.spellSlots) return null;
  const parts: string[] = [];
  for (const [lvl, slot] of Object.entries(after.spellSlots)) {
    const prevMax = before.spellSlots?.[Number(lvl)]?.max ?? 0;
    if (slot.max !== prevMax) {
      parts.push(`L${lvl}: ${prevMax} → ${slot.max}`);
    }
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scroll: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  banner: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.serif,
    fontWeight: '700',
    letterSpacing: 6,
    marginTop: spacing.xl,
  },
  levelText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.serif,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  classText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
    marginBottom: spacing.lg,
  },
  gainList: {
    width: '100%',
    gap: spacing.sm,
  },
  gainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.background.elevated,
    padding: spacing.md,
  },
  gainIcon: {
    fontSize: 24,
  },
  gainTitle: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  gainDetail: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  restNote: {
    color: colors.text.dim,
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.lg,
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
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
