export const INVENTORY_SIZE = 28;

export const ITEMS = {
  logs: { name: 'Logs' },
  copper: { name: 'Copper ore' },
  tin: { name: 'Tin ore' },
  bronze: { name: 'Bronze bar' },
};

export class Inventory {
  // Saved slots come from browser storage, so unknown entries are dropped.
  constructor(saved = []) {
    const slots = Array.isArray(saved) ? saved : [];
    this.slots = Array.from({ length: INVENTORY_SIZE }, (_, i) => (
      Object.hasOwn(ITEMS, slots[i]) ? slots[i] : null
    ));
  }

  count(item) {
    return this.slots.filter((slot) => slot === item).length;
  }

  isFull() {
    return !this.slots.includes(null);
  }

  add(item) {
    const index = this.slots.indexOf(null);
    if (index === -1) return false;
    this.slots[index] = item;
    return true;
  }

  remove(item) {
    const index = this.slots.lastIndexOf(item);
    if (index === -1) return false;
    this.slots[index] = null;
    return true;
  }

  removeAt(index) {
    const item = this.slots[index] ?? null;
    if (item) this.slots[index] = null;
    return item;
  }

  toJSON() {
    return [...this.slots];
  }
}

export function canSmeltBronze(inventory) {
  return inventory.count('copper') > 0 && inventory.count('tin') > 0;
}

export function smeltBronze(inventory) {
  if (!canSmeltBronze(inventory)) return false;
  inventory.remove('copper');
  inventory.remove('tin');
  inventory.add('bronze');
  return true;
}
