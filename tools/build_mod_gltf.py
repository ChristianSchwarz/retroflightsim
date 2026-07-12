"""Build a mod's static glTF from its Unity asset bundle.

This is a thin wrapper around the general mod importer. The mod-specific
settings live in tools/mods/mod.json. To import other mods, use import_mod.py
directly (see its module docstring) rather than copying this file.

    python tools/build_mod_gltf.py
    # equivalent to:
    python tools/import_mod.py --config tools/mods/mod.json
"""
import os

from import_mod import import_mod, load_config

CONFIG = os.path.join(os.path.dirname(__file__), 'mods', 'mod.json')

if __name__ == '__main__':
    raise SystemExit(import_mod(load_config(CONFIG)))
