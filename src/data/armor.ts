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
  // Light: full Dex bonus.
  studded: {
    id: 'studded',
    name: 'Studded Leather',
    baseAC: 12,
    category: 'light',
    dexCap: null,
  },
  // Medium: Dex bonus capped at +2.
  hide: {
    id: 'hide',
    name: 'Hide Armor',
    baseAC: 12,
    category: 'medium',
    dexCap: 2,
  },
  chain_shirt: {
    id: 'chain_shirt',
    name: 'Chain Shirt',
    baseAC: 13,
    category: 'medium',
    dexCap: 2,
  },
  scale: {
    id: 'scale',
    name: 'Scale Mail',
    baseAC: 14,
    category: 'medium',
    dexCap: 2,
  },
  breastplate: {
    id: 'breastplate',
    name: 'Breastplate',
    baseAC: 14,
    category: 'medium',
    dexCap: 2,
  },
  half_plate: {
    id: 'half_plate',
    name: 'Half Plate',
    baseAC: 15,
    category: 'medium',
    dexCap: 2,
  },
  // Heavy: no Dex bonus.
  ring: {
    id: 'ring',
    name: 'Ring Mail',
    baseAC: 14,
    category: 'heavy',
    dexCap: 0,
  },
  splint: {
    id: 'splint',
    name: 'Splint Armor',
    baseAC: 17,
    category: 'heavy',
    dexCap: 0,
    strRequirement: 15,
  },
  plate: {
    id: 'plate',
    name: 'Plate Armor',
    baseAC: 18,
    category: 'heavy',
    dexCap: 0,
    strRequirement: 15,
  },
  // Arcane vestments: no armor proficiency needed beyond the caster classes.
  mage_robe: {
    id: 'mage_robe',
    name: 'Mage Robe',
    baseAC: 13,
    category: 'arcane',
    dexCap: null,
  },
  greater_robe: {
    id: 'greater_robe',
    name: 'Greater Mage Robe',
    baseAC: 15,
    category: 'arcane',
    dexCap: null,
  },
};

export function getArmor(id: string): ArmorData {
  const a = ARMOR[id];
  if (!a) throw new Error(`Unknown armor: ${id}`);
  return a;
}
