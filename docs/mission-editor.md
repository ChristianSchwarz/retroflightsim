# Mission Editor

> **Status: implemented.** Press **`F7`** in the running app. The panel is
> [src/script/osd/missionEditorPanel.ts](../src/script/osd/missionEditorPanel.ts);
> how the AI flies what you author is [AI Waypoint Navigation](ai-waypoints.md).

A plan view of the baked terrain, with waypoints you place on it and AI flights
that fly them. Missions are JSON, saved through the dev server.

## Using it

`F7` opens and closes the editor from either the spawn menu or a flight in
progress; `Escape` closes it. The sim freezes while it is open — the scene keeps
rendering behind the panel, so closing puts you back exactly where you were.

1. **Add a route** (Routes → Add), then click the map to drop fixes.
2. Click a **leg line** to insert a fix in the middle; drag a fix to move it;
   right-click a fix to delete it. `Ctrl+Z` / `Ctrl+Y` undo and redo.
3. **Add a flight** (Flights → Add, or the *Flight start* mode and click the
   map), set its faction, size, airframe and pilot, and assign it a route.
4. Set the **player start** — an airfield from the dropdown, or the
   *Player start* mode and click the map.
5. **Save**, then **Fly**.

The map draws only terrain that is already in memory, so it never fetches and
never disturbs the renderer. Wherever you have already flown is sharp; the rest
is the coarse tier at 611 m per post. The readout under the map says which tier
answered — worth a glance before placing a low fix.

## The format

One file per mission, `data/missions/<id>.mission.json`, with the id as the
filename stem. The types are
[src/script/mission/missionFormat.ts](../src/script/mission/missionFormat.ts)
and the shipped example is
[assets/missions/gclp-cap.mission.json](../assets/missions/gclp-cap.mission.json)
— the same file the server test PUTs, so a broken example breaks the build.

A mission is stored **geodetically**: lat/lon, metres above the WGS84
ellipsoid, and **true** bearings. Scene metres are anchored at the play area's
ENU origin, which moves when you bake a different area, so a scene-metre mission
would silently relocate. `missionResolve.ts` converts once, on the main thread,
at launch — which is also why the worker never needs geodesy: everything that
crosses over is the flat numbers of `route.ts`.

Two consequences worth knowing:

- **A mission belongs to the area it was authored in.** `resolvePlayArea` is
  read once at startup. Loading a mission from another area shows a note and
  the fixes will be somewhere else.
- **`agl` altitudes are resolved at launch, not at authoring time.** Outside
  where you have flown, the editor's elevation is a lattice guess; at launch the
  tiles are resident. New fixes default to AGL for that reason.

## Where things run

```
editor (main thread, sim paused)          server (dev only)
  missionEditorPanel ─ missionEdit ──────► /api/missions ──► data/missions/*.json
        │                    │                    │
        │                    └── missionFormat ───┘   (one validator, both sides)
        ▼
  missionMap + mapProjection      ── reads resident DEM tiles, never fetches

Fly ─► missionResolve ─► MissionRunner ─► CombatSimClient.setRoute ─► AiPilot
       geodetic→scene     spawn + task        postMessage              WAYPOINT
```

`tools/missions.ts` imports the validator from `src/`, so a mission the browser
calls valid and one the server accepts are the same set by construction.
(`tools/` → `src/` is a normal direction here; the reverse is blocked by
`rootDir`.)

## Saving

**Server saving needs the dev server.** `/api/*` only exists under `npm start`
or `npm run serve` — which is how the README tells you to run the game anyway.
The published build is a static `dist/`, and there is no server behind it. The
editor probes `/api/health` and says so on the button rather than just greying
it out.

| | dev server | static build |
| --- | --- | --- |
| List | `GET /api/missions` | bundled `assets/missions/index.json` |
| Load | `GET /api/missions/:id` | `assets/missions/<id>.mission.json` |
| Save | `PUT /api/missions/:id` | **Download** a `.mission.json` |
| Reopen | — | **Import file** |
| Delete | `DELETE /api/missions/:id` | unavailable |

Download and Import are deliberately both there: a mission you can save and
never reopen is a data-loss bug with a progress indicator.

`data/missions/` is the working store and is gitignored. `npm run pack-missions`
copies missions into `assets/missions/` — which *is* tracked — and writes the
index. That is the only path by which an authored mission reaches a player, and
it is a deliberate step for the same reason baking terrain is.

## Why the map is a raster

The plan view rasterises the DEM tiles that are already resident, rather than
pointing an orthographic camera at the terrain mesh. The camera version would
need a projection refactor of `lod.ts` / `quadtree.ts` / `terrainEntity.ts` —
the hottest path in the renderer — and it shares the mesh cache, so panning the
map would evict terrain from under the aircraft.

Two rules make that safe, and both are enforced in `missionMap.ts`:

- **Never call `request()`.** Only `coarseTiles()` and `peekFine()`.
- **Colour from the tile's own heights, not `heightAtWorld`.** Scene Y is ENU
  up, so a constant elevation falls away with distance — 1.16 km down at 122 km.
  Shading that would darken the chart toward its edges from curvature alone.

The raster inverse-projects **per destination pixel** rather than using one
affine per tile. A plate-carrée tile is not a parallelogram in ENU: a z7 tile
spans 1.40625° and the east scale follows cos(lat), varying about 1.3% across
one tile. A single affine is ~1.8 km wrong at the far corner — 3 px at 600 m/px
but 36 px at 50 m/px, so the seams get worse exactly as you zoom in to author.

The chart is relief only. Per-facet colour and land cover live in the `.ptm`
mesh and only in GLSL, so the coastline here is the DEM's and will disagree with
the drawn vector coast by a strip.

## Limits

`MISSION_MAX_ENEMY` (7) + `MISSION_MAX_FRIENDLY` (6) = 13 aircraft, and the
header shows the running count. The ceiling is the shared snapshot bank, not
CPU: `SIM_SHARED_MAX_AIRCRAFT` is 16, and `player`, `ai0` and `wing0` hold three
rows for the whole session. Going over makes `encodeSnapshotInto` throw inside
the worker step handler, which comes back as `{type:'error'}` and **stalls the
sim with no visible exception** — so it is refused in the validator, again in
the resolver, and again at pool assignment. See
`src/script/physics/sim/combatSim.ceiling.test.ts`.

The two factions draw from separate fixed sub-pools because
`AiAircraftEntity.faction` is `readonly` and the sim protocol has no
`setFaction`. Exceeding one is an error rather than a clamp: silently dropping
half a mission's opposition is worse than refusing to fly it.

## Mission end

A mission ends when the player crashes or presses `Escape` to the spawn menu.
The runner disables every aircraft it spawned and clears their routes. Sim rows
are never reclaimed — `removeAircraft` is never called and `Scene` has no
`remove()` — so the 16-row budget is fixed from boot whether or not a mission is
loaded. That is the price of pooling, and it is why the ceiling test exists.

Not in this version: triggers, objectives, scoring, briefings, respawns, and
destructible ground targets (`GroundTargetEntity` has no faction, health or
`applyDamage`, so there is nothing to score against).
