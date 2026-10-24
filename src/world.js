import * as THREE from 'three';

const COLORS = {
  grass: 0x5f9e3a,
  sand: 0xd9c48a,
  water: 0x3a7fc4,
  ocean: 0x2f6aa8,
  trunk: 0x6b4423,
  leaves: 0x2f7d32,
  rock: 0x8a8a8a,
  depletedRock: 0x55524e,
  copper: 0xc8743a,
  tin: 0xdde3e8,
  furnace: 0x6e6a66,
  fire: 0xff7a1a,
};

// Deterministic per-tile noise so the grass isn't one flat colour.
function tileNoise(x, z) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function shaded(material) {
  return (mesh) => {
    mesh.material = material;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
}

function createTree(x, z) {
  const trunkMaterial = new THREE.MeshLambertMaterial({ color: COLORS.trunk });
  const leafMaterial = new THREE.MeshLambertMaterial({ color: COLORS.leaves, flatShading: true });

  const trunk = shaded(trunkMaterial)(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 6)));
  trunk.position.y = 0.4;

  const leaves = shaded(leafMaterial)(new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0)));
  leaves.position.y = 1.1;
  leaves.scale.set(1, 1.2, 1);
  leaves.rotation.y = tileNoise(x, z) * Math.PI;

  const stump = shaded(trunkMaterial)(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.2, 6)));
  stump.position.y = 0.1;
  stump.visible = false;

  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.add(trunk, leaves, stump);

  const tree = {
    x,
    z,
    item: 'logs',
    available: true,
    group,
    deplete() {
      tree.available = false;
      trunk.visible = false;
      leaves.visible = false;
      stump.visible = true;
    },
    restore() {
      tree.available = true;
      trunk.visible = true;
      leaves.visible = true;
      stump.visible = false;
    },
  };

  for (const mesh of [trunk, leaves, stump]) mesh.userData.target = { kind: 'tree', x, z, node: tree };
  return tree;
}

function createRock(x, z, ore) {
  const material = new THREE.MeshLambertMaterial({ color: COLORS.rock, flatShading: true });
  const rock = shaded(material)(new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0)));
  rock.position.set(x, 0.2, z);
  rock.scale.set(1, 0.7, 1);
  rock.rotation.y = tileNoise(x, z) * Math.PI;

  const fleckMaterial = new THREE.MeshLambertMaterial({ color: COLORS[ore], flatShading: true });
  const fleckGeometry = new THREE.IcosahedronGeometry(0.08, 0);
  const flecks = [0, 1, 2, 3].map((i) => {
    const angle = (i / 4) * Math.PI * 2 + tileNoise(x + i, z);
    const elevation = 0.25 + (i % 2) * 0.45;
    const fleck = new THREE.Mesh(fleckGeometry, fleckMaterial);
    fleck.position.set(
      Math.cos(elevation) * Math.cos(angle) * 0.36,
      Math.sin(elevation) * 0.36,
      Math.cos(elevation) * Math.sin(angle) * 0.36,
    );
    rock.add(fleck);
    return fleck;
  });

  const node = {
    x,
    z,
    item: ore,
    available: true,
    mesh: rock,
    deplete() {
      node.available = false;
      material.color.set(COLORS.depletedRock);
      rock.scale.set(0.8, 0.5, 0.8);
      rock.position.y = 0.14;
      for (const fleck of flecks) fleck.visible = false;
    },
    restore() {
      node.available = true;
      material.color.set(COLORS.rock);
      rock.scale.set(1, 0.7, 1);
      rock.position.y = 0.2;
      for (const fleck of flecks) fleck.visible = true;
    },
  };

  for (const mesh of [rock, ...flecks]) mesh.userData.target = { kind: 'rock', x, z, node };
  return node;
}

function createFurnace(x, z) {
  const stone = new THREE.MeshLambertMaterial({ color: COLORS.furnace, flatShading: true });
  const body = shaded(stone)(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8)));
  body.position.y = 0.35;
  const chimney = shaded(stone)(new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, 0.25)));
  chimney.position.set(0.2, 0.9, -0.2);

  // Two crossed glowing slabs poke out of the walls so the fire shows from every side.
  const fireMaterial = new THREE.MeshBasicMaterial({ color: COLORS.fire });
  const fireX = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.2, 0.3), fireMaterial);
  const fireZ = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.82), fireMaterial);
  fireX.position.y = 0.22;
  fireZ.position.y = 0.22;

  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.add(body, chimney, fireX, fireZ);
  for (const mesh of group.children) mesh.userData.target = { kind: 'furnace', x, z };
  return { group, fireMaterial };
}

export function buildWorld(scene, map) {
  const pickables = [];
  const trees = [];
  const waterTiles = [];
  const fires = [];
  const tileGeometry = new THREE.BoxGeometry(1, 0.3, 1);

  map.tiles.forEach((row, z) => row.forEach((tile, x) => {
    const color = new THREE.Color(COLORS[tile.type]);
    color.offsetHSL(0, 0, (tileNoise(x, z) - 0.5) * 0.06);
    const material = new THREE.MeshLambertMaterial({ color });
    if (tile.type === 'water') {
      material.transparent = true;
      material.opacity = 0.85;
    }

    const mesh = new THREE.Mesh(tileGeometry, material);
    mesh.position.set(x, tile.type === 'water' ? -0.35 : -0.15, z);
    mesh.receiveShadow = true;
    mesh.userData.target = { kind: 'tile', x, z };
    scene.add(mesh);
    pickables.push(mesh);
    if (tile.type === 'water') waterTiles.push(mesh);

    if (tile.object === 'tree') {
      const tree = createTree(x, z);
      scene.add(tree.group);
      pickables.push(...tree.group.children);
      trees.push(tree);
    } else if (tile.object === 'rock') {
      const rock = createRock(x, z, tile.ore);
      scene.add(rock.mesh);
      pickables.push(rock.mesh, ...rock.mesh.children);
    } else if (tile.object === 'furnace') {
      const furnace = createFurnace(x, z);
      scene.add(furnace.group);
      pickables.push(...furnace.group.children);
      fires.push(furnace.fireMaterial);
    }
  }));

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshLambertMaterial({ color: COLORS.ocean }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(map.width / 2, -0.45, map.height / 2);
  scene.add(ocean);

  return {
    pickables,
    trees,
    update(time) {
      for (const mesh of waterTiles) {
        const { x, z } = mesh.userData.target;
        mesh.position.y = -0.35 + Math.sin(time * 1.5 + x * 0.7 + z * 0.5) * 0.03;
      }
      for (const material of fires) {
        material.color.setHSL(0.07, 1, 0.5 + Math.sin(time * 9) * 0.06 + Math.sin(time * 23) * 0.03);
      }
    },
  };
}
