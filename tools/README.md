# Mod import tools

Tools for converting external Unity asset-bundle mods (e.g. Tiny Combat Arena
aircraft) into retroflightsim-compatible glTF models.

## Why this is needed

retroflightsim is a flat-shaded, **palette-based** renderer: it has no detail
textures. Each surface is one flat colour picked by the material *name*, which
normally maps to a `PaletteCategory`.

Many low-poly mods work the same way in spirit: their entire livery (paint,
national insignia, side numbers, red trim, warning triangles) is authored as
flat polygon **"vector decals"** whose colours come from a tiny
**palette-swatch texture** � a 16x16 (or similar) image of solid colour cells,
where every triangle's UVs point at one cell.

The importer recovers those real per-polygon colours by sampling the swatch
texture at each face's UV centroid, groups faces by colour, and writes a glTF
with one mesh/material per distinct colour. Each material is named `#rrggbb`,
and the sim renders that literal colour (see `ModelManager.rawColorFor` and the
`rawColor` path in `SceneMaterialManager`). Transparent glass keeps the `GLASS`
palette category so it stays tinted.

## Requirements

```
pip install UnityPy trimesh numpy pillow
```

## In-app import (F10)

The command-line workflow below is for authoring and repeatable builds. For a
quick import while the sim is running, press **`F10`** in the app and select a
mod `.zip`. The dev server (`tools/modserver.ts`, started by `npm run serve`)
receives the upload at `POST /api/import-mod`, runs `import_mod.py` and
`pack_aircraft_mods.py` for you, and the app registers and lets you fly the
result. The Python requirements above must be installed for this to work.

By default the in-app import uses a generic flyable config (no animated control
surfaces, active flight model). **Multi-plane mod packs are split by Unity livery
material** � each aircraft becomes its own `.aircraft.pack` with its colours
preserved. To ship full fidelity for a single plane, drop a `retroflight.json`
file (the same schema as `tools/mods/*.json`) inside the mod `.zip`; the server
will use it, overriding only `bundle`/`out`/`outPrefix`.

Inspect liveries in a bundle before importing:

```
python tools/import_mod.py --bundle "mods/mod.zip" --discover
```

## Usage

The `--bundle` input can be a mod **`.zip`** (e.g. a Tiny Combat Arena workshop
download), a raw Unity asset-bundle file, or a folder. A `.zip` is unpacked and
the Unity bundle inside (identified by its `UnityFS` header) is located
automatically.

### 1. Inspect a mod

Always look before importing � this lists textures (flagging likely
palette-swatch atlases), materials (texture / colour / alpha), and every mesh
GameObject with its material(s):

```
python tools/import_mod.py --bundle "C:/Downloads/my_aircraft_mod.zip" --list
```

### 2. Import

Straight from the CLI (auto-detects the palette texture and glass):

```
python tools/import_mod.py --bundle "C:/Downloads/mod.zip" --out assets/foo_static.gltf
```

Or, for repeatability, with a JSON config (recommended). Copy
`tools/mods/_template.json`, fill in `bundle` + `out`, and tweak from there:

```
python tools/import_mod.py --config tools/mods/mod.json
```

Only `bundle` and `out` are required; every other field has a sensible default
(include everything, drop colliders/shadows, auto-detect glass and the palette
swatch). Use `--list` to discover part and material names before narrowing the
include/skip lists.

A mod can have its own convenience wrapper:

```
python tools/build_mod_gltf.py
```

### 3. Wire it into the sim

The importer produces loose glTF files under `assets/` for editing and tests.
At build time, `tools/pack_aircraft_mods.py` bundles each flyable mod into a
single `dist/assets/{id}.aircraft.pack` file. Shipped mods keep
their manifests under `assets/`; **F10 imports** stage loose glTF files under
`tools/mods/imports/` until packing � they are not written into `assets/`.

To register a flyable mod, load its pack in `src/script/state/game.ts`:

```
await this.aircraftRegistry.loadPack('mymod', 'assets/mymod.aircraft.pack');
```

For parked ramp models, reference pack URLs in
`src/script/state/staticModelViews.ts` (e.g. `pack:mymod/mymod_static.gltf`).

### 4. Build

```
npm run build
```

Runs webpack and then `npm run pack-mods`. The deployable mod output is
`dist/assets/*.aircraft.pack`, not the hundreds of loose per-mod glTF files in
`assets/`.

## Config schema (`tools/mods/*.json`)

See `tools/mods/_template.json` for a copy-paste starting point. Only `bundle`
and `out` are required.

TCA part/material naming conventions (shared materials, control-surface fallbacks,
gear meshes, glass/nozzle detection, livery discovery) live in
[`tools/tca_mapping.json`](tca_mapping.json), derived from
[`docs/tca-aircraft-mods.md`](../docs/tca-aircraft-mods.md). Per-import config
keys such as `glassParts`, `nozzleParts`, and `skipNameParts` extend that base
mapping at runtime rather than replacing it.

| Field            | Meaning                                                              |
| ---------------- | ------------------------------------------------------------------- |
| `bundle`         | **(required)** Path to a mod `.zip`, a Unity asset-bundle file, or a folder. |
| `out`            | **(required)** Output `.gltf` path (relative to project root).      |
| `bufferPrefix`   | Prefix for the `.bin` buffers (defaults to the output file stem).   |
| `groundDistance` | Distance from model origin down to the ground (2.0 for aircraft).   |
| `groundContactPercentile` | Bottom percentile of `groundParts` vertex Y used as the wheel contact plane (default 10). Avoids mesh-min spikes that float the visible tire tread. |
| `groundContactInsetM` | Extra metres to shift the model down after percentile alignment (default 0). |
| `scale`          | Uniform scale applied to geometry (default 1.0).                    |
| `rotationEuler`  | `[x, y, z]` degrees to reorient a model that faces the wrong way.   |
| `swatchMax`      | Max texture size in px treated as a palette swatch (default 64).    |
| `glassColor`     | Flat colour for glass parts with no palette tint (default `#d1f7ff`). |
| `glassParts`     | Part-name substrings always exported as glass.                      |
| `glassAutoAlpha` | Auto-treat transparent materials as glass (default `true`).         |
| `glassAlphaMax`  | Alpha below which a material counts as glass (default `0.9`).        |
| `nozzleAuto`     | Auto-detect afterburner nozzle interiors and export them as dark metal `#rrggbb` (default `#1a1a1a`, or the material's black rest `_Color`). Afterburner glow is procedural at `fx.nozzles`, not on the body mesh. Detected by `NozzleInteriorMat` or mesh-name fallbacks. |
| `nozzleColor`    | Literal `#rrggbb` for nozzle-interior faces when the source material has no dark base colour. |
| `nozzleParts`    | Extra part-name substrings to treat as nozzle interiors.            |
| `nozzleMaterials`| Extra material-name substrings to treat as nozzle interiors.        |
| `emissiveLights` | Export materials with a bright `_EmissionColor` over a dark base (e.g. nav/beacon lights) as their literal emissive colour instead of the flat `_Color` (default `true`). |
| `emissiveMaterials` | Optional allow-list of material names permitted to glow; empty means any qualifying material. |
| `materialColors` | Map of Unity material name -> `#rrggbb` **or** a `PaletteCategory` (e.g. `"GLASS"`, `"FX_FIRE"`). Overrides palette sampling for those materials. |
| `groundParts`    | Part names whose mesh sets the ground contact height (wheel meshes). Uses the bottom `groundContactPercentile` of each part's vertices, then the highest contact among parts so tricycle mains do not float. On flyable imports, also auto-generates `flight.gear.points` from each part's mesh minimum Y for FM2 physics. `gearWheelParts` is accepted as an alias. |
| `skipMaterials`  | Material-name substrings whose meshes are dropped (colliders etc.). |
| `skipExact`      | Part names dropped exactly.                                         |
| `includeExact`   | Part names always kept even if they match a skip substring.         |
| `skipNameParts`  | Part-name substrings to drop (gauges, weapons, colliders, ...).     |
| `skipClutter`    | When `true`, skip weapon/pylon/gauge clutter from [`tca_mapping.json`](tca_mapping.json) `importClutterSkip`. Defaults to `false`; cockpit/canopy/attachment empties are kept. |
| `bitmapLivery`   | When `true` (default), sample large livery bitmap textures at face UVs (downsampled to `bitmapSampleMax`, default 512). Without this, only palette swatches ? `swatchMax` are sampled. |
| `dedupeParts`    | Keep one mesh per `(name, transformRoot)`. With `includeMaterials`, also span-clusters airframe roots so a shared livery name on an unrelated larger hull (or duplicate packed copies) is not merged into the export. |
| `rescueNozzleUnderRoot` | Multi-plane imports: re-admit nozzle-interior meshes under the same transform root as the livery even when their material differs. Defaults to `true` when `includeMaterials` is set. |
| `rescueNozzleGlobal` | When `true` (default with `includeMaterials`), also re-admit off-root pooled nozzle meshes that lie near the livery hull bounds. |
| `rescueGlassGlobal` | Same spatial rescue for canopy/glass parts (off-root pooled canopies). Defaults to `true` with `includeMaterials`. |
| `rescueCockpit` | Re-admit cockpit-interior meshes (by name) under the livery root or near the hull. Defaults to `true` with `includeMaterials`. |
| `wingtipParts`   | Extra part-name substrings treated as wingtip meshes for `fx.wingtips` trail origins (default mapping matches `WingTip` / `Wingtip`). |

With `skipClutter` false (the F10 default for flyable imports), cockpit/canopy
meshes export while weapons/pylons/gauges are still skipped when
`skipClutter` is enabled. Narrow further with `skipNameParts` / `skipExact`.

Mesh names containing `Shadow` or `WingInner` are **always** skipped (in addition
to `skipNameParts`). TCA's shared `ColliderMat` meshes are exported as an invisible
`*_collision.gltf` plus baked `collisionMesh` triangles for combat/ground hits.
`ShadowDepthOffset` / authored shadow meshes remain skipped — shared shadow materials are
referenced by GUID and usually are not bundled with a workshop mod, so their
material name cannot be resolved; the name fallback ensures those meshes are
still dropped (the sim generates its own shadow silhouette). Use `includeExact`
to keep a legitimate part whose name happens to contain one of these words.

### Per-material colour overrides

`materialColors` is the general way to fix a specific material's colour when the
palette/alpha heuristics get it wrong. The value can be either a literal
`#rrggbb` (rendered as-is) or the name of a sim `PaletteCategory` such as
`GLASS` or `VEHICLE_PLANE_GREY` (tinted by the active palette/time). Example:

```json
"materialColors": { "CanopyRubber": "#262826", "Windscreen": "GLASS" }
```

## Notes / limitations

- Colours are **flat-shaded** to match the sim's look; there are no gradients,
  speculars or actual bitmap textures. The paint *regions* are only as detailed
  as the mod's decal geometry.
- Materials whose `_MainTex` is a large (non-swatch) texture fall back to the
  material's flat `_Color`; true textured detail is not reproduced.
- Output has geometry only in LOD scene 0; scenes 1..5 are empty. Static ramp
  models use a high LOD bias so they render at LOD 0.
- `trimesh` prints a `scipy` traceback while computing normals; it falls back to
  a numpy path and the output is fine.
