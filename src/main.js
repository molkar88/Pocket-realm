import * as THREE from 'three';
import { MAP, parseMap, isWalkable } from './map.js';
import { findPath, findPathToAdjacent } from './pathfinding.js';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { Inventory, ITEMS, canSmeltBronze, smeltBronze } from './inventory.js';
import { SKILLS, createXp, addXp, levelForXp, actionSeconds } from './skills.js';
import { Minimap } from './minimap.js';
import { createUI } from './ui.js';

const TAP_SLOP_PX = 8;
const SAVE_KEY = 'pocket-realm-save-v1';
const SMELT_SECONDS = 2;
const SMELT_XP = 6.25;

const ACTIONS = {
  tree: {
    tool: 'axe',
    skill: 'woodcutting',
    xp: 25,
    seconds: 1.8,
    restoreMs: 12000,
    start: 'You swing your axe at the tree.',
    success: () => 'You get some logs.',
    empty: 'This tree has already been cut down.',
  },
  rock: {
    tool: 'pickaxe',
    skill: 'mining',
    xp: 17.5,
    seconds: 2.5,
    restoreMs: 15000,
    start: 'You swing your pick at the rock.',
    success: (node) => `You manage to mine some ${node.item}.`,
    empty: 'There is currently no ore available in this rock.',
  },
};

const map = parseMap(MAP);
const walkable = (x, z) => isWalkable(map, x, z);

const canvas = document.querySelector('#game');
const chatEl = document.querySelector('#chat');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec9f0);
scene.fog = new THREE.Fog(0x8ec9f0, 22, 50);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

scene.add(new THREE.HemisphereLight(0xdff1ff, 0x4a6b2a, 1.6));
const sun = new THREE.DirectionalLight(0xfff4e0, 2.4);
sun.position.set(map.width / 2 + 8, 14, map.height / 2 + 5);
sun.target.position.set(map.width / 2, 0, map.height / 2);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 45 });
scene.add(sun, sun.target);

const world = buildWorld(scene, map);
const player = new Player(scene, map.spawn);

const marker = new THREE.Mesh(
  new THREE.RingGeometry(0.22, 0.34, 24),
  new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, depthWrite: false }),
);
marker.rotation.x = -Math.PI / 2;
marker.visible = false;
scene.add(marker);
let markerTime = 0;

function showMarker(x, z, color, y = 0.02) {
  marker.position.set(x, y, z);
  marker.material.color.set(color);
  markerTime = 0.6;
  marker.visible = true;
}

function loadSave() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY));
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

const saved = loadSave();
const inventory = new Inventory(saved.inventory);
const xp = createXp(saved.xp);

let chatTimer = null;

function say(text) {
  chatEl.textContent = text;
  chatEl.classList.add('show');
  clearTimeout(chatTimer);
  chatTimer = setTimeout(() => chatEl.classList.remove('show'), 3500);
}

function walkTo(x, z) {
  if (!walkable(x, z)) {
    say(map.tiles[z]?.[x]?.type === 'water' ? "You can't walk on water." : "You can't stand there.");
    return;
  }
  const path = findPath(walkable, player.tile, { x, z });
  if (!path) {
    say("You can't reach that.");
    return;
  }
  showMarker(x, z, 0xffff00);
  player.setPath(path);
}

function saveProgress() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ inventory, xp }));
  } catch {
    // Storage can be unavailable (private browsing); progress just won't persist.
  }
}

function changed() {
  ui.update(inventory, xp);
  saveProgress();
}

function gainXp(skill, amount, message) {
  const level = addXp(xp, skill, amount);
  say(level ? `Congratulations, you just advanced a ${SKILLS[skill].name} level. You are now level ${level}.` : message);
}

function fullMessage(item) {
  return `Your inventory is too full to hold any more ${ITEMS[item].name.toLowerCase()}.`;
}

function approach(target, onArrive) {
  const path = findPathToAdjacent(walkable, player.tile, target);
  if (!path) {
    say("You can't reach that.");
    return;
  }
  showMarker(target.x, target.z, 0xff3030, 0.05);
  player.setPath(path, () => {
    player.face(target.x, target.z);
    onArrive();
  });
}

function gather(node, action) {
  if (!node.available) {
    say(action.empty);
    return;
  }
  if (inventory.isFull()) {
    say(fullMessage(node.item));
    return;
  }
  approach(node, () => {
    player.holdTool(action.tool);
    say(action.start);
    player.startAction(actionSeconds(action.seconds, levelForXp(xp[action.skill])), () => {
      if (!node.available) return;
      if (!inventory.add(node.item)) {
        say(fullMessage(node.item));
        return;
      }
      node.deplete();
      gainXp(action.skill, action.xp, action.success(node));
      changed();
      setTimeout(() => node.restore(), action.restoreMs);
    });
  });
}

// Keeps smelting bars until the player runs out of ore or walks away.
function smeltNext() {
  if (!canSmeltBronze(inventory)) return;
  player.startAction(actionSeconds(SMELT_SECONDS, levelForXp(xp.smithing)), () => {
    if (!smeltBronze(inventory)) return;
    gainXp('smithing', SMELT_XP, 'You retrieve a bar of bronze.');
    changed();
    smeltNext();
  });
}

function smelt(furnace) {
  if (!canSmeltBronze(inventory)) {
    say('You need one copper ore and one tin ore to make a bronze bar.');
    return;
  }
  approach(furnace, () => {
    player.holdTool(null);
    say('You place the copper and tin into the furnace.');
    smeltNext();
  });
}

const ui = createUI({
  onDrop(index) {
    const item = inventory.removeAt(index);
    if (!item) return;
    say(`You drop the ${ITEMS[item].name.toLowerCase()}.`);
    changed();
  },
});
ui.update(inventory, xp);

const minimap = new Minimap(document.querySelector('#minimap'), map, (dx, dz) => {
  const { x, z } = player.object.position;
  walkTo(Math.round(x + dx), Math.round(z + dz));
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function handleTap(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointer.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(world.pickables, false)[0];
  if (!hit) return;

  const target = hit.object.userData.target;
  if (target.kind === 'furnace') smelt(target);
  else if (target.node) gather(target.node, ACTIONS[target.kind]);
  else walkTo(target.x, target.z);
}

// Camera orbits around the player: drag rotates, pinch or wheel zooms.
const view = { yaw: Math.PI / 4, pitch: 0.85, distance: 11 };
const focus = player.object.position.clone();
const pointers = new Map();
let gesture = null;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const zoom = (factor) => { view.distance = clamp(view.distance * factor, 5, 20); };

function pinchDistance() {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
}

canvas.addEventListener('pointerdown', (event) => {
  canvas.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY });
  if (pointers.size === 1) {
    gesture = { tap: true };
  } else if (pointers.size === 2) {
    gesture.tap = false;
    gesture.pinch = pinchDistance();
  }
});

canvas.addEventListener('pointermove', (event) => {
  const p = pointers.get(event.pointerId);
  if (!p) return;
  const dx = event.clientX - p.x;
  const dy = event.clientY - p.y;
  p.x = event.clientX;
  p.y = event.clientY;

  if (pointers.size === 1) {
    if (Math.hypot(p.x - p.startX, p.y - p.startY) > TAP_SLOP_PX) gesture.tap = false;
    if (!gesture.tap) {
      view.yaw -= dx * 0.008;
      view.pitch = clamp(view.pitch + dy * 0.005, 0.35, 1.35);
    }
  } else if (pointers.size === 2) {
    const distance = pinchDistance();
    if (distance > 0) zoom(gesture.pinch / distance);
    gesture.pinch = distance;
  }
});

function endPointer(event) {
  if (!pointers.delete(event.pointerId)) return;
  if (pointers.size === 0 && gesture?.tap && event.type === 'pointerup') {
    handleTap(event.clientX, event.clientY);
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  zoom(event.deltaY > 0 ? 1.1 : 1 / 1.1);
}, { passive: false });

function updateCamera(dt) {
  focus.lerp(player.object.position, 1 - Math.exp(-dt * 6));
  const horizontal = view.distance * Math.cos(view.pitch);
  camera.position.set(
    focus.x + horizontal * Math.sin(view.yaw),
    focus.y + view.distance * Math.sin(view.pitch),
    focus.z + horizontal * Math.cos(view.yaw),
  );
  camera.lookAt(focus.x, focus.y + 0.6, focus.z);
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1);
  player.update(dt);
  world.update(clock.elapsedTime);
  updateCamera(dt);
  minimap.draw(player.object.position, view.yaw);

  if (marker.visible) {
    markerTime -= dt;
    marker.material.opacity = Math.max(markerTime / 0.6, 0);
    marker.visible = markerTime > 0;
  }

  renderer.render(scene, camera);
});

say('Tap to walk. Chop trees, mine rocks, smelt bronze at the furnace. Drag to turn, pinch to zoom.');
