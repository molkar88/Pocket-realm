// ~ water, s sand, . grass, T tree, R rock, @ player spawn (on grass)
export const MAP = [
  '~~~~~~~~~~~~~~~~',
  '~~~~~ssssss~~~~~',
  '~~~ss......ss~~~',
  '~~s...T..T...s~~',
  '~~s.T........s~~',
  '~s.....RR..T..s~',
  '~s..T.........s~',
  '~s......@.....s~',
  '~s.T.......T..s~',
  '~s.....~~.....s~',
  '~~s...~~~..R.s~~',
  '~~s.T..~...T.s~~',
  '~~~s.......ss~~~',
  '~~~~ss..T.s~~~~~',
  '~~~~~sssss~~~~~~',
  '~~~~~~~~~~~~~~~~',
];

const LEGEND = {
  '~': { type: 'water', object: null },
  s: { type: 'sand', object: null },
  '.': { type: 'grass', object: null },
  T: { type: 'grass', object: 'tree' },
  R: { type: 'grass', object: 'rock' },
  '@': { type: 'grass', object: null },
};

export function parseMap(rows) {
  const height = rows.length;
  const width = rows[0].length;
  let spawn = null;

  const tiles = rows.map((row, z) => {
    if (row.length !== width) {
      throw new Error(`Row ${z} has length ${row.length}, expected ${width}`);
    }
    return [...row].map((ch, x) => {
      const tile = LEGEND[ch];
      if (!tile) throw new Error(`Unknown map character "${ch}" at ${x},${z}`);
      if (ch === '@') spawn = { x, z };
      return { ...tile };
    });
  });

  if (!spawn) throw new Error('Map has no spawn (@)');
  return { width, height, tiles, spawn };
}

export function isWalkable(map, x, z) {
  const tile = map.tiles[z]?.[x];
  return Boolean(tile) && tile.type !== 'water' && !tile.object;
}
