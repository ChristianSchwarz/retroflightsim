#!/usr/bin/env python3
"""Bake OSM land/water coast masks into the planet quadtree pyramid.

Reads an existing ``assets/planet`` tree (manifest + index from DEM bake),
assembles land polygons from OpenStreetMap, rasterises them onto the same
257-node geographic grid as ``.pdm`` tiles, and writes ``.lwm`` files plus a
``coastMask`` block in ``manifest.json``.

Data sources (in priority order):

1. ``--land-shp PATH`` — shapefile from osmcoastline (preferred)
2. ``--pbf PATH`` — run osmcoastline if installed, else parse with Overpass-style logic
3. Overpass API for ``--bbox`` or manifest ``coverage``

Usage::

    python tools/bake_osm_coast.py --manifest assets/planet/manifest.json
    python tools/bake_osm_coast.py --bbox -18.66,26.97,-12.61,30.49 --out assets/planet
    python tools/bake_osm_coast.py --manifest assets/planet/manifest.json --pbf data/canary-islands.osm.pbf

Requires ``shapely`` and ``requests``::

    pip install shapely requests

Optional: ``osmcoastline`` binary for robust coastline assembly from PBF.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import struct
import subprocess
import sys
import tempfile
import time
import zlib
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple

import numpy as np

try:
    import requests
    from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box, mapping, shape
    from shapely.ops import polygonize, unary_union
    from shapely.prepared import prep
except ImportError:
    print('error: shapely and requests are required (pip install shapely requests)', file=sys.stderr)
    raise

try:
    from rasterio.features import rasterize
    from rasterio.transform import from_bounds as transform_from_bounds
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False

LWM_MAGIC = b'LWM1'
LWM_HEADER_BYTES = 8
LWM_NODATA = 255
LAND = 1
WATER = 0

LVR_MAGIC = b'LVR1'

OVERPASS_URLS = (
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter',
)


@dataclass(frozen=True)
class Bounds:
    west: float
    south: float
    east: float
    north: float

    def as_overpass(self) -> str:
        return f'{self.south},{self.west},{self.north},{self.east}'

    def as_box(self) -> Polygon:
        return box(self.west, self.south, self.east, self.north)


def tile_bounds(z: int, x: int, y: int) -> Bounds:
    span = 180.0 / (1 << z)
    west = -180.0 + x * span
    north = 90.0 - y * span
    return Bounds(west, north - span, west + span, north)


def tile_range_for_bounds(z: int, b: Bounds) -> Tuple[int, int, int, int]:
    span = 180.0 / (1 << z)
    nx, ny = (1 << (z + 1)), (1 << z)
    x0 = int(math.floor((b.west + 180.0) / span))
    x1 = int(math.ceil((b.east + 180.0) / span)) - 1
    y0 = int(math.floor((90.0 - b.north) / span))
    y1 = int(math.ceil((90.0 - b.south) / span)) - 1
    return (max(0, x0), max(0, y0), min(nx - 1, max(0, x1)), min(ny - 1, max(0, y1)))


def parse_bbox(text: str) -> Bounds:
    parts = [float(p.strip()) for p in text.split(',')]
    if len(parts) != 4:
        raise ValueError('bbox must be west,south,east,north')
    return Bounds(parts[0], parts[1], parts[2], parts[3])


def load_manifest(path: str) -> dict:
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)


def decode_index(index_path: str, min_zoom: int, max_zoom: int) -> Dict[int, Set[Tuple[int, int]]]:
    """Return {z: {(x,y), ...}} from PIX1 index.bin."""
    tiles: Dict[int, Set[Tuple[int, int]]] = {z: set() for z in range(min_zoom, max_zoom + 1)}
    with open(index_path, 'rb') as fh:
        data = fh.read()
    if len(data) < 8 or data[:4] != b'PIX1':
        return tiles
    min_z, max_z = struct.unpack_from('<HH', data, 4)
    offset = 8
    for z in range(min_z, max_z + 1):
        if offset + 16 > len(data):
            break
        min_x, min_y, w, h = struct.unpack_from('<IIII', data, offset)
        offset += 16
        nbytes = (w * h + 7) // 8
        if offset + nbytes > len(data):
            break
        bits = data[offset:offset + nbytes]
        offset += nbytes
        for dy in range(h):
            for dx in range(w):
                idx = dy * w + dx
                if bits[idx >> 3] & (1 << (idx & 7)):
                    tiles[z].add((min_x + dx, min_y + dy))
    return tiles


def scan_pdm_tiles(out_dir: str, min_zoom: int, max_zoom: int) -> Dict[int, Set[Tuple[int, int]]]:
    tiles: Dict[int, Set[Tuple[int, int]]] = {z: set() for z in range(min_zoom, max_zoom + 1)}
    for z in range(min_zoom, max_zoom + 1):
        zdir = os.path.join(out_dir, str(z))
        if not os.path.isdir(zdir):
            continue
        for xname in os.listdir(zdir):
            xpath = os.path.join(zdir, xname)
            if not os.path.isdir(xpath):
                continue
            try:
                x = int(xname)
            except ValueError:
                continue
            for fname in os.listdir(xpath):
                if fname.endswith('.pdm'):
                    try:
                        y = int(fname[:-4])
                        tiles[z].add((x, y))
                    except ValueError:
                        pass
    return tiles


def overpass_query(b: Bounds) -> dict:
    query = f'''[out:json][timeout:240];
(
  way["natural"="coastline"]({b.as_overpass()});
  relation["natural"="coastline"]({b.as_overpass()});
  way["natural"="water"]({b.as_overpass()});
  relation["natural"="water"]({b.as_overpass()});
  way["natural"="bay"]({b.as_overpass()});
  relation["natural"="bay"]({b.as_overpass()});
  way["waterway"="riverbank"]({b.as_overpass()});
  relation["place"="island"]({b.as_overpass()});
);
out body;
>;
out skel qt;
'''
    headers = {
        'User-Agent': 'retroflightsim-coast-bake/1.0',
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    }
    body = ('data=' + requests.utils.quote(query)).encode('utf-8')
    last_err: Optional[Exception] = None
    for url in OVERPASS_URLS:
        print(f'fetching OSM via Overpass ({url})…')
        try:
            resp = requests.post(url, data=body, headers=headers, timeout=300)
            resp.raise_for_status()
            return resp.json()
        except Exception as err:
            last_err = err
            print(f'  overpass failed: {err}', file=sys.stderr)
    raise RuntimeError(f'all Overpass endpoints failed: {last_err}')


def _nodes_map(elements: Sequence[dict]) -> Dict[int, Tuple[float, float]]:
    out: Dict[int, Tuple[float, float]] = {}
    for el in elements:
        if el.get('type') == 'node':
            out[el['id']] = (el['lon'], el['lat'])
    return out


def _way_line(way: dict, nodes: Dict[int, Tuple[float, float]]) -> Optional[LineString]:
    coords = [nodes[nid] for nid in way.get('nodes', []) if nid in nodes]
    if len(coords) < 2:
        return None
    return LineString(coords)


def _relation_rings(relation: dict, ways: Dict[int, dict], nodes: Dict[int, Tuple[float, float]]) -> List[List[Tuple[float, float]]]:
    """Assemble outer rings from a multipolygon relation."""
    outer_ways: List[List[int]] = []
    for m in relation.get('members', []):
        if m.get('type') != 'way' or m.get('role') not in ('outer', ''):
            continue
        wid = m.get('ref')
        if wid in ways:
            outer_ways.append(ways[wid].get('nodes', []))
    if not outer_ways:
        return []
    # Chain way segments into closed rings.
    rings: List[List[Tuple[float, float]]] = []
    used: Set[int] = set()
    for start_idx, start_nodes in enumerate(outer_ways):
        if start_idx in used:
            continue
        chain = list(start_nodes)
        used.add(start_idx)
        changed = True
        while changed:
            changed = False
            for j, seg in enumerate(outer_ways):
                if j in used:
                    continue
                if chain[-1] == seg[0]:
                    chain.extend(seg[1:])
                    used.add(j)
                    changed = True
                elif chain[-1] == seg[-1]:
                    chain.extend(reversed(seg[:-1]))
                    used.add(j)
                    changed = True
                elif chain[0] == seg[-1]:
                    chain = seg[:-1] + chain
                    used.add(j)
                    changed = True
                elif chain[0] == seg[0]:
                    chain = list(reversed(seg[1:])) + chain
                    used.add(j)
                    changed = True
        if len(chain) >= 4 and chain[0] == chain[-1]:
            rings.append([nodes[n] for n in chain if n in nodes])
    return rings


def _polygons_from_osm(data: dict, bbox: Bounds) -> Tuple[MultiPolygon, MultiPolygon]:
    """Return (land_multipolygon, water_multipolygon) clipped to bbox."""
    elements = data.get('elements', [])
    nodes = _nodes_map(elements)
    ways = {el['id']: el for el in elements if el.get('type') == 'way'}
    relations = [el for el in elements if el.get('type') == 'relation']

    coastline_lines: List[LineString] = []
    water_polys: List[Polygon] = []
    land_polys: List[Polygon] = []

    for way in ways.values():
        tags = way.get('tags', {})
        line = _way_line(way, nodes)
        if line is None:
            continue
        natural = tags.get('natural', '')
        waterway = tags.get('waterway', '')
        if natural == 'coastline':
            coastline_lines.append(line)
        elif natural in ('water', 'bay') or waterway == 'riverbank':
            coords = list(line.coords)
            if len(coords) >= 4 and coords[0] == coords[-1]:
                try:
                    water_polys.append(Polygon(coords))
                except Exception:
                    pass

    for rel in relations:
        tags = rel.get('tags', {})
        natural = tags.get('natural', '')
        place = tags.get('place', '')
        waterway = tags.get('waterway', '')
        rings = _relation_rings(rel, ways, nodes)
        for ring in rings:
            if len(ring) < 4:
                continue
            try:
                poly = Polygon(ring)
            except Exception:
                continue
            if not poly.is_valid:
                poly = poly.buffer(0)
            if natural in ('water', 'bay') or waterway == 'riverbank':
                water_polys.append(poly)
            elif natural == 'coastline' or place == 'island':
                land_polys.append(poly)

    clip = bbox.as_box()
    # Polygonize coastline linework + bbox boundary to split land/sea.
    bbox_ring = LineString([
        (bbox.west, bbox.south), (bbox.east, bbox.south),
        (bbox.east, bbox.north), (bbox.west, bbox.north), (bbox.west, bbox.south),
    ])
    linework = coastline_lines + [bbox_ring]
    pieces = list(polygonize(linework))

    # Corner probe: assume southwest corner is open ocean for regional bboxes.
    ocean_probe = Point(bbox.west + 0.01 * (bbox.east - bbox.west),
                        bbox.south + 0.01 * (bbox.north - bbox.south))
    ocean_poly: Optional[Polygon] = None
    for piece in pieces:
        if piece.contains(ocean_probe):
            ocean_poly = piece
            break
    if ocean_poly is None and pieces:
        ocean_poly = max(pieces, key=lambda p: p.area)

    land_from_coast: List[Polygon] = []
    for piece in pieces:
        if ocean_poly is not None and piece.equals(ocean_poly):
            continue
        if piece.area > 0:
            land_from_coast.append(piece)
    land_from_coast.extend(land_polys)

    water_union = unary_union(water_polys) if water_polys else Polygon()
    land_union = unary_union(land_from_coast) if land_from_coast else Polygon()
    if land_union.is_empty:
        land_union = clip.difference(water_union)
    else:
        land_union = land_union.difference(water_union)
    land_union = land_union.intersection(clip)
    water_union = water_union.intersection(clip)
    if land_union.is_empty:
        land_union = Polygon()
    if water_union.is_empty:
        water_union = Polygon()

    land_mp = land_union if isinstance(land_union, MultiPolygon) else (
        MultiPolygon([land_union]) if isinstance(land_union, Polygon) and not land_union.is_empty else MultiPolygon()
    )
    water_mp = water_union if isinstance(water_union, MultiPolygon) else (
        MultiPolygon([water_union]) if isinstance(water_union, Polygon) and not water_union.is_empty else MultiPolygon()
    )
    return land_mp, water_mp


def load_land_shp(path: str, bbox: Bounds) -> MultiPolygon:
    try:
        import shapefile  # pyshp
    except ImportError:
        try:
            import fiona
            from shapely.geometry import shape
            geoms = []
            with fiona.open(path) as src:
                for feat in src:
                    g = shape(feat['geometry'])
                    geoms.append(g)
            land = unary_union(geoms)
            return land.intersection(bbox.as_box())
        except ImportError:
            print('error: shapefile input requires pyshp or fiona', file=sys.stderr)
            raise
    sf = shapefile.Reader(path)
    geoms = []
    for shp in sf.shapes():
        pts = shp.points
        parts = list(shp.parts) + [len(pts)]
        for i in range(len(parts) - 1):
            ring = pts[parts[i]:parts[i + 1]]
            if len(ring) >= 4:
                try:
                    geoms.append(Polygon(ring))
                except Exception:
                    pass
    land = unary_union(geoms)
    return land.intersection(bbox.as_box())


def run_osmcoastline(pbf: str, out_shp: str) -> bool:
    for cmd in ('osmcoastline', 'osmcoastline.exe'):
        try:
            subprocess.run(
                [cmd, '-o', out_shp, pbf],
                check=True,
                capture_output=True,
                timeout=600,
            )
            return True
        except (FileNotFoundError, subprocess.CalledProcessError):
            continue
    return False


def assemble_land(bbox: Bounds, args: argparse.Namespace) -> MultiPolygon:
    if args.land_shp:
        print(f'loading land polygons from {args.land_shp}')
        land = load_land_shp(args.land_shp, bbox)
        if isinstance(land, Polygon):
            return MultiPolygon([land]) if not land.is_empty else MultiPolygon()
        return land

    if args.pbf:
        with tempfile.TemporaryDirectory() as tmp:
            shp = os.path.join(tmp, 'land_polygons.shp')
            if run_osmcoastline(args.pbf, shp):
                print(f'osmcoastline produced {shp}')
                land = load_land_shp(shp, bbox)
                if isinstance(land, Polygon):
                    return MultiPolygon([land]) if not land.is_empty else MultiPolygon()
                return land
            print('osmcoastline not available — falling back to Overpass', file=sys.stderr)

    data = overpass_query(bbox)
    print(f'  {len(data.get("elements", []))} OSM elements')
    land, _water = _polygons_from_osm(data, bbox)
    return land


def rasterize_tile(land_prep, land_geom, b: Bounds, n: int) -> bytearray:
    """Return row-major uint8 mask (LAND/WATER)."""
    if HAS_RASTERIO and not land_geom.is_empty:
        # rasterio row 0 = north; matches PDM node ordering.
        transform = transform_from_bounds(b.west, b.south, b.east, b.north, n, n)
        geoms = land_geom.geoms if isinstance(land_geom, MultiPolygon) else [land_geom]
        shapes = [(g, LAND) for g in geoms if not g.is_empty]
        grid = rasterize(
            shapes,
            out_shape=(n, n),
            transform=transform,
            fill=WATER,
            dtype=np.uint8,
        )
        return bytearray(grid.tobytes(order='C'))
    out = bytearray(n * n)
    lon_step = (b.east - b.west) / (n - 1)
    lat_step = (b.north - b.south) / (n - 1)
    for row in range(n):
        lat = b.north - row * lat_step
        for col in range(n):
            lon = b.west + col * lon_step
            out[row * n + col] = LAND if land_prep.contains(Point(lon, lat)) else WATER
    return out


def encode_lwm(grid: bytes, n: int) -> bytes:
    header = struct.pack('<4sHBB', LWM_MAGIC, n, 0, 0)
    payload = header + grid
    return zlib.compress(payload, 6)


def vector_simplify_tol(z: int, max_zoom: int, tile_size: int) -> float:
    """Degrees — ~15% of a grid cell, scaled coarser at lower zoom."""
    span = 180.0 / (1 << z)
    cell = span / max(1, tile_size - 1)
    return cell * 0.15 * (2 ** max(0, max_zoom - z))


def clip_vector_polys(
    land: MultiPolygon,
    b: Bounds,
    tolerance: float,
) -> List[Tuple[List[Tuple[float, float]], List[List[Tuple[float, float]]]]]:
    """Clip OSM land to a tile and return (exterior, holes) coord lists."""
    tile_box = box(b.west, b.south, b.east, b.north)
    clipped = land.intersection(tile_box)
    if clipped.is_empty:
        return []
    if isinstance(clipped, Polygon):
        geoms: Sequence[Polygon] = [clipped]
    elif isinstance(clipped, MultiPolygon):
        geoms = list(clipped.geoms)
    else:
        return []
    out: List[Tuple[List[Tuple[float, float]], List[List[Tuple[float, float]]]]] = []
    for geom in geoms:
        if geom.is_empty:
            continue
        poly = geom.simplify(tolerance, preserve_topology=True) if tolerance > 0 else geom
        if poly.is_empty or not isinstance(poly, Polygon):
            continue
        ext = [(float(x), float(y)) for x, y in poly.exterior.coords[:-1]]
        if len(ext) < 3:
            continue
        holes: List[List[Tuple[float, float]]] = []
        for interior in poly.interiors:
            ring = [(float(x), float(y)) for x, y in interior.coords[:-1]]
            if len(ring) >= 3:
                holes.append(ring)
        out.append((ext, holes))
    return out


def _encode_ring(ring: Sequence[Tuple[float, float]]) -> bytes:
    out = struct.pack('<H', len(ring))
    for lon, lat in ring:
        out += struct.pack('<ff', float(lon), float(lat))
    return out


def encode_lvr(
    polys: Sequence[Tuple[List[Tuple[float, float]], List[List[Tuple[float, float]]]]],
) -> bytes:
    payload = bytearray(LVR_MAGIC)
    payload += struct.pack('<H', len(polys))
    for ext, holes in polys:
        payload += struct.pack('<H', 1 + len(holes))
        payload += _encode_ring(ext)
        for hole in holes:
            payload += _encode_ring(hole)
    return zlib.compress(bytes(payload), 6)


def write_lvr(out_dir: str, z: int, x: int, y: int, blob: bytes) -> int:
    path = os.path.join(out_dir, str(z), str(x))
    os.makedirs(path, exist_ok=True)
    with open(os.path.join(path, f'{y}.lvr'), 'wb') as fh:
        fh.write(blob)
    return len(blob)


def write_lwm(out_dir: str, z: int, x: int, y: int, blob: bytes) -> int:
    path = os.path.join(out_dir, str(z), str(x))
    os.makedirs(path, exist_ok=True)
    with open(os.path.join(path, f'{y}.lwm'), 'wb') as fh:
        fh.write(blob)
    return len(blob)


def build_parent_mask(children: Dict[Tuple[int, int], bytearray], n: int) -> bytearray:
    half = (n - 1) // 2
    parent = bytearray(n * n)
    for (qx, qy), child in children.items():
        for row in range(half + 1):
            for col in range(half + 1):
                parent[(qy * half + row) * n + (qx * half + col)] = child[row * 2 * n + col * 2]
    return parent


def bake(args: argparse.Namespace) -> int:
    started = time.time()
    manifest_path = args.manifest or os.path.join(args.out, 'manifest.json')
    if not os.path.isfile(manifest_path):
        print(f'error: manifest not found: {manifest_path}', file=sys.stderr)
        return 2
    manifest = load_manifest(manifest_path)
    out_dir = args.out or os.path.dirname(manifest_path)
    tile_size = manifest.get('tileSize', 257)
    min_zoom = manifest.get('minZoom', 0)
    max_zoom = manifest.get('maxZoom', 12)
    cov = manifest.get('coverage', {})
    bbox = parse_bbox(args.bbox) if args.bbox else Bounds(
        cov['west'], cov['south'], cov['east'], cov['north'],
    )

    print(f'coverage    lon [{bbox.west:.5f}, {bbox.east:.5f}] '
          f'lat [{bbox.south:.5f}, {bbox.north:.5f}]')
    print(f'zoom        {min_zoom}..{max_zoom}  tileSize={tile_size}')

    land = assemble_land(bbox, args)
    if land.is_empty:
        print('error: no land polygons assembled — check bbox / OSM data', file=sys.stderr)
        return 2
    land_prep = prep(land)
    print(f'land area   {land.area:.6f} deg²')

    index_path = os.path.join(out_dir, manifest.get('indexPath', 'index.bin'))
    pdm_tiles = scan_pdm_tiles(out_dir, min_zoom, max_zoom)
    indexed = decode_index(index_path, min_zoom, max_zoom) if os.path.isfile(index_path) else {}
    for z, coords in indexed.items():
        if coords:
            pdm_tiles[z] = coords | pdm_tiles.get(z, set())
    pdm_count = sum(len(v) for v in pdm_tiles.values())
    print(f'pdm tiles   {pdm_count} across zoom {min_zoom}..{max_zoom}')

    # Tiles to bake at max zoom: every indexed PDM tile plus bbox neighbours
    # so open ocean inside the OSM coverage still resolves as water.
    max_tiles: Set[Tuple[int, int]] = set()
    for z, coords in pdm_tiles.items():
        if z == max_zoom:
            max_tiles.update(coords)
    if not max_tiles:
        x0, y0, x1, y1 = tile_range_for_bounds(max_zoom, bbox)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                max_tiles.add((x, y))
    elif args.include_ocean_tiles:
        x0, y0, x1, y1 = tile_range_for_bounds(max_zoom, bbox)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                max_tiles.add((x, y))

    level_grids: Dict[Tuple[int, int], bytearray] = {}
    total_bytes = 0
    total_lvr_bytes = 0
    total_tiles = 0
    total_lvr_tiles = 0

    for i, (x, y) in enumerate(sorted(max_tiles)):
        b = tile_bounds(max_zoom, x, y)
        grid = rasterize_tile(land_prep, land, b, tile_size)
        level_grids[(x, y)] = grid
        if max_tiles and (i % max(1, len(max_tiles) // 20)) == 0:
            print(f'  rasterize {i + 1}/{len(max_tiles)}', flush=True)

    print(f'level {max_zoom:2d}    {len(level_grids)} tiles')

    for z in range(max_zoom, min_zoom - 1, -1):
        written = 0
        lvr_written = 0
        tol = vector_simplify_tol(z, max_zoom, tile_size)
        for (x, y), grid in sorted(level_grids.items()):
            b = tile_bounds(z, x, y)
            total_bytes += write_lwm(out_dir, z, x, y, encode_lwm(bytes(grid), tile_size))
            polys = clip_vector_polys(land, b, tol)
            if polys:
                total_lvr_bytes += write_lvr(out_dir, z, x, y, encode_lvr(polys))
                lvr_written += 1
            total_tiles += 1
            written += 1
        total_lvr_tiles += lvr_written
        print(f'level {z:2d}    wrote {written} .lwm + {lvr_written} .lvr tiles', flush=True)
        if z == min_zoom:
            break
        parents: Dict[Tuple[int, int], bytearray] = {}
        parent_children: Dict[Tuple[int, int], Dict[Tuple[int, int], bytearray]] = {}
        for (x, y), grid in level_grids.items():
            key = (x >> 1, y >> 1)
            parent_children.setdefault(key, {})[(x & 1, y & 1)] = grid
        for key, children in parent_children.items():
            parents[key] = build_parent_mask(children, tile_size)
        level_grids = parents

    manifest['version'] = 3
    manifest['coastMask'] = {
        'enabled': True,
        'path': '{z}/{x}/{y}.lwm',
        'vectorPath': '{z}/{x}/{y}.lvr',
        'source': 'osm',
        'coverage': {
            'west': bbox.west,
            'south': bbox.south,
            'east': bbox.east,
            'north': bbox.north,
        },
    }
    with open(manifest_path, 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, indent=2)
        fh.write('\n')

    print(f'\nwrote {total_tiles} coast tiles, {total_bytes / (1024 * 1024):.1f} MB (.lwm)')
    print(f'wrote {total_lvr_tiles} vector tiles, {total_lvr_bytes / (1024 * 1024):.1f} MB (.lvr)')
    print(f'updated {manifest_path} (version 3 + coastMask)')
    print(f'done in {time.time() - started:.1f}s')
    return 0


def main(argv: Optional[Iterable[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--manifest', help='planet manifest.json (default: {out}/manifest.json)')
    parser.add_argument('--out', default='assets/planet', help='planet asset directory')
    parser.add_argument('--bbox', help='west,south,east,north degrees (default: manifest coverage)')
    parser.add_argument('--pbf', help='regional OSM PBF for osmcoastline')
    parser.add_argument('--land-shp', help='pre-built land polygons shapefile (osmcoastline output)')
    parser.add_argument('--include-ocean-tiles', action='store_true',
                        help='also bake every tile in the bbox at max zoom (slow; default: PDM tiles only)')
    args = parser.parse_args(list(argv) if argv is not None else None)
    return bake(args)


if __name__ == '__main__':
    raise SystemExit(main())
