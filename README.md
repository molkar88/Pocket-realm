# Pocket Realm

A tiny low-poly adventure in the style of classic tile-based MMOs, made to play in the browser on a phone. This first version is a short preview for testing graphics and controls.

## Controls

| Action | Phone | Computer |
| --- | --- | --- |
| Walk | Tap a tile | Click a tile |
| Chop a tree | Tap the tree | Click the tree |
| Turn camera | Drag with one finger | Drag with the mouse |
| Zoom | Pinch | Scroll wheel |

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

The tests cover pathfinding and check that every tree on the map can be reached from the spawn point.

## Project layout

- `index.html`, `style.css` – page and HUD
- `src/main.js` – renderer, camera, input and game loop
- `src/map.js` – the map as text (`~` water, `s` sand, `.` grass, `T` tree, `R` rock, `@` spawn)
- `src/world.js` – builds the 3D tiles, trees and rocks
- `src/player.js` – the character, walking and chopping animation
- `src/pathfinding.js` – A* pathfinding on the tile grid

3D rendering uses [three.js](https://threejs.org/) r160, loaded from a CDN, so there is no build step.
