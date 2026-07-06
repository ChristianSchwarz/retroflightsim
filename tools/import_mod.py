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
import os
import shutil
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
        print(f'Extracted asset bundle "{chosen.filename}" from {os.path.basename(path)}')
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


# --------------------------------------------------------------------------- #
# Import
# --------------------------------------------------------------------------- #
def _should_include(name: str, include_exact, skip_parts, skip_exact) -> bool:
    if name in skip_exact:
        return False
    if name in include_exact:
        return True
    return not any(part in name for part in skip_parts)


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
    ground_parts = set(cfg.get('groundParts', cfg.get('gearWheelParts', [])))
    include_exact = set(cfg.get('includeExact', []))
    skip_parts = tuple(cfg.get('skipNameParts', []))
    skip_exact = set(cfg.get('skipExact', []))
    skip_materials = tuple(cfg.get('skipMaterials', DEFAULT_SKIP_MATERIALS))

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
            return np.full(len(face_t), material_colors[mat['name']])
        # 2. Glass: a PaletteCategory glass colour (e.g. 'GLASS') always renders
        # as one uniform material so the sim can tint/dither it; a literal
        # '#rrggbb' still samples per-poly tint when the glass has a swatch.
        if is_glass(name, mat):
            if glass_color.startswith('#') and uvs is not None and pal is not None:
                return sample_hex(pal, uvs[face_t].mean(axis=1))
            return np.full(len(face_t), glass_color)
        # 3. Palette-swatch sampled per face.
        if pal is not None and uvs is not None:
            return sample_hex(pal, uvs[face_t].mean(axis=1))
        # 4. Flat material colour, else neutral fallback.
        if mat is not None and mat['color']:
            return np.full(len(face_t), rgba01_to_hex(mat['color']))
        return np.full(len(face_t), DEFAULT_MATERIAL)

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
        if any(any(s in bundle.materials.get(pid, {}).get('name', '')
                   for s in skip_materials)
               for pid in mat_pids):
            continue

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
            _ = m.vertex_normals
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

        # Hinge axis: explicit override, else spanwise (RIGHT) for pitch/roll/
        # flap surfaces and vertical (UP) for the rudder.
        if 'axis' in sd:
            axis = unit(sd['axis'])
        else:
            axis = np.array([1.0, 0.0, 0.0]) if control != 'yaw' else np.array([0.0, 1.0, 0.0])

        # Hinge pivot (aircraft-local frame). Baked-geometry mods carry no useful
        # per-part transform, so derive it from the part geometry: the spanwise/
        # vertical centre at the forward (nose-ward, max +Z) edge of the surface,
        # which is where a trailing-edge control hinges. `pivot` may override it.
        if 'pivot' in sd:
            pivot_local = np.asarray(sd['pivot'], dtype=np.float64)
            translate = np.array([0.0, ground_offset_y, 0.0]) - pivot_local
        else:
            member_v = np.vstack([p['world_v'] for p in members])
            pivot_world = np.array([
                float(member_v[:, 0].mean()),
                float(member_v[:, 1].mean()),
                float(member_v[:, 2].max()),
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

    manifest = {
        'name': cfg.get('name', stem),
        'body': rel(body_path),
        'shadow': shadow_manifest,
        'gear': gear_manifest,
        'surfaces': surfaces_manifest,
        'fx': flyable.get('fx', {'nozzles': None, 'wingtips': None}),
        'cockpitOffset': flyable.get('cockpitOffset', [0.0, 1.0, 4.0]),
        'spawn': flyable.get('spawn', {}),
        'groundOffsetY': round(float(ground_offset_y), 4),
        'flight': cfg.get('flight'),
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

    with open(out, 'w', encoding='utf-8') as f:
        json.dump(gltf, f, indent=2)


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

    if args.list:
        list_bundle(Bundle(cfg['bundle']))
        return 0

    if 'out' not in cfg:
        ap.error('an output path is required (via --out or --config)')

    return import_mod(cfg)


if __name__ == '__main__':
    raise SystemExit(main())
