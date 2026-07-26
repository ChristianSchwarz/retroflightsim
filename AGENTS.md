# AGENTS.md

## Cursor Cloud specific instructions

Retro Flight Simulator (`retroflightsim`) is a single-product repo: a browser-based
flight sim built with TypeScript + Three.js, bundled by Webpack, served by a small
Node/Express dev server. There is no database, Docker, or separate backend.

### Services / commands (all from repo root)

- Build: `npm run build` — webpack (development mode) + `npm run pack-mods`. Standard scripts live in `package.json`; the mod tooling is documented in `tools/README.md`.
- Run (dev server): `npm run serve` — serves `dist/` at `http://localhost:8010` and exposes the F10 mod-import API. Health check: `curl http://localhost:8010/api/health` → `{"ok":true,"server":"modserver"}`.
- Watch + live-reload dev loop: `npm start` (sets `LIVE_RELOAD=1`); `npm run watch` for build-on-change without the HTTP server.
- Tests: `npm test` — Node built-in test runner over `src/script/physics/**` and `src/script/ai/**`.

### Non-obvious caveats

- `npm run serve` must run **after** a build (its `preserve` hook runs `npm run build` first); it serves the static `dist/` output, so source edits require a rebuild (or use `npm start` for watch mode).
- The sim runs entirely client-side (WebGL + Web Workers for FM2/JSBSim/combat). To verify it works you must open it in a browser and actually fly — loading the page alone is not sufficient. Controls (QWERTY): `Z`/`X` throttle, `W`/`S` pitch, `A`/`D` roll, `Q`/`E` yaw.
- When screen-recording gameplay, the WebGL canvas can briefly drop to a black screen with a spinning white loading cube right as the recording stops / the tab loses focus. This is a WebGL context-loss recovery state, not a sim crash — reloading the page always restores flight.
- `npm test` currently has 4 pre-existing failures on `main` unrelated to environment setup: two need a `assets/mod.aircraft.json` fixture that only exists after importing a mod (`ENOENT`), and two are FM2 physics assertions (negative-g limiter, FCS surface deflection). 153/157 tests pass.

### Optional: F10 in-app mod import

The core sim flies without Python. The F10 mod-import feature (and the `tools/*.py`
CLI + `npm run pack-mods` packing) needs Python 3 with `UnityPy trimesh numpy pillow`
(`pip install UnityPy trimesh numpy pillow`). `npm run pack-mods` runs fine with only
stdlib when there are no aircraft manifests (prints "No aircraft manifests found").
