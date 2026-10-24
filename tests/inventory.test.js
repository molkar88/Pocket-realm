import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INVENTORY_SIZE, Inventory, canSmeltBronze, smeltBronze } from '../src/inventory.js';

test('adds items until all slots are full', () => {
  const inventory = new Inventory();
  for (let i = 0; i < INVENTORY_SIZE; i++) assert.equal(inventory.add('logs'), true);
  assert.equal(inventory.isFull(), true);
  assert.equal(inventory.add('logs'), false);
  assert.equal(inventory.count('logs'), INVENTORY_SIZE);
});

test('removeAt empties a slot and returns the item', () => {
  const inventory = new Inventory(['tin', 'copper']);
  assert.equal(inventory.removeAt(1), 'copper');
  assert.equal(inventory.removeAt(1), null);
  assert.equal(inventory.add('logs'), true);
  assert.equal(inventory.slots[1], 'logs');
});

test('drops unknown or malformed saved slots', () => {
  assert.deepEqual(new Inventory(['logs', 'gold', 42, null, '__proto__']).toJSON().slice(0, 5), [
    'logs', null, null, null, null,
  ]);
  assert.equal(new Inventory('not an array').slots.length, INVENTORY_SIZE);
});

test('smelting turns one copper and one tin into a bronze bar', () => {
  const inventory = new Inventory(['copper', 'tin', 'copper']);
  assert.equal(canSmeltBronze(inventory), true);
  assert.equal(smeltBronze(inventory), true);
  assert.equal(inventory.count('copper'), 1);
  assert.equal(inventory.count('tin'), 0);
  assert.equal(inventory.count('bronze'), 1);
  assert.equal(smeltBronze(inventory), false);
});

test('smelting works with a full inventory because it frees a slot', () => {
  const inventory = new Inventory(['copper', 'tin', ...Array(INVENTORY_SIZE - 2).fill('logs')]);
  assert.equal(smeltBronze(inventory), true);
  assert.equal(inventory.count('bronze'), 1);
});
