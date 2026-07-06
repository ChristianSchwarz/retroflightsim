"""Import a Unity asset-bundle aircraft/vehicle mod into a retroflightsim glTF.

Many low-poly flight-sim mods (e.g. the Tiny Combat Arena A-4E) do not use
detail textures. Their whole livery -- paint, insignia, side numbers, trim --
is authored as flat polygon "vector decals" whose colours come from a tiny
palette-swatch texture: every triangle's UVs point at one solid-colour cell.

This tool recovers those real per-polygon colours by sampling the palette
texture at each face's UV centroid, groups faces by colour, and writes a glTF
with one mesh/material per distinct colour. Each material is named '#rrggbb' so
the sim renders that literal colour (see ModelManager.rawColorFor) instead of
mapping it to a PaletteCategory. Transparent glass keeps the GLASS category.

The --bundle input may be a mod .zip (e.g. a Tiny Combat Arena workshop
download), a raw Unity asset bundle file, or a folder; a .zip is unpacked and
the Unity bundle inside is located automatically.

Usage:
    # Inspect a mod (list GameObjects, materials, textures) before importing:
    python tools/import_mod.py --bundle "C:/Downloads/3617819835_A-4E_Skyhawk.zip" --list

    # Import using a JSON config (see tools/mods/a4e.json):
    python tools/import_mod.py --config tools/mods/a4e.json

    # Import straight from the CLI with auto-detection:
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


# --------------------------------------------------------------------------- #
# Mesh / material parsing
# --------------------------------------------------------------------------- #
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
        print(f'  {m["name"]:24s} tex={texname:20s} color={col} alpha={m["alpha"]:.2f}')
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
def _should_include(name: str, include_exact, skip_parts) -> bool:
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
    scale = float(cfg.get('scale', 1.0))
    swatch_max = int(cfg.get('swatchMax', DEFAULT_SWATCH_MAX))
    gear_parts = set(cfg.get('gearWheelParts', []))
    glass_parts = tuple(cfg.get('glassParts', []))
    include_exact = set(cfg.get('includeExact', []))
    skip_parts = tuple(cfg.get('skipNameParts', []))
    skip_materials = tuple(cfg.get('skipMaterials', DEFAULT_SKIP_MATERIALS))

    bundle = Bundle(bundle_path)

    def is_glass(name: str, mat: dict) -> bool:
        if any(p in name for p in glass_parts):
            return True
        return mat is not None and mat['alpha'] < 0.9

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
    buckets: dict[str, list[np.ndarray]] = defaultdict(list)
    gear_min_y = None
    part_count = 0

    for o in bundle.env.objects:
        if o.type.name != 'GameObject':
            continue
        go = o.read()
        name = go.m_Name
        if not _should_include(name, include_exact, skip_parts):
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

        primary_mat = bundle.materials.get(mat_pids[0]) if mat_pids else None
        if primary_mat and any(s in primary_mat['name'] for s in skip_materials):
            continue

        glass = is_glass(name, primary_mat)
        pal = None if glass else palette_array(primary_mat)
        # Skip parts we cannot colour (no palette, no usable flat colour, not glass).
        if not glass and pal is None and (primary_mat is None or not primary_mat['color']):
            continue

        verts, uvs, face_v, face_t = parse_obj(mesh.export())
        if len(verts) == 0 or len(face_v) == 0:
            continue

        mat = world_matrix(transform_pid, bundle.transforms, world_cache)
        world_v = (mat @ np.c_[verts, np.ones(len(verts))].T).T[:, :3] * scale

        if name in gear_parts:
            wmin = float(world_v[:, 1].min())
            gear_min_y = wmin if gear_min_y is None else min(gear_min_y, wmin)

        tri_corners = world_v[face_v]  # (F, 3, 3)

        if glass:
            keys = np.full(len(face_v), GLASS_CATEGORY)
        elif pal is not None and uvs is not None:
            keys = sample_hex(pal, uvs[face_t].mean(axis=1))
        else:
            keys = np.full(len(face_v), rgba01_to_hex(primary_mat['color']))

        for key in np.unique(keys):
            buckets[str(key)].append(tri_corners[keys == key].reshape(-1, 3))

        part_count += 1

    if not buckets:
        raise SystemExit('No colourable meshes found. Try --list to inspect the bundle.')

    if gear_min_y is None:
        gear_min_y = min(min(t[:, 1].min() for t in tris) for tris in buckets.values())
    ground_offset_y = -ground_distance - gear_min_y

    scene = trimesh.Scene()
    for idx, (key, tris) in enumerate(buckets.items()):
        v = np.vstack(tris)
        f = np.arange(len(v), dtype=np.int64).reshape(-1, 3)
        m = trimesh.Trimesh(vertices=v, faces=f, process=False)
        m.apply_translation([0, ground_offset_y, 0])
        _ = m.vertex_normals
        m.visual = trimesh.visual.TextureVisuals(
            material=trimesh.visual.material.PBRMaterial(name=key))
        scene.add_geometry(m, node_name=f'0_{idx}_{key}', geom_name=f'{idx}_{key}')

    _write_gltf(scene, out, buffer_prefix)

    print(f'Wrote {out}')
    print(f'Parts: {part_count}, colours/materials: {len(buckets)}')
    print('  ' + ', '.join(sorted(buckets)))
    print(f'gear_min_y: {gear_min_y:.3f}, ground_offset_y: {ground_offset_y:.3f}')
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
