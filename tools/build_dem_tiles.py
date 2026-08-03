#!/usr/bin/env python3
"""Build a global-scheme geographic height tile pyramid from a WGS84 GeoTIFF DEM.

Tiles use the Cesium-style geographic scheme:
  xCount(z) = 2^(z+1),  yCount(z) = 2^z
  lon [-180, 180], lat [-90, 90]

Only tiles overlapping the GeoTIFF coverage are written. Coarse whole-Earth
levels are not baked — the runtime EllipsoidSeaSource fills those.

Output:
  assets/terrain/manifest.json
  assets/terrain/{z}/{x}/{y}.r16
"""

from __future__ import annotations

import argparse
import json
import math
import struct
import sys
from pathlib import Path

import numpy as np

try:
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.transform import from_bounds as transform_from_bounds
    from rasterio.warp import reproject, transform_bounds
except ImportError:
    print("Install rasterio: pip install rasterio numpy", file=sys.stderr)
    raise


MAGIC = b"R16H"
NODATA_U16 = 65535
DEFAULT_TILE_SIZE = 257


def log(msg: str) -> None:
    print(msg, flush=True)


def x_count(z: int) -> int:
    return 1 << (z + 1)


def y_count(z: int) -> int:
    return 1 << z


def tile_bounds(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    """Return (west, south, east, north) in degrees."""
    xc, yc = x_count(z), y_count(z)
    lon_span = 360.0 / xc
    lat_span = 180.0 / yc
    west = -180.0 + x * lon_span
    east = west + lon_span
    north = 90.0 - y * lat_span
    south = north - lat_span
    return west, south, east, north


def tiles_overlapping(
    z: int, west: float, south: float, east: float, north: float
) -> list[tuple[int, int]]:
    xc, yc = x_count(z), y_count(z)
    lon_span = 360.0 / xc
    lat_span = 180.0 / yc
    x0 = max(0, int(math.floor((west + 180.0) / lon_span)))
    x1 = min(xc - 1, int(math.floor((east + 180.0 - 1e-12) / lon_span)))
    y0 = max(0, int(math.floor((90.0 - north) / lat_span)))
    y1 = min(yc - 1, int(math.floor((90.0 - south - 1e-12) / lat_span)))
    return [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]


def choose_max_zoom(pixel_size_deg: float, tile_size: int) -> int:
    target_span = max(pixel_size_deg * (tile_size - 1), pixel_size_deg)
    z = int(round(math.log2(360.0 / target_span) - 1))
    return max(0, min(z, 15))


def sample_tile(
    src: "rasterio.DatasetReader",
    west: float,
    south: float,
    east: float,
    north: float,
    size: int,
    src_nodata: float | None,
) -> np.ndarray:
    """Reproject DEM into a size×size float32 grid (row 0 = north)."""
    dst = np.full((size, size), np.nan, dtype=np.float32)
    dst_transform = transform_from_bounds(west, south, east, north, size, size)
    reproject(
        source=rasterio.band(src, 1),
        destination=dst,
        src_transform=src.transform,
        src_crs=src.crs,
        dst_transform=dst_transform,
        dst_crs="EPSG:4326",
        resampling=Resampling.bilinear,
        src_nodata=src_nodata,
        dst_nodata=np.nan,
    )
    dst = np.where(np.isfinite(dst) & (dst > -500.0) & (dst < 9000.0), dst, np.nan)
    return dst


def quantize(tile: np.ndarray, h_min: float, h_scale: float) -> np.ndarray:
    out = np.full(tile.shape, NODATA_U16, dtype=np.uint16)
    valid = np.isfinite(tile)
    if h_scale <= 0:
        out[valid] = 0
        return out
    q = np.rint((tile[valid] - h_min) / h_scale).astype(np.int32)
    q = np.clip(q, 0, NODATA_U16 - 1)
    out[valid] = q.astype(np.uint16)
    return out


def write_r16(path: Path, data: np.ndarray, h_min: float, h_scale: float) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    header = MAGIC + struct.pack("<ffI", float(h_min), float(h_scale), int(data.shape[0]))
    with open(path, "wb") as f:
        f.write(header)
        f.write(np.ascontiguousarray(data, dtype="<u2").tobytes())


def height_range_fast(src: "rasterio.DatasetReader", src_nodata: float | None) -> tuple[float, float]:
    """Estimate min/max from a downsampled overview (fast)."""
    scale = max(1, max(src.width, src.height) // 2048)
    out_h = max(1, src.height // scale)
    out_w = max(1, src.width // scale)
    data = src.read(
        1,
        out_shape=(out_h, out_w),
        resampling=Resampling.nearest,
    )
    data = np.asarray(data, dtype=np.float64)
    if src_nodata is not None:
        data = np.where(data == src_nodata, np.nan, data)
    data = data[np.isfinite(data) & (data > -500.0) & (data < 9000.0)]
    if data.size == 0:
        return 0.0, 1.0
    return float(data.min()), float(data.max())


def build_pyramid(
    src_path: Path,
    out_dir: Path,
    tile_size: int,
    min_zoom: int,
    max_zoom: int | None,
) -> dict:
    with rasterio.open(src_path) as src:
        b = src.bounds
        if src.crs and not src.crs.is_geographic:
            west, south, east, north = transform_bounds(
                src.crs, "EPSG:4326", b.left, b.bottom, b.right, b.top
            )
        else:
            west, south, east, north = b.left, b.bottom, b.right, b.top

        if north < south:
            south, north = north, south
        if east < west:
            west, east = east, west

        pixel_size = abs(src.transform.a)
        src_nodata = src.nodata
        if max_zoom is None:
            max_zoom = choose_max_zoom(pixel_size, tile_size)

        log(
            f"Coverage lon[{west:.5f},{east:.5f}] lat[{south:.5f},{north:.5f}] "
            f"pixel~{pixel_size * 3600:.2f} arcsec maxZoom={max_zoom}"
        )

        log("Scanning height range...")
        h_min, h_max = height_range_fast(src, src_nodata)
        if h_max <= h_min:
            h_max = h_min + 1.0
        h_scale = (h_max - h_min) / (NODATA_U16 - 1)
        log(f"Height range [{h_min:.2f}, {h_max:.2f}] m  scale={h_scale:.6f}")

        origin_lon = 0.5 * (west + east)
        origin_lat = 0.5 * (south + north)

        tile_count = 0
        for z in range(max_zoom, min_zoom - 1, -1):
            coords = tiles_overlapping(z, west, south, east, north)
            log(f"Building zoom {z} ({len(coords)} tiles)...")
            level_count = 0
            for x, y in coords:
                tw, ts, te, tn = tile_bounds(z, x, y)
                if te < west or tw > east or tn < south or ts > north:
                    continue
                grid = sample_tile(src, tw, ts, te, tn, tile_size, src_nodata)
                if not np.isfinite(grid).any():
                    continue
                q = quantize(grid, h_min, h_scale)
                write_r16(out_dir / str(z) / str(x) / f"{y}.r16", q, h_min, h_scale)
                level_count += 1
                tile_count += 1
                if level_count % 25 == 0:
                    log(f"  wrote {level_count}/{len(coords)}...")
            log(f"  zoom {z}: {level_count} tiles")

    manifest = {
        "version": 1,
        "scheme": "geographic-cesium",
        "ellipsoid": "WGS84",
        "tileSize": tile_size,
        "nodata": NODATA_U16,
        "encoding": "uint16",
        "heightMin": h_min,
        "heightScale": h_scale,
        "heightMax": h_max,
        "minZoom": min_zoom,
        "maxZoom": max_zoom,
        "coverage": {
            "west": west,
            "south": south,
            "east": east,
            "north": north,
        },
        "enuOrigin": {
            "lat": origin_lat,
            "lon": origin_lon,
            "height": 0.0,
        },
        "seaLevel": 0.0,
        "tilePath": "{z}/{x}/{y}.r16",
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")
    log(f"Done. {tile_count} tiles -> {out_dir}")
    return manifest


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--input", type=Path, default=root / "data" / "output_hh.tif")
    p.add_argument("--out", type=Path, default=root / "assets" / "terrain")
    p.add_argument("--tile-size", type=int, default=DEFAULT_TILE_SIZE)
    p.add_argument("--min-zoom", type=int, default=0)
    p.add_argument("--max-zoom", type=int, default=None)
    args = p.parse_args()
    if not args.input.is_file():
        print(f"Missing input: {args.input}", file=sys.stderr)
        return 1
    build_pyramid(args.input, args.out, args.tile_size, args.min_zoom, args.max_zoom)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
