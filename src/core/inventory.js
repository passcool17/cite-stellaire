// Inventaire minimal : jusqu'à 3 potions + 1 clé de quête.
export const MAX_POTIONS = 3;
const POTION_HEAL = 30;

export function createInventory() {
  return { potions: MAX_POTIONS, questKey: null };
}

export function addItem(inv, itemId) {
  if (itemId === 'potion') {
    if (inv.potions >= MAX_POTIONS) return false;
    inv.potions += 1;
    return true;
  }
  inv.questKey = itemId;
  return true;
}

export function usePotion(inv, target) {
  if (inv.potions <= 0 || target.hp <= 0 || target.hp >= target.hpMax) return false;
  const healed = Math.min(POTION_HEAL, target.hpMax - target.hp);
  target.hp += healed;
  inv.potions -= 1;
  return healed;
}

export const hasQuestKey = (inv) => inv.questKey !== null;

export function takeQuestKey(inv) {
  const key = inv.questKey;
  inv.questKey = null;
  return key;
}
