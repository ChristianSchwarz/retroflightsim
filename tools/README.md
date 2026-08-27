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

Mesh names containing `Shadow` are **always** skipped (in addition to
`skipNameParts`). TCA's shared `ColliderMat` meshes are exported as an invisible
`*_collision.gltf` plus baked `collisionMesh` triangles for combat/ground hits.
`ShadowDepthOffset` / authored shadow meshes remain skipped — shared shadow materials are
referenced by GUID and usually are not bundled with a workshop mod, so their
material name cannot be resolved; the name fallback ensures those meshes are
still dropped (the sim generates its own shadow silhouette). Use `includeExact`
to keep a legitimate part whose name happens to contain one of these words.
Do **not** globally skip `WingInner*` — those meshes are wing fill on many
airframes; dropping them leaves rectangular holes in the wings.

### Per-material colour overrides

`materialColors` is the general way to fix a specific material's colour when the
palette/alpha heuristics get it wrong. The value can be either a literal
`#rrggbb` (rendered as-is) or the name of a sim `PaletteCategory` such as
`GLASS` or `VEHICLE_PLANE_GREY` (tinted by the active palette/time). Example:

```json
"materialColors": { "CanopyRubber": "#262826", "Windscreen": "GLASS" }
```

## Planet terrain

`assets/planet` is a **build product**, not a tracked asset. It is gitignored
and must be generated locally before the sim will show terrain.

The pipeline has four stages:

```
# 1. heights: WGS84 GeoTIFF -> .pdm pyramid + index.bin + manifest.json
pip install rasterio numpy
python tools/bake_planet_dem.py --input data/output_hh.tif --out assets/planet

# 2. coastlines: OSM -> .lwm masks + .lvr land polygons
pip install shapely requests
python tools/bake_osm_coast.py --manifest assets/planet/manifest.json

# 3. cover: landcover + satellite imagery -> .plc per tile   (optional)
npm run fetch:cover
npm run bake:cover

# 4. meshes: .pdm + .lvr + .plc -> draw-ready .ptm tiles + index_mesh.bin
npm run bake:mesh
npm run verify:planet -- --dir assets/terrain
```

Stage 4 is the only place terrain geometry is produced. The runtime fetches,
decodes and draws — it never triangulates — so there is no fallback path that
can drift out of sync with the bake.

Stage 3 is optional. Skip it and every land facet comes out plain grass, which
is what the bake produced before cover existed.

### Terrain colour

A land facet is baked carrying two observations of the ground it covers: a
**landcover class** and a **satellite colour**. Both travel in the same four
bytes per vertex, and which of them ends up on screen is a runtime choice —
the *Terrain colour* setting in the options panel, four modes, one uniform
write each:

| Mode | Colour |
| --- | --- |
| Landcover | class picks a palette tone; the most retro of the four |
| Swatches | satellite colour snapped to the table the bake derived |
| Hybrid | palette tone for the hue, satellite luminance for a banded shade |
| Imagery | the satellite colour itself |

Each has a **smooth** variant in the same list, which shades Gouraud instead of
flat. Both normals ship with every vertex — the facet's own, and the average of
the facets meeting there — so this is a uniform too, not a re-bake. Neither can
be derived from the other at load time: averaging is a per-vertex pass over
shared positions, which is exactly what PTM1 exists to avoid. That second
normal is what took the mesh stream from 55.5 MB to 68.7 MB; if it ever needs
to come back down, octahedral-encoding it into two bytes instead of four would
recover about half.

Averaging is per tile, so a vertex on a tile border only sees facets on its own
side. Measured on an adjacent z12 pair that costs 1.2 degrees of normal
disagreement on average (p90 2.5, max 8.7) — below what the palette's banded
shading can show, which is why the bake does not read neighbouring tiles.
Shore walls and skirts are excluded from the averaging in both directions:
they are creases by construction, and rounding one off bends the cliff edge
into the sea.

`fetch_cover_sources.py` pulls both sources into `data/cover` (gitignored):

* **ESA WorldCover 2021 v200** — 10 m, 11 classes, CC-BY 4.0, read from the
  public `esa-worldcover` S3 bucket. Ocean-only 3-degree tiles are not
  published at all, so 404s during the fetch are expected and skipped.
* **Sentinel-2 L2A true colour** — scenes found through the Earth Search STAC
  API, `visual` asset read from the public `sentinel-cogs` bucket. The search
  pages until it has every MGRS square over the coverage: one busy square
  fills a page on its own, and a single-page search comes back holding nothing
  but cloud-free open ocean.

Both are written at a deliberately coarse resolution (`--landcover-m`,
`--imagery-m`, default 20 m and 40 m). A facet at the finest zoom covers
30–100 m of ground, so anything sharper is averaged away in stage 4 anyway.

`bake_planet_cover.py` then resamples them onto each tile's own grid and
writes `.plc` alongside the `.pdm`.

`--patch-m` (default 250) is the one knob worth turning. WorldCover is a 10 m
product and it is right at 10 m — a single shed really is built-up — but at
the scale a facet paints, single-pixel truth is noise: the raw raster holds
1550 separate class regions on one z12 tile, 60% of them four nodes or
smaller, and the terrain comes out as confetti. A local majority filter over
the *land* classes, sized from a ground distance rather than a node count,
merges them into patches that read at the stated size. On tile `12/3744/1411`:

| | regions | median region | area in sub-250 m regions |
| --- | --- | --- | --- |
| `--patch-m 0` | 1550 | 33 m across | 23% |
| `--patch-m 250` | 44 | 260 m across | 2% |

Water and nodata are fixed points — never reassigned, never allowed to vote —
so the coastline comes through untouched. Without that the sea is the local
majority along any shore and it swallows headlands whole. Tiles are read with
a halo (`tools/cover_patches.py`, `halo_nodes`), which makes the result
identical to filtering the whole coverage at once; it also makes tile edges
*more* consistent than the unfiltered bake, because a 15-node majority barely
notices the half-pixel phase difference between two tiles' source reads
(measured on an adjacent pair: 55 and 29 disagreeing edge nodes unfiltered, 0
and 5 filtered).

Only the class raster changes. Where imagery exists the facet colours come out
bit-identical, so `Swatches` and `Imagery` are untouched and only the two
palette-driven modes get the bigger patches. Changing `--patch-m` means
re-running `npm run bake:cover` **and** `npm run bake:mesh`.

Two more rules live in the cover bake rather than in the mesh bake, because
they need something the raster does not carry:

* Bare ground within 160 m of the coast becomes **sand**. WorldCover has no
  sand class — dune, ash flat and lava field are all class 60 — so the
  distinction has to come from geometry.
* Landcover saying *open water* on a facet the OSM coast cut as **land** is a
  disagreement about where the shore is, and the coast vector wins. The
  alternative is a lake painted across a hillside.

Where imagery is missing — no scene, or no imagery fetched at all — a node
takes its class's own WorldCover map colour, so the imagery-driven modes
degrade to flat-but-plausible rather than to grey.

### Options

`bake_planet_dem.py`: `--max-zoom N` caps detail, `--clean` wipes the output
first. Do not bake past zoom 12: the source is 1 arc-second (~30 m) and z12
already oversamples it 1.6x.

`bake_planet_mesh.ts` (`npm run bake:mesh -- ...`):

| Flag | Meaning |
| --- | --- |
| `--src DIR` | input pyramid (default `assets/planet`) |
| `--out DIR` | output tree (default `assets/terrain`) |
| `--budget N` | triangles per tile (default 6144) |
| `--max-zoom N` | cap detail |
| `--only z/x/y` | bake one tile, repeatable, for debugging |
| `--limit N` | stop after N tiles, for a smoke bake |
| `--swatches N` | colours in the baked swatch table (default 24) |

### The triangle budget

`--budget` is the main quality knob, and what it really controls is
**shoreline resolution**. Raising the interior height tolerance coarsens flat
ground but does nothing for the coast, because shoreline blocks are pinned to
the finest leaf size regardless of height error. So the bake buys the finest
coast that fits in 80% of the budget and spends the rest on interior detail.

Measured on real Canary z12 tiles, the coast alone costs:

| Leaf size | Coast resolution | Triangles |
| --- | --- | --- |
| 1 cell | ~17 m | ~18,000 |
| 2 cells | ~34 m | ~9,000 |
| 4 cells | ~69 m | ~4,000 |
| 8 cells | ~138 m | ~1,600 |

The default 6144 lands on a ~34 m coast at roughly 5,300 triangles and 47 KB
gzip per tile. For comparison the old runtime CDT produced a median of 3,311
triangles per tile but had no ceiling at all — its worst z12 tile was 86,463.

### Serving

`assets/terrain` is **self-contained**: the mesh bake copies the height tiles
the runtime reads (z0..queryZoom) in alongside the `.ptm` meshes, so the whole
tree is one directory that any static file server can serve.

In development `tools/modserver.ts` mounts it straight from the repo, so tiles
need no rebuild and a dev build does not spend time copying ~82 MB it did not
change. `npm run build:prod` *does* copy it into `dist/`, because a deployed
`dist/` has to stand on its own.

`.ptm` files are stored gzip-compressed and served with `Content-Encoding:
gzip`, so the browser inflates them in native code off the main thread.

If the app reports `Failed to load terrain manifest ... 404`, either the tree
has not been baked yet (`npm run bake:mesh`) or a long-running `npm run serve`
predates the last change to the mounts — restart it.

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
