import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from 'src/theme/theme';
import { useCharacterStore } from 'src/store/characterStore';
import { calculateAC } from 'src/engine/character';
import { getItem } from 'src/data/items';
import { canEquip, bestPotion } from 'src/engine/inventory';
import { HPBar } from 'src/components/HPBar';

export default function InventoryScreen() {
  const router = useRouter();
  const character = useCharacterStore((s) => s.character);
  const equip = useCharacterStore((s) => s.equip);
  const sell = useCharacterStore((s) => s.sell);
  const drinkPotionOutOfCombat = useCharacterStore((s) => s.drinkPotionOutOfCombat);

  useEffect(() => {
    if (!character) {
      router.replace('/');
    }
  }, [character, router]);

  if (!character) return null;

  const ac = calculateAC(character);
  const atMaxHP = character.currentHP >= character.maxHP;
  const potion = bestPotion(character);

  const trinketItem = character.trinketId ? getItem(character.trinketId) : null;

  const kindLabel: Record<string, string> = {
    weapon: 'Weapon',
    armor: 'Armor',
    shield: 'Shield',
    potion: 'Potion',
    trinket: 'Trinket',
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <View style={styles.goldBadge}>
          <Text style={styles.goldText}>🪙 {character.gold}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Equipped panel */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EQUIPPED</Text>

          {/* HP */}
          <View style={styles.hpBlock}>
            <View style={styles.hpHead}>
              <Text style={styles.statKey}>HP</Text>
              <Text style={styles.statVal}>
                {character.currentHP} / {character.maxHP}
              </Text>
            </View>
            <HPBar current={character.currentHP} max={character.maxHP} height={10} />
          </View>

          {/* AC */}
          <View style={styles.statRow}>
            <Text style={styles.statKey}>AC</Text>
            <Text style={styles.statVal}>{ac}</Text>
          </View>

          {/* Weapon */}
          <View style={styles.statRow}>
            <Text style={styles.statKey}>Weapon</Text>
            <Text style={styles.statVal}>
              {character.mainHand.name}
              {character.mainHand.magicBonus ? ` +${character.mainHand.magicBonus}` : ''}
            </Text>
          </View>

          {/* Armor */}
          <View style={styles.statRow}>
            <Text style={styles.statKey}>Armor</Text>
            <Text style={styles.statVal}>{character.armor ? character.armor.name : 'None'}</Text>
          </View>

          {/* Shield */}
          <View style={styles.statRow}>
            <Text style={styles.statKey}>Shield</Text>
            <Text style={styles.statVal}>
              {character.shield
                ? `Yes (+${character.shieldBonus ?? 2} AC)`
                : 'None'}
            </Text>
          </View>

          {/* Trinket */}
          <View style={styles.statRow}>
            <Text style={styles.statKey}>Trinket</Text>
            <Text style={styles.statVal}>
              {trinketItem ? trinketItem.name : 'None'}
            </Text>
          </View>

          {/* Drink potion button */}
          {potion && (
            <Pressable
              style={({ pressed }) => [
                styles.potionBtn,
                atMaxHP && styles.potionBtnDisabled,
                !atMaxHP && pressed && styles.pressed,
              ]}
              onPress={() => !atMaxHP && drinkPotionOutOfCombat()}
              disabled={atMaxHP}
            >
              <Text style={[styles.potionBtnText, atMaxHP && styles.potionBtnTextDisabled]}>
                {atMaxHP ? 'Full HP' : `Drink ${potion.name}`}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Bag */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BAG</Text>
          {character.inventory.length === 0 ? (
            <Text style={styles.emptyText}>Your bag is empty.</Text>
          ) : (
            character.inventory.map((entry) => {
              const item = getItem(entry.itemId);
              const isPotion = item.kind === 'potion';
              const isEquippable = !isPotion;

              let equipCheck: { ok: boolean; reason?: string } = { ok: true };
              if (isEquippable) {
                equipCheck = canEquip(character, entry.itemId);
              }

              const potionDisabled = isPotion && atMaxHP;

              return (
                <View key={entry.itemId} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <View style={styles.itemNameRow}>
                      <Text style={styles.itemName}>
                        {item.name}{entry.qty > 1 ? ` ×${entry.qty}` : ''}
                      </Text>
                      <Text style={styles.itemKind}>{kindLabel[item.kind] ?? item.kind}</Text>
                    </View>
                    <Text style={styles.itemDesc}>{item.description}</Text>
                    {isEquippable && !equipCheck.ok && equipCheck.reason ? (
                      <Text style={styles.itemReason}>{equipCheck.reason}</Text>
                    ) : null}
                    {isPotion && atMaxHP ? (
                      <Text style={styles.itemReason}>Already at full HP</Text>
                    ) : null}
                  </View>
                  <View style={styles.itemActions}>
                    {isPotion ? (
                      <Pressable
                        style={({ pressed }) => [
                          styles.drinkBtn,
                          potionDisabled && styles.actionBtnDisabled,
                          !potionDisabled && pressed && styles.pressed,
                        ]}
                        onPress={() => !potionDisabled && drinkPotionOutOfCombat()}
                        disabled={potionDisabled}
                      >
                        <Text style={[styles.drinkBtnText, potionDisabled && styles.actionBtnTextDisabled]}>
                          Drink
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [
                          styles.equipBtn,
                          !equipCheck.ok && styles.actionBtnDisabled,
                          equipCheck.ok && pressed && styles.pressed,
                        ]}
                        onPress={() => equipCheck.ok && equip(entry.itemId)}
                        disabled={!equipCheck.ok}
                      >
                        <Text style={[styles.equipBtnText, !equipCheck.ok && styles.actionBtnTextDisabled]}>
                          Equip
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        onPress={() => router.back()}
      >
        <Text style={styles.backBtnText}>Back</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.xxl,
    fontFamily: typography.fontFamily.serif,
    fontWeight: '700',
  },
  goldBadge: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  goldText: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
  },
  section: {
    backgroundColor: colors.background.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.background.elevated,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  hpBlock: {
    gap: spacing.xs,
  },
  hpHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statKey: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  statVal: {
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  potionBtn: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accent.crimson,
    borderWidth: 1,
    borderColor: colors.accent.gold,
    borderRadius: 6,
    alignItems: 'center',
  },
  potionBtnDisabled: {
    backgroundColor: colors.background.elevated,
    borderColor: colors.background.elevated,
  },
  potionBtnText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  potionBtnTextDisabled: {
    color: colors.text.dim,
  },
  emptyText: {
    color: colors.text.dim,
    fontSize: typography.fontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.background.elevated,
    padding: spacing.sm,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  itemName: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  itemKind: {
    color: colors.text.dim,
    fontSize: typography.fontSize.xs,
    backgroundColor: colors.background.elevated,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 3,
  },
  itemDesc: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  itemReason: {
    color: colors.text.danger,
    fontSize: typography.fontSize.xs,
    fontStyle: 'italic',
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: spacing.xs,
  },
  equipBtn: {
    backgroundColor: colors.accent.crimson,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent.gold,
  },
  equipBtnText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  drinkBtn: {
    backgroundColor: colors.accent.emerald,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent.gold,
  },
  drinkBtnText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  actionBtnDisabled: {
    backgroundColor: colors.background.elevated,
    borderColor: colors.background.elevated,
  },
  actionBtnTextDisabled: {
    color: colors.text.dim,
  },
  backBtn: {
    margin: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.background.elevated,
    borderRadius: 8,
  },
  backBtnText: {
    color: colors.text.dim,
    fontSize: typography.fontSize.base,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
