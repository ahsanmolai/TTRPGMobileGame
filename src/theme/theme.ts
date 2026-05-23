import { Platform } from 'react-native';

export const colors = {
  background: {
    primary: '#0D0D0F',
    secondary: '#1A1A2E',
    card: '#16213E',
    elevated: '#0F3460',
    overlay: 'rgba(0, 0, 0, 0.75)',
  },
  accent: {
    gold: '#D4AF37',
    goldDim: '#8B7A1A',
    crimson: '#8B0000',
    emerald: '#2D6A4F',
    sapphire: '#1E3A8A',
    silver: '#C0C0C0',
  },
  text: {
    primary: '#E8E8E8',
    secondary: '#9CA3AF',
    accent: '#D4AF37',
    danger: '#EF4444',
    success: '#10B981',
    dim: '#6B7280',
  },
  hp: {
    high: '#10B981',
    medium: '#F59E0B',
    low: '#EF4444',
  },
  log: {
    attack_hit: '#E8E8E8',
    attack_miss: '#6B7280',
    critical_hit: '#FFD700',
    critical_fail: '#8B0000',
    damage: '#EF4444',
    heal: '#10B981',
    condition_applied: '#F59E0B',
    condition_removed: '#9CA3AF',
    death: '#6B7280',
    turn_start: '#D4AF37',
    initiative: '#9CA3AF',
    system: '#C0C0C0',
  },
} as const;

export const typography = {
  fontFamily: {
    serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export function hpColor(current: number, max: number): string {
  if (max <= 0) return colors.hp.low;
  const ratio = current / max;
  if (ratio > 0.5) return colors.hp.high;
  if (ratio > 0.25) return colors.hp.medium;
  return colors.hp.low;
}
