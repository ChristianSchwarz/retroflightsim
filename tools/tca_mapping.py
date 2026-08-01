"""Canonical Tiny Combat Arena part/material naming for tools/import_mod.py.

Loads tools/tca_mapping.json (doc-aligned conventions from docs/tca-aircraft-mods.md).
Import config keys (glassParts, nozzleParts, skipNameParts, …) extend the base
mapping at runtime via merge_config_overrides().
"""
from __future__ import annotations

import json
import os
from copy import deepcopy
from dataclasses import dataclass
from typing import Any

_MAPPING_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tca_mapping.json')

_BASE: dict[str, Any] | None = None


def _load_base() -> dict[str, Any]:
    global _BASE
    if _BASE is None:
        with open(_MAPPING_PATH, encoding='utf-8') as f:
            _BASE = json.load(f)
    return _BASE


@dataclass
class MaterialClass:
    action: str | None = None
    palette_category: str | None = None


@dataclass
class PartCategorySpec:
    exact: tuple[str, ...] = ()
    substring: tuple[str, ...] = ()
    prefix: tuple[str, ...] = ()
    exclude_substring: tuple[str, ...] = ()
    substring_all: tuple[tuple[str, ...], ...] = ()


@dataclass
class SurfaceRule:
    part_names: tuple[str, ...]
    role: str
    control: str
    sign: int
    range_rad: float


@dataclass
class TcaMapping:
    shared_materials: dict[str, MaterialClass]
    part_categories: dict[str, PartCategorySpec]
    surface_rules: list[SurfaceRule]
    rudder_fallback: SurfaceRule | None
    animated_part_fields: list[tuple[str, str]]
    livery_skip_material_substrings: tuple[str, ...]
    livery_name_substrings_lower: tuple[str, ...]
    livery_weapon_substrings_lower: tuple[str, ...]
    gear_clip_skip_exact: tuple[str, ...]
    gear_clip_skip_substring: tuple[str, ...]
    gear_mandatory_bones: tuple[str, ...]
    hinge_bone_prefix: str
    skip_material_substrings: tuple[str, ...] = (
        'Collider', 'ShadowDepthOffset', 'Shadow',
    )


def _part_spec(raw: dict | None) -> PartCategorySpec:
    if not raw:
        return PartCategorySpec()
    substring_all = tuple(tuple(g) for g in raw.get('substringAll', []))
    clip_skip = raw.get('clipSkip') or {}
    return PartCategorySpec(
        exact=tuple(raw.get('exact', [])),
        substring=tuple(raw.get('substring', [])),
        prefix=tuple(raw.get('prefix', [])),
        exclude_substring=tuple(raw.get('excludeSubstring', [])),
        substring_all=substring_all,
    )


def _parse_mapping(data: dict[str, Any]) -> TcaMapping:
    shared: dict[str, MaterialClass] = {}
    for name, spec in (data.get('sharedMaterials') or {}).items():
        shared[name] = MaterialClass(
            action=spec.get('action'),
            palette_category=spec.get('paletteCategory'),
        )

    categories: dict[str, PartCategorySpec] = {}
    gear_raw = (data.get('partCategories') or {}).get('gear') or {}
    clip_skip = gear_raw.get('clipSkip') or {}
    for cat, raw in (data.get('partCategories') or {}).items():
        categories[cat] = _part_spec(raw)

    surface_rules: list[SurfaceRule] = []
    for rule in data.get('surfaceRules') or []:
        surface_rules.append(SurfaceRule(
            part_names=tuple(rule.get('partNames', [])),
            role=rule['role'],
            control=rule['control'],
            sign=int(rule.get('sign', 1)),
            range_rad=float(rule.get('rangeRad', 0.45)),
        ))

    rudder_raw = data.get('rudderFallback')
    rudder_fallback = None
    if rudder_raw:
        rudder_fallback = SurfaceRule(
            part_names=tuple(rudder_raw.get('partNames', [])),
            role=rudder_raw['role'],
            control=rudder_raw['control'],
            sign=int(rudder_raw.get('sign', 1)),
            range_rad=float(rudder_raw.get('rangeRad', 0.45)),
        )

    animated = [
        (e['field'], e['control'])
        for e in (data.get('animatedPartFields') or [])
    ]

    livery = data.get('liveryMaterialExclude') or {}
    conventions = data.get('conventions') or {}

    return TcaMapping(
        shared_materials=shared,
        part_categories=categories,
        surface_rules=surface_rules,
        rudder_fallback=rudder_fallback,
        animated_part_fields=animated,
        livery_skip_material_substrings=tuple(
            livery.get('skipMaterialSubstrings', ['Collider', 'ShadowDepthOffset', 'Shadow']),
        ),
        livery_name_substrings_lower=tuple(livery.get('nameSubstringsLower', [])),
        livery_weapon_substrings_lower=tuple(livery.get('weaponSubstringsLower', [])),
        gear_clip_skip_exact=tuple(clip_skip.get('exact', [])),
        gear_clip_skip_substring=tuple(clip_skip.get('substring', [])),
        gear_mandatory_bones=tuple(gear_raw.get('mandatoryBones', [])),
        hinge_bone_prefix=str(conventions.get('hingeBonePrefix', 'B')),
        skip_material_substrings=tuple(
            livery.get('skipMaterialSubstrings', ['Collider', 'ShadowDepthOffset', 'Shadow']),
        ),
    )


def default_mapping() -> TcaMapping:
    return _parse_mapping(_load_base())


def _extend_spec(spec: PartCategorySpec, extra_substring: tuple[str, ...] = (),
                 extra_exact: tuple[str, ...] = ()) -> PartCategorySpec:
    return PartCategorySpec(
        exact=spec.exact + extra_exact,
        substring=spec.substring + extra_substring,
        prefix=spec.prefix,
        exclude_substring=spec.exclude_substring,
        substring_all=spec.substring_all,
    )


def merge_config_overrides(cfg: dict | None) -> TcaMapping:
    """Return base mapping extended by per-import config overrides."""
    base_data = deepcopy(_load_base())
    cfg = cfg or {}

    cats = base_data.setdefault('partCategories', {})
    if cfg.get('glassParts'):
        g = cats.setdefault('glass', {})
        g.setdefault('substring', []).extend(cfg['glassParts'])
    if cfg.get('nozzleParts'):
        n = cats.setdefault('nozzle', {})
        n.setdefault('substring', []).extend(cfg['nozzleParts'])
    if cfg.get('wingtipParts'):
        w = cats.setdefault('wingtip', {})
        w.setdefault('substring', []).extend(cfg['wingtipParts'])

    skip_extra = list(cfg.get('skipNameParts', []))
    if cfg.get('skipClutter', False):
        skip_extra.extend(default_import_skip_substrings())
    if skip_extra:
        s = cats.setdefault('skip', {})
        seen = set(s.get('substring', []))
        for part in skip_extra:
            if part not in seen:
                s.setdefault('substring', []).append(part)
                seen.add(part)

    livery = base_data.setdefault('liveryMaterialExclude', {})
    skip_mats = cfg.get('skipMaterials')
    if skip_mats:
        livery['skipMaterialSubstrings'] = list(skip_mats)

    mapping = _parse_mapping(base_data)

    nozzle_mats = tuple(cfg.get('nozzleMaterials', []))
    if nozzle_mats:
        extra = dict(mapping.shared_materials)
        for mat in nozzle_mats:
            extra[mat] = MaterialClass(palette_category='FX_FIRE')
        mapping.shared_materials = extra

    return mapping


def _matches_spec(name: str, spec: PartCategorySpec) -> bool:
    if name in spec.exact:
        return True
    ln = name.lower()
    for group in spec.substring_all:
        if all(tok in ln for tok in group):
            return True
    for tok in spec.substring:
        if tok in name:
            return True
    for prefix in spec.prefix:
        if name.startswith(prefix):
            return True
    return False


def classify_part(name: str, category: str, mapping: TcaMapping | None = None) -> bool:
    mapping = mapping or default_mapping()
    spec = mapping.part_categories.get(category)
    if spec is None:
        return False
    if not _matches_spec(name, spec):
        return False
    if spec.exclude_substring and any(ex in name for ex in spec.exclude_substring):
        return False
    return True


def classify_material(name: str, mapping: TcaMapping | None = None) -> MaterialClass | None:
    if not name:
        return None
    mapping = mapping or default_mapping()
    if name in mapping.shared_materials:
        return mapping.shared_materials[name]
    # Longer shared names first so "CanopyGlass" / "Glass HUD" win over "Glass".
    for mat_name, cls in sorted(
        mapping.shared_materials.items(), key=lambda kv: len(kv[0]), reverse=True,
    ):
        if mat_name not in name:
            continue
        # "Canopy" must not match frame/rubber/seal materials (CanopyRubber,
        # CanopyFrameMat, …) — those are opaque structure, not TinyCanopy glass.
        if cls.palette_category == 'GLASS' and any(
            ex in name for ex in _GLASS_MATERIAL_EXCLUDE_SUBSTRINGS
        ):
            continue
        return cls
    return None


_GLASS_MATERIAL_EXCLUDE_SUBSTRINGS = (
    'Frame', 'Rubber', 'Seal', 'Rail', 'Strut', 'Hinge', 'Latch', 'Handle',
)


def is_glass_part(name: str, mapping: TcaMapping | None = None) -> bool:
    return classify_part(name, 'glass', mapping)


def is_nozzle_part(name: str, mapping: TcaMapping | None = None) -> bool:
    return classify_part(name, 'nozzle', mapping)


def is_skip_part(name: str, mapping: TcaMapping | None = None) -> bool:
    return classify_part(name, 'skip', mapping)


def is_discover_skip_part(name: str, mapping: TcaMapping | None = None) -> bool:
    return classify_part(name, 'discoverSkip', mapping)


def is_body_hint_part(name: str, mapping: TcaMapping | None = None) -> bool:
    return classify_part(name, 'bodyHint', mapping)


def is_fuselage_part(name: str, mapping: TcaMapping | None = None) -> bool:
    return classify_part(name, 'fuselage', mapping)


def is_engine_part(name: str, mapping: TcaMapping | None = None) -> bool:
    return classify_part(name, 'engine', mapping)


def skip_part_substrings(mapping: TcaMapping | None = None) -> tuple[str, ...]:
    mapping = mapping or default_mapping()
    return mapping.part_categories.get('skip', PartCategorySpec()).substring


def default_import_skip_substrings(mapping: TcaMapping | None = None) -> tuple[str, ...]:
    """Weapon/gauge clutter for import skip — excludes cockpit/canopy/empties."""
    mapping = mapping or default_mapping()
    always_skip = set(mapping.part_categories.get('skip', PartCategorySpec()).substring)
    clutter = mapping.part_categories.get('importClutterSkip', PartCategorySpec()).substring
    return tuple(s for s in clutter if s not in always_skip)


def is_cockpit_part(name: str, mapping: TcaMapping | None = None) -> bool:
    return classify_part(name, 'cockpit', mapping)


def is_wingtip_part(name: str, mapping: TcaMapping | None = None) -> bool:
    return classify_part(name, 'wingtip', mapping)


def is_attachment_empty(name: str, mapping: TcaMapping | None = None) -> bool:
    return classify_part(name, 'attachmentEmpty', mapping)


def is_nozzle_mesh(name: str, mat_names: tuple[str, ...],
                   mapping: TcaMapping | None = None) -> bool:
    """True when a mesh is a nozzle interior by part name or FX_FIRE material."""
    if is_nozzle_part(name, mapping):
        return True
    for mat_name in mat_names:
        cls = classify_material(mat_name, mapping)
        if cls is not None and cls.palette_category == 'FX_FIRE':
            return True
    return False


def point_in_expanded_bounds(
        pos: tuple[float, float, float] | list[float],
        lo: tuple[float, float, float] | list[float],
        hi: tuple[float, float, float] | list[float],
        margin: tuple[float, float, float] = (3.0, 2.0, 2.0),
) -> bool:
    """True when pos lies inside an axis-aligned box expanded by margin (metres)."""
    for i in range(3):
        if pos[i] < lo[i] - margin[i] or pos[i] > hi[i] + margin[i]:
            return False
    return True


def is_livery_material(name: str, mapping: TcaMapping | None = None) -> bool:
    mapping = mapping or default_mapping()
    if any(s in name for s in mapping.livery_skip_material_substrings):
        return False
    low = name.lower()
    if any(s in low for s in mapping.livery_name_substrings_lower):
        return False
    if any(s in low for s in mapping.livery_weapon_substrings_lower):
        return False
    return True


def surface_rules(mapping: TcaMapping | None = None) -> list[SurfaceRule]:
    mapping = mapping or default_mapping()
    return list(mapping.surface_rules)


def auto_surface_defs(available: set[str], mapping: TcaMapping | None = None) -> list[dict]:
    mapping = mapping or default_mapping()
    surfaces: list[dict] = []
    used_roles: set[str] = set()
    used_parts: set[str] = set()
    for rule in mapping.surface_rules:
        if rule.role in used_roles:
            continue
        part = next((pn for pn in rule.part_names
                     if pn in available and pn not in used_parts), None)
        if part is None:
            continue
        surfaces.append({
            'role': rule.role,
            'parts': [part],
            'control': rule.control,
            'sign': rule.sign,
            'rangeRad': rule.range_rad,
        })
        used_roles.add(rule.role)
        used_parts.add(part)

    rf = mapping.rudder_fallback
    if rf and 'rudder' not in used_roles:
        rudder_parts = [p for p in rf.part_names if p in available and p not in used_parts]
        if rudder_parts:
            surfaces.append({
                'role': rf.role,
                'parts': rudder_parts,
                'control': rf.control,
                'sign': rf.sign,
                'rangeRad': rf.range_rad,
            })
    return surfaces


def auto_gear_names(available: set[str], mapping: TcaMapping | None = None) -> set[str]:
    mapping = mapping or default_mapping()
    spec = mapping.part_categories.get('gear', PartCategorySpec())
    names = {p for p in spec.exact if p in available}
    for n in available:
        if n in names:
            continue
        if _matches_spec(n, spec):
            names.add(n)
    return names


def should_skip_gear_clip_part(name: str, mapping: TcaMapping | None = None) -> bool:
    mapping = mapping or default_mapping()
    if name in mapping.gear_clip_skip_exact:
        return True
    ln = name.lower()
    return any(tok in ln for tok in mapping.gear_clip_skip_substring)


def animated_part_control(entry: dict, mapping: TcaMapping | None = None) -> str | None:
    mapping = mapping or default_mapping()
    for field_name, control in mapping.animated_part_fields:
        if entry.get(field_name) is not None:
            return control
    return None
