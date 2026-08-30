"""Tests for the raster windowing in tools/bake_planet_cover.py.

`Source.read_onto` is the one place a tile meets a source raster, and the two
disagree about their edges: the tile grid is fixed by the pyramid, the raster by
whatever `fetch_cover_sources.py` last downloaded. Everything here is about that
seam.
"""
from __future__ import annotations

import os
import tempfile
import unittest

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_bounds

from bake_planet_cover import Source

NODATA = 255


def write_raster(path: str, west: float, south: float, east: float, north: float,
                 width: int, height: int) -> None:
    """A single-band raster of a constant value, covering the given box."""
    with rasterio.open(
        path, 'w', driver='GTiff', width=width, height=height, count=1,
        dtype='uint8', crs='EPSG:4326', nodata=NODATA,
        transform=from_bounds(west, south, east, north, width, height),
    ) as ds:
        ds.write(np.full((height, width), 7, dtype='uint8'), 1)


class ReadOntoTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.path = os.path.join(self.dir, 'src.tif')
        # 100 px across one degree: one pixel is 0.01 deg.
        write_raster(self.path, 0.0, 0.0, 1.0, 1.0, 100, 100)
        self.src = Source(self.path, [1], NODATA)

    def tearDown(self):
        self.src.close()

    def test_a_tile_overlapping_by_less_than_a_pixel_is_skipped(self):
        """The narrow-bbox crash: rounding takes the sliver away.

        The tile really does overlap, so the bounds test lets it through, and
        then round_offsets puts the window's first column at the raster's width.
        Window.intersection raises on that rather than returning nothing, which
        killed the whole bake instead of skipping one tile.
        """
        self.assertIsNone(
            self.src.read_onto((1.0 - 1e-9, 0.2, 1.5, 0.7), 32, Resampling.nearest))
        # ...and the same on the other three sides.
        self.assertIsNone(
            self.src.read_onto((-0.5, 0.2, 1e-9, 0.7), 32, Resampling.nearest))
        self.assertIsNone(
            self.src.read_onto((0.2, 1.0 - 1e-9, 0.7, 1.5), 32, Resampling.nearest))
        self.assertIsNone(
            self.src.read_onto((0.2, -0.5, 0.7, 1e-9), 32, Resampling.nearest))

    def test_a_tile_clear_of_the_raster_is_skipped(self):
        self.assertIsNone(
            self.src.read_onto((2.0, 2.0, 3.0, 3.0), 32, Resampling.nearest))

    def test_a_tile_inside_the_raster_reads(self):
        out = self.src.read_onto((0.2, 0.2, 0.7, 0.7), 32, Resampling.nearest)
        self.assertIsNotNone(out)
        self.assertEqual(out.shape, (1, 32, 32))
        self.assertTrue(np.all(out == 7))

    def test_a_tile_hanging_off_the_edge_reads_the_part_that_exists(self):
        """Clamping has to keep the data where it belongs, not shift it."""
        out = self.src.read_onto((0.5, 0.2, 1.5, 0.7), 32, Resampling.nearest)
        self.assertIsNotNone(out)
        # The western half is inside the raster, the eastern half is not.
        self.assertTrue(np.all(out[0, :, :14] == 7), 'inside the raster went blank')
        self.assertTrue(np.all(out[0, :, 18:] == NODATA), 'data spilled past the edge')


if __name__ == '__main__':
    unittest.main()
