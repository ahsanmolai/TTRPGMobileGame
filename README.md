# TTRPG Combat — *Combat of the d20*

A turn-by-turn roguelike dungeon crawler for iOS and Android, built with Expo and React Native. All combat rules, monsters, classes, and spells follow the D&D 5th Edition System Reference Document 5.1.

---

## Features

- **20-floor campaign** — five fights per floor, the fifth a boss; beat the boss to gain a level, so you hit level 20 on the final floor. Defeat ends the run.
- **Character creation** — any of the 5 races and 12 classes, standard-array ability scores, SRD racial bonuses, per-class starting equipment
- **Full 1–20 leveling** — HP, proficiency, spell slots, auto-ASIs, Extra Attack, and new spells, all driven by the SRD progression tables
- **SRD XP economy** — monsters award their real SRD XP; each floor's bar fills exactly on the boss kill
- **Persistent runs** — character, floor, and XP survive app restarts (AsyncStorage)
- **SRD-faithful combat engine** — initiative, attack rolls, saving throws, spell DCs, critical hits
- **317 SRD monsters** spanning CR 0 to CR 30, split across floors by challenge rating
- **12 player classes** with full 20-level progression tables, spell slot data, and class features
- **319 SRD spells** indexed by class, level, and school
- **Structured spellcasting rules** — preparation styles, concentration, ritual casting, slot recovery
- **4 preset level-1 heroes** — Fighter, Rogue, Cleric, Wizard quick-starts
- **Spell resolution** — cantrips, levelled spells, upcast bonuses, condition effects

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev) (SDK 56) with Expo Router |
| UI | React Native 0.85 |
| State | [Zustand](https://github.com/pmndrs/zustand) + [Immer](https://immerjs.github.io/immer/) |
| Language | TypeScript 6 |
| Tests | Jest + ts-jest |
| SRD source | [vitusventure/5thSRD](https://github.com/vitusventure/5thSRD) (CC-BY-4.0) |

---

## Prerequisites

- Node.js 18+
- npm 9+
- Expo CLI: `npm install -g expo-cli` (optional, for device builds)

---

## Getting Started

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start the Expo dev server
npm start

# Run on a specific platform
npm run ios      # requires macOS + Xcode
npm run android  # requires Android Studio
npm run web      # runs in browser
```

---

## Running Tests

```bash
npm test
```

The suite (187 tests) covers the combat engine, character calculations, dice rolling, spell resolution, character creation/leveling, floor generation, and the campaign XP invariant.

---

## Project Structure

```
TTRPGMobileGame/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root navigation layout
│   ├── index.tsx           # Main menu (continue / new campaign)
│   ├── pick-character.tsx  # Preset selection + "Forge Your Own"
│   ├── create-character.tsx # Custom hero builder (race, class, standard array)
│   ├── campaign.tsx        # Floor hub: fight nodes, XP bar, victory/defeat states
│   ├── level-up.tsx        # Post-boss level-up summary
│   └── combat.tsx          # Combat screen
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ActionBar.tsx   # Attack / spell / pass action buttons
│   │   ├── CombatLog.tsx   # Scrollable event log
│   │   ├── HPBar.tsx       # Hit-point display
│   │   ├── InitiativeTracker.tsx
│   │   └── SpellMenu.tsx
│   ├── data/               # Static game data (most files generated from SRD)
│   │   ├── classes.ts      # 12 classes × 20 levels — progression tables, spell slots
│   │   ├── enemies.ts      # 317 SRD monsters indexed by id
│   │   ├── floors.ts       # CR bands per floor + encounter generation
│   │   ├── races.ts        # SRD racial bonuses, speed, features
│   │   ├── armor.ts        # Armor definitions
│   │   ├── startingEquipment.ts  # Per-class starting loadout
│   │   ├── presetCharacters.ts   # Level-1 quick-start builds
│   │   ├── spellbook.ts    # 8 fully-implemented spell effects
│   │   ├── spellcastingRules.ts  # Preparation style, slot recovery, ritual rules
│   │   ├── spellMetadata.ts      # 319 spell entries + class spell lists
│   │   └── weapons.ts
│   ├── engine/             # Pure, side-effect-free game logic
│   │   ├── character.ts    # HP, AC, attack bonus, spell DC, saving throws
│   │   ├── leveling.ts     # buildCharacter, applyLevelUp, rests, known spells
│   │   ├── campaign.ts     # Run state transitions + the floor XP invariant
│   │   ├── combat.ts       # Initiative, attack resolution, Extra Attack, enemy AI
│   │   ├── dice.ts         # Dice rolling (1d4 → 1d20, advantage/disadvantage)
│   │   └── spells.ts       # Spell effect resolution
│   ├── store/              # Zustand state (character & campaign persisted)
│   │   ├── characterStore.ts
│   │   ├── campaignStore.ts
│   │   └── combatStore.ts
│   └── theme/
│       └── theme.ts
├── scripts/                # SRD data generators (run once, commit output)
│   ├── generate-monsters.mjs  # → src/data/enemies.ts
│   ├── generate-classes.mjs   # → src/data/classes.ts
│   └── generate-spells.mjs    # → src/data/spellMetadata.ts
└── __tests__/
    ├── campaign.test.ts
    ├── campaignStore.test.ts
    ├── character.test.ts
    ├── combat.test.ts
    ├── dice.test.ts
    ├── floors.test.ts
    ├── leveling.test.ts
    └── spells.test.ts
```

---

## SRD Data Regeneration

All SRD-derived data files are committed to the repo as static TypeScript. To regenerate them after an upstream SRD update:

```bash
# 1. Download the SRD archive (one-time or on update)
curl -sL https://github.com/vitusventure/5thSRD/archive/refs/heads/master.zip \
  -o /tmp/5thsrd.zip
cd /tmp && unzip -q -o 5thsrd.zip

# 2. Regenerate all three data files
npm run generate:srd

# 3. Run tests to confirm nothing broke
npm test
```

Individual generators:

| Command | Output |
|---|---|
| `npm run generate:monsters` | `src/data/enemies.ts` — 317 monsters |
| `npm run generate:classes` | `src/data/classes.ts` — 12 classes × 20 levels |
| `npm run generate:spells` | `src/data/spellMetadata.ts` — 319 spells + class lists |

---

## Key Data Structures

### Monster (`EnemyStatBlock`)
Every monster has `id`, `name`, `cr`, `ac`, `maxHP`, `speed`, `abilityScores`, `initiativeBonus`, `attacks[]`, `xp`, and `flavor`. Monsters are indexed in `ENEMIES` by their SRD slug (e.g. `ENEMIES['ancient_red_dragon']`).

### Class (`ClassData`)
Every class has a `progression` array of 20 `ClassLevelEntry` objects. Each entry includes `level`, `proficiencyBonus`, `features[]`, `spellSlots`, and optional class-specific data (`cantripsKnown`, `spellsKnown`, `extra`).

```ts
import { CLASSES, getSpellSlotsAtLevel } from 'src/data/classes';

const wizardLevel5Slots = getSpellSlotsAtLevel('wizard', 5);
// → { 1: 4, 2: 3, 3: 2 }
```

### Spell Metadata (`SpellMeta`)
Each SRD spell has `id`, `name`, `level`, `school`, `castingTime`, `concentration`, `range`, and `classes[]`.

```ts
import { getClassSpellList } from 'src/data/spellMetadata';

const clericSpells = getClassSpellList('cleric', 3); // all cleric spells up to 3rd level
```

### Spellcasting Rules
```ts
import { SPELLCASTING_RULES, getMaxPreparedSpells } from 'src/data/spellcastingRules';

SPELLCASTING_RULES['wizard'].preparationStyle   // 'prepared'
SPELLCASTING_RULES['wizard'].slotRecovery       // 'long_rest'
SPELLCASTING_RULES['wizard'].ritualWithoutPreparing  // true
SPELLCASTING_RULES['warlock'].pactMagic         // true

getMaxPreparedSpells('cleric', 5, 3)  // WIS mod 3, level 5 → 8 spells
```

---

## SRD Attribution

This project uses content from the **System Reference Document 5.1** ("SRD 5.1") by Wizards of the Coast LLC, licensed under [Creative Commons Attribution 4.0 International (CC-BY-4.0)](https://creativecommons.org/licenses/by/4.0/).

SRD content is sourced via [vitusventure/5thSRD](https://github.com/vitusventure/5thSRD).
