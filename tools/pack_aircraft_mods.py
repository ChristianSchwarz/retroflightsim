"""Pack flyable aircraft mods into single .aircraft.pack files for dist."""
from __future__ import annotations

import json
import os
import zipfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = PROJECT_ROOT / 'assets'
DIST_ASSETS = PROJECT_ROOT / 'dist' / 'assets'


def pack_relative(path: str) -> str:
    p = path.replace('\\', '/')
    if p.startswith('assets/'):
        return p[len('assets/'):]
    return os.path.basename(p)


def resolve_gltf_uri(gltf_rel: str, uri: str) -> str | None:
    if uri.startswith('data:'):
        return None
    base_dir = os.path.dirname(gltf_rel)
    if base_dir:
        return os.path.normpath(os.path.join(base_dir, uri)).replace('\\', '/')
    return uri


def gltf_buffer_uris(gltf_rel: str, gltf_path: Path) -> list[str]:
    with open(gltf_path, encoding='utf-8') as f:
        gltf = json.load(f)
    uris: list[str] = []
    for buf in gltf.get('buffers', []):
        uri = buf.get('uri')
        if uri:
            resolved = resolve_gltf_uri(gltf_rel, uri)
            if resolved:
                uris.append(resolved)
    return uris


def collect_manifest_paths(manifest: dict) -> list[str]:
    paths = [manifest['body'], manifest['shadow']]
    if manifest.get('gear'):
        paths.append(manifest['gear'])
    if manifest.get('static'):
        paths.append(manifest['static'])
    for surface in manifest.get('surfaces', []):
        paths.append(surface['path'])
    return paths


def collect_files(manifest_path: Path) -> tuple[set[str], dict, str]:
    mod_id = manifest_path.name[:-len('.aircraft.json')]
    with open(manifest_path, encoding='utf-8') as f:
        manifest = json.load(f)

    files: set[str] = set()
    pending = [pack_relative(p) for p in collect_manifest_paths(manifest)]

    static_gltf = f'{mod_id}_static.gltf'
    if (ASSETS_DIR / static_gltf).exists() and static_gltf not in pending:
        pending.append(static_gltf)

    while pending:
        rel = pending.pop()
        if rel in files:
            continue
        asset_path = ASSETS_DIR / rel
        if not asset_path.exists():
            raise FileNotFoundError(f'Missing asset for {manifest_path.name}: {rel}')
        files.add(rel)
        if rel.endswith('.gltf'):
            for buf_rel in gltf_buffer_uris(rel, asset_path):
                if buf_rel not in files:
                    pending.append(buf_rel)

    return files, manifest, mod_id


def rewrite_manifest(manifest: dict, mod_id: str, files: set[str]) -> dict:
    out = dict(manifest)
    out['body'] = pack_relative(manifest['body'])
    out['shadow'] = pack_relative(manifest['shadow'])
    if manifest.get('gear'):
        out['gear'] = pack_relative(manifest['gear'])
    static_rel = f'{mod_id}_static.gltf'
    if static_rel in files:
        out['static'] = static_rel
    elif manifest.get('static'):
        out['static'] = pack_relative(manifest['static'])
    out['surfaces'] = [
        {**surface, 'path': pack_relative(surface['path'])}
        for surface in manifest.get('surfaces', [])
    ]
    return out


def cleanup_loose_mod_files(mod_id: str) -> None:
    if not DIST_ASSETS.exists():
        return
    for path in DIST_ASSETS.iterdir():
        name = path.name
        if not path.is_file():
            continue
        if name == f'{mod_id}.aircraft.pack':
            continue
        if name == f'{mod_id}.aircraft.json' or name.startswith(f'{mod_id}_'):
            path.unlink()


def pack_mod(manifest_path: Path) -> None:
    files, manifest, mod_id = collect_files(manifest_path)
    pack_manifest = rewrite_manifest(manifest, mod_id, files)

    DIST_ASSETS.mkdir(parents=True, exist_ok=True)
    out_path = DIST_ASSETS / f'{mod_id}.aircraft.pack'

    with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.writestr('manifest.json', json.dumps(pack_manifest, indent=2))
        for rel in sorted(files):
            zf.write(ASSETS_DIR / rel, rel)

    size = out_path.stat().st_size
    cleanup_loose_mod_files(mod_id)
    print(f'Wrote {out_path} ({len(files) + 1} entries, {size:,} bytes)')


def main() -> int:
    manifests = sorted(ASSETS_DIR.glob('*.aircraft.json'))
    if not manifests:
        print('No aircraft manifests found in assets/')
        return 0
    for manifest_path in manifests:
        pack_mod(manifest_path)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
