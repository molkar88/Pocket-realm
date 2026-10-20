const DIRECTIONS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

const key = (x, z) => `${x},${z}`;

function octile(a, b) {
  const dx = Math.abs(a.x - b.x);
  const dz = Math.abs(a.z - b.z);
  return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
}

// A* over a tile grid. Diagonal steps may not cut past blocked corners.
// Returns the tiles to walk (excluding start), [] if already there, or null if unreachable.
export function findPath(isWalkable, start, goal) {
  if (start.x === goal.x && start.z === goal.z) return [];
  if (!isWalkable(goal.x, goal.z)) return null;

  const open = [{ x: start.x, z: start.z, g: 0, f: octile(start, goal) }];
  const cameFrom = new Map();
  const bestCost = new Map([[key(start.x, start.z), 0]]);

  while (open.length) {
    let bestIndex = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIndex].f) bestIndex = i;
    }
    const current = open.splice(bestIndex, 1)[0];

    if (current.x === goal.x && current.z === goal.z) {
      const path = [];
      let k = key(current.x, current.z);
      while (cameFrom.has(k)) {
        const [x, z] = k.split(',').map(Number);
        path.unshift({ x, z });
        k = cameFrom.get(k);
      }
      return path;
    }

    for (const [dx, dz] of DIRECTIONS) {
      const x = current.x + dx;
      const z = current.z + dz;
      if (!isWalkable(x, z)) continue;
      const diagonal = dx !== 0 && dz !== 0;
      if (diagonal && (!isWalkable(current.x + dx, current.z) || !isWalkable(current.x, current.z + dz))) {
        continue;
      }

      const g = current.g + (diagonal ? Math.SQRT2 : 1);
      const k = key(x, z);
      if (g >= (bestCost.get(k) ?? Infinity)) continue;

      bestCost.set(k, g);
      cameFrom.set(k, key(current.x, current.z));
      open.push({ x, z, g, f: g + octile({ x, z }, goal) });
    }
  }

  return null;
}

// Path to the closest walkable tile directly beside target (north, south, east or west).
export function findPathToAdjacent(isWalkable, start, target) {
  let best = null;
  for (const [dx, dz] of DIRECTIONS.slice(0, 4)) {
    const goal = { x: target.x + dx, z: target.z + dz };
    const path = findPath(isWalkable, start, goal);
    if (path && (!best || path.length < best.length)) best = path;
  }
  return best;
}
