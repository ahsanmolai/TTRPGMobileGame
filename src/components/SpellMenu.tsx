import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { SpellDefinition, SpellId } from 'src/data/spellbook';
import { SpellSlotState } from 'src/engine/character';
import { colors, typography, spacing } from 'src/theme/theme';

interface SpellMenuProps {
  visible: boolean;
  spells: SpellDefinition[];
  spellSlots: SpellSlotState;
  actionUsed: boolean;
  bonusActionUsed: boolean;
  onCast: (spellId: SpellId, slotLevel: number) => void;
  onClose: () => void;
}

export function SpellMenu({
  visible,
  spells,
  spellSlots,
  actionUsed,
  bonusActionUsed,
  onCast,
  onClose,
}: SpellMenuProps) {
  const groups = [0, 1, 2]
    .map((level) => ({ level, spells: spells.filter((s) => s.level === level) }))
    .filter((g) => g.spells.length > 0);

  function isDisabled(spell: SpellDefinition): boolean {
    if (spell.castingTime === 'action' && actionUsed) return true;
    if (spell.castingTime === 'bonus_action' && bonusActionUsed) return true;
    if (spell.level > 0 && findLowestAvailableSlot(spell.level, spellSlots) === null) return true;
    return false;
  }

  function handleCast(spell: SpellDefinition) {
    if (isDisabled(spell)) return;
    const slotLevel = spell.level === 0 ? 0 : findLowestAvailableSlot(spell.level, spellSlots)!;
    onCast(spell.id, slotLevel);
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Spells</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {groups.map((g) => (
              <View key={g.level}>
                <Text style={styles.groupHeader}>
                  {g.level === 0
                    ? 'Cantrips'
                    : `Level ${g.level} — ${slotsRemaining(g.level, spellSlots)} slot${slotsRemaining(g.level, spellSlots) !== 1 ? 's' : ''} remaining`}
                </Text>
                {g.spells.map((spell) => {
                  const disabled = isDisabled(spell);
                  return (
                    <Pressable
                      key={spell.id}
                      onPress={() => handleCast(spell)}
                      disabled={disabled}
                      style={({ pressed }) => [
                        styles.spellRow,
                        disabled && styles.rowDisabled,
                        pressed && !disabled && styles.rowPressed,
                      ]}
                    >
                      <View style={styles.spellBody}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.spellName, disabled && styles.textDim]}>
                            {spell.name}
                          </Text>
                          <View style={styles.badges}>
                            <View
                              style={[
                                styles.badge,
                                spell.castingTime === 'bonus_action'
                                  ? styles.badgeBonus
                                  : styles.badgeAction,
                              ]}
                            >
                              <Text style={styles.badgeText}>
                                {spell.castingTime === 'bonus_action' ? 'BONUS' : 'ACTION'}
                              </Text>
                            </View>
                            {spell.concentration && (
                              <View style={styles.badgeConc}>
                                <Text style={styles.badgeText}>CONC</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <Text style={[styles.spellDesc, disabled && styles.textDim]}>
                          {spell.description}
                        </Text>
                      </View>
                      {spell.level > 0 && (
                        <SlotPips level={spell.level} slots={spellSlots} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function slotsRemaining(level: number, slots: SpellSlotState): number {
  return slots[level]?.remaining ?? 0;
}

function findLowestAvailableSlot(minLevel: number, slots: SpellSlotState): number | null {
  for (let lvl = minLevel; lvl <= 9; lvl++) {
    if ((slots[lvl]?.remaining ?? 0) > 0) return lvl;
  }
  return null;
}

function SlotPips({ level, slots }: { level: number; slots: SpellSlotState }) {
  const slotData = slots[level];
  if (!slotData) return null;
  return (
    <View style={styles.pips}>
      {Array.from({ length: slotData.max }).map((_, i) => (
        <View
          key={i}
          style={[styles.pip, i < slotData.remaining ? styles.pipFull : styles.pipEmpty]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.background.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 2,
    borderColor: colors.accent.gold,
    borderBottomWidth: 0,
    maxHeight: '80%',
    paddingBottom: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent.goldDim,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.serif,
    fontWeight: '700',
    textAlign: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.elevated,
    marginHorizontal: spacing.md,
  },
  scroll: {
    paddingHorizontal: spacing.md,
  },
  groupHeader: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  spellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent.sapphire,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  rowPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  spellBody: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  spellName: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeAction: {
    backgroundColor: colors.accent.crimson,
  },
  badgeBonus: {
    backgroundColor: colors.accent.emerald,
  },
  badgeConc: {
    backgroundColor: colors.accent.sapphire,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgeText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  spellDesc: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  textDim: {
    color: colors.text.dim,
  },
  pips: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  pip: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.accent.gold,
  },
  pipFull: {
    backgroundColor: colors.accent.gold,
  },
  pipEmpty: {
    backgroundColor: 'transparent',
  },
  closeBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.background.elevated,
  },
  closeBtnText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
});
