const TILE_PX = 7;

const COLORS = {
  water: '#3a7fc4',
  sand: '#d9c48a',
  grass: '#5f9e3a',
  tree: '#1f5e22',
  copper: '#c8743a',
  tin: '#dde3e8',
  furnace: '#ff7a1a',
  player: '#ffffff',
};

// Offsets are relative to the player, in tiles. The map is rotated so the camera faces up.
export function toMinimap(dx, dz, yaw) {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return { x: dx * cos - dz * sin, y: dx * sin + dz * cos };
}

export function fromMinimap(x, y, yaw) {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return { dx: x * cos + y * sin, dz: -x * sin + y * cos };
}

export class Minimap {
  constructor(canvas, map, onTap) {
    this.canvas = canvas;
    this.map = map;
    this.size = canvas.clientWidth;
    this.yaw = 0;

    const ratio = Math.min(window.devicePixelRatio, 2);
    canvas.width = this.size * ratio;
    canvas.height = this.size * ratio;
    this.ctx = canvas.getContext('2d');
    this.ctx.scale(ratio, ratio);

    canvas.addEventListener('pointerup', (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      if (Math.hypot(x, y) > rect.width / 2) return;
      const { dx, dz } = fromMinimap(x / TILE_PX, y / TILE_PX, this.yaw);
      onTap(dx, dz);
    });
  }

  draw(center, yaw) {
    const { ctx, size, map } = this;
    this.yaw = yaw;

    ctx.save();
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(0, 0, size, size);

    ctx.translate(size / 2, size / 2);
    ctx.rotate(yaw);
    ctx.scale(TILE_PX, TILE_PX);
    ctx.translate(-center.x, -center.z);

    map.tiles.forEach((row, z) => row.forEach((tile, x) => {
      ctx.fillStyle = COLORS[tile.type];
      ctx.fillRect(x - 0.5, z - 0.5, 1.02, 1.02);
    }));

    map.tiles.forEach((row, z) => row.forEach((tile, x) => {
      if (!tile.object) return;
      ctx.fillStyle = COLORS[tile.ore ?? tile.object];
      ctx.beginPath();
      if (tile.object === 'furnace') ctx.rect(x - 0.35, z - 0.35, 0.7, 0.7);
      else ctx.arc(x, z, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }));
    ctx.restore();

    ctx.fillStyle = COLORS.player;
    ctx.fillRect(size / 2 - 2, size / 2 - 2, 4, 4);
  }
}
