export type DieSize = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export interface RollResult {
  rolls: number[];
  total: number;
  modifier: number;
  naturalRoll?: number;
  isCritical?: boolean;
  isCriticalFail?: boolean;
}

export function roll(sides: DieSize, count: number = 1): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
}

export function rollD20(): { natural: number; isCrit: boolean; isCritFail: boolean } {
  const natural = Math.floor(Math.random() * 20) + 1;
  return {
    natural,
    isCrit: natural === 20,
    isCritFail: natural === 1,
  };
}

export function rollWithModifier(sides: DieSize, modifier: number): RollResult {
  const naturalRoll = Math.floor(Math.random() * sides) + 1;
  return {
    rolls: [naturalRoll],
    total: naturalRoll + modifier,
    modifier,
    naturalRoll,
    isCritical: sides === 20 && naturalRoll === 20,
    isCriticalFail: sides === 20 && naturalRoll === 1,
  };
}

export function rollAdvantage(modifier: number = 0): RollResult {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const natural = Math.max(a, b);
  return {
    rolls: [a, b],
    total: natural + modifier,
    modifier,
    naturalRoll: natural,
    isCritical: natural === 20,
    isCriticalFail: natural === 1,
  };
}

export function rollDisadvantage(modifier: number = 0): RollResult {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const natural = Math.min(a, b);
  return {
    rolls: [a, b],
    total: natural + modifier,
    modifier,
    naturalRoll: natural,
    isCritical: natural === 20,
    isCriticalFail: natural === 1,
  };
}

const DAMAGE_REGEX = /^\s*(\d+)d(\d+)\s*([+-]\s*\d+)?\s*$/i;

export interface ParsedDamage {
  count: number;
  sides: number;
  bonus: number;
}

export function parseDamageNotation(notation: string): ParsedDamage {
  const match = DAMAGE_REGEX.exec(notation);
  if (!match) {
    throw new Error(`Invalid damage notation: "${notation}"`);
  }
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const bonus = match[3] ? parseInt(match[3].replace(/\s+/g, ''), 10) : 0;
  return { count, sides, bonus };
}

export function rollDamage(
  notation: string,
  modifier: number = 0,
  critical: boolean = false,
): RollResult {
  const { count, sides, bonus } = parseDamageNotation(notation);
  const diceCount = critical ? count * 2 : count;
  const rolls: number[] = [];
  let total = 0;
  for (let i = 0; i < diceCount; i++) {
    const r = Math.floor(Math.random() * sides) + 1;
    rolls.push(r);
    total += r;
  }
  const finalModifier = bonus + modifier;
  total += finalModifier;
  if (total < 1) total = 1; // damage minimum 1 per PHB
  return {
    rolls,
    total,
    modifier: finalModifier,
  };
}
