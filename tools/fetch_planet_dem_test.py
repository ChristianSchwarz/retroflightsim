"""Tests for tools/fetch_planet_dem.py."""
from __future__ import annotations

import unittest

from fetch_planet_dem import (
    ARCSEC_DEG,
    TILE_SIZE,
    auto_max_zoom,
    glue_negative_values,
    lattice_step,
    parse_bbox,
    snap_bbox_to_pixels,
    snap_bbox_to_tiles,
    target_grid,
    tile_name,
    tiles_for_bbox,
)


class ParseBboxTest(unittest.TestCase):

    def test_reads_west_south_east_north(self):
        self.assertEqual(parse_bbox('6.0,45.6,8.0,46.6'), (6.0, 45.6, 8.0, 46.6))

    def test_tolerates_spaces(self):
        self.assertEqual(parse_bbox(' 6 , 45 , 8 , 46 '), (6.0, 45.0, 8.0, 46.0))

    def test_rejects_wrong_arity(self):
        with self.assertRaises(ValueError):
            parse_bbox('1,2,3')

    def test_rejects_inverted_axes(self):
        with self.assertRaises(ValueError):
            parse_bbox('8,45,6,46')
        with self.assertRaises(ValueError):
            parse_bbox('6,46,8,45')

    def test_rejects_outside_wgs84(self):
        with self.assertRaises(ValueError):
            parse_bbox('179,45,181,46')

    def test_rejects_antimeridian_span(self):
        # west > east is how a bbox crossing 180 would be written. Nothing
        # downstream splits it, so it has to be refused rather than silently
        # fetched inside out.
        with self.assertRaises(ValueError):
            parse_bbox('179,45,-179,46')


class GlueNegativeValuesTest(unittest.TestCase):

    def test_glues_a_western_bbox(self):
        # The Canaries coverage. Left split, argparse reads it as an option.
        self.assertEqual(
            glue_negative_values(['--bbox', '-18.66,26.97,-12.61,30.49']),
            ['--bbox=-18.66,26.97,-12.61,30.49'],
        )

    def test_leaves_a_positive_bbox_split(self):
        self.assertEqual(
            glue_negative_values(['--bbox', '6,45,8,46']),
            ['--bbox', '6,45,8,46'],
        )

    def test_leaves_other_options_alone(self):
        self.assertEqual(
            glue_negative_values(['--out', 'a.tif', '--arcsec', '3']),
            ['--out', 'a.tif', '--arcsec', '3'],
        )

    def test_keeps_following_options(self):
        self.assertEqual(
            glue_negative_values(['--bbox', '-1,2,3,4', '--out', 'a.tif']),
            ['--bbox=-1,2,3,4', '--out', 'a.tif'],
        )

    def test_trailing_bbox_without_a_value_is_left_for_argparse(self):
        self.assertEqual(glue_negative_values(['--bbox']), ['--bbox'])


class TileNameTest(unittest.TestCase):

    def test_northern_western_corner(self):
        self.assertEqual(tile_name(28, -16), 'Copernicus_DSM_COG_10_N28_00_W016_00_DEM')

    def test_southern_eastern_corner(self):
        self.assertEqual(tile_name(-1, 0), 'Copernicus_DSM_COG_10_S01_00_E000_00_DEM')

    def test_pads_to_archive_widths(self):
        # Two digits of latitude, three of longitude — an unpadded name is a 404.
        self.assertEqual(tile_name(5, 5), 'Copernicus_DSM_COG_10_N05_00_E005_00_DEM')


class TilesForBboxTest(unittest.TestCase):

    def test_covers_every_square_the_bbox_touches(self):
        names = tiles_for_bbox((6.0, 45.6, 8.0, 46.6))
        self.assertEqual(names, [
            'Copernicus_DSM_COG_10_N45_00_E006_00_DEM',
            'Copernicus_DSM_COG_10_N45_00_E007_00_DEM',
            'Copernicus_DSM_COG_10_N46_00_E006_00_DEM',
            'Copernicus_DSM_COG_10_N46_00_E007_00_DEM',
        ])

    def test_bbox_inside_one_square(self):
        self.assertEqual(
            tiles_for_bbox((7.6, 45.9, 7.8, 46.0)),
            ['Copernicus_DSM_COG_10_N45_00_E007_00_DEM'],
        )

    def test_negative_longitudes_floor_away_from_zero(self):
        # -15.5 sits in the square named W016, not W015.
        self.assertIn('Copernicus_DSM_COG_10_N28_00_W016_00_DEM',
                      tiles_for_bbox((-15.5, 28.2, -15.4, 28.3)))


class MaxZoomTest(unittest.TestCase):

    def test_one_arcsec_matches_the_existing_pyramid(self):
        # The whole point of the 1 arcsec default: the Canaries pyramid was
        # baked to z12, and an imported area has to land on the same depth or
        # the merged pyramid is a patchwork.
        self.assertEqual(auto_max_zoom(ARCSEC_DEG, TILE_SIZE), 12)

    def test_coarser_source_bakes_shallower(self):
        self.assertLess(auto_max_zoom(3 * ARCSEC_DEG, TILE_SIZE), 12)


class SnapBboxTest(unittest.TestCase):

    Z = 12
    SPAN = 180.0 / (1 << 12)

    def test_snapped_box_contains_the_request(self):
        req = (7.6, 45.9, 7.8, 46.0)
        w, s, e, n = snap_bbox_to_tiles(req, self.Z)
        self.assertLessEqual(w, req[0])
        self.assertLessEqual(s, req[1])
        self.assertGreaterEqual(e, req[2])
        self.assertGreaterEqual(n, req[3])

    def test_edges_land_on_tile_boundaries(self):
        w, s, e, n = snap_bbox_to_tiles((7.6, 45.9, 7.8, 46.0), self.Z)
        for lon in (w, e):
            self.assertAlmostEqual((lon + 180.0) / self.SPAN,
                                   round((lon + 180.0) / self.SPAN), places=6)
        for lat in (s, n):
            self.assertAlmostEqual((90.0 - lat) / self.SPAN,
                                   round((90.0 - lat) / self.SPAN), places=6)

    def test_is_idempotent(self):
        once = snap_bbox_to_tiles((7.6, 45.9, 7.8, 46.0), self.Z)
        self.assertEqual(snap_bbox_to_tiles(once, self.Z), once)

    def test_adjacent_requests_share_a_whole_tile_column(self):
        # The bug this exists for: two areas meeting at 7.8 must both fully
        # own the tile column their shared edge runs through, or whichever
        # merges second writes fake sea over the other's ground.
        a = snap_bbox_to_tiles((7.6, 45.9, 7.8, 46.0), self.Z)
        b = snap_bbox_to_tiles((7.8, 45.9, 8.0, 46.0), self.Z)
        self.assertGreater(a[2], b[0], 'snapped neighbours must overlap, not abut')
        seam = (b[0] + 180.0) / self.SPAN
        self.assertAlmostEqual(seam, round(seam), places=6)

    def test_western_hemisphere(self):
        w, s, e, n = snap_bbox_to_tiles((-15.7, 27.9, -15.5, 28.1), self.Z)
        self.assertLessEqual(w, -15.7)
        self.assertGreaterEqual(e, -15.5)
        self.assertAlmostEqual((w + 180.0) / self.SPAN,
                               round((w + 180.0) / self.SPAN), places=6)

    def test_clamps_to_the_wgs84_domain(self):
        w, s, e, n = snap_bbox_to_tiles((-179.99, -89.99, -179.9, -89.9), self.Z)
        self.assertGreaterEqual(w, -180.0)
        self.assertGreaterEqual(s, -90.0)


class LatticeStepTest(unittest.TestCase):

    Z = 12
    SPAN = 180.0 / (1 << 12)

    def test_a_whole_number_of_steps_spans_a_tile(self):
        step = lattice_step(ARCSEC_DEG, self.Z)
        self.assertAlmostEqual(self.SPAN / step, round(self.SPAN / step), places=9)

    def test_stays_close_to_the_step_asked_for(self):
        step = lattice_step(ARCSEC_DEG, self.Z)
        self.assertLess(abs(step - ARCSEC_DEG) / ARCSEC_DEG, 0.01)

    def test_tile_snap_then_pixel_snap_is_a_no_op(self):
        # The regression this guards: with an incommensurate step the pixel
        # snap grew the box a sliver past the tile edge, the bake claimed the
        # next tile along, and filled it with sea.
        step = lattice_step(ARCSEC_DEG, self.Z)
        tiles = snap_bbox_to_tiles((7.6, 45.9, 7.8, 46.0), self.Z)
        pixels = snap_bbox_to_pixels(tiles, step)
        for a, b in zip(tiles, pixels):
            self.assertAlmostEqual(a, b, places=9)

    def test_holds_for_a_western_box_too(self):
        step = lattice_step(ARCSEC_DEG, self.Z)
        tiles = snap_bbox_to_tiles((-15.7, 27.9, -15.5, 28.1), self.Z)
        for a, b in zip(tiles, snap_bbox_to_pixels(tiles, step)):
            self.assertAlmostEqual(a, b, places=9)

    def test_still_bakes_to_the_same_zoom(self):
        self.assertEqual(auto_max_zoom(lattice_step(ARCSEC_DEG, 12), TILE_SIZE), 12)


class SnapPixelsTest(unittest.TestCase):

    def test_edges_land_on_the_global_lattice(self):
        w, s, e, n = snap_bbox_to_pixels((7.6, 45.9, 7.8, 46.0), ARCSEC_DEG)
        for lon in (w, e):
            self.assertAlmostEqual((lon + 180.0) / ARCSEC_DEG,
                                   round((lon + 180.0) / ARCSEC_DEG), places=4)
        for lat in (s, n):
            self.assertAlmostEqual((90.0 - lat) / ARCSEC_DEG,
                                   round((90.0 - lat) / ARCSEC_DEG), places=4)

    def test_only_grows_the_box(self):
        req = (7.6, 45.9, 7.8, 46.0)
        w, s, e, n = snap_bbox_to_pixels(req, ARCSEC_DEG)
        self.assertLessEqual(w, req[0])
        self.assertLessEqual(s, req[1])
        self.assertGreaterEqual(e, req[2])
        self.assertGreaterEqual(n, req[3])

    def test_is_idempotent(self):
        once = snap_bbox_to_pixels((7.6, 45.9, 7.8, 46.0), ARCSEC_DEG)
        twice = snap_bbox_to_pixels(once, ARCSEC_DEG)
        for a, b in zip(once, twice):
            self.assertAlmostEqual(a, b, places=9)

    def test_neighbouring_areas_share_pixel_centres(self):
        # The crack this exists for: sampling the same ground through two
        # differently-aligned lattices disagrees by metres on a steep slope,
        # so a shared tile edge stops matching its neighbour.
        a = snap_bbox_to_pixels(snap_bbox_to_tiles((7.6, 45.9, 7.8, 46.0), 12), ARCSEC_DEG)
        b = snap_bbox_to_pixels(snap_bbox_to_tiles((7.8, 45.9, 8.0, 46.0), 12), ARCSEC_DEG)
        offset = (b[0] - a[0]) / ARCSEC_DEG
        self.assertAlmostEqual(offset, round(offset), places=4,
                               msg='neighbour origins must differ by whole pixels')


class TargetGridTest(unittest.TestCase):

    def test_grid_uses_exactly_the_step_asked_for(self):
        bounds = snap_bbox_to_pixels((7.6, 45.9, 7.8, 46.0), ARCSEC_DEG)
        transform, width, height = target_grid(bounds, ARCSEC_DEG)
        self.assertAlmostEqual(transform.a, ARCSEC_DEG, places=12)
        self.assertAlmostEqual(-transform.e, ARCSEC_DEG, places=12)
        # North-up: origin is the north-west corner and rows run south.
        self.assertAlmostEqual(transform.c, bounds[0])
        self.assertAlmostEqual(transform.f, bounds[3])
        self.assertLess(transform.e, 0)

    def test_grid_covers_the_snapped_bounds(self):
        bounds = snap_bbox_to_pixels((7.6, 45.9, 7.8, 46.0), ARCSEC_DEG)
        _, width, height = target_grid(bounds, ARCSEC_DEG)
        self.assertAlmostEqual(width * ARCSEC_DEG, bounds[2] - bounds[0], places=9)
        self.assertAlmostEqual(height * ARCSEC_DEG, bounds[3] - bounds[1], places=9)


if __name__ == '__main__':
    unittest.main()
