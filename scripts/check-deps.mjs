#!/usr/bin/env node
// Refuses to let dev/test commands run when any Expo-managed dependency
// drifts from the version Expo SDK 56 was built against. This is the
// guard that prevents blank-screen "react-dom doesn't match react"-style
// failures from reaching the user.
//
// Runs automatically via `pre*` hooks (prestart, preweb, pretest, ...).
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function readJSON(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(messages, fixCommands) {
  console.error('');
  console.error(`${RED}━━━ Dependency drift detected ━━━${RESET}`);
  for (const m of messages) console.error(`  ${RED}✗${RESET} ${m}`);
  console.error('');
  console.error(`${YELLOW}Fix with:${RESET}`);
  for (const c of fixCommands) console.error(`  ${c}`);
  console.error('');
  console.error(
    `${DIM}This guard runs before every dev command to prevent runtime version mismatches.${RESET}`,
  );
  console.error(
    `${DIM}When adding Expo packages, always use \`npx expo install <pkg>\`, not \`npm install\`.${RESET}`,
  );
  console.error('');
  process.exit(1);
}

// --- Compare package.json ranges against Expo's bundled list ---------------

const pkg = readJSON(join(repoRoot, 'package.json'));
const bundledPath = join(repoRoot, 'node_modules/expo/bundledNativeModules.json');

if (!existsSync(bundledPath)) {
  console.error(
    `${YELLOW}check:deps: skipped — node_modules/expo not present. Run \`npm install --legacy-peer-deps\` first.${RESET}`,
  );
  process.exit(0);
}

const bundled = readJSON(bundledPath);
const declared = { ...pkg.dependencies, ...pkg.devDependencies };

const messages = [];
const fixes = [];

for (const [name, expoRange] of Object.entries(bundled)) {
  const have = declared[name];
  if (!have) continue; // not used by this project
  if (have !== expoRange) {
    messages.push(
      `${name} in package.json is "${have}" but Expo SDK 56 expects "${expoRange}".`,
    );
    fixes.push(`npx expo install ${name}`);
  }
}

// --- Compare installed versions against Expo's bundled list ----------------
// Lockfile drift can still bite even when package.json is correct, e.g. when
// a previous install resolved a caret range to a too-new version.

import semverSatisfies from './semver-satisfies.mjs';

for (const [name, expoRange] of Object.entries(bundled)) {
  if (!declared[name]) continue;
  const installedPkgPath = join(repoRoot, 'node_modules', name, 'package.json');
  if (!existsSync(installedPkgPath)) {
    messages.push(`${name} declared but not installed in node_modules.`);
    fixes.push('npm install --legacy-peer-deps');
    continue;
  }
  const installedVersion = readJSON(installedPkgPath).version;
  if (!semverSatisfies(installedVersion, expoRange)) {
    messages.push(
      `${name} installed version ${installedVersion} does not satisfy Expo's "${expoRange}".`,
    );
    fixes.push(`npx expo install ${name}`);
  }
}

if (messages.length > 0) {
  // dedupe fixes
  fail(messages, [...new Set(fixes)]);
}

console.log(
  `${GREEN}✓ check:deps: ${Object.keys(bundled).filter((n) => declared[n]).length} Expo-managed packages in sync with SDK 56.${RESET}`,
);
