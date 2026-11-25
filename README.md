# Battle Chess

A browser-first, Windows-targeted 3D chess game. This repository begins with a technical prototype: Three.js rendering, placeholder chess pieces, and authoritative legal move handling through `chess.js`.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A modern browser with WebGL 2 support

## Run locally

```bash
npm install
npm run dev
```

Open the local Vite URL (normally `http://localhost:5173`).

## Verify the project

```bash
npm run typecheck
npm run build
npm run preview
```

## Current prototype behavior

- 3D 8×8 board with White oriented toward the camera.
- 32 procedural placeholder pieces.
- Legal move selection and destination highlighting.
- Check, checkmate, stalemate, draw status, promotion selection, undo, and restart are delegated to `chess.js`.
- Move history display.

The current piece meshes are deliberately temporary. They prove board coordinates, selection, rendering, and game-state synchronization before original character modeling begins.

## Architecture boundary

- `chess.js` owns chess legality and position history.
- `src/main.ts` currently coordinates the prototype UI and Three.js scene.
- The next refactor extracts chess orchestration, scene rendering, piece factories, and combat presentation into separate modules.
- Animation must never become authoritative for chess state. A move is committed by the rules layer before its visual sequence plays.

## Windows desktop target

The first desktop packaging target is Windows 10/11 x64 using Tauri 2. Add the Tauri wrapper after the browser prototype and asset-loading path are stable. Windows packaging requires the Rust toolchain and Microsoft C++ Build Tools; see the official [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## Original-IP rule

Use original character designs, models, textures, sound, music, names, and UI. Do not copy assets or branding from the historical Battle Chess game.

## Next milestones

See [`docs/PROTOTYPE-PLAN.md`](docs/PROTOTYPE-PLAN.md).
