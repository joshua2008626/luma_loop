# YouTube Playables integration

Status: **prepared, not submitted, not approved.** Playables access may require an invitation; nothing here claims publication or certification.

Sources: the official Getting Started and SDK reference pages at https://developers.google.com/youtube/gaming/playables (re-check them before submitting; the SDK can change).

## What is implemented (`src/platform/Playables.js`, wired in `src/main.js`)
| Requirement | Implementation |
|---|---|
| SDK loading | `npm run build:playables` injects `<script src="https://www.youtube.com/game_api/v1">` first in `<head>`. Standalone builds do not load it. |
| Standalone fallback | Every call checks `globalThis.ytgame` and `IN_PLAYABLES_ENV`; without them it is a no-op and saves use localStorage. |
| `firstFrameReady` / `gameReady` | Called from MenuScene (first frame, then first update). |
| Pause / resume | `system.onPause` opens the in-game pause menu, suspends audio and sleeps the Phaser loop; `onResume` wakes it. |
| Audio | Initial `isAudioEnabled()` and `onAudioEnabledChange` drive a platform mute in AudioSystem. Audio starts only after a user click. |
| Cloud save | `loadData()` at boot (2 s timeout) merged with local progress (best of each level, max stats, union of achievements); `saveData()` debounced 500 ms via `CloudStorage`. |
| Score | `engagement.sendScore({value})` with the total of best level scores, on level completion. |
| Errors | `window` error events call `health.logError()`. |
| Viewport | Phaser FIT scaling, touch pad, safe-area insets, no page scroll or zoom. |

## Submission checklist (all open until you run them)
- [ ] `npm install && npm run build:playables` succeeds; open `dist-playables/` via a local static server
- [ ] Run the official test suite from the Playables docs against the build
- [ ] Confirm first frame is fast and the game never autoplays audio
- [ ] Verify pause/resume, mute toggle and cloud save inside the Playables test environment
- [ ] Check bundle size and total assets against current Playables limits (read the current docs)
- [ ] Apply for / confirm developer access, then submit through the official process
