import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toMinimap, fromMinimap } from '../src/minimap.js';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('with yaw 0 the camera looks towards -z, which is up on the minimap', () => {
  const ahead = toMinimap(0, -1, 0);
  close(ahead.x, 0);
  close(ahead.y, -1);
  const right = toMinimap(1, 0, 0);
  close(right.x, 1);
  close(right.y, 0);
});

test('the tile the camera faces is always drawn straight up', () => {
  for (const yaw of [0.3, Math.PI / 4, 2, -1.2]) {
    const forward = toMinimap(-Math.sin(yaw), -Math.cos(yaw), yaw);
    close(forward.x, 0);
    close(forward.y, -1);
  }
});

test('fromMinimap undoes toMinimap', () => {
  const yaw = 1.1;
  const { x, y } = toMinimap(3, -2, yaw);
  const { dx, dz } = fromMinimap(x, y, yaw);
  close(dx, 3);
  close(dz, -2);
});
