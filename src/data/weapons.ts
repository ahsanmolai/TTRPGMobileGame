export type WeaponCategory = 'simple' | 'martial';
export type DamageType =
  | 'slashing'
  | 'piercing'
  | 'bludgeoning'
  | 'fire'
  | 'cold'
  | 'thunder'
  | 'necrotic'
  | 'radiant';

export type WeaponProperty =
  | 'finesse'
  | 'light'
  | 'heavy'
  | 'thrown'
  | 'two-handed'
  | 'versatile'
  | 'ranged';

export interface WeaponData {
  id: string;
  name: string;
  damageDice: string; // e.g. "1d8"
  damageType: DamageType;
  category: WeaponCategory;
  properties: WeaponProperty[];
  versatileDice?: string;
  range?: { normal: number; long: number };
}

export const WEAPONS: Record<string, WeaponData> = {
  dagger: {
    id: 'dagger',
    name: 'Dagger',
    damageDice: '1d4',
    damageType: 'piercing',
    category: 'simple',
    properties: ['finesse', 'light', 'thrown'],
    range: { normal: 20, long: 60 },
  },
  shortsword: {
    id: 'shortsword',
    name: 'Shortsword',
    damageDice: '1d6',
    damageType: 'piercing',
    category: 'martial',
    properties: ['finesse', 'light'],
  },
  longsword: {
    id: 'longsword',
    name: 'Longsword',
    damageDice: '1d8',
    damageType: 'slashing',
    category: 'martial',
    properties: ['versatile'],
    versatileDice: '1d10',
  },
  greataxe: {
    id: 'greataxe',
    name: 'Greataxe',
    damageDice: '1d12',
    damageType: 'slashing',
    category: 'martial',
    properties: ['heavy', 'two-handed'],
  },
  mace: {
    id: 'mace',
    name: 'Mace',
    damageDice: '1d6',
    damageType: 'bludgeoning',
    category: 'simple',
    properties: [],
  },
  shortbow: {
    id: 'shortbow',
    name: 'Shortbow',
    damageDice: '1d6',
    damageType: 'piercing',
    category: 'simple',
    properties: ['ranged', 'two-handed'],
    range: { normal: 80, long: 320 },
  },
};

export function getWeapon(id: string): WeaponData {
  const w = WEAPONS[id];
  if (!w) throw new Error(`Unknown weapon: ${id}`);
  return w;
}
