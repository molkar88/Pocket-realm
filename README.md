# Pocket Realm

A tiny low-poly adventure in the style of classic tile-based MMOs, made to play in the browser on a phone. This first version is a short preview for testing graphics and controls.

## Controls

| Action | Phone | Computer |
| --- | --- | --- |
| Walk | Tap a tile | Click a tile |
| Chop a tree | Tap the tree | Click the tree |
| Mine copper or tin | Tap the rock | Click the rock |
| Smelt bronze bars | Tap the furnace | Click the furnace |
| Walk via minimap | Tap the minimap | Click the minimap |
| Inventory / skills | 🎒 / 📊 buttons | 🎒 / 📊 buttons |
| Drop an item | Tap it in the inventory | Click it in the inventory |
| Turn camera | Drag with one finger | Drag with the mouse |
| Zoom | Pinch | Scroll wheel |

## Gameplay

- **Inventory:** 28 slots, one item each. When it is full you can't chop or mine until you drop something or smelt.
- **Smelting:** one copper ore + one tin ore makes a bronze bar. The furnace keeps going until you run out of ore or walk away.
- **Skills:** Woodcutting (25 xp per log), Mining (17.5 xp per ore) and Smithing (6.25 xp per bar), using the classic XP curve up to level 99. Each level makes that action 1.5% faster, down to half the base time.
- **Saving:** inventory and XP are saved in your browser (`localStorage`), so they survive a reload on the same device.

## Play on your phone (GitHub Pages)

1. Settings → Pages → Source: *Deploy from a branch* → branch `main`, folder `/ (root)`.
2. After a minute the game is live at `https://<your-username>.github.io/pocket-realm/`.
3. Optional: in your phone browser use *Add to Home Screen* to launch it like an app.

## Run locally

The game uses ES modules, so it must be served over HTTP (not opened as a file):

```sh
npm start   # or: python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Tests

Requires Node 18 or newer:

```sh
npm test
```

The tests cover pathfinding, map parsing, the inventory and smelting, skill levels, and the minimap rotation, and check that every tree, rock and furnace can be reached from the spawn point.

## Project layout

- `index.html`, `style.css` – page and HUD
- `src/main.js` – renderer, camera, input and game loop
- `src/map.js` – the map as text (`~` water, `s` sand, `.` grass, `T` tree, `C` copper rock, `N` tin rock, `F` furnace, `@` spawn)
- `src/world.js` – builds the 3D tiles, trees, ore rocks and furnace
- `src/player.js` – the character, tools, and walking and gathering animations
- `src/pathfinding.js` – A* pathfinding on the tile grid
- `src/inventory.js` – the 28-slot inventory and smelting
- `src/skills.js` – XP curve, levels and action speed
- `src/minimap.js` – the rotating minimap
- `src/ui.js` – inventory and skills panels

3D rendering uses [three.js](https://threejs.org/) r160, loaded from a CDN, so there is no build step.
