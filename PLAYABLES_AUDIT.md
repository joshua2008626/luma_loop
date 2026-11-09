# LUMA LOOP: YouTube Playables audit

Date of audit: 2026-11-09. Scope: the existing Phaser 3 project (live at https://joshua2008626.github.io/luma_loop/).
This is **not** certification and **not** approval. Developer access to Playables is a separate process.

Sources read (official, current at audit time): Playables home; Certification overview; Integration, Design, Stability and performance, Privacy & Data and Accessibility requirements; SDK reference. Not read: i18n/L10n, Monetization, Trust & Safety, Developer Portal pages and the Test Suite guide.

Status key: **PASS** = verified or satisfied by inspection of the actual source. **FAIL** = requirement not met (fixed below where noted). **NOT IMPLEMENTED** = absent. **NOT TESTED** = could not be verified in this environment.

## What could and could not be run here
The audit sandbox has no network and no browser. `npm install` was attempted and timed out (exit 124), so Phaser and Vite were never installed.
- Ran: 25 automated Node tests, `node --check` on every source file, a test that runs the real `vite.config.js` HTML transform, and the new bundle auditor against synthetic bundles.
- Fetched: the live GitHub Pages URL (it serves the game page, which shows the earlier GitHub Actions build and deploy succeeded).
- **Production build (`npm run build`, `npm run build:playables`): NOT RUN here.** A new GitHub Actions job (`playables-check`) now runs `build:playables` and the bundle audit on every push; check its result in the Actions tab.
- Desktop browser, mobile browser, touch, keyboard, resizing, real audio, real pause/resume, and playing all 30 levels in a browser: **NOT TESTED**.

## 1. Existing features that pass
| Area | Status | Evidence |
|---|---|---|
| SDK loads before game code (Playables build) | PASS | `vite.config.js` injects the script as the first element of `<head>`; a test checks its position before the module script. The built output itself: NOT TESTED (CI audit checks it). |
| Standalone fallback | PASS | SDK calls are guarded and no-op without `ytgame`; standalone build contains no external script (test). |
| `gameReady` timing | PASS (code) | Called once, on the first update of the main menu, never during loading. |
| `sendScore` | PASS (code) | One dimension: total of best level scores (integer), the same number the Settings screen shows as "Total score". Sent at level completion. |
| Mute / audio state | PASS (code) | `isAudioEnabled` at start, `onAudioEnabledChange` live; when muted, no sound is generated and volume sliders cannot change output. No overall mute button in the game; sound never starts before a user click. |
| `onPause`/`onResume` use | PASS (code) | Only SDK callbacks are used by game code; no Page Visibility API in `src/`. |
| Saved data size | PASS | A save is a few KB (limit 3 MiB, recommended 500 KiB). |
| No external calls in source | PASS | `grep` finds no `fetch`, XHR, WebSocket, cookies, clipboard, `window.open`, `alert` or hard-coded URLs in `src/` (the only URL is the SDK script in `vite.config.js`). |
| No personal data, QR codes, login screens, sharing prompts, user agreements, exit button | PASS | By inspection of all scenes. "Main Menu" in the pause menu is navigation, not an exit. |
| No clickable external links | PASS | The channel name appears as plain text only. |
| Orientation not locked | PASS | No orientation lock anywhere. |
| Relative paths, file names | PASS (config) | `base: './'`. Vite file names use letters, digits, `_` and `-`. Built output: NOT TESTED (auditor checks it). |
| Keyboard, Esc, `preventDefault` | PASS | Esc pauses/closes; Esc is never `preventDefault`ed. |
| Minified, not obfuscated; single-page app | PASS | Plain Vite minification; one `index.html`. |
| Standard web tech | PASS | Phaser Canvas/WebGL, no WASM or workers in game code. |

## 2. Missing requirements and failures found
| # | Requirement | Status before | How found |
|---|---|---|---|
| F1 | Integration 4: **MUST NOT use any other mechanism to save progress** | FAIL | Code: progress was mirrored to `localStorage` inside Playables. **Reproduced** by test BUG-1 (failed before the fix). |
| F2 | Integration 4: **MUST await `loadData` before `saveData`** | FAIL | Code: boot raced `loadData` against a 2 s timeout and saves were not held back. **Reproduced**: with `loadData` pending, `saveData` was called immediately (script and test BUG-2). |
| F3 | Integration 6: **MUST pause all execution, including music** | FAIL | Code: after `onPause` the music timer kept running and scheduled audio on a suspended context. **Reproduced** by test BUG-3 (audio scheduled while paused). |
| F4 | Integration 2: **`firstFrameReady` when a loading screen is shown** | FAIL | Code: it was called from the main menu after the cloud-load wait, not from the loading screen. Not reproducible without a browser. |
| F5 | Design 2: **MUST support mouse input for all interactions** | FAIL | Code/CSS: the on-screen move/jump/switch buttons were shown only for coarse pointers, so a mouse-only desktop user could not play. Not reproduced in a browser. |
| F6 | Design 5: **MUST communicate that there is no more content** | FAIL | Code: the final screen said LUMA is free but did not say the game is complete. |
| F7 | Integration 6 (SHOULD): save on pause | FAIL | Code: nothing was saved on `onPause`. |
| F8 | Integration 4: use older cloud saves without errors | Partial | `validate` rejected any other version, which would discard progress after a future version bump. |
| F9 | Real bug (found while checking Esc handling) | FAIL | Code: Esc while the pause-menu Settings panel was open resumed the game but left the panel on screen blocking input. Not reproduced in a browser. |

## 3. Confirmed bugs
Reproduced by running code: F1, F2, F3 (regression tests in `tests/audit.test.js`; they failed before the fixes and pass now).
Found by code inspection, **not reproduced** (need a browser): F4, F5, F6, F9. They are fixed on the evidence of the code, so please confirm them in a browser.

## 4. Performance issues and risks (none measured)
- **Individual file size SHOULD be under 512 KiB:** the Phaser library alone is over 1 MiB, so the game bundle will almost certainly exceed this recommendation (the MUST limit is 30 MiB per file, far away). Cannot be avoided without replacing Phaser. Exact size: NOT TESTED; run the auditor.
- **Load time SHOULD be under 5 s:** untested. The loading screen waits at most 2 s for cloud data.
- **Rendering clarity (Design 3.1, MUST):** the canvas is 960x540 and scaled by CSS, so it may look soft on high-density or large screens. NOT TESTED visually. **NOT IMPLEMENTED:** the real fix (render at higher resolution) touches every scene and cannot be validated without a browser; recommended next step.
- **Narrow portrait screens (9:16, 9:32):** the game letterboxes correctly but is small. Playable by design; usability NOT TESTED.
- **Page Visibility API:** Playables forbids games from using it. Our code does not, but Phaser itself listens for visibility and focus changes. Whether the Test Suite flags this is NOT TESTED.
- **eval / web workers / WebAssembly:** YouTube may decline games using them. Our code uses none; the Phaser bundle may contain `eval`-like strings. The auditor reports counts; NOT TESTED on a real build.
- **Pause button position:** the "II" button is at the top right, near where YouTube places its own controls. Design 6.4 forbids lookalike icons near Playables buttons. NOT TESTED.
- Accessibility (WCAG AA is a SHOULD): NOT TESTED. The dimension switch uses a short screen flash, disabled by the reduced-motion setting.

## 5. Required changes
Everything marked FAIL in section 2 (done), plus the remaining work in section 8.

## 6. Changes implemented (existing game and features preserved; standalone GitHub Pages unaffected)
- `src/platform/Playables.js`: `CloudStorage` uses the cloud save only inside Playables (standalone keeps `localStorage`), holds saves until `loadData` finishes (`setGate`), and exposes an awaited `flush()`.
- `src/main.js`: no `localStorage` in Playables; `saveData` gated on `loadData`; save and flush on `onPause`; on-screen buttons always shown in Playables (and on first touch / coarse pointers).
- `src/systems/AudioSystem.js`: real pause (music timer stopped, nothing scheduled, context suspended) and clean resume.
- `src/scenes/BootScene.js`: calls `firstFrameReady` while the loading screen is shown. `MenuScene.js`: calls only `gameReady`.
- `src/scenes/GameScene.js`: Esc closes the settings panel first; completion text states there are no more levels.
- `src/systems/SaveSystem.js`: reads older save versions field by field; unknown newer versions are ignored.
- `index.html`: touch-pad visibility moved to a `touch` class set by script.
- New `scripts/audit-bundle.mjs` (`npm run audit:bundle`): checks file count/size/names, absolute paths, external references, SDK-first order, risky language features, and URL strings in a built folder.
- `.github/workflows/deploy.yml`: new non-blocking `playables-check` job (build for Playables, then audit). The Pages deployment does not depend on it.
- New tests in `tests/audit.test.js` and `tests/platform.test.js`.

## 7. Tests performed
| Test | Result |
|---|---|
| `npm test` (25 Node tests: energy, dimensions, saves, achievements, 30-level validator, Playables wrapper, regression tests, Vite SDK injection, bundle auditor) | PASS |
| `node --check` on all source files | PASS |
| Repro of F1, F2, F3 before fixes | Reproduced (tests failed) |
| `npm install` / production build / Playables build here | NOT RUN (no network) |
| Live GitHub Pages page reachable | PASS (page served) |
| Desktop browser, mobile browser, touch, keyboard, resize, real pause/resume, real audio, save persistence in a browser, all 30 levels played | NOT TESTED |
| Playables SDK Test Suite | NOT TESTED |

## 8. Remaining work
1. Run `npm install && npm run build:playables && npm run audit:bundle` locally (or read the `playables-check` job in GitHub Actions) and fix every FAIL line; read the WARN lines.
2. Open `dist-playables/` in the official Playables SDK Test Suite and fix what it reports.
3. Test in real browsers and on a phone: mouse-only play in Playables mode, portrait and landscape, resizing mid-level, pause/resume, mute, saving and reloading.
4. Decide on a higher-resolution render for clarity on large and high-density screens.
5. Review i18n, monetization and Trust & Safety requirements (not read in this audit) and the Accessibility SHOULDs.
6. Prepare Developer Portal metadata (thumbnails, title, description, genre); it must not contain branding or logos.
7. Request developer access through the official interest form.

## 9. Final readiness assessment
Technically **prepared for Playables SDK testing**, not verified and not certified. The integration now follows the documented MUST rules for loading order, ready signals, cloud-only saving, pause and audio, based on the source and automated tests. Nothing has yet been run in a browser, the Playables build has not been built or measured, and the Test Suite has not been used. Treat the game as "ready to test", not "ready to submit".
