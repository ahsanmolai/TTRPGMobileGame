import { ArmorData } from 'src/engine/character';

export const ARMOR: Record<string, ArmorData> = {
  chainmail: {
    id: 'chainmail',
    name: 'Chain Mail',
    baseAC: 16,
    category: 'medium',
    dexCap: 2,
  },
  leather: {
    id: 'leather',
    name: 'Leather Armor',
    baseAC: 11,
    category: 'light',
    dexCap: null,
  },
};

export function getArmor(id: string): ArmorData {
  const a = ARMOR[id];
  if (!a) throw new Error(`Unknown armor: ${id}`);
  return a;
}
