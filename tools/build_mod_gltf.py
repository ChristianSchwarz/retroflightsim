"""Build the A-4E static glTF from its Unity asset bundle.

This is a thin wrapper around the general mod importer. The A-4E-specific
settings live in tools/mods/a4e.json. To import other mods, use import_mod.py
directly (see its module docstring) rather than copying this file.

    python tools/build_a4e_gltf.py
    # equivalent to:
    python tools/import_mod.py --config tools/mods/a4e.json
"""
import os

from import_mod import import_mod, load_config

CONFIG = os.path.join(os.path.dirname(__file__), 'mods', 'a4e.json')

if __name__ == '__main__':
    raise SystemExit(import_mod(load_config(CONFIG)))
