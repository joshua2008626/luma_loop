# LUMA LOOP progress

## Verified (ran here)
- `node --test tests/*.test.js`: 16/16 pass (energy, dimension rule, save + cloud merge, level validator incl. moving/timed rules, achievements, Playables wrapper with a fake SDK, all 30 levels validated, laser fairness rule)
- `node --check` syntax pass on every file in src/

## Written but NOT run (no network in the authoring sandbox: Phaser/Vite never installed)
- Vite config (+ `build:playables` mode), index.html with touch pad, src/main.js
- Scenes: Boot/loading, Menu, WorldSelect, LevelSelect (best time/score per level), Game, Settings (sfx + music volume, reduced motion, reset with confirmation, stats, achievements), Credits, GameOver (every 5th fall in a run)
- GameScene: movement, fair-switch rule, energy, fragments, portal, lasers, moving/timed/falling platforms, pause menu with settings panel, achievement toasts, new-best message, ending message on level 30
- Systems: InputSystem, AudioSystem (sfx + procedural music), Playables module (docs/PLAYABLES.md), CloudStorage
- .github/workflows/deploy.yml (Pages deploy; runs tests then build)
- Expect first-run bugs. Run `npm install && npm run dev`, then `npm run build`.

## Not done
- README screenshots (none included; folder docs/screenshots/ is ready)
- Author's local run (`npm install`, `npm run dev`, `npm run build`, `npm run build:playables`) and bug fixes from it
- Playtest of lasers, moving/falling platforms; mobile device check
- LUMA-LOOP-FINAL.zip (not built yet by request)

## Next steps
1. Author runs the commands above and reports errors; fix them.
2. Playtest all 30 levels, tune physics constants and validator limits if levels feel unfair.
3. Add screenshots, choose LICENSE, then build and verify LUMA-LOOP-FINAL.zip.

## Review pass log
- Fixed: portal trigger was only ~8px wide when standing on the portal's platform (now a 56x80px ellipse-like box); same fix applied to the published prototype.
- Fixed: touch pad no longer overlays menus (only visible during gameplay).
- Added: validator rule that a laser must leave room to stand beside it.
- Still unverified: everything that needs Phaser at runtime (physics carry on moving platforms, particles API, scaling).
- Validator now uses a physics-based jump envelope (canJump: speed 230, jump 540, gravity 1500, 15% margin) instead of fixed gap/rise caps; a test cross-checks it against a frame-stepped simulation, and all 30 levels still pass.

## Release
- LICENSE: MIT (default chosen on author's go-ahead; author may change it)
- Author reported the local run as OK ("All okay"); the authoring sandbox itself still never ran Phaser or Vite.
- LUMA-LOOP-FINAL.zip built from the tested source; no pre-built dist/ folder because Vite could not be run in the sandbox.

## Playables audit (2026-11-09)
- Audited against the current official requirements; fixed cloud-only saving, load-before-save ordering, real pause for audio, firstFrameReady placement, mouse support for gameplay, end-of-game message, settings-panel Esc bug. 25 tests pass. See PLAYABLES_AUDIT.md. Production and Playables builds were NOT run in the sandbox (no network); a CI job (playables-check) now does it.
