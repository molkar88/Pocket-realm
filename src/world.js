import * as THREE from 'three';

const COLORS = {
  grass: 0x5f9e3a,
  sand: 0xd9c48a,
  water: 0x3a7fc4,
  ocean: 0x2f6aa8,
  trunk: 0x6b4423,
  leaves: 0x2f7d32,
  rock: 0x8a8a8a,
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
    alive: true,
    group,
    fell() {
      tree.alive = false;
      trunk.visible = false;
      leaves.visible = false;
      stump.visible = true;
    },
    regrow() {
      tree.alive = true;
      trunk.visible = true;
      leaves.visible = true;
      stump.visible = false;
    },
  };

  for (const mesh of [trunk, leaves, stump]) mesh.userData.target = { kind: 'tree', x, z, tree };
  return tree;
}

function createRock(x, z) {
  const material = new THREE.MeshLambertMaterial({ color: COLORS.rock, flatShading: true });
  const rock = shaded(material)(new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0)));
  rock.position.set(x, 0.2, z);
  rock.scale.set(1, 0.7, 1);
  rock.rotation.y = tileNoise(x, z) * Math.PI;
  rock.userData.target = { kind: 'rock', x, z };
  return rock;
}

export function buildWorld(scene, map) {
  const pickables = [];
  const trees = [];
  const waterTiles = [];
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
      const rock = createRock(x, z);
      scene.add(rock);
      pickables.push(rock);
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
    },
  };
}
