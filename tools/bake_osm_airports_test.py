"""Tests for tools/bake_osm_airports.py.

The parts a wrong answer would be hard to spot in the rendered world: which way
a runway points, how long it is, and what plane the terrain gets cut to. A
heading read backwards still draws a runway — just one you land on downwind.
"""
from __future__ import annotations

import math
import unittest

from bake_osm_airports import (
    DEFAULT_TAXIWAY_WIDTH_M,
    Airfield,
    Bounds,
    LocalFrame,
    MIN_RUNWAY_LENGTH_M,
    Runway,
    angle_delta_deg,
    dedupe_runways,
    bearing_deg,
    designator_bearing,
    designator_for,
    fit_axis,
    fit_plane,
    gradient_limit,
    merge_items,
    metres_per_degree,
    parse_ref,
    platform_pads,
    runway_from_way,
    taxiway_width_m,
)

# Gran Canaria, near the 03L threshold. Any mid-latitude point would do; a real
# one keeps the metres-per-degree numbers honest.
LAT0, LON0 = 27.9300, -15.3860


def way_from_bearing(way_id: int, bearing: float, length_m: float, tags: dict,
                     lat: float = LAT0, lon: float = LON0) -> tuple:
    """A two-node way centred on (lat, lon), running along `bearing`."""
    frame = LocalFrame(lat, lon)
    half = length_m / 2.0
    e = math.sin(math.radians(bearing)) * half
    n = math.cos(math.radians(bearing)) * half
    a = frame.to_lonlat(-e, -n)
    b = frame.to_lonlat(e, n)
    nodes = {1: a, 2: b}
    return {'type': 'way', 'id': way_id, 'nodes': [1, 2], 'tags': tags}, nodes


class LocalFrameTest(unittest.TestCase):

    def test_metres_per_degree_is_the_familiar_number(self):
        m_lat, m_lon = metres_per_degree(0.0)
        self.assertAlmostEqual(m_lat, 110574, delta=50)
        self.assertAlmostEqual(m_lon, 111320, delta=50)
        # Longitude shrinks by cos(lat); latitude barely moves.
        m_lat45, m_lon45 = metres_per_degree(45.0)
        self.assertAlmostEqual(m_lon45 / m_lon, math.cos(math.radians(45)), delta=0.002)
        self.assertGreater(m_lat45, m_lat)

    def test_round_trips_metres_through_lon_lat(self):
        frame = LocalFrame(LAT0, LON0)
        lon, lat = frame.to_lonlat(1500.0, -2200.0)
        e, n = frame.to_m(lon, lat)
        self.assertAlmostEqual(e, 1500.0, places=6)
        self.assertAlmostEqual(n, -2200.0, places=6)


class BearingTest(unittest.TestCase):

    def test_bearing_is_clockwise_from_north(self):
        self.assertAlmostEqual(bearing_deg(0, 1), 0.0)
        self.assertAlmostEqual(bearing_deg(1, 0), 90.0)
        self.assertAlmostEqual(bearing_deg(0, -1), 180.0)
        self.assertAlmostEqual(bearing_deg(-1, 0), 270.0)

    def test_delta_takes_the_short_way_round(self):
        self.assertAlmostEqual(angle_delta_deg(5.0, 355.0), 10.0)
        self.assertAlmostEqual(angle_delta_deg(355.0, 5.0), -10.0)


class DesignatorTest(unittest.TestCase):

    def test_parses_the_forms_osm_uses(self):
        self.assertEqual(parse_ref('03L/21R'), ['03L', '21R'])
        self.assertEqual(parse_ref('09/27'), ['09', '27'])
        self.assertEqual(parse_ref('  9/27 '), ['9', '27'])
        self.assertEqual(parse_ref(None), [])
        self.assertEqual(parse_ref('grass'), [])

    def test_designator_bearing_reads_tens_of_degrees(self):
        self.assertEqual(designator_bearing('03L'), 30.0)
        self.assertEqual(designator_bearing('27'), 270.0)
        # 36 is north, which is bearing 0.
        self.assertEqual(designator_bearing('36'), 0.0)
        self.assertIsNone(designator_bearing('L'))
        self.assertIsNone(designator_bearing('40'))

    def test_derived_designator_never_reads_zero(self):
        # A runway pointing due north is 36, not 00 — there is no runway 00.
        self.assertEqual(designator_for(0.0), '36')
        self.assertEqual(designator_for(359.0), '36')
        self.assertEqual(designator_for(87.0), '09')
        self.assertEqual(designator_for(184.0), '18')


class FitAxisTest(unittest.TestCase):

    def test_recovers_the_direction_through_noisy_nodes(self):
        # A way digitised with intermediate nodes a metre either side of the
        # centreline. First-to-last would tilt with whichever end wandered.
        bearing = 32.0
        ax = math.sin(math.radians(bearing))
        ay = math.cos(math.radians(bearing))
        wobble = [0.0, 1.2, -0.9, 0.6, -1.4, 0.0]
        pts = []
        for i, w in enumerate(wobble):
            t = -1500.0 + i * 600.0
            pts.append((ax * t - ay * w, ay * t + ax * w))
        _, direction = fit_axis(pts)
        self.assertAlmostEqual(bearing_deg(*direction) % 180.0, bearing, places=1)


class RunwayFromWayTest(unittest.TestCase):

    def test_reads_heading_length_and_thresholds(self):
        way, nodes = way_from_bearing(1, 32.0, 3100.0, {'aeroway': 'runway', 'ref': '03L/21R'})
        r = runway_from_way(way, nodes, 'international')
        self.assertIsNotNone(r)
        self.assertAlmostEqual(r.heading_deg, 32.0, places=1)
        self.assertAlmostEqual(r.length_m, 3100.0, delta=1.0)
        self.assertEqual(r.ref, '03L/21R')
        self.assertFalse(r.ref_derived)
        # `ref` is magnetic and the geometry is true, so the difference is
        # declination — about two degrees here, not a hundred and eighty.
        self.assertAlmostEqual(r.ref_delta_deg, 2.0, places=1)
        self.assertAlmostEqual(r.lat, LAT0, places=5)
        self.assertAlmostEqual(r.lon, LON0, places=5)
        # Thresholds come out in the order the ref names them: 03L end first.
        frame = LocalFrame(LAT0, LON0)
        e, n = frame.to_m(r.thresholds[0][1], r.thresholds[0][0])
        self.assertAlmostEqual(bearing_deg(-e, -n), 32.0, places=1)

    def test_a_way_drawn_backwards_is_turned_to_match_its_ref(self):
        # OSM way direction is arbitrary; the designator is not. Drawn from the
        # 21R end, this still has to come out as a 03L runway.
        way, nodes = way_from_bearing(2, 212.0, 3100.0, {'aeroway': 'runway', 'ref': '03L/21R'})
        r = runway_from_way(way, nodes, 'international')
        self.assertAlmostEqual(r.heading_deg, 32.0, places=1)
        self.assertAlmostEqual(abs(r.ref_delta_deg), 2.0, places=1)

    def test_derives_a_ref_when_osm_has_none(self):
        way, nodes = way_from_bearing(3, 87.0, 1400.0, {'aeroway': 'runway'})
        r = runway_from_way(way, nodes, 'regional')
        self.assertEqual(r.ref, '09/27')
        self.assertTrue(r.ref_derived)
        self.assertIsNone(r.ref_delta_deg)

    def test_width_falls_back_to_the_aerodrome_class(self):
        way, nodes = way_from_bearing(4, 90.0, 2000.0, {'aeroway': 'runway'})
        self.assertEqual(runway_from_way(way, nodes, 'international').width_m, 45.0)
        self.assertEqual(runway_from_way(way, nodes, 'regional').width_m, 30.0)
        self.assertEqual(runway_from_way(way, nodes, 'ga').width_m, 18.0)

    def test_a_tagged_width_wins_over_the_class_default(self):
        way, nodes = way_from_bearing(5, 90.0, 2000.0, {'aeroway': 'runway', 'width': '60 m'})
        self.assertEqual(runway_from_way(way, nodes, 'ga').width_m, 60.0)

    def test_a_runway_mapped_as_an_area_has_its_width_measured(self):
        # A closed rectangle 2000 x 45, running 090.
        frame = LocalFrame(LAT0, LON0)
        corners = [(-1000, -22.5), (1000, -22.5), (1000, 22.5), (-1000, 22.5)]
        nodes = {}
        ids = []
        for i, (along, across) in enumerate(corners, start=1):
            # bearing 090: along is east, across is north.
            nodes[i] = frame.to_lonlat(along, across)
            ids.append(i)
        way = {'type': 'way', 'id': 6, 'nodes': ids + [ids[0]],
               'tags': {'aeroway': 'runway', 'area': 'yes'}}
        r = runway_from_way(way, nodes, 'ga')
        self.assertAlmostEqual(r.length_m, 2000.0, delta=1.0)
        self.assertAlmostEqual(r.width_m, 45.0, delta=0.5)
        self.assertTrue(r.width_measured)
        self.assertAlmostEqual(r.heading_deg % 180.0, 90.0, places=1)

    def test_a_displaced_threshold_is_paint_rather_than_a_runway(self):
        # La Palma maps one as its own aeroway=runway way lying on the real
        # strip. Taken at face value it becomes a second coincident runway.
        way, nodes = way_from_bearing(
            8, 179.0, 900.0,
            {'aeroway': 'runway', 'runway': 'displaced_threshold'})
        self.assertIsNone(runway_from_way(way, nodes, 'regional'))

    def test_keeps_the_length_tag_beside_the_measured_one(self):
        # La Palma again: the way measures 2112 m and the tag declares 2200.
        # The geometry places the runway; the tag is kept so the disagreement
        # is visible rather than silently resolved.
        way, nodes = way_from_bearing(
            9, 179.0, 2112.0, {'aeroway': 'runway', 'ref': '18/36', 'length': '2200'})
        r = runway_from_way(way, nodes, 'regional')
        self.assertAlmostEqual(r.length_m, 2112.0, delta=1.0)
        self.assertEqual(r.length_tag_m, 2200.0)

    def test_an_impossibly_narrow_width_tag_is_disbelieved(self):
        # Dzhankoi carries width=12 on 2.5 km of concrete - narrower than the
        # taxiways beside it. Honoured, it would draw as a ribbon.
        way, nodes = way_from_bearing(
            10, 50.0, 2513.0, {'aeroway': 'runway', 'width': '12'})
        r = runway_from_way(way, nodes, 'military')
        self.assertEqual(r.width_m, 45.0)
        self.assertTrue(r.width_implausible)

    def test_a_genuinely_narrow_short_strip_keeps_its_width(self):
        way, nodes = way_from_bearing(
            11, 50.0, 700.0, {'aeroway': 'runway', 'width': '12'})
        r = runway_from_way(way, nodes, 'ga')
        self.assertEqual(r.width_m, 12.0)
        self.assertFalse(r.width_implausible)

    def test_a_farm_strip_is_not_a_runway(self):
        way, nodes = way_from_bearing(7, 90.0, MIN_RUNWAY_LENGTH_M - 1.0, {'aeroway': 'runway'})
        self.assertIsNone(runway_from_way(way, nodes, 'ga'))


class DedupeRunwaysTest(unittest.TestCase):
    """OSM often maps one strip twice - a centreline and an area."""

    def runway(self, bearing, length, offset_m=0.0, ref='05/23', measured=False):
        frame = LocalFrame(LAT0, LON0)
        ax = math.sin(math.radians(bearing))
        ay = math.cos(math.radians(bearing))
        lon, lat = frame.to_lonlat(-ay * offset_m, ax * offset_m)
        return Runway(
            ref=ref, heading_deg=bearing, length_m=length, width_m=45.0,
            surface='concrete', lit=True, lat=lat, lon=lon,
            thresholds=[[lat, lon], [lat, lon]], osm_id=1,
            ref_derived=False, ref_delta_deg=0.0, width_measured=measured,
            length_tag_m=None, width_implausible=False,
        )

    def test_a_coincident_pair_collapses_to_the_measured_one(self):
        # Oktyabrskoye: 3294 m centreline and a 3323 m area, same strip.
        line = self.runway(58.5, 3294.0)
        area = self.runway(58.6, 3323.0, measured=True)
        kept = dedupe_runways([line, area])
        self.assertEqual(len(kept), 1)
        self.assertTrue(kept[0].width_measured)

    def test_parallel_runways_are_two_runways(self):
        # Las Palmas 03L / 03R sit about 180 m apart. Merging them would
        # delete a runway that is really there.
        left = self.runway(21.4, 3103.0, offset_m=-90.0, ref='03L/21R')
        right = self.runway(21.4, 3099.0, offset_m=90.0, ref='03R/21L')
        self.assertEqual(len(dedupe_runways([left, right])), 2)

    def test_crossing_runways_are_two_runways(self):
        self.assertEqual(len(dedupe_runways(
            [self.runway(50.0, 2500.0, ref='05/23'),
             self.runway(140.0, 2000.0, ref='14/32')])), 2)


class TaxiwayWidthTest(unittest.TestCase):
    """667 of 684 taxiways carry no width tag, so the default is what is drawn."""

    def test_follows_the_aerodrome_class(self):
        # Annex 14's code letters: E for an international field, down to B for
        # a light-aircraft strip. One number for all of them put an
        # international taxiway through every gliding club in Brandenburg.
        self.assertEqual(taxiway_width_m({}, 'international'), 23.0)
        self.assertEqual(taxiway_width_m({}, 'military'), 18.0)
        self.assertEqual(taxiway_width_m({}, 'regional'), 15.0)
        self.assertEqual(taxiway_width_m({}, 'ga'), 10.5)

    def test_gets_narrower_as_the_field_gets_smaller(self):
        widths = [DEFAULT_TAXIWAY_WIDTH_M[k]
                  for k in ('international', 'military', 'regional', 'ga')]
        self.assertEqual(widths, sorted(widths, reverse=True))

    def test_a_tagged_width_wins(self):
        self.assertEqual(taxiway_width_m({'width': '16'}, 'international'), 16.0)
        self.assertEqual(taxiway_width_m({'width': '10.5 m'}, 'ga'), 10.5)

    def test_a_width_too_narrow_to_be_a_taxiway_is_disbelieved(self):
        # A service road or a footpath that picked up the tag.
        self.assertEqual(taxiway_width_m({'width': '2'}, 'regional'), 15.0)

    def test_an_unknown_class_falls_back_to_the_smallest(self):
        self.assertEqual(taxiway_width_m({}, 'seaplane base'), 10.5)


class FitPlaneTest(unittest.TestCase):

    def samples(self, gradient: float, intercept: float, noise=()):
        pts = []
        # An even count, so alternating noise averages to exactly zero and
        # the residual numbers below are the ones the arithmetic promises.
        for i in range(100):
            along = -1500.0 + i * 30.0
            n = noise[i % len(noise)] if noise else 0.0
            pts.append((along, intercept + gradient * along + n))
        return pts

    def test_recovers_a_real_slope(self):
        fit = fit_plane(self.samples(0.006, 24.0), gradient_limit(3000.0))
        self.assertAlmostEqual(fit['gradient'], 0.006, places=6)
        self.assertAlmostEqual(fit['heightMsl'], 24.0, places=6)
        self.assertFalse(fit['clamped'])
        self.assertAlmostEqual(fit['residualMaxM'], 0.0, places=6)

    def test_clamps_a_slope_no_runway_could_have(self):
        # 5% over 3 km is not drainage, it is the DEM disagreeing with itself.
        fit = fit_plane(self.samples(0.05, 100.0), gradient_limit(3000.0))
        self.assertTrue(fit['clamped'])
        self.assertAlmostEqual(fit['gradient'], 0.01)
        self.assertAlmostEqual(fit['gradientRaw'], 0.05, places=6)

    def test_the_clamped_plane_is_re_centred_on_the_ground(self):
        # Keeping the tilted fit's intercept would leave the plane offset from
        # the terrain it is supposed to sit in. Mean residual has to stay zero.
        pts = self.samples(0.05, 100.0)
        fit = fit_plane(pts, gradient_limit(3000.0))
        residuals = [h - (fit['heightMsl'] + fit['gradient'] * a) for a, h in pts]
        self.assertAlmostEqual(sum(residuals) / len(residuals), 0.0, places=6)

    def test_reports_how_far_the_ground_is_from_the_plane(self):
        # +1 -1 -1 +1, not +1 -1: an alternating pattern is not orthogonal to a
        # linear ramp, so the fit would absorb part of it as a gradient and the
        # residual would come out a hair over the metre that was put in.
        fit = fit_plane(self.samples(0.0, 10.0, noise=(1.0, -1.0, -1.0, 1.0)),
                        gradient_limit(3000.0))
        self.assertAlmostEqual(fit['residualMaxM'], 1.0, places=6)
        self.assertAlmostEqual(fit['residualRmsM'], 1.0, places=6)

    def test_a_short_strip_may_be_steeper(self):
        self.assertEqual(gradient_limit(3000.0), 0.01)
        self.assertEqual(gradient_limit(800.0), 0.02)

    def test_too_few_samples_is_no_fit_rather_than_a_bad_one(self):
        self.assertEqual(fit_plane([(0.0, 1.0)], 0.01), {})


class PlatformPadsTest(unittest.TestCase):

    def airfield(self, **kw) -> Airfield:
        runway = Runway(
            ref='03/21', heading_deg=32.0, length_m=3100.0, width_m=45.0,
            surface='asphalt', lit=True, lat=LAT0, lon=LON0,
            thresholds=[[LAT0, LON0], [LAT0, LON0]], osm_id=1,
            ref_derived=False, ref_delta_deg=2.0, width_measured=False,
            length_tag_m=None, width_implausible=False,
        )
        return Airfield(name='Test', icao='TEST', iata='', kind='international',
                        lat=LAT0, lon=LON0, ele_tag_m=None, osm_id=1,
                        runways=[runway], **kw)

    def test_the_pad_covers_the_runway_and_its_strip(self):
        pads = platform_pads(self.airfield())
        self.assertEqual(len(pads), 1)
        pad = pads[0]
        self.assertAlmostEqual(pad['headingDeg'], 32.0)
        # Half-extents are the pad's outer edge, feather included, so the
        # fully flattened core is what is left inside them. Long enough for the
        # runway plus an overrun at each end...
        self.assertGreater(pad['halfD'] - pad['featherM'], 3100.0 / 2.0)
        # ...and at least the ICAO graded strip across, which is wider than the
        # pavement. A pad the width of the tarmac leaves the ground falling
        # away at the runway edge.
        self.assertGreaterEqual(pad['halfW'] - pad['featherM'], 75.0)

    def test_an_apron_pad_lines_up_with_the_runway(self):
        frame = LocalFrame(LAT0, LON0)
        ring = [frame.to_lonlat(*p) for p in
                ((200, 100), (600, 100), (600, 400), (200, 400), (200, 100))]
        apron = {'ring': [[lat, lon] for lon, lat in ring]}
        pads = platform_pads(self.airfield(aprons=[apron]))
        self.assertEqual(len(pads), 2)
        # Not the apron's own axis: an irregular blob's principal direction
        # swings with its shape and would tilt the pad against the runway.
        self.assertAlmostEqual(pads[1]['headingDeg'], 32.0)


class MergeItemsTest(unittest.TestCase):
    """A scoped bake looked at one box and knows nothing about the rest."""

    def test_replaces_inside_the_bbox_and_keeps_everything_outside(self):
        bbox = Bounds(-16.0, 27.0, -15.0, 28.5)
        previous = [
            {'icao': 'GCLP', 'name': 'old Gran Canaria', 'lat': 27.93, 'lon': -15.39},
            {'icao': 'EDDB', 'name': 'Berlin', 'lat': 52.36, 'lon': 13.50},
        ]
        fresh = [{'icao': 'GCLP', 'name': 'Gran Canaria', 'lat': 27.93, 'lon': -15.39}]
        out = merge_items(previous, fresh, bbox)
        self.assertEqual([i['name'] for i in out], ['Berlin', 'Gran Canaria'])

    def test_is_sorted_so_a_re_bake_produces_a_readable_diff(self):
        bbox = Bounds(0.0, 0.0, 1.0, 1.0)
        fresh = [{'icao': 'ZZZZ', 'name': 'b', 'lat': 0.5, 'lon': 0.5},
                 {'icao': 'AAAA', 'name': 'a', 'lat': 0.5, 'lon': 0.5}]
        self.assertEqual([i['icao'] for i in merge_items([], fresh, bbox)],
                         ['AAAA', 'ZZZZ'])


if __name__ == '__main__':
    unittest.main()
