// Minimal semver range matcher — only the operators Expo's bundled list uses:
//   "1.2.3"   exact
//   "~1.2.3"  same major+minor, patch >= .3
//   "^1.2.3"  same major, version >= 1.2.3   (rare here but supported)
// No prereleases, no compound ranges, no extras. Keeps the dep-check script
// dependency-free so it can run before `npm install` finishes wiring anything.
export default function satisfies(version, range) {
  const v = parse(version);
  if (!v) return false;

  let op = '=';
  let rangeStr = range.trim();
  if (rangeStr.startsWith('~') || rangeStr.startsWith('^')) {
    op = rangeStr[0];
    rangeStr = rangeStr.slice(1);
  }
  const r = parse(rangeStr);
  if (!r) return false;

  if (op === '=') {
    return v.major === r.major && v.minor === r.minor && v.patch === r.patch;
  }
  if (op === '~') {
    if (v.major !== r.major || v.minor !== r.minor) return false;
    return v.patch >= r.patch;
  }
  if (op === '^') {
    if (v.major !== r.major) return false;
    if (r.major === 0) {
      // ^0.y.z behaves like ~0.y.z
      if (v.minor !== r.minor) return false;
      return v.patch >= r.patch;
    }
    return cmp(v, r) >= 0;
  }
  return false;
}

function parse(s) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(s);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function cmp(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}
