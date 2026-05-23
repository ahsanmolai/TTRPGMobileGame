import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { CombatLogEntry } from 'src/engine/combat';
import { colors, typography, spacing } from 'src/theme/theme';

interface CombatLogProps {
  entries: CombatLogEntry[];
}

export function CombatLog({ entries }: CombatLogProps) {
  const listRef = useRef<FlatList<CombatLogEntry>>(null);
  useEffect(() => {
    if (entries.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [entries.length]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.entry}>
            <Text style={[styles.text, { color: colors.log[item.type] ?? colors.text.primary }, item.type === 'death' && styles.deathText]}>
              {item.text}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.background.elevated,
    padding: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.sm,
  },
  entry: {
    paddingVertical: 2,
  },
  text: {
    fontSize: typography.fontSize.sm,
    lineHeight: 18,
  },
  deathText: {
    textDecorationLine: 'line-through',
    color: colors.text.dim,
  },
});
