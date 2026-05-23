import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from 'src/theme/theme';

export default function MainMenu() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>TTRPG</Text>
        <Text style={styles.subtitle}>Combat of the d20</Text>
        <Text style={styles.flavor}>
          A turn-by-turn dungeon brawler{'\n'}forged from the rules of the world's
          oldest tabletop game.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={() => router.push('/pick-character')}
        >
          <Text style={styles.buttonText}>New Fight</Text>
        </Pressable>
      </View>
      <Text style={styles.footer}>v0.1 — Combat MVP</Text>
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
    marginTop: -spacing.xs,
    marginBottom: spacing.xl,
  },
  flavor: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.accent.crimson,
    borderWidth: 2,
    borderColor: colors.accent.gold,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  buttonText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.xl,
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
