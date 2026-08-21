# BUGS & ISSUES LOG — THE LAST SIGNAL

## Active Issues
*(No critical or high-severity blockers active. All 134 automated unit and integration tests passing cleanly).*

## Resolved Issues (QA & Integration Pass: 2026-08-21)

1. **[BUG-001] Map Tile Overwrite on Server Core Red Blast Door (`src/world/MapData.js`)**
   - *Severity*: High / Progression Blocker
   - *Description*: Maintenance Vent 2 bypass was defined with `fillRect(21, 44, 24, 44, TILE_TYPES.FLOOR_GRATE)`, overwriting the locked Red Blast Door at `grid[44][21]` (`DOOR_LOCKED_RED`) into a floor grate.
   - *Fix*: Corrected Vent 2 bounds to `fillRect(22, 44, 24, 44, TILE_TYPES.FLOOR_GRATE)`, preserving the Red Blast Door at `(21, 44)`.

2. **[BUG-002] Premature Generator Restoration in Terminal Interaction (`src/entities/Interactable.js`)**
   - *Severity*: Medium / Puzzle Bypass
   - *Description*: `Terminal.interact()` immediately set `gameState.generatorOnline = true` upon interaction with `TERM-PWR-01`, completing the objective before the player solved the 4-breaker reactor puzzle.
   - *Fix*: Removed premature generator state mutation from `Terminal.interact()`; reactor power restoration is now properly driven by `TerminalUI.toggleBreaker()` upon closing all 4 breaker switches.

3. **[BUG-003] Terminal Type Resolution Mismatch in TerminalUI (`src/ui/TerminalUI.js`)**
   - *Severity*: Medium / Functional
   - *Description*: `TerminalUI.open()` inspected `terminalData.type` (which evaluates to `'terminal'` on Entity instances) instead of `terminalData.terminalType`, causing contextual screen routing (e.g. `REACTOR`, `COMMS`, `DOORS`) to fall back to `'LOGS'`.
   - *Fix*: Updated property resolution to `terminalData.terminalType || terminalData.type || 'lore'`.

4. **[BUG-004] Headless DOM Reference Errors in Node Test Environment (`src/core/Engine.js`, `src/core/InputManager.js`)**
   - *Severity*: Low / Tooling
   - *Description*: Headless Node.js execution threw `ReferenceError: requestAnimationFrame is not defined` and `TypeError: window.addEventListener is not a function`.
   - *Fix*: Added robust `typeof` guards in `Engine.init()`, `Engine.start()`, `Engine.stop()`, `Engine.resizeCanvas()`, `InputManager.attach()`, and `InputManager.detach()`.

5. **[BUG-005] Event Property Key Alignment on State Transition (`src/core/Engine.js`)**
   - *Severity*: Low / Logging
   - *Description*: `Engine.bindEvents()` logged `STATE_CHANGED` transitions as `undefined to undefined` due to checking `data.oldState` / `data.newState` whereas `GameState.setState()` emitted `{ from, to }`.
   - *Fix*: Normalized property extraction to `data.from || data.oldState` and `data.to || data.newState`.

## Known Limitations / Edge Cases Tracked
- Ensure Web Audio API context unlocks cleanly on first user gesture in modern browsers (Chrome/Firefox/Safari autoplay policies).
- Canvas resolution automatically scales to maintain crisp 16:9 aspect ratio across window resizing.
- Dynamic A* pathfinding accounts for door open/closed status changes during runtime.
