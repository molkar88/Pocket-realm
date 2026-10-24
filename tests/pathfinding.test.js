import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPath, findPathToAdjacent } from '../src/pathfinding.js';
import { MAP, parseMap, isWalkable } from '../src/map.js';

function gridFrom(rows) {
  return (x, z) => rows[z]?.[x] === '.';
}

test('straight path excludes start and includes goal', () => {
  const walkable = gridFrom(['....']);
  assert.deepEqual(findPath(walkable, { x: 0, z: 0 }, { x: 3, z: 0 }), [
    { x: 1, z: 0 }, { x: 2, z: 0 }, { x: 3, z: 0 },
  ]);
});

test('already at goal returns empty path', () => {
  const walkable = gridFrom(['..']);
  assert.deepEqual(findPath(walkable, { x: 1, z: 0 }, { x: 1, z: 0 }), []);
});

test('uses diagonals on open ground', () => {
  const walkable = gridFrom(['...', '...', '...']);
  const path = findPath(walkable, { x: 0, z: 0 }, { x: 2, z: 2 });
  assert.deepEqual(path, [{ x: 1, z: 1 }, { x: 2, z: 2 }]);
});

test('does not cut corners past blocked tiles', () => {
  const walkable = gridFrom([
    '.#',
    '..',
  ]);
  const path = findPath(walkable, { x: 0, z: 0 }, { x: 1, z: 1 });
  assert.deepEqual(path, [{ x: 0, z: 1 }, { x: 1, z: 1 }]);
});

test('walks around walls', () => {
  const walkable = gridFrom([
    '.#.',
    '.#.',
    '...',
  ]);
  const path = findPath(walkable, { x: 0, z: 0 }, { x: 2, z: 0 });
  assert.equal(path.at(-1).x, 2);
  assert.ok(path.every(({ x, z }) => walkable(x, z)));
  assert.equal(path.length, 6);
});

test('returns null when goal is blocked or unreachable', () => {
  const walkable = gridFrom([
    '.#.',
    '.#.',
  ]);
  assert.equal(findPath(walkable, { x: 0, z: 0 }, { x: 1, z: 0 }), null);
  assert.equal(findPath(walkable, { x: 0, z: 0 }, { x: 2, z: 1 }), null);
});

test('findPathToAdjacent stops beside the target', () => {
  const walkable = gridFrom([
    '.....',
    '..#..',
    '.....',
  ]);
  const path = findPathToAdjacent(walkable, { x: 0, z: 1 }, { x: 2, z: 1 });
  assert.deepEqual(path, [{ x: 1, z: 1 }]);
});

test('findPathToAdjacent returns empty path when already beside target', () => {
  const walkable = gridFrom(['.#.']);
  assert.deepEqual(findPathToAdjacent(walkable, { x: 0, z: 0 }, { x: 1, z: 0 }), []);
});

test('game map: every tree, rock and furnace can be reached from spawn', () => {
  const map = parseMap(MAP);
  const walkable = (x, z) => isWalkable(map, x, z);
  assert.ok(walkable(map.spawn.x, map.spawn.z));

  const counts = { tree: 0, rock: 0, furnace: 0 };
  map.tiles.forEach((row, z) => row.forEach((tile, x) => {
    if (!tile.object) return;
    counts[tile.object]++;
    assert.ok(findPathToAdjacent(walkable, map.spawn, { x, z }), `${tile.object} at ${x},${z} unreachable`);
  }));
  assert.ok(counts.tree > 0);
  assert.ok(counts.rock > 0);
  assert.ok(counts.furnace > 0);
});

test('parseMap reads copper and tin rocks as blocking ore tiles', () => {
  const map = parseMap(['@CN']);
  assert.deepEqual(map.tiles[0][1], { type: 'grass', object: 'rock', ore: 'copper' });
  assert.deepEqual(map.tiles[0][2], { type: 'grass', object: 'rock', ore: 'tin' });
  assert.equal(isWalkable(map, 1, 0), false);
});

test('parseMap rejects bad maps', () => {
  assert.throws(() => parseMap(['..@', '..']), /length/);
  assert.throws(() => parseMap(['.?@']), /Unknown/);
  assert.throws(() => parseMap(['...']), /spawn/);
});
