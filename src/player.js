import * as THREE from 'three';

const WALK_SPEED = 2.8; // tiles per second

function box(width, height, depth, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.castShadow = true;
  return mesh;
}

// A limb that swings from its top end (hip or shoulder).
function limb(width, length, color, pivotY, offsetX) {
  const pivot = new THREE.Group();
  pivot.position.set(offsetX, pivotY, 0);
  const mesh = box(width, length, width, color);
  mesh.position.y = -length / 2;
  pivot.add(mesh);
  return pivot;
}

export class Player {
  constructor(scene, spawn) {
    this.object = new THREE.Group();
    this.object.position.set(spawn.x, 0, spawn.z);

    this.leftLeg = limb(0.15, 0.45, 0x5a3d22, 0.45, -0.1);
    this.rightLeg = limb(0.15, 0.45, 0x5a3d22, 0.45, 0.1);
    this.leftArm = limb(0.12, 0.42, 0x2d5fa8, 0.95, -0.3);
    this.rightArm = limb(0.12, 0.42, 0x2d5fa8, 0.95, 0.3);

    const axe = box(0.05, 0.45, 0.05, 0x6b4423);
    axe.position.set(0, -0.42, 0.18);
    axe.rotation.x = Math.PI / 2;
    const blade = box(0.04, 0.16, 0.14, 0xb0b0b8);
    blade.position.set(0, 0.06, 0.2);
    axe.add(blade);

    const pickaxe = box(0.05, 0.45, 0.05, 0x6b4423);
    pickaxe.position.copy(axe.position);
    pickaxe.rotation.copy(axe.rotation);
    const pickHead = box(0.04, 0.05, 0.42, 0x9a9aa4);
    pickHead.position.y = 0.2;
    pickaxe.add(pickHead);

    this.tools = { axe, pickaxe };
    this.rightArm.add(axe, pickaxe);
    this.holdTool('axe');

    const body = box(0.48, 0.55, 0.28, 0x2d5fa8);
    body.position.y = 0.72;
    const head = box(0.3, 0.3, 0.3, 0xe0b48a);
    head.position.y = 1.16;
    const hair = box(0.32, 0.08, 0.32, 0x4a2f1a);
    hair.position.y = 1.33;

    this.object.add(body, head, hair, this.leftLeg, this.rightLeg, this.leftArm, this.rightArm);
    scene.add(this.object);

    this.path = [];
    this.onArrive = null;
    this.action = null;
    this.animTime = 0;
  }

  holdTool(name) {
    for (const [toolName, tool] of Object.entries(this.tools)) tool.visible = toolName === name;
  }

  get tile() {
    return { x: Math.round(this.object.position.x), z: Math.round(this.object.position.z) };
  }

  setPath(path, onArrive = null) {
    const { x, z } = this.tile;
    const position = this.object.position;
    const atTile = position.x === x && position.z === z;
    this.path = atTile ? [...path] : [{ x, z }, ...path];
    this.onArrive = onArrive;
    this.action = null;
  }

  face(x, z) {
    const { position } = this.object;
    this.object.rotation.y = Math.atan2(x - position.x, z - position.z);
  }

  startAction(duration, onDone) {
    this.action = { timeLeft: duration, onDone };
  }

  update(dt) {
    const walking = this.path.length > 0;
    this.animTime += dt;

    if (walking) {
      const next = this.path[0];
      const position = this.object.position;
      const dx = next.x - position.x;
      const dz = next.z - position.z;
      const distance = Math.hypot(dx, dz);
      const step = WALK_SPEED * dt;

      if (distance > 0.001) this.object.rotation.y = Math.atan2(dx, dz);
      if (distance <= step) {
        position.x = next.x;
        position.z = next.z;
        this.path.shift();
      } else {
        position.x += (dx / distance) * step;
        position.z += (dz / distance) * step;
      }
    }

    if (!this.path.length && this.onArrive) {
      const onArrive = this.onArrive;
      this.onArrive = null;
      onArrive();
    }

    const swing = walking ? Math.sin(this.animTime * 12) * 0.6 : 0;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    this.leftArm.rotation.x = -swing;
    this.rightArm.rotation.x = swing;
    this.object.position.y = walking ? Math.abs(Math.sin(this.animTime * 12)) * 0.05 : 0;

    if (this.action) {
      this.rightArm.rotation.x = -1.2 - Math.sin(this.animTime * 10) * 0.9;
      this.action.timeLeft -= dt;
      if (this.action.timeLeft <= 0) {
        const { onDone } = this.action;
        this.action = null;
        onDone();
      }
    }
  }
}
