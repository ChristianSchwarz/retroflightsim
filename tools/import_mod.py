"""Import a Unity asset-bundle mod into a retroflightsim glTF.

Many low-poly Unity mods (e.g. Tiny Combat Arena aircraft) do not use detail
textures. Their whole livery -- paint, insignia, side numbers, trim -- is
authored as flat polygon "vector decals" whose colours come from a tiny
palette-swatch texture: every triangle's UVs point at one solid-colour cell.
Others simply rely on per-material flat `_Color` values.

This tool recovers those real per-polygon colours by, for each mesh face:
  1. an explicit per-material override colour (config `materialColors`), else
  2. a palette-swatch sample at the face's UV centroid, else
  3. the material's flat `_Color`, else a neutral fallback.
Faces are grouped by colour and written to a glTF with one mesh/material per
distinct colour. Each material is named '#rrggbb' so the sim renders that
literal colour (see ModelManager.rawColorFor). A material name may also be a
PaletteCategory (e.g. 'GLASS') to let the sim tint it per palette/time.

Transparent materials (low alpha) are auto-detected as glass; you can also
force parts to glass by name, and control the glass colour.

The --bundle input may be a mod .zip (e.g. a Tiny Combat Arena workshop
download), a raw Unity asset bundle file, or a folder; a .zip is unpacked and
the Unity bundle inside is located automatically.

Usage:
    # Inspect a mod (list GameObjects, materials, textures) before importing:
    python tools/import_mod.py --bundle "C:/Downloads/mod.zip" --list

    # Import using a JSON config (see tools/mods/_template.json for all fields):
    python tools/import_mod.py --config tools/mods/a4e.json

    # Import straight from the CLI (zero-config: include everything, auto glass):
    python tools/import_mod.py --bundle "C:/Downloads/mod.zip" --out assets/foo.gltf

The importer only produces the glTF asset. To make it appear in the sim, add it
to src/script/state/staticModelViews.ts (static ramp models) or load it via
ModelManager.getModel(...) like any other model.
"""
from __future__ import annotations

import argparse
import atexit
import json
import math
import os
import shutil
import sys
import tempfile
import zipfile
from collections import defaultdict

import numpy as np
import trimesh
import UnityPy
from PIL import Image

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

GLASS_CATEGORY = 'GLASS'
DEFAULT_MATERIAL = '#909094'  # neutral grey fallback
# PaletteCategory used for a generated flyable-aircraft shadow silhouette.
SHADOW_MATERIAL = 'VEHICLE_PLANE_GREY'

# UnityPy's mesh.export() negates X to convert Unity's left-handed coordinates
# to a right-handed OBJ/glTF system. Transforms read from the bundle are still
# in Unity's left-handed space, so a part's world matrix must be conjugated by
# this flip (S @ M @ S) before it is applied to the exported (flipped) verts.
# Without this, only identity-rotation parts land correctly; rotated/offset
# parts (gear wheels, speedbrakes, control surfaces) get the wrong axis.
_FLIP_X = np.diag([-1.0, 1.0, 1.0, 1.0])

# A texture no larger than this (px) is treated as a flat palette-swatch atlas.
DEFAULT_SWATCH_MAX = 64

# Materials whose meshes are never visible geometry.
DEFAULT_SKIP_MATERIALS = ('Collider', 'ShadowDepthOffset', 'Shadow')


# --------------------------------------------------------------------------- #
# Unity math helpers
# --------------------------------------------------------------------------- #
def vec3(v) -> np.ndarray:
    return np.array([v.x, v.y, v.z], dtype=np.float64)


def quat(q) -> np.ndarray:
    return np.array([q.x, q.y, q.z, q.w], dtype=np.float64)


def local_matrix(transform) -> np.ndarray:
    pos = vec3(transform.m_LocalPosition)
    rot = quat(transform.m_LocalRotation)
    scale = vec3(transform.m_LocalScale)

    x, y, z, w = rot
    xx, yy, zz = x * x, y * y, z * z
    xy, xz, yz = x * y, x * z, y * z
    wx, wy, wz = w * x, w * y, w * z

    rot_mat = np.array([
        [1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy)],
        [2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx)],
        [2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy)],
    ], dtype=np.float64)

    mat = np.eye(4, dtype=np.float64)
    mat[:3, :3] = rot_mat * scale
    mat[:3, 3] = pos
    return mat


def world_matrix(path_id: int, transforms, cache) -> np.ndarray:
    if path_id in cache:
        return cache[path_id]
    transform = transforms[path_id]
    mat = local_matrix(transform)
    parent = transform.m_Father
    if parent.path_id != 0 and parent.path_id in transforms:
        mat = world_matrix(parent.path_id, transforms, cache) @ mat
    cache[path_id] = mat
    return mat


def euler_matrix(degrees) -> np.ndarray:
    """3x3 rotation matrix from XYZ Euler angles (degrees), applied X then Y then Z."""
    rx, ry, rz = (np.radians(float(a)) for a in degrees)
    cx, sx = np.cos(rx), np.sin(rx)
    cy, sy = np.cos(ry), np.sin(ry)
    cz, sz = np.cos(rz), np.sin(rz)
    mx = np.array([[1, 0, 0], [0, cx, -sx], [0, sx, cx]], dtype=np.float64)
    my = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]], dtype=np.float64)
    mz = np.array([[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]], dtype=np.float64)
    return mz @ my @ mx


# --------------------------------------------------------------------------- #
# Mesh / material parsing
# --------------------------------------------------------------------------- #
def mesh_geometry(mesh, mat_pids: list) -> tuple[np.ndarray, np.ndarray | None, list[np.ndarray], list[np.ndarray]]:
    """Return verts, uvs, per-submesh face indices, and per-submesh UV indices."""
    verts, uvs, face_v, face_t = parse_obj(mesh.export())
    if len(verts) == 0 or len(face_v) == 0:
        return np.empty((0, 3)), None, [], []
    return verts, uvs, [face_v], [face_t]


def parse_obj(obj_text: str):
    """Return (vertices Nx3, uvs Mx2 or None, face_v Fx3, face_t Fx3)."""
    verts, uvs, face_v, face_t = [], [], [], []
    for line in obj_text.splitlines():
        if line.startswith('v '):
            verts.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('vt '):
            uvs.append([float(x) for x in line.split()[1:3]])
        elif line.startswith('f '):
            corners = line.split()[1:]
            if len(corners) < 3:
                continue
            vi, ti = [], []
            for c in corners[:3]:
                p = c.split('/')
                vi.append(int(p[0]) - 1)
                ti.append(int(p[1]) - 1 if len(p) > 1 and p[1] else -1)
            face_v.append(vi)
            face_t.append(ti)
    verts = np.array(verts, dtype=np.float64) if verts else np.empty((0, 3))
    uvs = np.array(uvs, dtype=np.float64) if uvs else None
    face_v = np.array(face_v, dtype=np.int64) if face_v else np.empty((0, 3), np.int64)
    face_t = np.array(face_t, dtype=np.int64) if face_t else np.empty((0, 3), np.int64)
    return verts, uvs, face_v, face_t


def sample_hex(pal: np.ndarray, uv_centroids: np.ndarray) -> np.ndarray:
    """Sample sRGB hex colours from a palette texture at (u, v) coordinates.

    Unity UV origin is bottom-left, so V is flipped."""
    h, w, _ = pal.shape
    xs = np.clip((uv_centroids[:, 0] * w).astype(int), 0, w - 1)
    ys = np.clip(((1.0 - uv_centroids[:, 1]) * h).astype(int), 0, h - 1)
    cols = pal[ys, xs]
    return np.array(['#%02x%02x%02x' % (int(c[0]), int(c[1]), int(c[2])) for c in cols])


def rgba01_to_hex(c) -> str:
    r = int(round(max(0.0, min(1.0, c.get('r', 1.0))) * 255))
    g = int(round(max(0.0, min(1.0, c.get('g', 1.0))) * 255))
    b = int(round(max(0.0, min(1.0, c.get('b', 1.0))) * 255))
    return '#%02x%02x%02x' % (r, g, b)


def resolve_bundle_path(path: str) -> str:
    """Accept a raw Unity asset bundle, a folder, or a mod .zip.

    Mods are usually distributed as a .zip (e.g. a Tiny Combat Arena workshop
    download) with the Unity asset bundle inside alongside config files. This
    extracts the largest file whose header is the Unity bundle magic 'UnityFS'
    into a temp dir (cleaned up on exit) and returns its path."""
    if not path.lower().endswith('.zip'):
        return path

    tmp = tempfile.mkdtemp(prefix='rfs_mod_')
    atexit.register(shutil.rmtree, tmp, ignore_errors=True)

    with zipfile.ZipFile(path) as z:
        candidates = []
        for info in z.infolist():
            if info.is_dir():
                continue
            with z.open(info) as f:
                if f.read(8).startswith(b'UnityFS'):
                    candidates.append(info)
        if not candidates:
            raise SystemExit(f'No Unity asset bundle (UnityFS) found in {path}')
        candidates.sort(key=lambda i: i.file_size, reverse=True)
        chosen = candidates[0]
        out = os.path.join(tmp, os.path.basename(chosen.filename))
        with z.open(chosen) as src, open(out, 'wb') as dst:
            shutil.copyfileobj(src, dst)
        print(f'Extracted asset bundle "{chosen.filename}" from {os.path.basename(path)}',
              file=sys.stderr)
        return out


class Bundle:
    """Parsed view over a Unity asset bundle."""

    def __init__(self, path: str):
        self.env = UnityPy.load(resolve_bundle_path(path))
        self.by_path = {o.path_id: o for o in self.env.objects}
        self.transforms = {}
        self.mesh_filters = {}
        self.meshes = {}
        self.materials = {}   # path_id -> dict(name, main_tex, color, alpha)
        self.textures = {}    # path_id -> dict(name, w, h, array or None)
        for o in self.env.objects:
            t = o.type.name
            if t == 'Transform':
                self.transforms[o.path_id] = o.read()
            elif t == 'MeshFilter':
                self.mesh_filters[o.path_id] = o.read()
            elif t == 'Mesh':
                self.meshes[o.path_id] = o.read()
            elif t == 'Material':
                self.materials[o.path_id] = self._read_material(o)
            elif t == 'Texture2D':
                self.textures[o.path_id] = self._read_texture(o)

    @staticmethod
    def _read_material(o) -> dict:
        tt = o.read_typetree()
        sp = tt.get('m_SavedProperties', {})
        colors = {c[0]: c[1] for c in sp.get('m_Colors', [])}
        texs = sp.get('m_TexEnvs', [])
        main_tex = None
        for key, env in texs:
            if isinstance(env, dict):
                pid = env.get('m_Texture', {}).get('m_PathID', 0)
                if pid and (key == '_MainTex' or main_tex is None):
                    main_tex = pid
                    if key == '_MainTex':
                        break
        color = colors.get('_Color') or colors.get('_BaseColor') or {}
        return {
            'name': tt.get('m_Name', ''),
            'main_tex': main_tex,
            'color': color,
            'alpha': float(color.get('a', 1.0)) if color else 1.0,
        }

    @staticmethod
    def _read_texture(o) -> dict:
        t = o.read()
        info = {'name': t.m_Name, 'w': int(t.m_Width), 'h': int(t.m_Height), 'array': None}
        try:
            info['array'] = np.array(t.image.convert('RGB'))
        except Exception:
            pass
        return info


# --------------------------------------------------------------------------- #
# Inspection
# --------------------------------------------------------------------------- #
def list_bundle(bundle: Bundle):
    print('== Textures ==')
    for pid, tex in bundle.textures.items():
        tag = ' (palette-swatch?)' if tex['w'] <= DEFAULT_SWATCH_MAX and tex['h'] <= DEFAULT_SWATCH_MAX else ''
        print(f'  {tex["name"]:24s} {tex["w"]}x{tex["h"]}{tag}')
    print('== Materials ==')
    for pid, m in bundle.materials.items():
        tex = bundle.textures.get(m['main_tex'], {}) if m['main_tex'] else {}
        texname = tex.get('name', '-')
        col = rgba01_to_hex(m['color']) if m['color'] else '-'
        glass = ' (transparent -> glass)' if m['alpha'] < 0.9 else ''
        print(f'  {m["name"]:24s} tex={texname:20s} color={col} alpha={m["alpha"]:.2f}{glass}')
    print('== GameObjects with meshes ==')
    for o in bundle.env.objects:
        if o.type.name != 'GameObject':
            continue
        go = o.read()
        mats = _renderer_material_names(bundle, go)
        if mats is None:
            continue
        print(f'  {go.m_Name:24s} materials={mats}')


def _renderer_material_names(bundle: Bundle, go):
    has_mesh = False
    names = []
    for comp in go.m_Component:
        co = bundle.by_path.get(comp.component.path_id)
        if co is None:
            continue
        if co.type.name == 'MeshFilter':
            has_mesh = True
        elif co.type.name == 'MeshRenderer':
            tt = co.read_typetree()
            names = [bundle.materials.get(m['m_PathID'], {}).get('name', '?')
                     for m in tt.get('m_Materials', [])]
    return names if has_mesh else None


# Substrings that identify exterior airframe meshes when discovering liveries.
_BODY_PART_HINTS = (
    'Fuselage', 'Wing', 'Nose', 'Elevator', 'Rudder', 'Aileron',
    'Tail', 'Fin', 'Stabilizer', 'Slat', 'Flap', 'Intake', 'Nozzle',
    'SpeedBrake', 'Body', 'Hull',
)

_DISCOVER_SKIP_NAME_PARTS = (
    'Collider', 'Shadow', 'Stick', 'Gauge', 'Needle', 'Pylon', 'Weapon',
    'Cockpit', 'Seat', 'Mirror', 'Empty', 'FX', 'Light', 'Bolt', 'AIM',
    'Gun', 'Tank', 'Launcher',
)


def _discover_skip_part(name: str) -> bool:
    return any(s in name for s in _DISCOVER_SKIP_NAME_PARTS)


def _is_body_part(name: str) -> bool:
    return any(h in name for h in _BODY_PART_HINTS)


def _is_fuselage_part(name: str) -> bool:
    return 'Fuselage' in name or name in ('Body', 'Hull', 'Fuse')


def _livery_material_name(name: str, skip_materials: tuple) -> bool:
    if any(s in name for s in skip_materials):
        return False
    low = name.lower()
    if 'glass' in low or 'canopy' in low or 'windscreen' in low or 'collider' in low:
        return False
    if any(s in low for s in ('missile', 'weapon', 'pylon', 'bomb', 'rocket', 'pod')):
        return False
    return True


def discover_livery_materials(bundle_path: str) -> list[dict]:
    """Find distinct flyable aircraft liveries in a multi-plane Unity bundle.

    Multi-plane packs (e.g. Tiny Combat Arena collections) reuse the same mesh
    part names across aircraft; only the Unity *material* (livery) differs.
    Returns one entry per livery material, suitable for ``includeMaterials``.
    """
    bundle = Bundle(bundle_path)
    skip_materials = DEFAULT_SKIP_MATERIALS
    body_parts: dict[str, set[str]] = defaultdict(set)
    fuselage_mats: set[str] = set()
    mesh_hits: dict[str, int] = defaultdict(int)

    for o in bundle.env.objects:
        if o.type.name != 'GameObject':
            continue
        go = o.read()
        name = go.m_Name
        if _discover_skip_part(name):
            continue
        mat_pids: list[int] = []
        has_mesh = False
        for comp in go.m_Component:
            co = bundle.by_path.get(comp.component.path_id)
            if co is None:
                continue
            if co.type.name == 'MeshFilter':
                has_mesh = True
            elif co.type.name == 'MeshRenderer':
                tt = co.read_typetree()
                mat_pids = [m['m_PathID'] for m in tt.get('m_Materials', [])]
        if not has_mesh or not mat_pids:
            continue

        for pid in mat_pids:
            mat = bundle.materials.get(pid)
            if mat is None:
                continue
            mat_name = mat.get('name', '')
            if not _livery_material_name(mat_name, skip_materials):
                continue
            if mat.get('alpha', 1.0) < 0.9:
                continue
            mesh_hits[mat_name] += 1
            if _is_body_part(name):
                body_parts[mat_name].add(name)
            if _is_fuselage_part(name):
                fuselage_mats.add(mat_name)

    candidates = sorted(fuselage_mats) if fuselage_mats else sorted(
        m for m, parts in body_parts.items() if len(parts) >= 3)

    if not candidates and body_parts:
        candidates = sorted(
            m for m, parts in body_parts.items() if len(parts) >= 2)

    # Drop materials with too few distinct airframe parts (decals, weapons, etc.).
    candidates = [
        m for m in candidates
        if len(body_parts.get(m, ())) >= 5 or m in fuselage_mats
    ]

    out = []
    for mat_name in candidates:
        out.append({
            'material': mat_name,
            'name': mat_name,
            'partCount': mesh_hits[mat_name],
            'bodyParts': len(body_parts.get(mat_name, ())),
        })
    return out


# --------------------------------------------------------------------------- #
# Import
# --------------------------------------------------------------------------- #
def _should_include(name: str, include_exact, skip_parts, skip_exact) -> bool:
    if name in skip_exact:
        return False
    if name in include_exact:
        return True
    return not any(part in name for part in skip_parts)


# Tiny Combat Arena / workshop mods reuse these GameObject names across aircraft.
# When flyable.surfaces is omitted (generic F10 import), match them automatically.
_AUTO_SURFACE_RULES: list[tuple[tuple[str, ...], str, str, int, float]] = [
    (('ElevatorLeft', 'ElevatorL'), 'elevatorLeft', 'pitch', 1, 0.42),
    (('ElevatorRight', 'ElevatorR'), 'elevatorRight', 'pitch', 1, 0.42),
    (('AileronL', 'AileronLeft'), 'aileronLeft', 'roll', 1, 0.4),
    (('AileronR', 'AileronRight'), 'aileronRight', 'roll', -1, 0.4),
    (('FlapL', 'FlapLeft'), 'flapLeft', 'flaps', -1, 0.5),
    (('FlapR', 'FlapRight'), 'flapRight', 'flaps', -1, 0.5),
    (('SlatsL', 'SlatL', 'SlatLeft'), 'slatLeft', 'slats', 1, 0.35),
    (('SlatsR', 'SlatR', 'SlatRight'), 'slatRight', 'slats', 1, 0.35),
    (('SpeedBrakeL',), 'speedbrakeLeft', 'flaps', 1, 0.3),
    (('SpeedBrakeR',), 'speedbrakeRight', 'flaps', 1, 0.3),
]

_AUTO_GEAR_PARTS = (
    'GearNoseWheel', 'GearMainWheelL', 'GearMainWheelR',
    'GearNoseStrut', 'GearMainStrutL', 'GearMainStrutR',
    'GearNoseBase', 'GearNoseBase2', 'GearMainBaseL', 'GearMainBaseR',
    'GearDoorFront', 'GearDoorL', 'GearDoorR', 'GearNoseDoor',
    'GearLSupport1', 'GearLSupport2', 'GearRSupport1', 'GearRSupport2',
    'GearNoseSupport', 'GearNoseSupporter1', 'GearNoseSupporter2',
)


def auto_surface_defs(available: set[str]) -> list[dict]:
    """Build flyable surface entries from standard TCA part names."""
    surfaces: list[dict] = []
    used_roles: set[str] = set()
    used_parts: set[str] = set()
    for part_names, role, control, sign, range_rad in _AUTO_SURFACE_RULES:
        if role in used_roles:
            continue
        part = next((pn for pn in part_names if pn in available and pn not in used_parts), None)
        if part is None:
            continue
        surfaces.append({
            'role': role,
            'parts': [part],
            'control': control,
            'sign': sign,
            'rangeRad': range_rad,
        })
        used_roles.add(role)
        used_parts.add(part)

    # Some mods split the rudder into left/right meshes instead of one "Rudder".
    if 'rudder' not in used_roles:
        rudder_parts = [p for p in ('Rudder', 'RudderLeft', 'RudderRight')
                        if p in available and p not in used_parts]
        if rudder_parts:
            surfaces.append({
                'role': 'rudder',
                'parts': rudder_parts,
                'control': 'yaw',
                'sign': 1,
                'rangeRad': 0.45,
            })
    return surfaces


def auto_gear_names(available: set[str]) -> set[str]:
    return {p for p in _AUTO_GEAR_PARTS if p in available}


def transform_root(tpid: int, transforms) -> int:
    """Walk the Unity Transform parent chain to the top-most ancestor path_id."""
    seen: set[int] = set()
    cur = tpid
    while True:
        t = transforms.get(cur)
        if t is None:
            return cur
        father = t.m_Father.path_id
        if not father or father not in transforms or father in seen:
            return cur
        seen.add(cur)
        cur = father


def _transform_pid_of(go, bundle: Bundle) -> int | None:
    for comp in go.m_Component:
        co = bundle.by_path.get(comp.component.path_id)
        if co is not None and co.type.name == 'Transform':
            return comp.component.path_id
    return None


def hinge_frame_from_part(
    bundle: Bundle,
    part_name: str,
    world_cache: dict[int, np.ndarray],
    scale: float,
    ground_offset_y: float,
    control: str = 'pitch',
    hinge_axis: str | None = None,
    root_pid: int | None = None,
) -> tuple[np.ndarray, np.ndarray] | None:
    """Pivot + hinge axis from a Unity bone/empty (e.g. BSlatL) in the sim body frame.

    The hinge axis is one of the bone's three local axes, but which column the
    artist aligned to the hinge line varies between mods (e.g. the F-16 rudder
    hinge is the bone's local Y, the A-4 rudder hinge is its local Z). Rather
    than assume a fixed column, pick the local axis whose world direction best
    matches the expected hinge orientation: vertical (world +Y) for a yaw
    surface (rudder), spanwise (world +X) for everything else. An explicit
    `hinge_axis` ('x'/'y'/'z') forces a specific column when needed.

    A single Unity bundle may pack several aircraft that share bone names (e.g.
    12 different planes each with a `BAileronL`). When `root_pid` is given, the
    bone under that aircraft's transform root is preferred so the surface always
    gets *its own* plane's hinge, not the first identically-named bone in the
    bundle. Falls back to the first name match if none share the root.
    """
    matches: list[int] = []
    for o in bundle.env.objects:
        if o.type.name != 'GameObject':
            continue
        go = o.read()
        if go.m_Name != part_name:
            continue
        tp = _transform_pid_of(go, bundle)
        if tp is not None:
            matches.append(tp)
    if not matches:
        return None

    transform_pid = None
    if root_pid is not None:
        for tp in matches:
            if transform_root(tp, bundle.transforms) == root_pid:
                transform_pid = tp
                break
    if transform_pid is None:
        transform_pid = matches[0]

    wm = _FLIP_X @ world_matrix(transform_pid, bundle.transforms, world_cache) @ _FLIP_X
    hinge_world = wm[:3, 3] * scale
    pivot_local = hinge_world + np.array([0.0, ground_offset_y, 0.0])

    def _norm(v: np.ndarray) -> np.ndarray:
        n = float(np.linalg.norm(v))
        return v / n if n > 1e-9 else np.array([1.0, 0.0, 0.0])

    cols = [_norm(wm[:3, i].copy()) for i in range(3)]
    ref = np.array([0.0, 1.0, 0.0]) if control == 'yaw' else np.array([1.0, 0.0, 0.0])
    if hinge_axis is not None:
        axis = cols[{'x': 0, 'y': 1, 'z': 2}.get(hinge_axis.lower(), 0)]
    else:
        axis = max(cols, key=lambda c: abs(float(c @ ref)))
    # Orient the sign so the dominant component is positive (+Y for yaw,
    # +X otherwise); the per-surface `sign` in the manifest is tuned against
    # this convention.
    if float(axis @ ref) < 0.0:
        axis = -axis
    return pivot_local, axis


def derive_gear_points(
    processed: list[dict],
    ground_part_names: list[str],
    translate: np.ndarray,
    bottom_percentile: float = 10.0,
) -> list[list[float]]:
    """FM2 spring contact points from each wheel mesh's lowest vertices."""
    part_by_name = {p['name']: p for p in processed}
    translate = np.asarray(translate, dtype=np.float64)
    points: list[list[float]] = []
    for name in ground_part_names:
        part = part_by_name.get(name)
        if part is None:
            print(f'WARNING: ground part "{name}" not found; skipping gear point.')
            continue
        v = part['world_v'] + translate
        y_contact = float(v[:, 1].min())
        y_thresh = float(np.percentile(v[:, 1], bottom_percentile))
        bottom = v[v[:, 1] <= y_thresh]
        if len(bottom) == 0:
            bottom = v
        x = float(bottom[:, 0].mean())
        z = float(bottom[:, 2].mean())
        points.append([round(x, 4), round(y_contact, 4), round(z, 4)])
    return points


def import_mod(cfg: dict) -> int:
    bundle_path = cfg['bundle']
    out = cfg['out']
    if not os.path.isabs(out):
        out = os.path.join(PROJECT_ROOT, out)
    buffer_prefix = cfg.get('bufferPrefix') or (
        os.path.splitext(os.path.basename(out))[0] + '_buffer_')
    ground_distance = float(cfg.get('groundDistance', 2.0))
    ground_contact_percentile = float(cfg.get('groundContactPercentile', 10.0))
    ground_contact_inset_m = float(cfg.get('groundContactInsetM', 0.0))
    scale = float(cfg.get('scale', 1.0))
    rotation_euler = cfg.get('rotationEuler')  # [x, y, z] degrees, or None
    swatch_max = int(cfg.get('swatchMax', DEFAULT_SWATCH_MAX))
    glass_color = cfg.get('glassColor', '#d1f7ff')
    glass_parts = tuple(cfg.get('glassParts', []))
    glass_auto_alpha = bool(cfg.get('glassAutoAlpha', True))
    glass_alpha_max = float(cfg.get('glassAlphaMax', 0.9))
    # Explicit per-material colour overrides: Unity material name -> '#rrggbb'
    # or a PaletteCategory name (e.g. 'GLASS'). Supersedes palette sampling.
    material_colors = dict(cfg.get('materialColors', {}))
    # groundParts is the general name; gearWheelParts kept as a back-compat alias.
    ground_part_names = list(cfg.get('groundParts', cfg.get('gearWheelParts', [])))
    ground_parts = set(ground_part_names)
    include_exact = set(cfg.get('includeExact', []))
    skip_parts = tuple(cfg.get('skipNameParts', []))
    skip_exact = set(cfg.get('skipExact', []))
    skip_materials = tuple(cfg.get('skipMaterials', DEFAULT_SKIP_MATERIALS))
    # A single Unity bundle may pack several aircraft that share part names
    # (e.g. many 'WingR'/'Cockpit'); they are separable only by material. When
    # set, only meshes whose renderer uses one of these materials are exported,
    # carving one plane out of a multi-plane bundle. Empty = include all.
    include_materials = set(cfg.get('includeMaterials', []))
    # Some bundles pack two overlapping copies of the same plane (e.g. a
    # flyable + a scenery prefab, or two liveries sharing one material). Left
    # in, they z-fight and the model looks broken. When true, only the first
    # mesh per unique GameObject name is kept, yielding one clean copy.
    dedupe_parts = bool(cfg.get('dedupeParts', False))
    seen_names: set[str] = set()
    # Optional greyscale remap. Some liveries bake heavy panel/camo shading into
    # their swatch texture, so sampling yields a high-contrast mix of near-black
    # and white faces. In a flat-shaded renderer the near-black regions read as
    # voids ("missing" fuselage/wings), and the plane is not the uniform grey a
    # jet should be. When enabled, every sampled colour is desaturated to its
    # luminance and remapped into a [lo, hi] grey band (lifting blacks, taming
    # whites), yielding a clean, fully-visible grey aircraft. Value: true (uses
    # the defaults) or {"lo": <0-255>, "hi": <0-255>}.
    grayscale_cfg = cfg.get('grayscale')
    if grayscale_cfg is True:
        gray_lo, gray_hi = 90, 205
    elif isinstance(grayscale_cfg, dict):
        gray_lo = int(grayscale_cfg.get('lo', 90))
        gray_hi = int(grayscale_cfg.get('hi', 205))
    else:
        grayscale_cfg = None
        gray_lo = gray_hi = 0

    def grayify(hexes: np.ndarray) -> np.ndarray:
        """Map an array of '#rrggbb' colours to greys in the [lo, hi] band.
        Non-hex entries (PaletteCategory names, e.g. 'GLASS') pass through."""
        if not grayscale_cfg:
            return hexes
        out = hexes.copy()
        for h in np.unique(hexes):
            s = str(h)
            if len(s) != 7 or s[0] != '#':
                continue
            try:
                r, g, b = int(s[1:3], 16), int(s[3:5], 16), int(s[5:7], 16)
            except ValueError:
                continue
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            v = int(round(gray_lo + (gray_hi - gray_lo) * (lum / 255.0)))
            v = max(0, min(255, v))
            out[hexes == h] = f'#{v:02x}{v:02x}{v:02x}'
        return out

    rotation_matrix = euler_matrix(rotation_euler) if rotation_euler else None

    bundle = Bundle(bundle_path)

    def is_glass(name: str, mat: dict | None) -> bool:
        if any(p in name for p in glass_parts):
            return True
        if glass_auto_alpha and mat is not None and mat['alpha'] < glass_alpha_max:
            return True
        return False

    def face_colors(name: str, mat: dict | None, face_t: np.ndarray,
                    uvs: np.ndarray | None, pal: np.ndarray | None) -> np.ndarray:
        # 1. Explicit per-material override wins.
        if mat is not None and mat['name'] in material_colors:
            res = np.full(len(face_t), material_colors[mat['name']])
        # 2. Glass: a PaletteCategory glass colour (e.g. 'GLASS') always renders
        # as one uniform material so the sim can tint/dither it; a literal
        # '#rrggbb' still samples per-poly tint when the glass has a swatch.
        elif is_glass(name, mat):
            if glass_color.startswith('#') and uvs is not None and pal is not None:
                res = sample_hex(pal, uvs[face_t].mean(axis=1))
            else:
                # A PaletteCategory glass colour is left untouched by the grey
                # remap so the sim keeps tinting/dithering it as glass.
                return np.full(len(face_t), glass_color)
        # 3. Palette-swatch sampled per face.
        elif pal is not None and uvs is not None:
            res = sample_hex(pal, uvs[face_t].mean(axis=1))
        # 4. Flat material colour, else neutral fallback.
        elif mat is not None and mat['color']:
            res = np.full(len(face_t), rgba01_to_hex(mat['color']))
        else:
            res = np.full(len(face_t), DEFAULT_MATERIAL)
        return grayify(res)

    def palette_array(mat: dict):
        if mat is None or not mat['main_tex']:
            return None
        tex = bundle.textures.get(mat['main_tex'])
        if tex is None or tex['array'] is None:
            return None
        if tex['w'] <= swatch_max and tex['h'] <= swatch_max:
            return tex['array']
        return None

    world_cache: dict[int, np.ndarray] = {}

    # A flyable mod additionally routes movable parts into per-surface + gear
    # sub-models and emits an aircraft manifest; absent, the classic single
    # static glTF is produced.
    flyable = cfg.get('flyable')
    surface_defs = flyable.get('surfaces', []) if flyable else []
    gear_names = set(flyable.get('gear', [])) if flyable else set()
    surface_of_part: dict[str, int] = {}
    for si, sd in enumerate(surface_defs):
        for pn in sd.get('parts', []):
            surface_of_part[pn] = si

    def colourable(name: str, sub_mat: dict | None, pal) -> bool:
        has_override = sub_mat is not None and sub_mat['name'] in material_colors
        return bool(has_override or is_glass(name, sub_mat)
                    or pal is not None or (sub_mat is not None and sub_mat['color']))

    # A multi-plane bundle shares generic glass materials (e.g. 'Canopy',
    # 'Glass') across every aircraft, so some transparent parts belong to the
    # target plane yet carry no livery material and are dropped by
    # includeMaterials (e.g. the F-16's separate 'CanopyBack' glass). When
    # rescueGlassUnderRoot is set, we first find the transform-hierarchy root(s)
    # of the livery-matched parts, then re-admit any glass (low-alpha) mesh that
    # lives under the same root -- capturing this plane's stray glass without
    # pulling in other planes' identically-named canopies.
    rescue_glass = bool(cfg.get('rescueGlassUnderRoot', False)) and bool(include_materials)

    def _root_of(tpid: int) -> int:
        return transform_root(tpid, bundle.transforms)

    def _has_glass_mat(pids) -> bool:
        return any(bundle.materials.get(pid, {}).get('alpha', 1.0) < glass_alpha_max
                   for pid in pids)

    matched_roots: set[int] = set()
    if rescue_glass:
        for o in bundle.env.objects:
            if o.type.name != 'GameObject':
                continue
            go = o.read()
            tpid = None
            mat_pids = []
            for comp in go.m_Component:
                co = bundle.by_path.get(comp.component.path_id)
                if co is None:
                    continue
                if co.type.name == 'Transform':
                    tpid = comp.component.path_id
                elif co.type.name == 'MeshRenderer':
                    tt = co.read_typetree()
                    mat_pids = [m['m_PathID'] for m in tt.get('m_Materials', [])]
            if tpid is not None and any(
                    bundle.materials.get(pid, {}).get('name', '') in include_materials
                    for pid in mat_pids):
                matched_roots.add(_root_of(tpid))

    processed: list[dict] = []
    ground_contact_y = None

    for o in bundle.env.objects:
        if o.type.name != 'GameObject':
            continue
        go = o.read()
        name = go.m_Name
        if not _should_include(name, include_exact, skip_parts, skip_exact):
            continue

        transform_pid = None
        mesh_filter = None
        mat_pids = []
        for comp in go.m_Component:
            co = bundle.by_path.get(comp.component.path_id)
            if co is None:
                continue
            tn = co.type.name
            if tn == 'Transform':
                transform_pid = comp.component.path_id
            elif tn == 'MeshFilter':
                mesh_filter = bundle.mesh_filters[comp.component.path_id]
            elif tn == 'MeshRenderer':
                tt = co.read_typetree()
                mat_pids = [m['m_PathID'] for m in tt.get('m_Materials', [])]

        if transform_pid is None or mesh_filter is None:
            continue
        mesh = bundle.meshes.get(mesh_filter.m_Mesh.path_id)
        if mesh is None:
            continue

        if not mat_pids:
            continue
        has_livery = (not include_materials) or any(
            bundle.materials.get(pid, {}).get('name', '') in include_materials
            for pid in mat_pids)
        rescued = (rescue_glass and not has_livery
                   and _root_of(transform_pid) in matched_roots
                   and _has_glass_mat(mat_pids))
        if include_materials and not has_livery and not rescued:
            continue
        if any(any(s in bundle.materials.get(pid, {}).get('name', '')
                   for s in skip_materials)
               for pid in mat_pids):
            continue
        if dedupe_parts:
            if name in seen_names:
                continue
            seen_names.add(name)

        verts, uvs, sub_faces, sub_face_t = mesh_geometry(mesh, mat_pids)
        if len(verts) == 0 or not sub_faces:
            continue

        wm = world_matrix(transform_pid, bundle.transforms, world_cache)
        wm = _FLIP_X @ wm @ _FLIP_X  # match the X-flip in mesh.export()
        world_v = (wm @ np.c_[verts, np.ones(len(verts))].T).T[:, :3] * scale
        if rotation_matrix is not None:
            world_v = world_v @ rotation_matrix.T

        if name in ground_parts:
            ys = world_v[:, 1]
            contact = float(np.percentile(ys, ground_contact_percentile))
            contact -= ground_contact_inset_m
            ground_contact_y = (contact if ground_contact_y is None
                                else max(ground_contact_y, contact))

        sub_mats = [bundle.materials.get(mat_pids[si if si < len(mat_pids) else 0])
                    for si in range(len(sub_faces))]
        processed.append({
            'name': name, 'world_v': world_v, 'uvs': uvs,
            'sub_faces': sub_faces, 'sub_face_t': sub_face_t, 'sub_mats': sub_mats,
            'tpid': transform_pid,
        })

    if not processed:
        raise SystemExit('No colourable meshes found. Try --list to inspect the bundle.')

    if ground_contact_y is None:
        ground_contact_y = min(float(p['world_v'][:, 1].min()) for p in processed)
    ground_min_y = ground_contact_y
    ground_offset_y = -ground_distance - ground_min_y

    def build_buckets(parts, translate) -> dict[str, list[np.ndarray]]:
        buckets: dict[str, list[np.ndarray]] = defaultdict(list)
        for p in parts:
            for si, face_v in enumerate(p['sub_faces']):
                sub_mat = p['sub_mats'][si]
                if sub_mat and any(s in sub_mat['name'] for s in skip_materials):
                    continue
                pal = palette_array(sub_mat)
                if not colourable(p['name'], sub_mat, pal):
                    continue
                face_t = p['sub_face_t'][si]
                tri_corners = p['world_v'][face_v] + translate
                keys = face_colors(p['name'], sub_mat, face_t, p['uvs'], pal)
                for key in np.unique(keys):
                    buckets[str(key)].append(tri_corners[keys == key].reshape(-1, 3))
        return buckets

    def emit(parts, translate, out_path, buffer_prefix) -> list[str]:
        buckets = build_buckets(parts, np.asarray(translate, dtype=np.float64))
        if not buckets:
            return []
        scene = trimesh.Scene()
        for idx, (key, tris) in enumerate(buckets.items()):
            v = np.vstack(tris)
            f = np.arange(len(v), dtype=np.int64).reshape(-1, 3)
            m = trimesh.Trimesh(vertices=v, faces=f, process=False)
            # Degenerate (zero-area) faces yield zero-length normals that trimesh
            # normalises to NaN. Those NaNs land in the NORMAL accessor's min/max,
            # and Python's json.dump happily writes the literal `NaN` -- which is
            # invalid JSON, so the browser's JSON.parse (and thus GLTFLoader)
            # rejects the entire file and the mesh silently fails to load. Replace
            # any non-finite normal with a safe up-vector before export.
            n = np.asarray(m.vertex_normals, dtype=np.float64)
            bad = ~np.isfinite(n).all(axis=1)
            if bad.any():
                n = n.copy()
                n[bad] = (0.0, 1.0, 0.0)
                m.vertex_normals = n
            m.visual = trimesh.visual.TextureVisuals(
                material=trimesh.visual.material.PBRMaterial(name=key))
            scene.add_geometry(m, node_name=f'0_{idx}_{key}', geom_name=f'{idx}_{key}')
        _write_gltf(scene, out_path, buffer_prefix)
        return sorted(buckets)

    def emit_shadow(parts, translate, out_path, buffer_prefix) -> bool:
        """Flattened planform silhouette (aircraft-local y=0) as a single grey mesh."""
        tris = []
        translate = np.asarray(translate, dtype=np.float64)
        for p in parts:
            for si, face_v in enumerate(p['sub_faces']):
                sub_mat = p['sub_mats'][si]
                if sub_mat and any(s in sub_mat['name'] for s in skip_materials):
                    continue
                v = p['world_v'][face_v].reshape(-1, 3).copy() + translate
                v[:, 1] = 0.0
                tris.append(v)
        if not tris:
            return False
        v = np.vstack(tris)
        f = np.arange(len(v), dtype=np.int64).reshape(-1, 3)
        m = trimesh.Trimesh(vertices=v, faces=f, process=False)
        m.vertex_normals = np.tile([0.0, 1.0, 0.0], (len(v), 1))
        m.visual = trimesh.visual.TextureVisuals(
            material=trimesh.visual.material.PBRMaterial(name=SHADOW_MATERIAL))
        scene = trimesh.Scene()
        scene.add_geometry(m, node_name=f'0_0_{SHADOW_MATERIAL}',
                           geom_name=f'0_{SHADOW_MATERIAL}')
        _write_gltf(scene, out_path, buffer_prefix)
        return True

    def bp(path: str) -> str:
        return os.path.splitext(os.path.basename(path))[0] + '_buffer_'

    def rel(path: str) -> str:
        return os.path.relpath(path, PROJECT_ROOT).replace('\\', '/')

    ground_translate = [0.0, ground_offset_y, 0.0]

    if not flyable:
        keys = emit(processed, ground_translate, out, buffer_prefix)
        print(f'Wrote {out}')
        print(f'Parts: {len(processed)}, colours/materials: {len(keys)}')
        print('  ' + ', '.join(keys))
        print(f'ground_min_y: {ground_min_y:.3f}, ground_offset_y: {ground_offset_y:.3f}')
        return 0

    available = {p['name'] for p in processed}
    if not surface_defs and flyable.get('autoSurfaces', True) is not False:
        surface_defs = auto_surface_defs(available)
        if surface_defs:
            print(f'Auto-detected {len(surface_defs)} control surface(s): '
                  + ', '.join(sd['role'] for sd in surface_defs))
    if not gear_names and flyable.get('autoGear', True) is not False:
        detected_gear = auto_gear_names(available)
        if detected_gear:
            gear_names = detected_gear
            print(f'Auto-detected {len(gear_names)} gear part(s)')

    # ---- Flyable: split into body / per-surface / gear sub-models + manifest.
    out_dir = os.path.dirname(out)
    stem = os.path.splitext(os.path.basename(out))[0]
    if stem.endswith('_static'):
        stem = stem[:-len('_static')]
    prefix = flyable.get('outPrefix') or os.path.join(out_dir, stem)
    if not os.path.isabs(prefix):
        prefix = os.path.join(PROJECT_ROOT, prefix)

    surface_parts = set(surface_of_part.keys())
    body_parts = [p for p in processed
                  if p['name'] not in surface_parts and p['name'] not in gear_names]
    gear_parts = [p for p in processed if p['name'] in gear_names]

    body_path = f'{prefix}_body.gltf'
    body_keys = emit(body_parts, ground_translate, body_path, bp(body_path))
    print(f'Wrote {body_path} ({len(body_keys)} colours)')

    gear_manifest = None
    if gear_parts:
        gear_path = f'{prefix}_gear.gltf'
        gear_keys = emit(gear_parts, ground_translate, gear_path, bp(gear_path))
        if gear_keys:
            gear_manifest = rel(gear_path)
            print(f'Wrote {gear_path} ({len(gear_keys)} colours)')

    def unit(v) -> np.ndarray:
        v = np.asarray(v, dtype=np.float64)
        n = float(np.linalg.norm(v))
        return v / n if n > 1e-9 else np.array([1.0, 0.0, 0.0])

    surfaces_manifest = []
    for si, sd in enumerate(surface_defs):
        members = [p for pn in sd.get('parts', []) for p in processed if p['name'] == pn]
        if not members:
            print(f'WARNING: surface "{sd.get("role", si)}" matched no parts; skipping.')
            continue
        control = sd.get('control', 'pitch')
        role = sd.get('role', f'surf{si}')

        # A bundle may pack many planes sharing bone names, so resolve the hinge
        # bone within the same aircraft hierarchy (transform root) as this
        # surface's own mesh -- otherwise a left surface can grab another plane's
        # identically-named bone and hinge about the wrong axis/pivot.
        member_tpid = next((p.get('tpid') for p in members if p.get('tpid') is not None), None)
        surface_root = _root_of(member_tpid) if member_tpid is not None else None

        # Hinge frame: an explicit `hingePart` bone, else -- unless disabled via
        # `autoHinge: false` -- an auto-discovered bone following the mod's
        # `B`+partName convention (e.g. Rudder -> BRudder, SlatsL -> BSlatsL).
        # This lets any well-authored mod get its true (often tilted) hinge axis
        # and pivot with no per-surface config.
        hinge_part = sd.get('hingePart')
        hinge_frame = None
        if hinge_part:
            hinge_frame = hinge_frame_from_part(
                bundle, hinge_part, world_cache, scale, ground_offset_y,
                control, sd.get('hingeAxis'), surface_root,
            )
            if hinge_frame is None:
                print(f'WARNING: hingePart "{hinge_part}" for surface "{role}" not found; '
                      'falling back to geometry pivot.')
        elif sd.get('autoHinge', True) and sd.get('parts'):
            bone_prefix = cfg.get('hingeBonePrefix', 'B')
            hinge_part = bone_prefix + sd['parts'][0]
            hinge_frame = hinge_frame_from_part(
                bundle, hinge_part, world_cache, scale, ground_offset_y,
                control, sd.get('hingeAxis'), surface_root,
            )
            if hinge_frame is not None:
                print(f'  auto hinge bone "{hinge_part}" for surface "{role}"')

        # Hinge axis: explicit override, else bone local axis, else spanwise
        # flap surfaces and vertical (UP) for the rudder.
        if 'axis' in sd:
            axis = unit(sd['axis'])
        elif hinge_frame is not None:
            axis = unit(hinge_frame[1])
        else:
            axis = np.array([1.0, 0.0, 0.0]) if control != 'yaw' else np.array([0.0, 1.0, 0.0])

        # Hinge pivot (aircraft-local frame). Baked-geometry mods carry no useful
        # per-part transform, so derive it from the part geometry: the spanwise/
        # vertical centre at the hinge edge; trailing-edge controls (flaps,
        # ailerons, etc.) use max +Z; leading-edge slats use min +Z. `pivot` may
        # override it.
        if 'pivot' in sd:
            pivot_local = np.asarray(sd['pivot'], dtype=np.float64)
            translate = np.array([0.0, ground_offset_y, 0.0]) - pivot_local
        elif hinge_frame is not None:
            pivot_local = hinge_frame[0]
            translate = np.array([0.0, ground_offset_y, 0.0]) - pivot_local
        else:
            member_v = np.vstack([p['world_v'] for p in members])
            hinge_z = float(member_v[:, 2].min()) if control == 'slats' else float(member_v[:, 2].max())
            pivot_world = np.array([
                float(member_v[:, 0].mean()),
                float(member_v[:, 1].mean()),
                hinge_z,
            ])
            pivot_local = pivot_world + np.array([0.0, ground_offset_y, 0.0])
            translate = -pivot_world

        surf_path = f'{prefix}_surf_{role}.gltf'
        surf_keys = emit(members, translate, surf_path, bp(surf_path))
        if not surf_keys:
            print(f'WARNING: surface "{role}" produced no geometry; skipping.')
            continue
        surfaces_manifest.append({
            'role': role,
            'path': rel(surf_path),
            'pivot': [round(float(x), 4) for x in pivot_local],
            'axis': [round(float(x), 4) for x in axis],
            'control': control,
            'sign': sd.get('sign', 1),
            'rangeRad': sd.get('rangeRad', float(np.pi / 6)),
        })
        print(f'Wrote {surf_path} (pivot={pivot_local.round(2).tolist()} axis={axis.round(2).tolist()})')

    # Flattened planform shadow in the same aircraft-local frame as the body.
    shadow_path = f'{prefix}_shadow.gltf'
    shadow_manifest = (rel(shadow_path)
                       if emit_shadow(processed, ground_translate, shadow_path, bp(shadow_path))
                       else None)
    if shadow_manifest:
        print(f'Wrote {shadow_path}')

    flight = dict(cfg.get('flight') or {})
    ground_rest_height_m = ground_distance
    if ground_part_names and flight:
        gear_cfg = dict(flight.get('gear') or {})
        derived = derive_gear_points(
            processed, ground_part_names, np.asarray(ground_translate),
            bottom_percentile=ground_contact_percentile,
        )
        if derived:
            gear_cfg['points'] = derived
            flight['gear'] = gear_cfg
            ground_rest_height_m = -min(p[1] for p in derived)
            print(f'Gear contact points: {derived}')

    manifest = {
        'name': cfg.get('name', stem),
        'body': rel(body_path),
        'shadow': shadow_manifest,
        'gear': gear_manifest,
        'static': rel(out),
        'surfaces': surfaces_manifest,
        'fx': flyable.get('fx', {'nozzles': None, 'wingtips': None}),
        'cockpitOffset': flyable.get('cockpitOffset', [0.0, 1.0, 4.0]),
        'spawn': flyable.get('spawn', {}),
        'groundOffsetY': round(float(ground_offset_y), 4),
        'groundRestHeightM': round(float(ground_rest_height_m), 4),
        'flight': flight or None,
    }
    manifest_path = f'{prefix}.aircraft.json'
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    print(f'Wrote {manifest_path}')

    static_keys = emit(processed, ground_translate, out, buffer_prefix)
    if static_keys:
        print(f'Wrote {out} ({len(static_keys)} colours)')

    print(f'Parts: {len(processed)} (body {len(body_parts)}, '
          f'gear {len(gear_parts)}, surfaces {len(surfaces_manifest)})')
    print(f'ground_min_y: {ground_min_y:.3f}, ground_offset_y: {ground_offset_y:.3f}')
    return 0


def _hex_to_factor(key: str):
    if key.startswith('#') and len(key) == 7:
        return [int(key[1:3], 16) / 255.0, int(key[3:5], 16) / 255.0,
                int(key[5:7], 16) / 255.0, 1.0]
    return [1.0, 1.0, 1.0, 1.0]


def _write_gltf(scene: trimesh.Scene, out: str, buffer_prefix: str):
    export = scene.export(file_type='gltf')
    gltf = json.loads(export['model.gltf'].decode('utf-8'))

    mesh_key: dict[int, str] = {}
    for node in gltf.get('nodes', []):
        nm = node.get('name', '')
        if node.get('mesh') is not None and nm.startswith('0_'):
            mesh_key[node['mesh']] = nm.split('_', 2)[2]

    material_index: dict[str, int] = {}
    mats: list[dict] = []
    for mi, mesh_def in enumerate(gltf.get('meshes', [])):
        key = mesh_key.get(mi, DEFAULT_MATERIAL)
        if key not in material_index:
            material_index[key] = len(mats)
            mats.append({'name': key,
                         'pbrMetallicRoughness': {'baseColorFactor': _hex_to_factor(key)}})
        for prim in mesh_def.get('primitives', []):
            prim['material'] = material_index[key]
    gltf['materials'] = mats

    # Flatten node hierarchy: every mesh is a direct scene root (like the F-22),
    # not wrapped under trimesh's 'world' parent node.
    flat_nodes = [{'name': n.get('name', ''), 'mesh': n['mesh']}
                  for n in gltf.get('nodes', []) if n.get('mesh') is not None]
    gltf['nodes'] = flat_nodes

    # LOD scene 0 holds every mesh node; scenes 1..5 are empty LOD levels.
    gltf['scenes'][0]['name'] = '0'
    gltf['scenes'][0]['nodes'] = list(range(len(flat_nodes)))
    for lod in range(1, 6):
        gltf['scenes'].append({'name': str(lod), 'nodes': []})

    out_dir = os.path.dirname(out)
    os.makedirs(out_dir, exist_ok=True)

    # Pair each buffer with its own exporter key via the existing uri. Do NOT
    # sort keys lexicographically: trimesh emits gltf_buffer_10.bin etc, which
    # would sort before gltf_buffer_2.bin and scramble buffer contents.
    for i, buf in enumerate(gltf['buffers']):
        with open(os.path.join(out_dir, f'{buffer_prefix}{i}.bin'), 'wb') as f:
            f.write(export[buf['uri']])
        buf['uri'] = f'{buffer_prefix}{i}.bin'

    # Defensive guard: glTF is JSON, and browsers reject the non-standard `NaN`
    # /`Infinity` literals that Python's json.dump emits. Scrub any non-finite
    # accessor bounds (they are only hints) so a stray degenerate value can never
    # again produce a file that parses in Python but fails in the browser.
    for acc in gltf.get('accessors', []):
        for bound in ('min', 'max'):
            vals = acc.get(bound)
            if vals is not None and any(not math.isfinite(x) for x in vals):
                acc[bound] = [0.0 if not math.isfinite(x) else x for x in vals]

    with open(out, 'w', encoding='utf-8') as f:
        json.dump(gltf, f, indent=2, allow_nan=False)


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def load_config(path: str) -> dict:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description='Import a Unity asset-bundle mod into a retroflightsim glTF.')
    ap.add_argument('--config', help='JSON config file (see tools/mods/a4e.json).')
    ap.add_argument('--bundle', help='Path to a mod .zip, a Unity asset bundle file, or a folder.')
    ap.add_argument('--out', help='Output .gltf path (relative to project root).')
    ap.add_argument('--ground', type=float, help='Distance from origin to ground (default 2.0).')
    ap.add_argument('--scale', type=float, help='Uniform scale applied to geometry.')
    ap.add_argument('--rotate', help='XYZ Euler rotation in degrees, e.g. "0,180,0", to reorient the model.')
    ap.add_argument('--swatch-max', type=int, help='Max texture size (px) treated as a palette swatch.')
    ap.add_argument('--list', action='store_true', help='List textures/materials/objects and exit.')
    ap.add_argument('--discover', action='store_true',
                    help='List distinct aircraft liveries (JSON) and exit.')
    args = ap.parse_args(argv)

    cfg: dict = load_config(args.config) if args.config else {}
    if args.bundle:
        cfg['bundle'] = args.bundle
    if args.out:
        cfg['out'] = args.out
    if args.ground is not None:
        cfg['groundDistance'] = args.ground
    if args.scale is not None:
        cfg['scale'] = args.scale
    if args.rotate is not None:
        cfg['rotationEuler'] = [float(x) for x in args.rotate.split(',')]
    if args.swatch_max is not None:
        cfg['swatchMax'] = args.swatch_max

    if 'bundle' not in cfg:
        ap.error('a bundle is required (via --bundle or --config)')

    if args.discover:
        print(json.dumps(discover_livery_materials(cfg['bundle']), indent=2))
        return 0

    if args.list:
        list_bundle(Bundle(cfg['bundle']))
        return 0

    if 'out' not in cfg:
        ap.error('an output path is required (via --out or --config)')

    return import_mod(cfg)


if __name__ == '__main__':
    raise SystemExit(main())
