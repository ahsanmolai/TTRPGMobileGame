import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, hpColor, typography } from 'src/theme/theme';

interface HPBarProps {
  current: number;
  max: number;
  label?: string;
  height?: number;
  showNumbers?: boolean;
}

export function HPBar({ current, max, label, height = 16, showNumbers = true }: HPBarProps) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const fill = hpColor(current, max);
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.barBg, { height }]}>
        <View
          style={[
            styles.barFill,
            { width: `${ratio * 100}%`, backgroundColor: fill, height },
          ]}
        />
        {showNumbers && (
          <Text style={styles.numbers}>
            {current} / {max}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    marginBottom: 4,
  },
  barBg: {
    width: '100%',
    backgroundColor: colors.background.secondary,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.background.elevated,
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 4,
  },
  numbers: {
    color: colors.text.primary,
    fontSize: typography.fontSize.xs,
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
