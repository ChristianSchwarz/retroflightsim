"""Tests for tools/bake_osm_coast.py.

Two things: the bbox rule that decides which tiles a scoped bake may write --
which is what keeps two imported areas stitched together -- and the layer that
carries a river to the renderer as a stroke.
"""
from __future__ import annotations

import struct
import unittest
import zlib

from shapely.geometry import LineString

from bake_osm_coast import (
    LVR_MAGIC,
    LVR2_MAGIC,
    LVR3_MAGIC,
    WATERWAY_FALLBACK_WIDTH_M,
    Bounds,
    Watercourse,
    clip_watercourses,
    encode_lvr,
    snap_bounds_to_tiles,
    tile_range_for_bounds,
    waterway_width_m,
)

TILE = Bounds(0.0, 0.0, 1.0, 1.0)
MAX_ZOOM = 12
SPAN = 180.0 / (1 << MAX_ZOOM)


class SnapBoundsTest(unittest.TestCase):
    """Every tile the bake writes has to be one it has land for all of."""

    def edges_are_tile_aligned(self, b: Bounds):
        for v in ((b.west + 180.0) / SPAN, (b.east + 180.0) / SPAN,
                  (90.0 - b.north) / SPAN, (90.0 - b.south) / SPAN):
            self.assertAlmostEqual(v, round(v), places=6, msg=f'{v} is not a tile edge')

    def test_snaps_a_hand_drawn_box_out_to_whole_tiles(self):
        b = snap_bounds_to_tiles(
            Bounds(32.11, 45.204449, 35.02, 46.47), MAX_ZOOM)
        self.edges_are_tile_aligned(b)
        # Outwards only: nothing the caller asked for is dropped.
        self.assertLessEqual(b.west, 32.11)
        self.assertLessEqual(b.south, 45.204449)
        self.assertGreaterEqual(b.east, 35.02)
        self.assertGreaterEqual(b.north, 46.47)

    def test_a_box_already_on_tile_edges_is_unchanged(self):
        # The Crimea import as the manifest records it. Growing this by a tile
        # would spread every scoped bake a ring wider on each re-run.
        aligned = Bounds(32.0361328125, 45.17578125, 35.068359375, 46.494140625)
        self.assertEqual(snap_bounds_to_tiles(aligned, MAX_ZOOM), aligned)

    def test_every_tile_in_range_is_inside_the_snapped_box(self):
        """The seam: a tile half in the box is written half as open sea.

        The raw box below is the one measured on the second Crimea import — its
        south edge fell a third of the way down tile row 1019 — and unsnapped
        that row is in range while the box covers only its top third.
        """
        raw = Bounds(32.11, 45.204449, 35.02, 46.47)
        for b, want_inside in ((raw, False), (snap_bounds_to_tiles(raw, MAX_ZOOM), True)):
            x0, y0, x1, y1 = tile_range_for_bounds(MAX_ZOOM, b)
            covered = all(
                b.west - 1e-9 <= -180.0 + x * SPAN
                and -180.0 + (x + 1) * SPAN <= b.east + 1e-9
                and b.south - 1e-9 <= 90.0 - (y + 1) * SPAN
                and 90.0 - y * SPAN <= b.north + 1e-9
                for x in range(x0, x1 + 1) for y in range(y0, y1 + 1))
            self.assertEqual(covered, want_inside)

    def test_a_western_box_snaps_the_same_way(self):
        b = snap_bounds_to_tiles(
            Bounds(-113.61, 35.60, -110.79, 37.10), MAX_ZOOM)
        self.edges_are_tile_aligned(b)
        self.assertLessEqual(b.west, -113.61)
        self.assertGreaterEqual(b.east, -110.79)


class WaterwayWidthTest(unittest.TestCase):
    def test_tagged_width_wins(self):
        self.assertEqual(waterway_width_m({'waterway': 'canal', 'width': '18'}), 18.0)

    def test_untagged_falls_back_per_kind(self):
        self.assertEqual(waterway_width_m({'waterway': 'river'}),
                         WATERWAY_FALLBACK_WIDTH_M['river'])
        self.assertEqual(waterway_width_m({'waterway': 'canal'}),
                         WATERWAY_FALLBACK_WIDTH_M['canal'])

    def test_a_narrow_canal_keeps_its_true_width(self):
        """No floor: the minimum is a screen quantity and lives in the stroke."""
        self.assertEqual(waterway_width_m({'waterway': 'canal', 'width': '4'}), 4.0)

    def test_not_a_watercourse(self):
        self.assertIsNone(waterway_width_m({'natural': 'water'}))
        self.assertIsNone(waterway_width_m({'waterway': 'dam'}))


class ClipWatercoursesTest(unittest.TestCase):
    def test_clips_to_the_tile_and_keeps_the_width(self):
        course = Watercourse(LineString([(-1.0, 0.5), (2.0, 0.5)]), 12.0)
        out = clip_watercourses([course], TILE, 0.0)
        self.assertEqual(len(out), 1)
        width, pts = out[0]
        self.assertEqual(width, 12.0)
        self.assertAlmostEqual(min(p[0] for p in pts), 0.0, places=6)
        self.assertAlmostEqual(max(p[0] for p in pts), 1.0, places=6)

    def test_a_line_leaving_and_returning_becomes_two_runs(self):
        """Joined, the stroke would be drawn across ground it does not cover."""
        course = Watercourse(
            LineString([(0.2, 0.5), (0.5, 1.5), (0.8, 0.5)]), 30.0)
        out = clip_watercourses([course], TILE, 0.0)
        self.assertEqual(len(out), 2)

    def test_a_line_outside_the_tile_is_dropped(self):
        course = Watercourse(LineString([(5.0, 5.0), (6.0, 6.0)]), 30.0)
        self.assertEqual(clip_watercourses([course], TILE, 0.0), [])

    def test_simplify_drops_points_but_keeps_the_ends(self):
        pts = [(0.1 + i * 0.001, 0.5 + (i % 2) * 1e-7) for i in range(400)]
        course = Watercourse(LineString(pts), 30.0)
        plain = clip_watercourses([course], TILE, 0.0)[0][1]
        thinned = clip_watercourses([course], TILE, 1e-4)[0][1]
        self.assertLess(len(thinned), len(plain))
        self.assertAlmostEqual(thinned[0][0], plain[0][0], places=6)
        self.assertAlmostEqual(thinned[-1][0], plain[-1][0], places=6)


class EncodeLvrTest(unittest.TestCase):
    RING = ([(0.0, 0.0), (1.0, 0.0), (1.0, 1.0)], [])

    def magic(self, blob: bytes) -> bytes:
        return zlib.decompress(blob)[:4]

    def test_version_is_the_highest_layer_present(self):
        """A tile with nothing new stays LVR1 and byte-identical."""
        self.assertEqual(self.magic(encode_lvr([self.RING])), LVR_MAGIC)
        self.assertEqual(
            self.magic(encode_lvr([self.RING], [(12.0, self.RING[0], [])])),
            LVR2_MAGIC)
        self.assertEqual(
            self.magic(encode_lvr([self.RING], [], [(30.0, [(0.0, 0.0), (1.0, 1.0)])])),
            LVR3_MAGIC)

    def test_lines_carry_their_width_and_points(self):
        line = [(0.25, 0.5), (0.75, 0.5)]
        payload = zlib.decompress(encode_lvr([], [], [(18.5, line)]))
        # LVR3, zero polygons, zero inland bodies, then the line layer.
        self.assertEqual(payload[:4], LVR3_MAGIC)
        self.assertEqual(struct.unpack_from('<H', payload, 4)[0], 0)   # polygons
        self.assertEqual(struct.unpack_from('<H', payload, 6)[0], 0)   # inland
        self.assertEqual(struct.unpack_from('<H', payload, 8)[0], 1)   # lines
        self.assertAlmostEqual(struct.unpack_from('<f', payload, 10)[0], 18.5, places=4)
        self.assertEqual(struct.unpack_from('<H', payload, 14)[0], len(line))
        for i, (lon, lat) in enumerate(line):
            got = struct.unpack_from('<ff', payload, 16 + i * 8)
            self.assertAlmostEqual(got[0], lon, places=5)
            self.assertAlmostEqual(got[1], lat, places=5)


if __name__ == '__main__':
    unittest.main()
