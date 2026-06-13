import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from 'src/theme/theme';
import { useCharacterStore } from 'src/store/characterStore';
import { useCampaignStore } from 'src/store/campaignStore';
import { getItem, ARMOR_PROFICIENCY, SHIELD_PROFICIENT } from 'src/data/items';
import { sellPrice } from 'src/engine/inventory';

type Tab = 'buy' | 'sell';

export default function ShopScreen() {
  const router = useRouter();
  const character = useCharacterStore((s) => s.character);
  const sell = useCharacterStore((s) => s.sell);
  const run = useCampaignStore((s) => s.run);
  const buyFromShop = useCampaignStore((s) => s.buyFromShop);
  const [tab, setTab] = useState<Tab>('buy');

  if (!character || !run) {
    router.replace('/');
    return null;
  }

  function getAffordability(itemId: string): { canAfford: boolean; reason?: string } {
    const item = getItem(itemId);
    if (!character) return { canAfford: false, reason: 'No character' };
    if (character.gold < item.price) {
      return { canAfford: false, reason: `Need ${item.price - character.gold} more gold` };
    }
    // Check proficiency for armor and shields.
    if (item.kind === 'armor' && item.armor) {
      const allowed = ARMOR_PROFICIENCY[character.classId];
      if (!allowed.includes(item.armor.category)) {
        return { canAfford: false, reason: `Not proficient with ${item.armor.category} armor` };
      }
    }
    if (item.kind === 'shield') {
      if (!SHIELD_PROFICIENT.includes(character.classId)) {
        return { canAfford: false, reason: 'Not proficient with shields' };
      }
    }
    return { canAfford: true };
  }

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
        <Text style={styles.title}>Merchant</Text>
        <View style={styles.goldBadge}>
          <Text style={styles.goldText}>🪙 {character.gold}</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, tab === 'buy' && styles.tabActive]}
          onPress={() => setTab('buy')}
        >
          <Text style={[styles.tabText, tab === 'buy' && styles.tabTextActive]}>Buy</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'sell' && styles.tabActive]}
          onPress={() => setTab('sell')}
        >
          <Text style={[styles.tabText, tab === 'sell' && styles.tabTextActive]}>Sell</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {tab === 'buy' ? (
          run.shopStock.length === 0 ? (
            <Text style={styles.emptyText}>The merchant has nothing left to sell.</Text>
          ) : (
            run.shopStock.map((entry) => {
              const item = getItem(entry.itemId);
              const { canAfford, reason } = getAffordability(entry.itemId);
              return (
                <View
                  key={entry.itemId}
                  style={[styles.itemRow, !canAfford && styles.itemRowDimmed]}
                >
                  <View style={styles.itemInfo}>
                    <View style={styles.itemNameRow}>
                      <Text style={[styles.itemName, !canAfford && styles.itemNameDimmed]}>
                        {item.name}
                      </Text>
                      <Text style={styles.itemKind}>{kindLabel[item.kind] ?? item.kind}</Text>
                    </View>
                    <Text style={[styles.itemDesc, !canAfford && styles.itemDescDimmed]}>
                      {item.description}
                    </Text>
                    {reason ? (
                      <Text style={styles.itemReason}>{reason}</Text>
                    ) : null}
                    {entry.qty > 1 && (
                      <Text style={styles.itemQty}>In stock: {entry.qty}</Text>
                    )}
                  </View>
                  <View style={styles.itemActions}>
                    <Text style={[styles.itemPrice, !canAfford && styles.itemPriceDimmed]}>
                      🪙 {item.price}
                    </Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.buyBtn,
                        !canAfford && styles.buyBtnDisabled,
                        pressed && canAfford && styles.pressed,
                      ]}
                      onPress={() => canAfford && buyFromShop(entry.itemId)}
                      disabled={!canAfford}
                    >
                      <Text style={[styles.buyBtnText, !canAfford && styles.buyBtnTextDisabled]}>
                        Buy
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )
        ) : (
          character.inventory.length === 0 ? (
            <Text style={styles.emptyText}>Your bag is empty.</Text>
          ) : (
            character.inventory.map((entry) => {
              const item = getItem(entry.itemId);
              const sp = sellPrice(item);
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
                  </View>
                  <View style={styles.itemActions}>
                    <Text style={styles.sellPrice}>🪙 {sp}</Text>
                    <Pressable
                      style={({ pressed }) => [styles.sellBtn, pressed && styles.pressed]}
                      onPress={() => sell(entry.itemId)}
                    >
                      <Text style={styles.sellBtnText}>Sell</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )
        )}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.leaveBtn, pressed && styles.pressed]}
        onPress={() => router.back()}
      >
        <Text style={styles.leaveBtnText}>Leave</Text>
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
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.background.elevated,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.background.card,
  },
  tabActive: {
    backgroundColor: colors.accent.crimson,
  },
  tabText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.text.primary,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.text.dim,
    fontSize: typography.fontSize.base,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.background.elevated,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  itemRowDimmed: {
    opacity: 0.6,
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
  itemNameDimmed: {
    color: colors.accent.goldDim,
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
  itemDescDimmed: {
    color: colors.text.dim,
  },
  itemReason: {
    color: colors.text.danger,
    fontSize: typography.fontSize.xs,
    fontStyle: 'italic',
  },
  itemQty: {
    color: colors.text.dim,
    fontSize: typography.fontSize.xs,
  },
  itemActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  itemPrice: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  itemPriceDimmed: {
    color: colors.accent.goldDim,
  },
  buyBtn: {
    backgroundColor: colors.accent.crimson,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent.gold,
  },
  buyBtnDisabled: {
    backgroundColor: colors.background.elevated,
    borderColor: colors.background.elevated,
  },
  buyBtnText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  buyBtnTextDisabled: {
    color: colors.text.dim,
  },
  sellPrice: {
    color: colors.text.success,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  sellBtn: {
    backgroundColor: colors.accent.emerald,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent.gold,
  },
  sellBtnText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: '700',
  },
  leaveBtn: {
    margin: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.background.elevated,
    borderRadius: 8,
  },
  leaveBtnText: {
    color: colors.text.dim,
    fontSize: typography.fontSize.base,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
