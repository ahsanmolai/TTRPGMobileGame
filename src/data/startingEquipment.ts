// Default starting loadout per class, limited to items the engine implements.
import { ClassId } from 'src/data/classes';
import { WeaponCategory } from 'src/data/weapons';

export interface StartingEquipment {
  weaponId: string;
  armorId: string | null;
  shield: boolean;
  proficientWeapons: WeaponCategory[];
}

export const STARTING_EQUIPMENT: Record<ClassId, StartingEquipment> = {
  barbarian: { weaponId: 'greataxe', armorId: null, shield: false, proficientWeapons: ['simple', 'martial'] },
  bard: { weaponId: 'shortsword', armorId: 'leather', shield: false, proficientWeapons: ['simple', 'martial'] },
  cleric: { weaponId: 'mace', armorId: 'chainmail', shield: true, proficientWeapons: ['simple'] },
  druid: { weaponId: 'mace', armorId: 'leather', shield: true, proficientWeapons: ['simple'] },
  fighter: { weaponId: 'longsword', armorId: 'chainmail', shield: true, proficientWeapons: ['simple', 'martial'] },
  monk: { weaponId: 'shortsword', armorId: null, shield: false, proficientWeapons: ['simple', 'martial'] },
  paladin: { weaponId: 'longsword', armorId: 'chainmail', shield: true, proficientWeapons: ['simple', 'martial'] },
  ranger: { weaponId: 'shortbow', armorId: 'leather', shield: false, proficientWeapons: ['simple', 'martial'] },
  rogue: { weaponId: 'shortsword', armorId: 'leather', shield: false, proficientWeapons: ['simple', 'martial'] },
  sorcerer: { weaponId: 'dagger', armorId: null, shield: false, proficientWeapons: ['simple'] },
  warlock: { weaponId: 'dagger', armorId: 'leather', shield: false, proficientWeapons: ['simple'] },
  wizard: { weaponId: 'dagger', armorId: null, shield: false, proficientWeapons: ['simple'] },
};
