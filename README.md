# LUMA LOOP

*Every shadow hides a different path. Every light reveals a new possibility.*

LUMA LOOP is an original 2D puzzle platformer. You guide LUMA, a small glowing orb, through 30 levels by switching between the **Light World** and the **Shadow World**. Each world has its own platforms and hazards, and every switch costs energy, so route planning matters.

Made by Joshua Samuel, Just An Hour With Josh (https://www.youtube.com/@justanhourjosh).

## Features
- 30 levels in three worlds: The Awakening (1-10), The Fractured Realm (11-20), The Final Loop (21-30)
- Dimension switching with an energy budget; a switch is refused if it would drop you through a vanishing platform or into a solid
- Energy fragments, exit portals, lasers, moving, timed and falling platforms
- World and level select, unlockable progress, best times and scores
- Six achievements, statistics, settings (effects and music volume, reduced motion, reset with confirmation)
- Mobile-first: responsive scaling, on-screen touch buttons, no page scroll or zoom
- All graphics and sounds are generated in code: no external assets to fail loading
- Versioned, validated save data with safe fallbacks; optional YouTube Playables cloud save

## Screenshots
Add images to `docs/screenshots/` and link them here (none are included yet).

## Install and run
Requires Node.js 18 or newer.

```
npm install
npm run dev        # development server
npm test           # automated tests (no dependencies needed)
npm run build      # production build in dist/
npm run build:playables   # Playables build in dist-playables/
npm run preview    # serve the production build locally
```

## Controls
| Action | Keyboard | Touch |
|---|---|---|
| Move | A / D or Left / Right | on-screen arrows |
| Jump | Space (or W / Up) | on-screen jump button |
| Switch dimension | Shift | on-screen switch button |
| Pause | Esc (or P) | pause button, top right |

## Deploy to GitHub Pages
1. Create a GitHub repository and push this project to the `main` branch.
2. In the repository, open Settings > Pages and set Source to **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` runs the tests, builds, and deploys on every push to `main`.

The build uses relative asset paths (`base: './'`), so it works under a repository subpath such as `https://<user>.github.io/<repo>/`.

## Project layout
`src/scenes` (screens), `src/systems` (energy, dimensions, save, audio, input, achievements, level validator), `src/levels` (worlds 1-3), `src/platform` (YouTube Playables layer), `tests` (automated tests), `docs` (Playables notes).

## Level validation
`src/systems/LevelValidator.js` searches every level for a route from start to portal using the game's jump physics, the energy budget, moving and timed platforms, and a laser-fairness rule. `npm test` runs it on all 30 levels. It does not model fragment energy refills or how movers feel, so playtesting still matters.

## YouTube Playables
An integration layer is prepared (see `docs/PLAYABLES.md`) using documented SDK methods only, with a standalone fallback. The game has **not** been submitted to or approved by YouTube Playables.

## Credits
Design, code and levels by Joshua Samuel. Built with [Phaser 3](https://phaser.io/) and [Vite](https://vitejs.dev/).

## License
MIT, see `LICENSE`.
