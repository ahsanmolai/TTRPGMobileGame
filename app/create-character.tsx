import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from 'src/theme/theme';
import {
  AbilityName,
  AbilityScores,
  RaceId,
  calculateAC,
  getModifier,
  isSpellcaster,
} from 'src/engine/character';
import { CLASSES, ClassId } from 'src/data/classes';
import { RACES } from 'src/data/races';
import { SPELLS } from 'src/data/spellbook';
import { STANDARD_ARRAY, PRIMARY_ABILITY, buildCharacter } from 'src/engine/leveling';
import { useCharacterStore } from 'src/store/characterStore';
import { useCampaignStore } from 'src/store/campaignStore';

const ABILITIES: { key: AbilityName; label: string }[] = [
  { key: 'strength', label: 'STR' },
  { key: 'dexterity', label: 'DEX' },
  { key: 'constitution', label: 'CON' },
  { key: 'intelligence', label: 'INT' },
  { key: 'wisdom', label: 'WIS' },
  { key: 'charisma', label: 'CHA' },
];

const RACE_IDS = Object.keys(RACES) as RaceId[];
const CLASS_IDS = Object.keys(CLASSES) as ClassId[];

// Sensible default value order per class: primary ability first, CON second,
// the rest in descending usefulness.
function autoAssign(classId: ClassId): AbilityScores {
  const primary = PRIMARY_ABILITY[classId];
  const order: AbilityName[] = [primary, 'constitution'];
  const rest = ABILITIES.map((a) => a.key).filter((a) => !order.includes(a));
  // casters value their off-stats lightly; martials dump INT/CHA — descending
  // STANDARD_ARRAY down the remaining abilities is close enough for a default
  for (const a of rest) order.push(a);
  const scores = {} as AbilityScores;
  order.forEach((ability, i) => {
    scores[ability] = STANDARD_ARRAY[i];
  });
  return scores;
}

type Assignments = Partial<Record<AbilityName, number>>;

export default function CreateCharacter() {
  const router = useRouter();
  const setCharacter = useCharacterStore((s) => s.setCharacter);
  const startRun = useCampaignStore((s) => s.startRun);

  const [name, setName] = useState('');
  const [race, setRace] = useState<RaceId>('human');
  const [classId, setClassId] = useState<ClassId>('fighter');
  const [assignments, setAssignments] = useState<Assignments>(autoAssign('fighter'));
  const [selectedValueIdx, setSelectedValueIdx] = useState<number | null>(null);

  const assignedValues = Object.values(assignments);
  // pool entries are indexes into STANDARD_ARRAY so duplicate values (none in
  // the standard array, but safe) stay distinct
  const usedIdx = new Set<number>();
  for (const v of assignedValues) {
    const idx = STANDARD_ARRAY.findIndex((sv, i) => sv === v && !usedIdx.has(i));
    if (idx >= 0) usedIdx.add(idx);
  }

  const complete = ABILITIES.every((a) => assignments[a.key] !== undefined);
  const canCreate = complete && name.trim().length > 0;

  const preview = useMemo(() => {
    if (!complete) return null;
    return buildCharacter({
      id: 'preview',
      name: name.trim() || 'Hero',
      race,
      classId,
      abilityScores: assignments as AbilityScores,
    });
  }, [complete, name, race, classId, assignments]);

  function pickClass(id: ClassId) {
    setClassId(id);
    setAssignments(autoAssign(id));
    setSelectedValueIdx(null);
  }

  function tapValue(idx: number) {
    if (usedIdx.has(idx)) return;
    setSelectedValueIdx(selectedValueIdx === idx ? null : idx);
  }

  function tapAbility(ability: AbilityName) {
    if (selectedValueIdx !== null) {
      setAssignments({ ...assignments, [ability]: STANDARD_ARRAY[selectedValueIdx] });
      setSelectedValueIdx(null);
    } else if (assignments[ability] !== undefined) {
      const next = { ...assignments };
      delete next[ability];
      setAssignments(next);
    }
  }

  function create() {
    if (!canCreate) return;
    const character = buildCharacter({
      id: `custom_${Date.now()}`,
      name: name.trim(),
      race,
      classId,
      abilityScores: assignments as AbilityScores,
    });
    setCharacter(character);
    startRun();
    router.replace('/campaign');
  }

  const racialBonuses = RACES[race].abilityBonuses;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Forge Your Hero</Text>

        <Text style={styles.sectionLabel}>Name</Text>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="Name your hero…"
          placeholderTextColor={colors.text.dim}
          maxLength={24}
        />

        <Text style={styles.sectionLabel}>Race</Text>
        <View style={styles.chipRow}>
          {RACE_IDS.map((id) => (
            <Pressable
              key={id}
              style={[styles.chip, race === id && styles.chipPicked]}
              onPress={() => setRace(id)}
            >
              <Text style={[styles.chipText, race === id && styles.chipTextPicked]}>
                {RACES[id].name}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>{RACES[race].description}</Text>

        <Text style={styles.sectionLabel}>Class</Text>
        <View style={styles.chipRow}>
          {CLASS_IDS.map((id) => (
            <Pressable
              key={id}
              style={[styles.chip, classId === id && styles.chipPicked]}
              onPress={() => pickClass(id)}
            >
              <Text style={[styles.chipText, classId === id && styles.chipTextPicked]}>
                {CLASSES[id].name}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>{classHint(classId)}</Text>

        <Text style={styles.sectionLabel}>Ability Scores — Standard Array</Text>
        <Text style={styles.hint}>
          Tap a value, then an ability to place it. Tap an ability to clear it.
        </Text>
        <View style={styles.poolRow}>
          {STANDARD_ARRAY.map((value, idx) => {
            const used = usedIdx.has(idx);
            const selected = selectedValueIdx === idx;
            return (
              <Pressable
                key={idx}
                style={[styles.poolChip, used && styles.poolUsed, selected && styles.poolSelected]}
                onPress={() => tapValue(idx)}
                disabled={used}
              >
                <Text style={[styles.poolText, used && styles.poolTextUsed]}>{value}</Text>
              </Pressable>
            );
          })}
          <Pressable style={styles.autoBtn} onPress={() => setAssignments(autoAssign(classId))}>
            <Text style={styles.autoText}>Auto</Text>
          </Pressable>
        </View>

        <View style={styles.abilityGrid}>
          {ABILITIES.map(({ key, label }) => {
            const base = assignments[key];
            const bonus = racialBonuses[key] ?? 0;
            const total = base !== undefined ? base + bonus : undefined;
            return (
              <Pressable
                key={key}
                style={[styles.abilityBox, key === PRIMARY_ABILITY[classId] && styles.abilityPrimary]}
                onPress={() => tapAbility(key)}
              >
                <Text style={styles.abilityLabel}>{label}</Text>
                <Text style={styles.abilityValue}>{total !== undefined ? total : '—'}</Text>
                <Text style={styles.abilitySub}>
                  {base !== undefined
                    ? `${base}${bonus ? ` +${bonus}` : ''} (${getModifier(total!) >= 0 ? '+' : ''}${getModifier(total!)})`
                    : bonus
                      ? `racial +${bonus}`
                      : ' '}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {preview && (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>
              {preview.name} — Level 1 {RACES[race].name} {CLASSES[classId].name}
            </Text>
            <View style={styles.previewRow}>
              <PreviewStat label="HP" value={preview.maxHP} />
              <PreviewStat label="AC" value={calculateAC(preview)} />
              <PreviewStat label="Weapon" value={preview.mainHand.name} />
            </View>
            {isSpellcaster(classId) && (
              <Text style={styles.previewSpells}>
                Spells:{' '}
                {preview.knownSpells && preview.knownSpells.length > 0
                  ? preview.knownSpells.map((id) => SPELLS[id].name).join(', ')
                  : 'none yet — unlocked as you level'}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.confirm, !canCreate && styles.disabled, pressed && canCreate && styles.pressed]}
        onPress={create}
        disabled={!canCreate}
      >
        <Text style={styles.confirmText}>Begin the Descent</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function classHint(classId: ClassId): string {
  const cls = CLASSES[classId];
  const primary = PRIMARY_ABILITY[classId].slice(0, 3).toUpperCase();
  if (!isSpellcaster(classId)) {
    return `d${cls.hitDie} hit die · ${primary} primary · weapon specialist`;
  }
  if (classId === 'warlock') {
    return `d${cls.hitDie} hit die · ${primary} primary · pact magic — spells unlock at level 3`;
  }
  return `d${cls.hitDie} hit die · ${primary} primary · ${cls.spellcastingAbility} caster`;
}

function PreviewStat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.previewStat}>
      <Text style={styles.previewStatLabel}>{label}</Text>
      <Text style={styles.previewStatValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    color: colors.accent.gold,
    fontFamily: typography.fontFamily.serif,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  nameInput: {
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.background.elevated,
    borderRadius: 8,
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.background.elevated,
  },
  chipPicked: {
    borderColor: colors.accent.gold,
    backgroundColor: colors.background.elevated,
  },
  chipText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  chipTextPicked: {
    color: colors.accent.gold,
    fontWeight: '700',
  },
  hint: {
    color: colors.text.dim,
    fontSize: typography.fontSize.xs,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  poolRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  poolChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.card,
    borderWidth: 2,
    borderColor: colors.accent.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolUsed: {
    borderColor: colors.background.elevated,
    opacity: 0.35,
  },
  poolSelected: {
    borderColor: colors.accent.gold,
    backgroundColor: colors.background.elevated,
  },
  poolText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  poolTextUsed: {
    color: colors.text.dim,
  },
  autoBtn: {
    marginLeft: 'auto',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accent.goldDim,
  },
  autoText: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  abilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  abilityBox: {
    width: '31.5%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.background.elevated,
  },
  abilityPrimary: {
    borderColor: colors.accent.goldDim,
  },
  abilityLabel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
  abilityValue: {
    color: colors.text.primary,
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
  },
  abilitySub: {
    color: colors.text.dim,
    fontSize: typography.fontSize.xs,
  },
  preview: {
    marginTop: spacing.lg,
    backgroundColor: colors.background.card,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.accent.goldDim,
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewTitle: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.serif,
    fontWeight: '700',
  },
  previewRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  previewStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    backgroundColor: colors.background.elevated,
    borderRadius: 4,
  },
  previewStatLabel: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
  },
  previewStatValue: {
    color: colors.accent.gold,
    fontSize: typography.fontSize.base,
    fontWeight: '700',
  },
  previewSpells: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
    fontStyle: 'italic',
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
