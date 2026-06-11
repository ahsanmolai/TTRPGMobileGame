import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from 'src/theme/theme';
import { useCharacterStore } from 'src/store/characterStore';
import { useCampaignStore } from 'src/store/campaignStore';

export default function MainMenu() {
  const router = useRouter();
  const character = useCharacterStore((s) => s.character);
  const characterHydrated = useCharacterStore((s) => s._hasHydrated);
  const clearCharacter = useCharacterStore((s) => s.clearCharacter);
  const run = useCampaignStore((s) => s.run);
  const campaignHydrated = useCampaignStore((s) => s._hasHydrated);
  const abandonRun = useCampaignStore((s) => s.abandonRun);

  const hydrated = characterHydrated && campaignHydrated;
  const hasActiveRun = hydrated && !!character && run?.status === 'active';

  function newCampaign() {
    if (hasActiveRun) {
      abandonRun();
      clearCharacter();
    }
    router.push('/pick-character');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>TTRPG</Text>
        <Text style={styles.subtitle}>Combat of the d20</Text>
        <Text style={styles.flavor}>
          Twenty floors. Five battles each.{'\n'}Climb from level 1 to legend — or die trying.
        </Text>

        {hasActiveRun && (
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={() => router.push('/campaign')}
          >
            <Text style={styles.buttonText}>Continue Run — Floor {run!.floor}</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            hasActiveRun && styles.buttonSecondary,
            pressed && styles.pressed,
          ]}
          onPress={newCampaign}
        >
          <Text style={styles.buttonText}>
            {hasActiveRun ? 'Abandon & Start New' : 'New Campaign'}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.footer}>v0.2 — The Twenty Floors</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: 72,
    fontFamily: typography.fontFamily.serif,
    color: colors.accent.gold,
    fontWeight: '700',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.serif,
    fontStyle: 'italic',
    marginTop: -spacing.md,
  },
  flavor: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.accent.crimson,
    borderWidth: 2,
    borderColor: colors.accent.gold,
    borderRadius: 8,
    minWidth: 280,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: colors.background.card,
    borderColor: colors.accent.goldDim,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.serif,
    fontWeight: '700',
    letterSpacing: 2,
  },
  footer: {
    textAlign: 'center',
    color: colors.text.dim,
    fontSize: typography.fontSize.xs,
    paddingBottom: spacing.md,
  },
});
