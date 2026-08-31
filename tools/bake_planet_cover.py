#!/usr/bin/env python3
"""Bake observed ground cover onto the planet quadtree grid.

Reads an existing ``assets/planet`` tree - the one ``bake_planet_dem.py``
wrote - and, for every ``.pdm`` height tile, resamples the landcover and
imagery rasters onto that tile's own ``size * size`` geographic grid, writing
a matching ``.plc``::

    {z}/{x}/{y}.plc     zlib-compressed PLC1: one class + one sRGB triple
                        per grid node

``tools/bake_planet_mesh.ts`` then reduces those per-node values to one class
and one colour per *facet*, and bakes them into the mesh. This step exists so
that reduction happens against the same grid the heights use, instead of every
mesh bake reprojecting a global raster.

Three rules live here rather than downstream:

* WorldCover's sparse 10..100 codes are compacted to the dense 0..15
  ``TerrainClass`` range the mesh format carries. The map is the one in
  ``src/script/terrain/tones.ts`` and the two must agree.
* Landcover speckle is merged into patches that read at a stated ground
  distance (``--patch-m``); see ``tools/cover_patches.py`` for why that is a
  majority filter and not a region merge. Tiles are read with a halo so the
  result is identical to filtering the whole coverage at once and no seam can
  appear along a tile border.
* Where imagery is missing - no scene, cloud, or no imagery at all - the node
  takes a plausible ground colour for its class instead (``CLASS_COLORS``, not
  ESA's map legend). That keeps every tile fully populated, so the mesh bake
  never has to know which sources were around, and the imagery-driven modes
  degrade to a flat-but-plausible look rather than to grey.

Usage::

    python tools/bake_planet_cover.py
    python tools/bake_planet_cover.py --landcover data/cover/landcover.tif
    python tools/bake_planet_cover.py --max-zoom 10 --only 12/3745/1410
    python tools/bake_planet_cover.py --patch-m 150

With no ``--landcover`` / ``--imagery``, ``data/cover/sources.json`` is used
if ``tools/fetch_cover_sources.py`` has been run.

Requires ``rasterio`` and ``numpy``::

    pip install rasterio numpy
"""

from __future__ import annotations

import argparse
import json
import math
import os
import struct
import sys
import time
import warnings
import zlib
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from cover_patches import enlarge_patches, halo_nodes

warnings.filterwarnings('ignore', category=DeprecationWarning, module='rasterio')

try:
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.transform import from_bounds as transform_from_bounds
    from rasterio.warp import reproject
except ImportError:  # pragma: no cover - dependency hint
    print('error: rasterio is required (pip install rasterio numpy)', file=sys.stderr)
    raise

PLC_MAGIC = b'PLC1'
PLC_VERSION = 1
PLC_HEADER_BYTES = 16
PLC_FLAG_REAL_IMAGERY = 1 << 0

DEFAULT_SRC = 'assets/planet'
DEFAULT_SOURCES = 'data/cover/sources.json'

# Ground distance a landcover patch should read as. Measured on tile
# 12/3744/1411, this takes the raster from 1550 regions with a 33 m median to
# 40 regions with a 269 m median, and drops the share of tile area sitting in
# sub-250 m regions from 23% to 1%.
DEFAULT_PATCH_M = 250.0

# Compact TerrainClass ids. Must match src/script/terrain/tones.ts.
CLS_UNKNOWN = 0
CLS_TREE = 1
CLS_SHRUB = 2
CLS_GRASS = 3
CLS_CROP = 4
CLS_BUILT = 5
CLS_BARE = 6
CLS_SNOW = 7
CLS_WATER = 8
CLS_WETLAND = 9
CLS_MANGROVE = 10
CLS_MOSS = 11
CLS_SAND = 12   # bake-assigned downstream, never read from the raster

WORLDCOVER_TO_CLASS: Dict[int, int] = {
    10: CLS_TREE,
    20: CLS_SHRUB,
    30: CLS_GRASS,
    40: CLS_CROP,
    50: CLS_BUILT,
    60: CLS_BARE,
    70: CLS_SNOW,
    80: CLS_WATER,
    90: CLS_WETLAND,
    95: CLS_MANGROVE,
    100: CLS_MOSS,
}

# What each cover actually looks like from the air, used wherever there is no
# imagery to sample.
#
# Deliberately NOT ESA's own map legend. Those colours - scarlet for built-up,
# lemon for grassland, magenta for cropland - are chosen to be told apart on a
# map, and they are ruinous here twice over: they are what the imagery-driven
# modes fall back to, and they feed the bake's swatch table, which then hands
# real ground the nearest of them.
#
# These are eyeballed for the Canaries: volcanic, arid, sparsely green.
CLASS_COLORS: Dict[int, Tuple[int, int, int]] = {
    CLS_UNKNOWN: (0x6B, 0x6A, 0x5E),
    CLS_TREE: (0x2E, 0x4A, 0x2A),
    CLS_SHRUB: (0x6B, 0x6A, 0x45),
    CLS_GRASS: (0x7B, 0x7D, 0x4E),
    CLS_CROP: (0x6D, 0x7A, 0x3C),
    CLS_BUILT: (0x8E, 0x8A, 0x84),
    CLS_BARE: (0x8A, 0x72, 0x56),
    CLS_SNOW: (0xE8, 0xEC, 0xF0),
    CLS_WATER: (0x1E, 0x3A, 0x52),
    CLS_WETLAND: (0x4A, 0x63, 0x50),
    CLS_MANGROVE: (0x2F, 0x50, 0x40),
    CLS_MOSS: (0x7D, 0x7A, 0x5C),
    CLS_SAND: (0xCB, 0xB2, 0x87),
}


def _metres_per_degree(lat_deg: float) -> Tuple[float, float]:
    """Metres per degree of latitude and of longitude.

    A local copy of the series in ``bake_osm_airports.py``. Importing it would
    pull shapely in behind it, and this file deliberately depends on rasterio
    and numpy only - the same trade the ``.pdm`` reader in the coast bake makes.
    """
    lat = math.radians(lat_deg)
    return (111132.92 - 559.82 * math.cos(2 * lat) + 1.175 * math.cos(4 * lat),
            111412.84 * math.cos(lat) - 93.5 * math.cos(3 * lat))


def airfield_pads(manifest: dict) -> List[dict]:
    """Every airfield platform rectangle the airports bake recorded."""
    out: List[dict] = []
    for airfield in (manifest.get('airfields') or {}).get('items') or []:
        out.extend(airfield.get('pads') or [])
    return out


def stamp_airfield_classes(
    classes: np.ndarray, bounds: Tuple[float, float, float, float],
    size: int, pads: Sequence[dict],
) -> int:
    """Paint the airfield platforms as built ground. Returns nodes changed.

    The cover raster does not know an airfield is there. WorldCover has Gran
    Canaria's runways as a patchwork of bare and built at 10 m, and a grass
    field as grass - and whatever the ground was before it was paved is the one
    thing it must not be afterwards. So the platform the mesh bake flattens is
    also the platform the cover bake paints.

    Only the flat core, never the feather, which is the same rule the mesh bake
    and the height sampler use for what counts as paved: the feather is where
    the airfield blends into the countryside, and it should look like it.

    Written into the classes before the colour pass, so a tile with no imagery
    picks up the built-up colour from the class LUT for free.
    """
    if not pads:
        return 0
    west, south, east, north = bounds
    lons = west + (east - west) * np.arange(size) / (size - 1)
    lats = north - (north - south) * np.arange(size) / (size - 1)
    changed = 0
    for pad in pads:
        half_d = pad['halfD']
        half_w = pad['halfW']
        feather = pad.get('featherM', 0.0)
        reach = math.hypot(half_d + feather, half_w + feather)
        m_lat, m_lon = _metres_per_degree(pad['lat'])
        m_lon = max(1.0, m_lon)
        if (pad['lat'] < south - reach / m_lat or pad['lat'] > north + reach / m_lat
                or pad['lon'] < west - reach / m_lon or pad['lon'] > east + reach / m_lon):
            continue
        core_d = max(0.0, half_d - feather)
        core_w = max(0.0, half_w - feather)
        if core_d <= 0 or core_w <= 0:
            continue
        e = (lons - pad['lon']) * m_lon
        n = (lats - pad['lat']) * m_lat
        heading = math.radians(pad.get('headingDeg', 0.0))
        ax, ay = math.sin(heading), math.cos(heading)
        # Rows are latitude, columns are longitude, matching the class grid.
        along = e[None, :] * ax + n[:, None] * ay
        across = e[None, :] * ay - n[:, None] * ax
        mask = (np.abs(along) <= core_d) & (np.abs(across) <= core_w)
        if mask.any():
            changed += int(mask.sum())
            classes[mask] = CLS_BUILT
    return changed


def build_class_lut() -> np.ndarray:
    """256-entry lookup so the whole raster converts in one indexing op."""
    lut = np.full(256, CLS_UNKNOWN, dtype=np.uint8)
    for code, cls in WORLDCOVER_TO_CLASS.items():
        lut[code] = cls
    return lut


def build_color_lut() -> np.ndarray:
    lut = np.zeros((256, 3), dtype=np.uint8)
    lut[:] = CLASS_COLORS[CLS_UNKNOWN]
    for cls, rgb in CLASS_COLORS.items():
        lut[cls] = rgb
    return lut


def tile_bounds(z: int, x: int, y: int) -> Tuple[float, float, float, float]:
    """Geographic quadtree: level z has 2^(z+1) columns by 2^z rows."""
    span = 180.0 / (1 << z)
    west = -180.0 + x * span
    north = 90.0 - y * span
    return west, north - span, west + span, north


def pdm_size(path: str) -> int:
    """Grid size straight out of the PDM1 header, without inflating the body."""
    with open(path, 'rb') as fh:
        head = fh.read(4)
        if head == b'PDM1':
            rest = head + fh.read(20)
        else:
            fh.seek(0)
            rest = zlib.decompress(fh.read())[:24]
    if rest[:4] != b'PDM1':
        raise ValueError(f'{path}: not a PDM1 tile')
    return struct.unpack_from('<H', rest, 4)[0]


class Source:
    """One raster, opened once and windowed per tile."""

    def __init__(self, path: str, bands: Sequence[int], nodata: int):
        self.path = path
        self.bands = list(bands)
        self.nodata = nodata
        self.ds = rasterio.open(path)

    def close(self) -> None:
        self.ds.close()

    def read_onto(
        self, bounds: Tuple[float, float, float, float], size: int, resampling: Resampling,
    ) -> Optional[np.ndarray]:
        """Resample this raster onto a size*size grid over `bounds`.

        Returns None when the raster does not reach the tile at all, which is
        the common case: most of an ocean-heavy coverage has no land in it.
        """
        west, south, east, north = bounds
        sw, ss, se, sn = self.ds.bounds
        if east <= sw or west >= se or north <= ss or south >= sn:
            return None

        # Read a window, decimated so a coarse tile does not pull a whole
        # continent's worth of pixels into memory, then reproject that exact
        # window onto the target grid. Reading straight to out_shape would snap
        # the window to whole source pixels and shift the result by up to half
        # of one; going through the window's own transform does not.
        window = self.ds.window(west, south, east, north).round_offsets().round_lengths()
        # Clamped to the raster by hand rather than with Window.intersection,
        # which *raises* on an empty overlap instead of returning an empty
        # window - so the degenerate check below never ran and the bake died
        # with "Intersection is empty" instead of skipping the tile.
        #
        # The bounds test above does not prevent it. A tile overlapping the
        # raster by less than a pixel passes that test, and then round_offsets
        # takes the overlap away: on a one-tile-wide bbox the raster came out
        # 123 px across and a tile asked for a window at column 123.
        col_off = max(0, int(window.col_off))
        row_off = max(0, int(window.row_off))
        col_end = min(int(self.ds.width), int(window.col_off + window.width))
        row_end = min(int(self.ds.height), int(window.row_off + window.height))
        if col_end - col_off < 1 or row_end - row_off < 1:
            return None
        window = rasterio.windows.Window(
            col_off, row_off, col_end - col_off, row_end - row_off)
        # 4x the target is plenty to resample from and bounds the read.
        out_w = int(min(window.width, size * 4))
        out_h = int(min(window.height, size * 4))
        data = self.ds.read(
            self.bands,
            window=window,
            out_shape=(len(self.bands), out_h, out_w),
            resampling=resampling,
            boundless=False,
        )
        src_transform = self.ds.window_transform(window) * rasterio.Affine.scale(
            window.width / out_w, window.height / out_h)

        dst = np.zeros((len(self.bands), size, size), dtype=data.dtype)
        reproject(
            source=data,
            destination=dst,
            src_transform=src_transform,
            src_crs=self.ds.crs,
            src_nodata=self.nodata,
            dst_transform=transform_from_bounds(west, south, east, north, size, size),
            dst_crs='EPSG:4326',
            dst_nodata=self.nodata,
            resampling=resampling,
        )
        if not np.any(dst != self.nodata):
            return None
        return dst


def encode_plc(size: int, flags: int, classes: np.ndarray, colors: np.ndarray) -> bytes:
    header = struct.pack('<4sBBHII', PLC_MAGIC, PLC_VERSION, flags, size, 0, 0)
    return zlib.compress(header + classes.tobytes() + colors.tobytes(), 6)


def glue_negative_bbox(argv: Sequence[str]) -> List[str]:
    """Rewrite ``--bbox -9.7,...`` into the ``--bbox=-9.7,...`` argparse takes.

    A western bbox starts with a minus, which argparse reads as the next option
    rather than this one's value.
    """
    out: List[str] = []
    i = 0
    while i < len(argv):
        if argv[i] == '--bbox' and i + 1 < len(argv) and argv[i + 1].startswith('-'):
            out.append(f'--bbox={argv[i + 1]}')
            i += 2
            continue
        out.append(argv[i])
        i += 1
    return out


def parse_bbox(text: str) -> Tuple[float, float, float, float]:
    parts = [p.strip() for p in text.split(',')]
    if len(parts) != 4:
        raise ValueError('bbox must be west,south,east,north')
    return tuple(float(p) for p in parts)  # type: ignore[return-value]


def tile_overlaps(z: int, x: int, y: int, bbox: Tuple[float, float, float, float]) -> bool:
    west, south, east, north = tile_bounds(z, x, y)
    bw, bs, be, bn = bbox
    return not (east <= bw or west >= be or north <= bs or south >= bn)


def walk_tiles(src: str, max_zoom: int) -> List[Tuple[int, int, int]]:
    out: List[Tuple[int, int, int]] = []
    for z in range(0, max_zoom + 1):
        zdir = os.path.join(src, str(z))
        if not os.path.isdir(zdir):
            continue
        for xs in os.listdir(zdir):
            xdir = os.path.join(zdir, xs)
            if not os.path.isdir(xdir):
                continue
            for name in os.listdir(xdir):
                if name.endswith('.pdm'):
                    out.append((z, int(xs), int(name[:-4])))
    out.sort()
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--src', default=DEFAULT_SRC, help='pyramid to read and write into')
    ap.add_argument('--out', help='write .plc here instead of alongside the .pdm')
    ap.add_argument('--landcover', action='append', default=[],
                    help='landcover raster (repeatable; local path or http URL)')
    ap.add_argument('--imagery', action='append', default=[],
                    help='true-colour raster (repeatable; local path or http URL)')
    ap.add_argument('--sources', default=DEFAULT_SOURCES,
                    help='fetch_cover_sources.py index, used when no raster is given')
    ap.add_argument('--patch-m', type=float, default=DEFAULT_PATCH_M,
                    help='ground size a landcover patch should read as, in metres '
                         f'(default {DEFAULT_PATCH_M:.0f}; 0 disables the filter)')
    ap.add_argument('--max-zoom', type=int)
    ap.add_argument('--only', action='append', default=[], help='z/x/y, repeatable')
    ap.add_argument('--bbox', help='west,south,east,north degrees; bake only tiles '
                                   'overlapping it (default: every tile in the pyramid)')
    args = ap.parse_args(glue_negative_bbox(sys.argv[1:]))

    manifest_path = os.path.join(args.src, 'manifest.json')
    if not os.path.exists(manifest_path):
        print(f'error: no manifest at {manifest_path}', file=sys.stderr)
        print('Run tools/bake_planet_dem.py first.', file=sys.stderr)
        sys.exit(1)
    with open(manifest_path, encoding='utf-8') as fh:
        manifest = json.load(fh)

    landcover_paths = list(args.landcover)
    imagery_paths = list(args.imagery)
    if not landcover_paths and not imagery_paths and os.path.exists(args.sources):
        with open(args.sources, encoding='utf-8') as fh:
            found = json.load(fh)
        if found.get('landcover'):
            landcover_paths = [found['landcover']]
        if found.get('imagery'):
            imagery_paths = [found['imagery']]
        print(f'using sources from {args.sources}')

    if not landcover_paths and not imagery_paths:
        print('error: no cover sources. Run tools/fetch_cover_sources.py, or pass',
              file=sys.stderr)
        print('       --landcover / --imagery explicitly.', file=sys.stderr)
        sys.exit(1)

    def vsicurl(p: str) -> str:
        return f'/vsicurl/{p}' if p.startswith('http') else p

    landcover = [Source(vsicurl(p), [1], 0) for p in landcover_paths]
    imagery = [Source(vsicurl(p), [1, 2, 3], 0) for p in imagery_paths]
    for s in landcover + imagery:
        print(f'  {s.path}: {s.ds.width}x{s.ds.height} {s.ds.crs}')

    class_lut = build_class_lut()
    color_lut = build_color_lut()

    max_zoom = manifest.get('maxZoom', 0)
    if args.max_zoom is not None:
        max_zoom = min(max_zoom, args.max_zoom)

    if args.only:
        tiles = [tuple(int(v) for v in spec.split('/')) for spec in args.only]
    else:
        tiles = walk_tiles(args.src, max_zoom)

    if args.bbox:
        # The cover rasters were fetched for one area. A tile outside them
        # reads back nothing, which is not "leave it alone" - it is a .plc of
        # unknown class and LUT colour, written straight over whatever an
        # earlier bake produced there. Scope the tile list instead.
        bbox = parse_bbox(args.bbox)
        before = len(tiles)
        tiles = [t for t in tiles if tile_overlaps(t[0], t[1], t[2], bbox)]
        print(f'bbox: {len(tiles)} of {before} tiles overlap it; '
              f'{before - len(tiles)} left alone')

    out_root = args.out or args.src
    patch = f'{args.patch_m:.0f} m patches' if args.patch_m > 0 else 'raw classes'
    print(f'baking cover for {len(tiles)} tiles -> {out_root} ({patch})')

    pads = airfield_pads(manifest)
    if pads:
        print(f'airfields: {len(pads)} platform rectangles painted as built ground')

    written = 0
    with_imagery = 0
    paved_nodes = 0
    total_bytes = 0
    t0 = time.time()
    for i, (z, x, y) in enumerate(tiles):
        stem = os.path.join(args.src, str(z), str(x), str(y))
        pdm = f'{stem}.pdm'
        if not os.path.exists(pdm):
            continue
        size = pdm_size(pdm)
        bounds = tile_bounds(z, x, y)
        west, south, east, north = bounds
        node_m = ((north - south) / (size - 1)) * 110540

        # Read the class raster with a halo, so the majority filter below sees
        # the same neighbourhood a node would have had in the whole coverage.
        # Without it the outermost nodes are filtered against a truncated
        # window and adjacent tiles disagree along their shared edge.
        halo = halo_nodes(args.patch_m, node_m)
        pad = halo * ((north - south) / (size - 1))
        read_bounds = (west - pad, south - pad, east + pad, north + pad)
        read_size = size + 2 * halo

        # Classes. Mode resampling, because averaging category codes invents
        # categories that are not there - halfway between built-up and bare is
        # not "somewhat built-up", it is a different class entirely.
        classes = np.zeros((read_size, read_size), dtype=np.uint8)
        for src_lc in landcover:
            got = src_lc.read_onto(read_bounds, read_size, Resampling.mode)
            if got is None:
                continue
            fresh = (classes == CLS_UNKNOWN) & (got[0] != 0)
            classes[fresh] = class_lut[got[0]][fresh]

        classes = enlarge_patches(classes, args.patch_m, node_m)
        if halo:
            classes = classes[halo:halo + size, halo:halo + size]
        # The crop leaves a view into the padded array; the encoder needs the
        # bytes contiguous.
        classes = np.ascontiguousarray(classes)
        paved_nodes += stamp_airfield_classes(classes, bounds, size, pads)

        # Colour. Average, because this one really is a continuous quantity.
        colors = np.zeros((size, size, 3), dtype=np.uint8)
        covered = np.zeros((size, size), dtype=bool)
        for src_img in imagery:
            got = src_img.read_onto(bounds, size, Resampling.average)
            if got is None:
                continue
            fresh = (~covered) & np.any(got != 0, axis=0)
            if not fresh.any():
                continue
            for b in range(3):
                colors[..., b][fresh] = got[b][fresh]
            covered |= fresh

        gaps = ~covered
        if gaps.any():
            colors[gaps] = color_lut[classes][gaps]

        flags = PLC_FLAG_REAL_IMAGERY if covered.any() else 0
        if covered.any():
            with_imagery += 1

        out_dir = os.path.join(out_root, str(z), str(x))
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, f'{y}.plc')
        blob = encode_plc(size, flags, classes, colors)
        with open(out_path, 'wb') as fh:
            fh.write(blob)
        written += 1
        total_bytes += len(blob)

        if (i + 1) % 50 == 0 or i + 1 == len(tiles):
            pct = 100.0 * (i + 1) / max(1, len(tiles))
            sys.stdout.write(
                f'\r  {i + 1}/{len(tiles)} ({pct:.1f}%)  {total_bytes / 1048576:.1f} MB')
            sys.stdout.flush()
    sys.stdout.write('\n')

    for s in landcover + imagery:
        s.close()

    secs = time.time() - t0
    print(f'wrote {written} cover tiles, {total_bytes / 1048576:.1f} MB in {secs:.1f}s')
    print(f'  {with_imagery}/{max(1, written)} carry real imagery; '
          f'the rest fall back to class colours')
    if paved_nodes:
        print(f'  {paved_nodes} nodes repainted as airfield pavement')
    print('next: npm run bake:mesh')


if __name__ == '__main__':
    main()
