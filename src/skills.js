export const SKILLS = {
  woodcutting: { name: 'Woodcutting' },
  mining: { name: 'Mining' },
  smithing: { name: 'Smithing' },
};

export const MAX_LEVEL = 99;
export const MAX_XP = 200_000_000;

// RuneScape-style curve: XP_TABLE[level] is the total XP needed to reach that level.
export const XP_TABLE = (() => {
  const table = [0, 0];
  let points = 0;
  for (let level = 1; level < MAX_LEVEL; level++) {
    points += Math.floor(level + 300 * 2 ** (level / 7));
    table.push(Math.floor(points / 4));
  }
  return table;
})();

export function levelForXp(xp) {
  let level = 1;
  while (level < MAX_LEVEL && xp >= XP_TABLE[level + 1]) level++;
  return level;
}

export function levelProgress(xp) {
  const level = levelForXp(xp);
  if (level === MAX_LEVEL) return { level, fraction: 1, nextLevelXp: null };
  const start = XP_TABLE[level];
  const nextLevelXp = XP_TABLE[level + 1];
  return { level, fraction: (xp - start) / (nextLevelXp - start), nextLevelXp };
}

// Saved XP comes from browser storage, so anything that isn't a sane number becomes 0.
export function createXp(saved = {}) {
  const xp = {};
  for (const skill of Object.keys(SKILLS)) {
    const value = Number(saved?.[skill]);
    xp[skill] = Number.isFinite(value) && value > 0 ? Math.min(value, MAX_XP) : 0;
  }
  return xp;
}

// Returns the new level if the XP caused a level-up, otherwise null.
export function addXp(xp, skill, amount) {
  const before = levelForXp(xp[skill]);
  xp[skill] = Math.min(xp[skill] + amount, MAX_XP);
  const after = levelForXp(xp[skill]);
  return after > before ? after : null;
}

// Each level makes actions 1.5% faster, down to half the base time.
export function actionSeconds(baseSeconds, level) {
  return baseSeconds * Math.max(0.5, 1 - (level - 1) * 0.015);
}
