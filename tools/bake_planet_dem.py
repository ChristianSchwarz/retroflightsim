#!/usr/bin/env python3
"""Bake a WGS84 GeoTIFF DEM into the planet quadtree height pyramid.

Output layout (default ``assets/planet``)::

    manifest.json           pyramid description consumed by src/script/planet
    index.bin               packed "tile exists" bitmask per level
    {z}/{x}/{y}.pdm         zlib-compressed PDM1 height tile

Tiling is a geographic (Plate Carree) quadtree over the whole ellipsoid: level
``z`` holds ``2^(z+1)`` columns by ``2^z`` rows, ``x`` increasing east from
lon -180 and ``y`` increasing south from lat +90. Every tile carries
``tile_size`` grid *nodes* inclusive of both edges, so the last column of a tile
is bit-identical to the first column of its eastern neighbour.

Tiles that hold no land are not written at all; the runtime falls back to the
sea-level ellipsoid there, which is what keeps an ocean-heavy DEM cheap.

Usage::

    python tools/bake_planet_dem.py
    python tools/bake_planet_dem.py --input data/output_hh.tif --max-zoom 11

Requires ``rasterio`` and ``numpy``::

    pip install rasterio numpy
"""

from __future__ import annotations

import argparse
import json
import math
import os
import shutil
import struct
import sys
import time
import warnings
import zlib
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Tuple

import numpy as np

# rasterio 1.5 still reshapes arrays in place when reading; the warning is
# upstream noise that would otherwise drown the progress output.
warnings.filterwarnings('ignore', category=DeprecationWarning, module='rasterio')

try:
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.vrt import WarpedVRT
    from rasterio.windows import Window
except ImportError:  # pragma: no cover - dependency hint
    print('error: rasterio is required (pip install rasterio numpy)', file=sys.stderr)
    raise

TILE_MAGIC = b'PDM1'
TILE_HEADER_BYTES = 24
INDEX_MAGIC = b'PIX1'
NODATA_U16 = 0xFFFF
QUANT_MAX = 0xFFFE

# Source samples outside this band are voids rather than terrain.
VALID_MIN_M = -500.0
VALID_MAX_M = 9000.0

DEFAULT_INPUT = 'data/output_hh.tif'
DEFAULT_OUT = 'assets/planet'
DEFAULT_TILE_SIZE = 257
DEFAULT_SEA_LEVEL = 0.0
# A tile is "land" once any sample rises this far above the sea datum. Small
# enough to keep beaches, large enough to reject float noise on the sea floor.
LAND_EPSILON_M = 0.5


@dataclass(frozen=True)
class Bounds:
    west: float
    south: float
    east: float
    north: float

    def intersects(self, other: 'Bounds') -> bool:
        return not (self.east <= other.west or self.west >= other.east
                    or self.north <= other.south or self.south >= other.north)


def tile_bounds(z: int, x: int, y: int) -> Bounds:
    """Geodetic extent of tile (z, x, y) in degrees."""
    span = 180.0 / (1 << z)
    west = -180.0 + x * span
    north = 90.0 - y * span
    return Bounds(west, north - span, west + span, north)


def level_tile_counts(z: int) -> Tuple[int, int]:
    return (1 << (z + 1)), (1 << z)


def tile_range_for_bounds(z: int, b: Bounds) -> Tuple[int, int, int, int]:
    """Inclusive tile index range covering `b` at level `z`."""
    span = 180.0 / (1 << z)
    nx, ny = level_tile_counts(z)
    x0 = int(math.floor((b.west + 180.0) / span))
    x1 = int(math.ceil((b.east + 180.0) / span)) - 1
    y0 = int(math.floor((90.0 - b.north) / span))
    y1 = int(math.ceil((90.0 - b.south) / span)) - 1
    return (max(0, x0), max(0, y0), min(nx - 1, max(0, x1)), min(ny - 1, max(0, y1)))


def auto_max_zoom(deg_per_pixel: float, tile_size: int) -> int:
    """Smallest level whose node spacing resolves the source raster."""
    intervals = tile_size - 1
    for z in range(0, 24):
        spacing = (180.0 / (1 << z)) / intervals
        if spacing <= deg_per_pixel:
            return z
    return 23


class SourceSampler:
    """Bilinear point sampler over an axis-aligned EPSG:4326 raster."""

    def __init__(self, dataset, sea_level: float):
        self.ds = dataset
        self.sea_level = sea_level
        t = dataset.transform
        self.west = t.c
        self.north = t.f
        self.dx = t.a
        self.dy = -t.e
        self.width = dataset.width
        self.height = dataset.height
        self.nodata = dataset.nodata

    @property
    def bounds(self) -> Bounds:
        b = self.ds.bounds
        return Bounds(b.left, b.bottom, b.right, b.top)

    @property
    def deg_per_pixel(self) -> float:
        return min(self.dx, self.dy)

    def _clean(self, block: np.ndarray) -> np.ndarray:
        out = block.astype(np.float64, copy=True)
        if self.nodata is not None:
            out[out == self.nodata] = np.nan
        out[~np.isfinite(out)] = np.nan
        out[(out < VALID_MIN_M) | (out > VALID_MAX_M)] = np.nan
        return out

    def sample_grid(self, b: Bounds, n: int) -> np.ndarray:
        """Sample an `n` x `n` node grid over `b`; row 0 is the north edge.

        Nodes outside the raster resolve to the sea datum, so tiles straddling
        the DEM border blend into open water instead of punching holes.
        """
        lons = b.west + (b.east - b.west) * (np.arange(n, dtype=np.float64) / (n - 1))
        lats = b.north - (b.north - b.south) * (np.arange(n, dtype=np.float64) / (n - 1))

        # Continuous source pixel-centre coordinates.
        fx = (lons - self.west) / self.dx - 0.5
        fy = (self.north - lats) / self.dy - 0.5

        inside_x = (fx > -1.0) & (fx < self.width)
        inside_y = (fy > -1.0) & (fy < self.height)
        if not inside_x.any() or not inside_y.any():
            return np.full((n, n), self.sea_level, dtype=np.float64)

        cx = np.clip(fx, 0.0, self.width - 1.0)
        cy = np.clip(fy, 0.0, self.height - 1.0)

        x0 = int(math.floor(cx.min()))
        x1 = int(math.floor(cx.max())) + 1
        y0 = int(math.floor(cy.min()))
        y1 = int(math.floor(cy.max())) + 1
        x1 = min(x1, self.width - 1)
        y1 = min(y1, self.height - 1)

        window = Window(x0, y0, x1 - x0 + 1, y1 - y0 + 1)
        block = self._clean(self.ds.read(1, window=window))

        gx = cx - x0
        gy = cy - y0
        ix = np.clip(np.floor(gx).astype(np.int64), 0, block.shape[1] - 1)
        iy = np.clip(np.floor(gy).astype(np.int64), 0, block.shape[0] - 1)
        ix1 = np.minimum(ix + 1, block.shape[1] - 1)
        iy1 = np.minimum(iy + 1, block.shape[0] - 1)
        tx = (gx - ix)[None, :]
        ty = (gy - iy)[:, None]

        v00 = block[np.ix_(iy, ix)]
        v01 = block[np.ix_(iy, ix1)]
        v10 = block[np.ix_(iy1, ix)]
        v11 = block[np.ix_(iy1, ix1)]
        top = v00 * (1.0 - tx) + v01 * tx
        bottom = v10 * (1.0 - tx) + v11 * tx
        grid = top * (1.0 - ty) + bottom * ty

        # Voids and anything beyond the raster become open water.
        grid[~np.isfinite(grid)] = self.sea_level
        outside = ~np.outer(inside_y, inside_x)
        grid[outside] = self.sea_level
        return grid

    def land_mask(self, sea_level: float, max_cells: int = 4096) -> Tuple[np.ndarray, float, float]:
        """Coarse "has land" overview used to skip all-water tiles cheaply."""
        scale = max(1, int(math.ceil(max(self.width, self.height) / max_cells)))
        h = max(1, self.height // scale)
        w = max(1, self.width // scale)
        block = self._clean(self.ds.read(1, out_shape=(h, w)))
        mask = np.isfinite(block) & (block > sea_level + LAND_EPSILON_M)
        # Dilate by one cell so coastal tiles survive the decimation.
        padded = np.zeros((h + 2, w + 2), dtype=bool)
        padded[1:-1, 1:-1] = mask
        grown = (padded[0:-2, 1:-1] | padded[2:, 1:-1] | padded[1:-1, 0:-2]
                 | padded[1:-1, 2:] | padded[1:-1, 1:-1])
        return grown, (self.bounds.east - self.bounds.west) / w, (self.bounds.north - self.bounds.south) / h

    def close(self) -> None:
        self.ds.close()


def mask_has_land(mask: np.ndarray, src: Bounds, cell_lon: float, cell_lat: float, b: Bounds) -> bool:
    if not b.intersects(src):
        return False
    h, w = mask.shape
    c0 = int(math.floor((max(b.west, src.west) - src.west) / cell_lon))
    c1 = int(math.ceil((min(b.east, src.east) - src.west) / cell_lon))
    r0 = int(math.floor((src.north - min(b.north, src.north)) / cell_lat))
    r1 = int(math.ceil((src.north - max(b.south, src.south)) / cell_lat))
    c0 = max(0, min(w - 1, c0))
    r0 = max(0, min(h - 1, r0))
    c1 = max(c0 + 1, min(w, c1))
    r1 = max(r0 + 1, min(h, r1))
    return bool(mask[r0:r1, c0:c1].any())


def quantize(grid: np.ndarray) -> Tuple[np.ndarray, float, float, float]:
    finite = np.isfinite(grid)
    if not finite.any():
        return np.full(grid.shape, NODATA_U16, dtype=np.uint16), 0.0, 0.0, 1.0
    lo = float(np.min(grid[finite]))
    hi = float(np.max(grid[finite]))
    scale = (hi - lo) / QUANT_MAX if hi > lo else 1.0
    q = np.full(grid.shape, NODATA_U16, dtype=np.uint16)
    if hi > lo:
        vals = np.rint((grid[finite] - lo) / scale)
        q[finite] = np.clip(vals, 0, QUANT_MAX).astype(np.uint16)
    else:
        q[finite] = 0
    return q, lo, hi, scale


def encode_tile(grid: np.ndarray, geometric_error: float) -> bytes:
    n = grid.shape[0]
    q, lo, hi, scale = quantize(grid)
    flags = 1 if bool((q == NODATA_U16).any()) else 0
    header = struct.pack(
        '<4sHBBffff',
        TILE_MAGIC, n, flags, 0, lo, hi, scale, float(geometric_error),
    )
    assert len(header) == TILE_HEADER_BYTES, len(header)
    payload = header + q.astype('<u2').tobytes(order='C')
    return zlib.compress(payload, 6)


def upsample_parent_quadrant(parent: np.ndarray, qx: int, qy: int, n: int) -> np.ndarray:
    """Bilinear 2x upsample of one parent quadrant onto the child node grid."""
    half = (n - 1) // 2
    sub = parent[qy * half: qy * half + half + 1, qx * half: qx * half + half + 1]
    up = np.empty((n, n), dtype=np.float64)
    up[0::2, 0::2] = sub
    up[0::2, 1::2] = 0.5 * (sub[:, :-1] + sub[:, 1:])
    up[1::2, 0::2] = 0.5 * (sub[:-1, :] + sub[1:, :])
    up[1::2, 1::2] = 0.25 * (sub[:-1, :-1] + sub[:-1, 1:] + sub[1:, :-1] + sub[1:, 1:])
    return up


def build_parent(children: Dict[Tuple[int, int], np.ndarray], n: int, sea_level: float) -> np.ndarray:
    """Point-decimate four child node grids into one parent grid.

    Point decimation (rather than averaging) keeps parent nodes exactly on top
    of child nodes, so shared tile edges stay bit-identical between neighbours
    and the geometric error below measures real dropped detail.
    """
    half = (n - 1) // 2
    parent = np.full((n, n), sea_level, dtype=np.float64)
    for (qx, qy), child in children.items():
        parent[qy * half: qy * half + half + 1, qx * half: qx * half + half + 1] = child[0::2, 0::2]
    return parent


def parent_geometric_error(
    parent: np.ndarray,
    children: Dict[Tuple[int, int], np.ndarray],
    child_errors: Dict[Tuple[int, int], float],
    n: int,
) -> float:
    """Error of drawing `parent` instead of descending into `children`.

    Includes the children's own errors so the value never decreases going up
    the tree; a coarse node that under-reported would let the LOD selector stop
    refining before reaching the detail it promised.
    """
    worst = 0.0
    for quadrant, child in children.items():
        approx = upsample_parent_quadrant(parent, quadrant[0], quadrant[1], n)
        diff = np.abs(approx - child)
        if diff.size:
            worst = max(worst, float(np.max(diff)))
        worst = max(worst, child_errors.get(quadrant, 0.0))
    return worst


def write_tile(out_dir: str, z: int, x: int, y: int, blob: bytes) -> int:
    path = os.path.join(out_dir, str(z), str(x))
    os.makedirs(path, exist_ok=True)
    with open(os.path.join(path, f'{y}.pdm'), 'wb') as fh:
        fh.write(blob)
    return len(blob)


def pack_index(levels: List[Tuple[int, int, int, int, int, List[Tuple[int, int]]]]) -> bytes:
    """`levels` entries are (z, minX, minY, w, h, [(x, y), ...])."""
    if not levels:
        return INDEX_MAGIC + struct.pack('<HH', 0, 0)
    min_zoom = levels[0][0]
    max_zoom = levels[-1][0]
    head = bytearray(INDEX_MAGIC + struct.pack('<HH', min_zoom, max_zoom))
    masks = bytearray()
    for z, min_x, min_y, w, h, coords in levels:
        head += struct.pack('<IIII', min_x, min_y, w, h)
        bits = bytearray((w * h + 7) // 8)
        for (x, y) in coords:
            idx = (y - min_y) * w + (x - min_x)
            bits[idx >> 3] |= 1 << (idx & 7)
        masks += bits
    return bytes(head + masks)


def bake(args: argparse.Namespace) -> int:
    started = time.time()
    dataset = rasterio.open(args.input)
    vrt: Optional[WarpedVRT] = None
    if dataset.crs is None:
        print('error: source has no CRS', file=sys.stderr)
        return 2
    if dataset.crs.to_epsg() != 4326:
        print(f'reprojecting {dataset.crs} -> EPSG:4326')
        vrt = WarpedVRT(dataset, crs='EPSG:4326', resampling=Resampling.bilinear)
        sampler = SourceSampler(vrt, args.sea_level)
    else:
        sampler = SourceSampler(dataset, args.sea_level)

    src_bounds = sampler.bounds
    tile_size = args.tile_size
    if (tile_size - 1) & (tile_size - 2) != 0:
        print(f'error: --tile-size must be 2^k+1 (got {tile_size})', file=sys.stderr)
        return 2

    max_zoom = args.max_zoom if args.max_zoom is not None else auto_max_zoom(sampler.deg_per_pixel, tile_size)
    min_zoom = args.min_zoom
    if min_zoom > max_zoom:
        print('error: --min-zoom above --max-zoom', file=sys.stderr)
        return 2

    node_spacing = (180.0 / (1 << max_zoom)) / (tile_size - 1)
    print(f'source      {args.input}')
    print(f'raster      {sampler.width} x {sampler.height} @ {sampler.deg_per_pixel:.8f} deg/px')
    print(f'coverage    lon [{src_bounds.west:.5f}, {src_bounds.east:.5f}] '
          f'lat [{src_bounds.south:.5f}, {src_bounds.north:.5f}]')
    print(f'zoom        {min_zoom}..{max_zoom} (node spacing {node_spacing:.8f} deg '
          f'~ {node_spacing * 111320.0:.1f} m)')

    if os.path.isdir(args.out) and args.clean:
        shutil.rmtree(args.out)
    os.makedirs(args.out, exist_ok=True)

    mask, cell_lon, cell_lat = sampler.land_mask(args.sea_level)
    print(f'land mask   {mask.shape[1]} x {mask.shape[0]} cells, {int(mask.sum())} with land')

    # --- finest level -----------------------------------------------------
    x0, y0, x1, y1 = tile_range_for_bounds(max_zoom, src_bounds)
    candidates = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)
                  if mask_has_land(mask, src_bounds, cell_lon, cell_lat, tile_bounds(max_zoom, x, y))]
    print(f'level {max_zoom:2d}    {len(candidates)} candidate tiles '
          f'(of {(x1 - x0 + 1) * (y1 - y0 + 1)} in coverage)')

    level_grids: Dict[Tuple[int, int], np.ndarray] = {}
    total_bytes = 0
    total_tiles = 0
    height_min = math.inf
    height_max = -math.inf
    level_errors: Dict[int, float] = {}
    level_index: List[Tuple[int, int, int, int, int, List[Tuple[int, int]]]] = []

    for i, (x, y) in enumerate(candidates):
        grid = sampler.sample_grid(tile_bounds(max_zoom, x, y), tile_size)
        if float(np.nanmax(grid)) <= args.sea_level + LAND_EPSILON_M:
            continue
        level_grids[(x, y)] = grid
        if (i % 200) == 0:
            print(f'  sampling {i + 1}/{len(candidates)}', flush=True)

    print(f'level {max_zoom:2d}    {len(level_grids)} tiles with land')

    # Geometric error of a tile is the detail lost by drawing it instead of its
    # four children, so it is only known once the children have been decimated.
    tile_errors: Dict[Tuple[int, int], float] = {}

    for z in range(max_zoom, min_zoom - 1, -1):
        written: List[Tuple[int, int]] = []
        level_max_error = 0.0
        for (x, y), grid in sorted(level_grids.items()):
            err = tile_errors.get((x, y), 0.0)
            level_max_error = max(level_max_error, err)
            finite = np.isfinite(grid)
            if finite.any():
                height_min = min(height_min, float(np.min(grid[finite])))
                height_max = max(height_max, float(np.max(grid[finite])))
            total_bytes += write_tile(args.out, z, x, y, encode_tile(grid, err))
            total_tiles += 1
            written.append((x, y))
        level_errors[z] = level_max_error
        if written:
            xs = [c[0] for c in written]
            ys = [c[1] for c in written]
            level_index.append((z, min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1, written))
        print(f'level {z:2d}    wrote {len(written)} tiles, max geometric error '
              f'{level_max_error:.2f} m', flush=True)

        if z == min_zoom:
            break

        parents: Dict[Tuple[int, int], np.ndarray] = {}
        parent_children: Dict[Tuple[int, int], Dict[Tuple[int, int], np.ndarray]] = {}
        parent_child_errors: Dict[Tuple[int, int], Dict[Tuple[int, int], float]] = {}
        for (x, y), grid in level_grids.items():
            key = (x >> 1, y >> 1)
            quadrant = (x & 1, y & 1)
            parent_children.setdefault(key, {})[quadrant] = grid
            parent_child_errors.setdefault(key, {})[quadrant] = tile_errors.get((x, y), 0.0)
        next_errors: Dict[Tuple[int, int], float] = {}
        for key, children in parent_children.items():
            parent = build_parent(children, tile_size, args.sea_level)
            parents[key] = parent
            next_errors[key] = parent_geometric_error(
                parent, children, parent_child_errors[key], tile_size)
        level_grids = parents
        tile_errors = next_errors

    level_index.sort(key=lambda e: e[0])
    with open(os.path.join(args.out, 'index.bin'), 'wb') as fh:
        fh.write(pack_index(level_index))

    center_lat = 0.5 * (src_bounds.south + src_bounds.north)
    center_lon = 0.5 * (src_bounds.west + src_bounds.east)
    manifest = {
        'version': 2,
        'scheme': 'geographic-quadtree',
        'ellipsoid': 'WGS84',
        'tileSize': tile_size,
        'encoding': 'uint16',
        'compression': 'zlib',
        'nodata': NODATA_U16,
        'minZoom': min_zoom,
        'maxZoom': max_zoom,
        'heightMin': None if height_min == math.inf else height_min,
        'heightMax': None if height_max == -math.inf else height_max,
        'seaLevel': args.sea_level,
        'coverage': {
            'west': src_bounds.west,
            'south': src_bounds.south,
            'east': src_bounds.east,
            'north': src_bounds.north,
        },
        'enuOrigin': {'lat': center_lat, 'lon': center_lon, 'height': 0.0},
        'tilePath': '{z}/{x}/{y}.pdm',
        'indexPath': 'index.bin',
        'levelGeometricErrorM': [level_errors.get(z, 0.0) for z in range(0, max_zoom + 1)],
    }
    with open(os.path.join(args.out, 'manifest.json'), 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, indent=2)
        fh.write('\n')

    if vrt is not None:
        vrt.close()
    dataset.close()

    print(f'\nwrote {total_tiles} tiles, {total_bytes / (1024 * 1024):.1f} MB to {args.out}')
    print(f'height range {manifest["heightMin"]:.2f} .. {manifest["heightMax"]:.2f} m')
    print(f'done in {time.time() - started:.1f}s')
    return 0


def main(argv: Optional[Iterable[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--input', default=DEFAULT_INPUT, help=f'source DEM GeoTIFF (default {DEFAULT_INPUT})')
    parser.add_argument('--out', default=DEFAULT_OUT, help=f'output directory (default {DEFAULT_OUT})')
    parser.add_argument('--tile-size', type=int, default=DEFAULT_TILE_SIZE, help='nodes per tile edge, must be 2^k+1')
    parser.add_argument('--min-zoom', type=int, default=0)
    parser.add_argument('--max-zoom', type=int, default=None, help='default: derived from source resolution')
    parser.add_argument('--sea-level', type=float, default=DEFAULT_SEA_LEVEL)
    parser.add_argument('--clean', action='store_true', help='delete the output directory first')
    args = parser.parse_args(list(argv) if argv is not None else None)
    return bake(args)


if __name__ == '__main__':
    raise SystemExit(main())
