import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XP_TABLE, MAX_XP, levelForXp, levelProgress, createXp, addXp, actionSeconds } from '../src/skills.js';

test('XP table matches the classic curve', () => {
  assert.equal(XP_TABLE[2], 83);
  assert.equal(XP_TABLE[10], 1154);
  assert.equal(XP_TABLE[99], 13034431);
});

test('levelForXp', () => {
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(82), 1);
  assert.equal(levelForXp(83), 2);
  assert.equal(levelForXp(MAX_XP), 99);
});

test('levelProgress reports the fraction towards the next level', () => {
  const progress = levelProgress(83 + (174 - 83) / 2);
  assert.equal(progress.level, 2);
  assert.equal(progress.nextLevelXp, 174);
  assert.equal(progress.fraction, 0.5);
  assert.deepEqual(levelProgress(MAX_XP), { level: 99, fraction: 1, nextLevelXp: null });
});

test('addXp returns the new level only on level-up', () => {
  const xp = createXp();
  assert.equal(addXp(xp, 'mining', 50), null);
  assert.equal(addXp(xp, 'mining', 50), 2);
  assert.equal(xp.mining, 100);
});

test('createXp ignores bad saved values', () => {
  assert.deepEqual(createXp({ woodcutting: 'abc', mining: -5, smithing: 1e12, magic: 99 }), {
    woodcutting: 0,
    mining: 0,
    smithing: MAX_XP,
  });
  assert.deepEqual(createXp(null), { woodcutting: 0, mining: 0, smithing: 0 });
});

test('actionSeconds speeds up with level but never below half', () => {
  assert.equal(actionSeconds(2, 1), 2);
  assert.ok(actionSeconds(2, 10) < 2);
  assert.equal(actionSeconds(2, 99), 1);
});
