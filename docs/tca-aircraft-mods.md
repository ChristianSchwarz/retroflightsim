# Tiny Combat Arena Aircraft Mods: Format & Importer Guide

A deep-dive into how Tiny Combat Arena (TCA) aircraft mods are authored with
[brihernandez/TinyCombatTools](https://github.com/brihernandez/TinyCombatTools),
how they actually work (with a focus on **animation** and **shared materials**),
how individual mods differ, and — most importantly — how each concept maps onto
retroflightsim's importer (`tools/import_mod.py`) today, plus a prioritized list
of concrete improvements.

This document is descriptive/analytical. It proposes changes but does not make
them; the importer is unchanged by this doc.

## Source material

TinyCombatTools (the official Unity modding project), read at these paths:

- `readme.md` — the authoritative modder-facing reference.
- `Assets/TinyCombatTools/Scripts/Editor/TCABundler.cs` — the Mod Builder that
  produces the `Mod.json` + asset bundle.
- `Assets/TinyCombatTools/Content/SharedMaterials/Aircraft/*.mat` — `Canopy`,
  `ColliderMat`, `NozzleInteriorMat`.
- `Assets/TinyCombatTools/Content/SharedMaterials/Common/Shadow*.mat`.
- `Assets/TinyCombatTools/Content/Shaders/Tiny*.shadergraph`.
- `Assets/TinyCombatTools/Content/_Examples/F4E/*` — a complete example aircraft,
  including `F4EAnimator.controller` and `Animations/F4EGearUp.anim`.

retroflightsim (the consumer side), read at these paths:

- [tools/import_mod.py](../tools/import_mod.py) — the Unity bundle -> glTF importer.
- [tools/modserver.ts](../tools/modserver.ts) — the F10 in-app import server and mod-metadata parser.
- [tools/README.md](../tools/README.md) — the importer's own usage/config docs.
- [src/script/state/aircraftRegistry.ts](../src/script/state/aircraftRegistry.ts) — manifest -> flyable def.
- [src/script/scene/entities/aircraftDef.ts](../src/script/scene/entities/aircraftDef.ts) — the flyable def shape.
- [src/script/scene/entities/player.ts](../src/script/scene/entities/player.ts) — gear playback, afterburner pane binding, control-surface hookup.
- [src/script/scene/entities/afterburnerCones.ts](../src/script/scene/entities/afterburnerCones.ts) — procedural exhaust plume.

---

## 1. How a TCA mod is built

A TCA mod is authored inside a **Unity 2020.3.30f1** project (the game's exact
engine version) so the modder can preview the model under the real game shaders
and environment before exporting.

The **TCA Mod Builder** (`Tiny Combat Arena -> Open Mod Builder`, implemented in
`TCABundler.cs`) exports three things into the mod folder:

1. `Mod.json` — the mod manifest (name, short name, display name, summary,
   description, thumbnail/preview image paths, Steam workshop `Id`, and the list
   of asset-bundle names). Serialized from the `ModData` class via Newtonsoft.
2. `assetlist.txt` — a human-readable list of the exact in-bundle asset paths.
3. One **AssetBundle** built with `BuildAssetBundleOptions.StrictMode` for
   `BuildTarget.StandaloneWindows` (`BuildBundle` in `TCABundler.cs`).

Key mechanics that matter downstream:

- **All asset paths are forced to lowercase** (`CreateAssetPathFromFilePath`),
  and the bundle name is `assets` + the mod name (`WriteModJSONToDisk`).
- **`.meta` files are stripped** from the bundle (`GetAllExportPaths`).
- Everything under the selected "project mod folder" is bundled recursively; the
  modder is warned to use a unique root folder name (e.g. `MOD_A10`) to avoid
  path collisions.

### Data vs. assets

The bundler exports **assets only**. The **data** that actually references those
assets (aircraft stats, spawn behaviour, model/animator paths) lives in separate
JSON files that the modder edits by hand, using the paths from `assetlist.txt`.

An aircraft definition references its assets by their **full lowercase path,
including extension**:

```json
"Name": "A10A",
"DisplayName": "A-10A",
"DotColors": [130, 141, 154],
"ModelPath": "assets/mod/aircraft/a10a/a10a.fbx",
"AnimatorPath": "assets/mod/aircraft/a10a/a10aanimator.controller",
"SpawnOffset": -1.875,
"SpawnRotation": 4.1
```

`ModelPath` points at the FBX; `AnimatorPath` points at the Unity
`AnimatorController` that drives the gear animation (see
[section 5](#5-animation)). `SpawnOffset`/`SpawnRotation` position the aircraft
on the ramp; `DotColors` is the map/radar blip colour.

### Conflict rules (relevant to multi-mod imports)

Mods fail to load if two loaded mods share:

- **Identical asset paths** — hence unique root folder names.
- **Identical asset GUIDs** — a single asset (e.g. a shared missile model) must
  not be exported by two mods. This is also why re-exporting the example F-4,
  M60, or SA-2 collides with the game's own core assets: they are the literal
  game assets with the same GUIDs. Deleting a `.meta` file forces Unity to mint
  a fresh GUID.

This is the real-world reason retroflightsim's importer splits multi-plane packs
into distinct outputs and de-dupes re-imports (see [section 6](#6-differences-between-mods)).

---

## 2. Anatomy of an aircraft mod

Using the example F-4E (`_Examples/F4E/`) as the canonical shape, an aircraft
mod consists of:

- **`F4E.fbx`** — the model, authored as a hierarchy of named child objects
  (fuselage, wings, control surfaces, gear legs/doors, canopy, nozzle interior,
  shadow mesh, colliders).
- **`F4Palette.png`** — a small palette texture; the whole livery is UV-mapped
  onto solid-colour cells (the "vector decal" convention).
- **`F4EMat.mat`** — the main body material (uses `TinyDiffuse`).
- **`F4EEmissiveMat.mat`** — an emissive material for lights (bright regardless
  of scene lighting).
- **`F4EAnimator.controller`** + **`Animations/F4EGearUp.anim`** — the gear
  retract/extend animation (see [section 5](#5-animation)).

Three authoring requirements have direct consequences for import fidelity:

- **Orientation at rest**: every mesh and dummy/empty must have local axes
  **X = right, Y = up, Z = forward** when the part is in its rest pose (no
  rotation other than the intended one). Handles must be viewed in `Pivot` +
  `Local` mode to verify. Wrong axes break both in-game behaviour and any
  importer that reconstructs hinges from bone orientation.
- **Mesh Read/Write Enabled**: required so the game can reshuffle vertices at
  runtime. (For the importer this is moot — UnityPy reads the serialized mesh
  directly regardless — but it explains why bundled meshes are always readable.)
- **Per-part pivots**: the pivot of each control surface / gear bone is the hinge
  it will rotate about. TCA relies on these pivots; retroflightsim's importer
  reconstructs equivalent pivots from bone transforms and geometry.

---

## 3. Shaders (and the flat-shaded palette renderer)

TCA ships three custom Shader Graph shaders. retroflightsim is a flat-shaded,
palette-category renderer with no bitmap textures, so the useful thing is
understanding what data each shader exposes so the importer can translate intent.

- **`TinyDiffuse`** — the default for nearly everything. Inputs: `Color`
  (usually white when a texture is present; used as a flat colour otherwise),
  `Emission` (usually black; bright for lights), `Texture`, and `LightSteps`
  (shading fidelity, default 8/7). The palette-texture convention is **stylistic,
  not enforced** — this is exactly why the importer can sample the palette swatch
  to recover per-polygon flat colours.
- **`TinyCanopy`** — cockpit glass. The `Canopy` material's `_Color` carries a
  low-alpha tint (see [section 4](#4-shared-materials)); the shader adds a smooth
  contour highlight (`_Highlight`, `_HighlightPower`) and fades canopy opacity
  by distance (`_FadeIn`/`_FadeOut`). Canopy meshes are recommended to be
  **smooth-shaded** (unlike everything else) so the highlight reads correctly.
- **`TinyShadow`** — non-static-object shadows. Dithered up close, solid at
  range. Uses `DepthOffset` (pull toward camera) or `HeightOffset` (lift
  vertically) so the coplanar shadow still draws on top of the ground.

---

## 4. Shared materials

Shared Materials live in `Assets/TinyCombatTools/Content/SharedMaterials` and are
"materials which are common among many different objects". Authors are told to
**reference them but NOT include them in the export folder** — the game resolves
them at runtime by GUID:

> "When exporting your assets **do not include these materials** in the mod
> export folder. As long as they reference the shared materials, they will map
> correctly once imported."

The five relevant shared materials:

| Material | Shader | Purpose |
| --- | --- | --- |
| `Canopy` | TinyCanopy | Cockpit glass. `_Color = (0.116, 0.313, 0.462, a=0.16)` — a blue tint at ~16% alpha. |
| `ColliderMat` | (collider) | Invisible collision geometry. |
| `NozzleInteriorMat` | TinyDiffuse | Afterburner glow surface (see below). |
| `ShadowDepthOffset` | TinyShadow | Aircraft shadow (convention). |
| `ShadowHeightOffset` | TinyShadow | Vehicle shadow (convention). |

### Why this matters for the importer (the GUID gotcha)

Because shared materials are referenced by GUID and deliberately excluded from
the mod's export folder, a downloaded workshop bundle **may not contain the
shared material asset at all** — the mesh's renderer holds an external reference
whose target does not exist in the bundle. When that happens, the importer's
`Bundle._read_material` cannot resolve a name, so the mesh's effective material
name is empty/blank.

The importer today classifies parts largely by **material name**:

- glass detection: `_GLASS_MATERIAL_NAMES = {'Glass', 'Canopy', ...}` and
  `is_glass()` in `import_mod.py`;
- skip detection: `DEFAULT_SKIP_MATERIALS = ('Collider', 'ShadowDepthOffset', 'Shadow')`.

If the shared material name is missing, these checks silently miss — a canopy
would render opaque, a collider or shadow might leak into the visible mesh. In
practice retroflightsim already hedges with **mesh-name** heuristics
(`_GLASS_PART_NAME_PARTS`, and skip-name substrings), which is exactly the right
fallback; this doc's recommendations (section 8) push that further so classification
never depends solely on a shared-material name being present.

### `NozzleInterior` and afterburners

The nozzle interior is the mesh that glows when the afterburner lights. Its
requirements (from the readme) are strict:

1. It must be **its own mesh**.
2. It must have **only one material**.

The mechanism: `NozzleInteriorMat` has `_Color = black` at rest, a white
`_Emissive`, and the `NozzleInterior` texture as `_MainTex`. In-game the engine
**ramps `_Color` from black to white with afterburner throttle**; combined with
the white emission and texture this produces the glow.

This is nearly identical to how retroflightsim already animates afterburner
"panes": `player.ts` scans the body model for materials whose palette category is
`PaletteCategory.FX_FIRE` (`collectAfterburnerPaneMaterials`) and drives their
colour by throttle (`updateAfterburnerPaneColors`). So a nozzle interior detected
during import and tagged as `FX_FIRE` would light up automatically with zero
extra wiring — see recommendation 1.

### Shadows

Aircraft use `ShadowDepthOffset`; vehicles use `ShadowHeightOffset`. Munitions
have no shadow mesh (generated at runtime). retroflightsim ignores authored
shadow meshes entirely and **generates its own flattened planform silhouette**
(`emit_shadow` in `import_mod.py`, material `VEHICLE_PLANE_GREY`), which is the
correct approach for its renderer — the authored TCA shadow mesh is skipped via
`DEFAULT_SKIP_MATERIALS`.

---

## 5. Animation

This is the area with the biggest fidelity gap, so it is worth understanding in
detail.

### Gear animation is a scrubbed clip, not a state machine

TCA aircraft animate **only the landing gear** through Unity's Animator, and they
do it in an unusual way. The `F4EAnimator.controller` has:

- one float parameter, `GearUp` (`m_Type: 1`);
- one state, `F4EGearUp`, whose motion is the `F4EGearUp.anim` clip;
- crucially, `m_TimeParameterActive: 1` with `m_TimeParameter: GearUp`.

That last part means `GearUp` is used as a **normalized time parameter**: the
game sets `GearUp` in `[0, 1]` to **scrub** the clip to an exact pose, rather
than triggering a transition. Gear down = one end, gear up = the other, and any
value in between is a partial retract. `m_Speed: 0` reinforces that the clip is
driven by the parameter, not by wall-clock time.

### What the clip actually animates

`F4EGearUp.anim` (sample rate 60, stop time 1.0) contains two kinds of curves:

**Euler rotation curves (`m_EulerCurves`)** — rotate each gear base bone about
its hinge:

- `GearMainL/GearMainBaseL`: local **Z** 0 -> 72 deg over time 0.30 -> 1.0.
- `GearMainR/GearMainBaseR`: local **Z** 0 -> -72 deg over time 0.25 -> 0.95.
- `GearNose/GearNoseBase`: local **X** 0 -> 77.937 deg over time 0.0 -> 0.883.

Note the **staggered timing** (nose retracts first, mains slightly offset
left/right) and that left/right mains rotate in opposite signs about the same
local axis — the standard "legs fold inward/backward" motion.

**Activation curves (`m_IsActive`, `classID: 1`)** — a step curve per gear group
that toggles the GameObject active/inactive (value 1 -> 0). This hides the leg
once it is stowed (and is why the gear can visually "disappear" into the well).

Bindings reference the child objects by **hashed transform path**
(`m_ClipBindingConstant.genericBindings`, e.g. path `16514355`), with the
readable paths in `m_EditorCurves`.

### Control surfaces are NOT keyframed

Ailerons, elevators, and rudders have **no animation clips**. The game deflects
them procedurally at runtime by rotating the named child bones about their pivots.
This is a key insight: retroflightsim's importer mirrors the game exactly — it
reconstructs each surface's hinge pivot and axis from the bone convention
(`hinge_frame_from_part`, `_AUTO_SURFACE_RULES`, `hingeBonePrefix` default `B`)
and then the sim deflects them from control input (`controlSurfaceDescriptors`
in `player.ts`). No clip is needed or expected for surfaces.

### How retroflightsim consumes gear animation today

The sim is already capable of playing a gear clip: in `player.ts`, if
`def.gear` is set and `def.gearAnimated` is true, it calls
`setPlaybackDuration(LANDING_GEAR_ANIM_DURATION)` and `setPlaybackPosition(1)` on
the gear `LODHelper` — i.e. the gear glTF is expected to carry an animation clip
(the built-in F-22 does: `assets/f22_landinggear.glb`, `gearAnimated: true`).

But imported mods get **`gearAnimated: false`** hard-coded in `manifestToDef`
(aircraftRegistry.ts), with the comment *"imported gear models are static (no
retract clip)"*. The importer emits a static `*_gear.gltf` and never reads the
`AnimatorController`/`.anim`. So the raw data needed to bake a real retract
animation exists in the bundle but is currently discarded — see recommendation 2.

---

## 6. Differences between mods

Real mods vary along several axes the importer must handle:

- **Single-plane vs. multi-plane packs.** Many workshop packs bundle a dozen
  aircraft that **reuse the same part names** (`WingR`, `Cockpit`, `Fuselage`,
  even shared gear bones). They are separable only by the Unity **livery
  material**. The importer discovers these via `discover_livery_materials`
  (`--discover`) and carves out one plane with `includeMaterials`, `dedupeParts`,
  and the "rescue under root" logic (`rescueGlassUnderRoot`,
  `rescueMaterialsUnderRoot`) so per-plane glass/details are not lost. The
  modserver runs discovery automatically and matches each livery to catalog
  metadata (`buildPlanesFromCatalog`).
- **Naming variants.** Rudders may be a single `Rudder` or split `RudderLeft`/
  `RudderRight`; slats appear as `SlatsL`/`SlatL`/`SlatLeft`; gear parts span a
  large family (`GearNoseWheel`, `GearMainStrutL`, `GearDoorFront`, ...). The
  importer already tolerates these via `_AUTO_SURFACE_RULES` and
  `_AUTO_GEAR_PARTS`.
- **Livery encoding.** Three cases: (a) vector-decal geometry + palette swatch
  (recovered per-polygon via `sample_hex`); (b) a flat `_Color`/`_BaseColor`
  (used directly); (c) a large detail texture (**not** reproducible — falls back
  to the flat `_Color`). The optional `grayscale` remap exists for liveries whose
  swatch bakes heavy panel shading into near-black cells.
- **Data metadata in the zip.** Beyond the bundle, the mod zip can carry
  `mod.json`, `data/flyables.json`, `data/database/aircraft.json`, and
  `data/aircraft2/*.json`. The modserver already parses these
  (`extractModCatalog`) for `DisplayName`, `Filter`/category, `Description`, and
  `ModelPath`. Not yet consumed: `SpawnOffset`, `SpawnRotation`, `DotColors`
  (see recommendation 5).

---

## 7. Concept -> current importer handling -> gap

- **Body livery colours** — Handled well. Palette-swatch sampling per face,
  flat `_Color` fallback, `#rrggbb` materials, optional grayscale. Gap: large
  detail textures are not reproduced (inherent to a flat renderer).
- **Shared materials (general)** — Partially handled. Detection relies on the
  shared material *name* being present in the bundle; if it is an unresolved
  external GUID ref, name-based classification can miss. Mesh-name fallbacks
  exist but are incomplete. Gap: make classification name-optional.
- **Canopy / glass** — Handled via `Canopy` material name, glass part-name
  substrings, and auto-alpha; rendered as a fixed `glassColor` (default
  `GLASS` category). Gap: the shared `Canopy` tint/alpha (blue, ~16%) is ignored
  in favour of a constant.
- **Colliders / authored shadows** — Handled. Skipped by `DEFAULT_SKIP_MATERIALS`;
  the sim generates its own silhouette shadow. No gap.
- **Nozzle interior / afterburner** — Not handled. `NozzleInteriorMat` meshes are
  either colour-sampled like body parts or dropped; they are never tagged
  `FX_FIRE`, so the sim's throttle-driven glow (which already exists) never binds.
- **Gear animation** — Not handled. The `AnimatorController`/`GearUp` `.anim` is
  never read; gear is emitted static and `gearAnimated` is forced false, even
  though the sim can play a baked clip.
- **Control surfaces** — Handled well, and correctly modelled as procedural (no
  clip), matching the game. No gap.
- **Emissive lights** — Not handled. `_read_material` reads only
  `_Color`/`_BaseColor`; `_EmissionColor`/`_Emissive` are ignored, so nav/beacon
  lights render as ordinary flat colours.
- **Orientation / pivots** — Handled. `_FLIP_X` conjugation + optional
  `rotationEuler`; hinge axes recovered from bone columns.
- **Spawn metadata (offset/rotation/dot colour)** — Not handled. Ground contact
  is derived geometrically; `SpawnOffset`/`SpawnRotation`/`DotColors` from mod
  data are ignored even though they are already parsed by the modserver.

---

## 8. Prioritized importer improvements

Each item lists effort, the functions it touches, and why it is safe / aligned
with existing behaviour. Ordered by value-to-effort.

### 1. Map nozzle interiors to the afterburner glow (low effort, high payoff)

**What:** During import, detect the nozzle interior — by material name
(`NozzleInterior`, `NozzleInteriorMat`) **and** by a mesh-name fallback
(`Nozzle`, `Afterburner`, `Burner`) — and emit those faces under a material named
for the sim's `FX_FIRE` palette category instead of colour-sampling them.

**Why it's safe:** `player.ts` already binds any `PaletteCategory.FX_FIRE`
material in the body model and drives its colour by throttle
(`collectAfterburnerPaneMaterials` / `updateAfterburnerPaneColors`). No sim
change is required; the importer just has to emit the right material name.

**Touches:** `is_glass`/`face_colors` classification and `build_buckets`/`emit`
in `import_mod.py`; add an `FX_FIRE` branch analogous to the glass branch. A new
config key (e.g. `nozzleParts` / `nozzleMaterials`) mirrors `glassParts`.

### 2. Bake the gear retract animation (high effort, high payoff)

**What:** Read the `AnimatorController` referenced by the mod (or discovered in
the bundle) and its `GearUp` `.anim` clip; convert the `m_EulerCurves`
(per gear-base-bone rotation) into a glTF animation channel on the corresponding
gear nodes in `*_gear.gltf`. Optionally honour the `m_IsActive` step curves by
collapsing stowed legs at t=1. Then emit the gear as animated and stop forcing
`gearAnimated: false`.

**Why it's aligned:** the sim already scrubs a gear clip via
`setPlaybackDuration`/`setPlaybackPosition` (`player.ts`) and the F-22 proves the
path works; only imported mods opt out.

**Touches:** new anim-reading code in `import_mod.py` (UnityPy can read
`AnimationClip`/`AnimatorController` type trees); the gear-emit path must keep
per-part nodes (today faces are merged by colour, which destroys per-bone nodes,
so gear emission needs a node-preserving mode); manifest gains a
`gearAnimated`/`gearAnimation` field; relax the hard-coded
`gearAnimated: false` in `manifestToDef` (aircraftRegistry.ts).

**Risks:** Unity euler curves use a rotation order and tangents; baking to glTF
needs sampling to keyframes (e.g. at 60 Hz like the clip) rather than copying
tangents. The hinge-bone frame must be expressed in the same aircraft-local,
X-flipped, scaled space the importer uses for geometry (`_FLIP_X`, `scale`,
`ground_offset_y`). Scope this as its own change with a visual test.

### 3. Make shared-material classification name-optional (medium effort)

**What:** When a mesh's renderer material is an unresolved external GUID (no name
resolvable in the bundle), fall back to **mesh-name conventions** for all
classifications, not just glass: canopy (`Canopy*`, `Windscreen`), collider
(`*Collider*`), shadow (`Shadow*`), nozzle (`Nozzle*`). This guarantees correct
glass/skip/nozzle behaviour even when the shared material asset was excluded from
the bundle (the normal TCA case).

**Why:** the readme explicitly says shared materials are excluded from the export
folder, so relying on their names being present in a bundle is fragile.

**Touches:** `_read_material` (surface whether the material resolved),
`is_glass`, the skip checks, and the nozzle detection from item 1 in
`import_mod.py`.

### 4. Recover emissive lights (medium effort)

**What:** Read `_EmissionColor`/`_Emissive` in `_read_material`; when a material
has a non-black emission, map it to an emissive-appropriate sim palette category
(or a literal bright `#rrggbb`) instead of the flat `_Color`. Useful for
nav/formation/beacon lights (cf. `F4EEmissiveMat`).

**Touches:** `Bundle._read_material` and `face_colors` in `import_mod.py`;
possibly a config allow-list so only intended emissive materials are treated as
lights.

### 5. Pass through spawn metadata (low effort)

**What:** Use `SpawnOffset`, `SpawnRotation`, and `DotColors` from the mod's data
files (already parsed in `extractModCatalog`, modserver.ts) to seed the
manifest's ground offset, spawn rotation, and a radar/map dot colour, instead of
relying solely on geometric ground-contact derivation.

**Touches:** `extractModCatalog`/`buildPlaneConfig` (modserver.ts) to forward the
values into the import config; `import_mod.py` manifest assembly to store them.

### 6. Honour the real canopy tint (low effort)

**What:** When a canopy uses the shared `Canopy` material (or any glass material
with a meaningful `_Color`), prefer that material's actual tint/alpha (the blue
~16% alpha) over the fixed `glassColor` default, so canopies match the game's
look more closely.

**Touches:** `is_glass`/`face_colors` in `import_mod.py`; keep the `GLASS`
category path for tinting/dither but seed it from the material colour when
present.

---

## Quick reference: TCA term -> retroflightsim term

- FBX child object / bone -> GameObject + Transform (parsed by `world_matrix`).
- Livery material -> `includeMaterials` selector; `#rrggbb` output material.
- Palette texture -> palette swatch sampled by `sample_hex`.
- `Canopy` shared material / TinyCanopy -> `GLASS` palette category.
- `NozzleInteriorMat` -> should map to `FX_FIRE` (recommendation 1).
- `ShadowDepthOffset` mesh -> skipped; sim generates `VEHICLE_PLANE_GREY` silhouette.
- `ColliderMat` mesh -> skipped (`DEFAULT_SKIP_MATERIALS`).
- `GearUp` animator + `.anim` -> currently discarded; target of recommendation 2.
- Procedural control-surface bones -> `surfaces[]` with pivot/axis in the manifest.
- `SpawnOffset`/`SpawnRotation`/`DotColors` -> currently unused (recommendation 5).
