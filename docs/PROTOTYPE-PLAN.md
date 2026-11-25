# Initial Prototype Construction Plan

## Platform decision

- Browser-first development and testing.
- Windows 10/11 x64 is the first desktop packaging target.
- macOS packaging is deferred; the application architecture should not prevent it later.

## Prototype objective

Prove that a full legal chess position can be rendered in a navigable 3D scene, that user input maps to board coordinates correctly, and that every visual update remains synchronized with the authoritative chess engine.

## Scope for prototype 0.1

1. Vite + TypeScript application scaffold.
2. Three.js scene, camera, lights, board, and 32 procedural placeholder pieces.
3. Click-to-select and click-to-move interaction.
4. Legal moves, castling, en passant, promotion, check/checkmate, draw states, undo, restart, and move history through `chess.js`.
5. Build and type-check scripts.

## Explicitly out of scope

- Character combat, custom models, rigging, and cinematic capture sequences.
- Stockfish or other computer opponent.
- Online play, user accounts, cloud saves, matchmaking, or monetization.
- Tauri packaging in this first prototype; the desktop wrapper follows browser stability.

## Build sequence

### A. Establish a repeatable baseline

- Install dependencies and run the Vite development server.
- Confirm strict TypeScript checks and production build.
- Confirm the 3D scene loads at desktop and mobile viewport sizes.

**Exit criteria:** `npm run typecheck` and `npm run build` pass; board is visible.

### B. Verify board mapping and legal interaction

- Confirm a1 is dark and h1 is light with White at the bottom.
- Verify all 32 starting pieces are on their correct squares.
- Verify legal move targets, occupied-square captures, turn alternation, and move history.
- Verify castling, en passant, and promotion positions manually.

**Exit criteria:** a legal game can be played to a terminal position without the visual board drifting from `chess.js`.

### C. Extract maintainable modules

Split the current prototype into:

- `src/chess/ChessController.ts` — rules adapter, move history, FEN/PGN access.
- `src/app/Game.ts` — game orchestration and animation lock.
- `src/board/BoardScene.ts` and `BoardInput.ts` — scene and square interaction.
- `src/pieces/PieceFactory.ts` and `PieceManager.ts` — temporary and final model instances.
- `src/combat/CombatDirector.ts` and `CombatRegistry.ts` — capture presentation interface, initially disabled.

**Exit criteria:** chess domain code has no Three.js imports; presentation can be rebuilt from a FEN position.

### D. First capture pipeline proof

- Add one original rigged character model exported as GLB.
- Move the attacker to a temporary combat stage after a legal capture has committed.
- Play one attack, defender reaction/defeat, and return-to-board sequence.
- Lock player input while presentation is active.
- On animation failure or skip, rebuild the scene from the authoritative chess position.

**Exit criteria:** one capture sequence is repeatable and cannot corrupt game state.

### E. Windows desktop wrapper

After browser stability:

- Add Tauri 2 and Windows application metadata/icons.
- Verify local asset paths and WebGL behavior.
- Verify Web Worker support before integrating the chess engine worker.
- Produce and test a Windows installer on Windows 10/11 x64.

## Technical risks to test early

- WebGL performance and shadow quality on integrated graphics.
- Correct pointer-to-square mapping across aspect ratios and camera changes.
- Chess special moves and visual reconciliation (especially en passant and castling).
- Asset loading paths under Vite and later Tauri packaging.
- Third-party dependency licenses before any commercial distribution; Stockfish's GPL obligations require a separate review if selected.

## First review checklist

- [ ] `npm install` succeeds.
- [ ] `npm run typecheck` succeeds.
- [ ] `npm run build` succeeds.
- [ ] Board orientation and all starting pieces are correct.
- [ ] e2-e4 and a capture work.
- [ ] Castling, en passant, and all four promotion choices work.
- [ ] Undo and restart restore the correct position.
- [ ] Checkmate and stalemate end the game.
- [ ] No chess legality logic is embedded in rendering code after the module extraction.
