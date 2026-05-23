import {
  roll,
  rollD20,
  rollWithModifier,
  rollAdvantage,
  rollDisadvantage,
  rollDamage,
  parseDamageNotation,
} from 'src/engine/dice';

describe('dice.roll', () => {
  it('produces values between 1 and sides inclusive', () => {
    for (let i = 0; i < 200; i++) {
      const r = roll(20);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(20);
    }
  });

  it('sums multiple dice', () => {
    for (let i = 0; i < 50; i++) {
      const r = roll(6, 3);
      expect(r).toBeGreaterThanOrEqual(3);
      expect(r).toBeLessThanOrEqual(18);
    }
  });
});

describe('dice.rollD20', () => {
  it('flags natural 20 as crit', () => {
    const samples = Array.from({ length: 500 }, () => rollD20());
    const crit = samples.find((s) => s.natural === 20);
    if (crit) expect(crit.isCrit).toBe(true);
    const critFail = samples.find((s) => s.natural === 1);
    if (critFail) expect(critFail.isCritFail).toBe(true);
  });
});

describe('dice.rollWithModifier', () => {
  it('adds modifier to result', () => {
    for (let i = 0; i < 100; i++) {
      const r = rollWithModifier(20, 5);
      expect(r.total).toBe((r.naturalRoll ?? 0) + 5);
      expect(r.modifier).toBe(5);
    }
  });
});

describe('dice.rollAdvantage / rollDisadvantage', () => {
  it('advantage picks higher of 2d20', () => {
    for (let i = 0; i < 200; i++) {
      const r = rollAdvantage(0);
      expect(r.rolls.length).toBe(2);
      expect(r.naturalRoll).toBe(Math.max(r.rolls[0], r.rolls[1]));
    }
  });

  it('disadvantage picks lower of 2d20', () => {
    for (let i = 0; i < 200; i++) {
      const r = rollDisadvantage(0);
      expect(r.rolls.length).toBe(2);
      expect(r.naturalRoll).toBe(Math.min(r.rolls[0], r.rolls[1]));
    }
  });

  it('advantage averages higher than disadvantage over many rolls', () => {
    let advSum = 0;
    let disSum = 0;
    for (let i = 0; i < 5000; i++) {
      advSum += rollAdvantage(0).total;
      disSum += rollDisadvantage(0).total;
    }
    expect(advSum).toBeGreaterThan(disSum);
  });
});

describe('dice.parseDamageNotation', () => {
  it('parses simple notation', () => {
    expect(parseDamageNotation('1d8')).toEqual({ count: 1, sides: 8, bonus: 0 });
  });

  it('parses notation with positive bonus', () => {
    expect(parseDamageNotation('2d6+3')).toEqual({ count: 2, sides: 6, bonus: 3 });
  });

  it('parses notation with negative bonus', () => {
    expect(parseDamageNotation('1d4-1')).toEqual({ count: 1, sides: 4, bonus: -1 });
  });

  it('parses notation with whitespace', () => {
    expect(parseDamageNotation(' 3d6 + 2 ')).toEqual({ count: 3, sides: 6, bonus: 2 });
  });

  it('throws on invalid notation', () => {
    expect(() => parseDamageNotation('garbage')).toThrow();
  });
});

describe('dice.rollDamage', () => {
  it('respects min/max bounds for non-crit', () => {
    for (let i = 0; i < 200; i++) {
      const r = rollDamage('2d6+3', 0, false);
      expect(r.total).toBeGreaterThanOrEqual(5);
      expect(r.total).toBeLessThanOrEqual(15);
      expect(r.rolls.length).toBe(2);
    }
  });

  it('doubles dice count on critical (not the total)', () => {
    for (let i = 0; i < 200; i++) {
      const r = rollDamage('1d8+0', 0, true);
      expect(r.rolls.length).toBe(2);
      expect(r.total).toBeGreaterThanOrEqual(2);
      expect(r.total).toBeLessThanOrEqual(16);
    }
  });

  it('combines notation bonus and ability modifier', () => {
    const r = rollDamage('1d6+2', 3, false);
    expect(r.modifier).toBe(5);
    expect(r.total).toBeGreaterThanOrEqual(6);
    expect(r.total).toBeLessThanOrEqual(11);
  });

  it('enforces minimum damage of 1', () => {
    for (let i = 0; i < 50; i++) {
      const r = rollDamage('1d4-10', 0, false);
      expect(r.total).toBeGreaterThanOrEqual(1);
    }
  });
});
