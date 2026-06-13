# HANDOVER — Dungeons n Dice: Pixel-Art Visual Overhaul

> Self-contained handoff for a fresh chat. Read this top to bottom; it assumes no prior context.

## 1. What this project is
**Dungeons n Dice** — a turn-based solo D&D 5e SRD roguelike (Expo SDK 56 / React Native 0.85 / TypeScript / Expo Router; Zustand+Immer stores with persistence; Jest+ts-jest). 20-floor tower, 5 fights/floor, levels 1–20, 12 classes × 5 races, 317 SRD monsters, spells, class abilities, and a loot/economy (gold, drops, merchant, inventory, potions). All gameplay milestones are DONE and merged to `main`. The game is fully playable but **visually bare** (emoji enemy icons, flat UI, no animation). This milestone is the **visual overhaul**.

## 2. Current branch & state
- **Branch:** `claude/visuals-dungeons-n-dice` (pushed), based on `main` @ `34c9531` (loot/economy merged via PR #2). No open PR for this branch yet.
- **Already committed on this branch:**
  - Rename to **Dungeons n Dice** — `app.json` (`name`/`slug`/`scheme`), `app/index.tsx` (two-line pixel-ready title block), `README.md`.
  - Five review mockups in `mockups/` (design reference, not app code): `style-1-arcane-neon.html`, `style-2-inked-bestiary.html`, `style-3-bold-flat.html`, `style-4-pixel-dungeon.html`, `style-pixel-moods.html`.
- **Tests/health:** 279 tests pass, `npx tsc --noEmit` clean, `npx expo export --platform web` builds.
- **DECISIONS LOCKED (by the user):**
  - Art style = **Pixel art**, the 16-bit dungeon look in `mockups/style-4-pixel-dungeon.html`.
  - Sprites are **code-drawn pixel grids** (NOT commissioned/sourced raster; works offline, no art budget).
  - Ship **3 moods × light/dark** (see `mockups/style-pixel-moods.html`). **Default mood = Cursed Hollow** (eerie green/violet). Other moods: Torchlit Halls (warm amber/gold), Frostbound Crypt (cool ice-blue).

## 3. How to resume (first actions in the new chat)
1. `git checkout claude/visuals-dungeons-n-dice && git pull`
2. `npm install --legacy-peer-deps`
3. Open `mockups/style-4-pixel-dungeon.html` and `mockups/style-pixel-moods.html` in a browser to see the target look (Cursed Hollow is the default mood).
4. Start **Phase 1** below. Gate every phase on green `npm test` + `npx tsc --noEmit` + `npx expo export --platform web`, then commit.

## 4. Hard constraints & gotchas (read before coding)
- **Dependencies:** add native/Expo packages with **`npx expo install <pkg>`**, never `npm install` (an `AGENTS.md` rule; a `check:deps` pretest hook enforces SDK-56 pinned versions and will fail the test run otherwise). This milestone needs `npx expo install react-native-svg`. NOT installed: `react-native-svg`, `expo-font`, Lottie. Installed: `react-native-reanimated@4.3.1` + worklets, gesture-handler, `expo-haptics`.
- **No network for assets/fonts** → the bitmap UI font must be **code-drawn** (SVG rects), not a downloaded `.ttf`.
- **Rolls are synchronous** (`src/engine/dice.ts` → `RollResult.naturalRoll`; resolved instantly in `src/store/combatStore.ts`). Animations are **cosmetic overlays** sequenced over an already-decided result; `combatStore.isAnimating` exists and `ActionBar` already respects it. A `pendingRoll` field may be added to drive the dice overlay.
- **Theme refactor needed:** ~10 screens/components statically `import { colors } from 'src/theme/theme'`. Runtime mood/mode switching requires moving to a `useColors()` hook (mechanical but broad). `spacing`/`typography` stay static.
- **Immer gotcha (combatStore):** inside `set((s)=>…)` patch individual participant fields; do NOT wholesale-replace a participant with a snapshot object (frozen arrays → "can't define array index" crash). See the comment in `playerCastSpell`.
- **Persisted-shape changes** need a zustand `persist` version bump + `migrate` (pattern in `characterStore.ts`/`campaignStore.ts`). The new `themeStore` is additive (no migration).
- **Commit discipline:** work on the branch; conventional messages; end each commit message with the session link line `https://claude.ai/code/...`; gate each phase green before committing. A stop-hook nags about uncommitted changes between turns — expected when sub-agents are mid-edit; commit at green phase boundaries.
- **Sub-agent delegation (user preference):** keep planning/orchestration on the top model; delegate implementation to **Opus** sub-agents for logic and **Sonnet** for UI/screens. Phases are sequential (shared files), so dispatch one at a time and verify between.

## 5. Key files & reusable hooks
- Theme: `src/theme/theme.ts` (`colors`/`typography`/`spacing`).
- Stores: `src/store/{characterStore,campaignStore,combatStore}.ts` (zustand+immer+persist; `_hasHydrated` pattern).
- Combat UI: `app/combat.tsx` (`enemyIcon()` emoji map, `EnemyCard`, `PlayerPanel`, target-picker modal, victory/defeat handlers); components `src/components/{ActionBar,SpellMenu,CombatLog,HPBar,InitiativeTracker}.tsx`.
- Engine: `src/engine/{character,combat,dice,spells,leveling,inventory,campaign,classAbilities}.ts`.
- Data: `src/data/{enemies,classes,races,armor,weapons,items,spellbook,floors}.ts`.
  - `enemy.flavor` = "SIZE TYPE, alignment" (15 creature types × 6 sizes → ~90 archetypes cover 317 monsters); `enemy.iconHint` is per-monster; `enemy.cr` for boss scaling.
  - Players: 12 `ClassId` × 5 `RaceId`; `CharacterStats.portrait` = `race_class`.
  - Items: `ItemKind` weapon/armor/shield/potion/trinket (~25 sprites); magic weapons embed `magicBonus`.
  - Spells: `SpellEffectDef` + 8 `damageType`s (fire/cold/radiant/lightning/necrotic/psychic/force/poison) for VFX variety.
- Tests: `__tests__/` (279 tests). Pure-function tests use real-dice loops with bounds.

## 6. The plan — 6 phases (default mood: Cursed Hollow)

### Phase 1 — Theme system: mood × mode + light/dark toggle
- Refactor `src/theme/theme.ts`: keep token NAMES (`colors.background.*`, `accent.*`, `text.*`, `hp.*`, `log.*`) but source values from `PALETTES[mood][mode]`. Types `Mood='torch'|'frost'|'cursed'`, `Mode='light'|'dark'`. Map the 6 palettes from `mockups/style-pixel-moods.html` (`MOODS` object) onto the token shape.
- New `src/store/themeStore.ts` (zustand+persist): `{ mood, mode, setMood, setMode, toggleMode }`; **defaults: mood `'cursed'`, mode `'dark'`**.
- `useColors()` hook → active palette. Replace static `colors` imports with `const colors = useColors()`; convert `StyleSheet.create` that bakes colors to a `makeStyles(colors)` or inline pattern.
- Settings UI on main menu: Light/Dark toggle + mood picker.
- Tests: every (mood×mode) defines every token; toggle/persist round-trip. **Delegate: Opus.**

### Phase 2 — Pixel sprite engine + bitmap font
- `npx expo install react-native-svg`.
- `src/sprites/PixelSprite.tsx`: render `{w,h,palette,rows[]}` as `<Svg>` + one `<Rect>` per non-transparent cell, integer `scale`, optional `tint`.
- `src/components/PixelText.tsx`: code-drawn 5×7 bitmap font (extend the mockup's font to full A–Z/0–9/punct) for titles/headings; dense text stays styled monospace.
- Pure resolvers in `src/sprites/`: `monsterSprite(enemy)` (flavor→type×size, alignment tint, CR scale), `playerSprite(race,class)`, `itemSprite(item)`, `spellVfx(damageType)`.
- Tests: all 317 enemies resolve; every race×class; every item; every damageType→VFX; PixelSprite/PixelText render. **Delegate: Opus.**

### Phase 3 — Author the archetype sprite set (data)
- ~15 creature-type base grids (humanoid, beast, dragon, undead, fiend, aberration, ooze, construct, elemental, fey, giant, monstrosity, plant, celestial, swarm) + size scaling/alignment tint; reuse the mockup's goblin (humanoid) & dragon bases.
- 12 class silhouettes + 5 race accents (reuse the dwarf-fighter base). ~25 item grids (reuse the mockup potion).
- Data-only; covered by Phase 2 resolver tests. NOTE: this is iterative pixel work — acceptable to ship a solid starter set and expand archetype coverage as a follow-on. **Delegate: Opus or do iteratively in-chat.**

### Phase 4 — Dice + attack animations (reanimated)
- `src/components/DiceRoller.tsx`: full-screen overlay, stepped-frame (`steps()`) tumble + number cycle settling on `RollResult.naturalRoll`; reused for initiative, attack rolls, saves. Store sets `isAnimating`+`pendingRoll`; overlay plays then log/result reveal.
- Attack anims: attacker hop/recoil, target hit-flash, floating damage number (frame-stepped); `expo-haptics` on hit/crit; sequenced before the combat-log entry shows. Light smoke tests only. **Delegate: Opus (engine hook) + Sonnet (visual).**

### Phase 5 — Integration
- `app/combat.tsx`: replace emoji/`PlayerPanel` with `<PixelSprite>`; JRPG scene (sprites on themed floor + bottom command/log window); mount `DiceRoller` + attack anims.
- `pick-character.tsx`/`create-character.tsx`: player sprite preview. `shop.tsx`/`inventory.tsx`: item sprites. `campaign.tsx`: enemy preview. `index.tsx`: `PixelText` logo + Settings (mood/mode). All colors via `useColors()`. **Delegate: Sonnet.**

### Phase 6 — Full pass
`npm test` + `tsc` + web export green; manual `npm run web` walk-through; commit/push each phase; open/refresh PR.

## 7. Verification
- Per phase: relevant tests green + full suite + tsc + web export clean.
- End-to-end manual (`npm run web`): combat shows pixel sprites in **Cursed Hollow** (legible in light AND dark); d20 tumbles on initiative/attacks; attacks animate (hop/flash/damage numbers); item sprites in shop/inventory; Settings toggle re-themes the whole app live; mood switch swaps palette.

## 8. Mockups to reference (in `mockups/`)
- `style-4-pixel-dungeon.html` — the chosen style (title + combat, animated d20). Canvas pixel sprites + 5×7 bitmap logo font are the reference implementation for `PixelSprite`/`PixelText`.
- `style-pixel-moods.html` — the 3 moods × light/dark; its `MOODS` JS object is the source of the palette values for Phase 1.
