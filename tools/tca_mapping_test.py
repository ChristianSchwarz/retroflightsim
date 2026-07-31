"""Tests for tools/tca_mapping.py."""
from __future__ import annotations

import unittest

from tca_mapping import (
    animated_part_control,
    auto_gear_names,
    auto_surface_defs,
    classify_material,
    classify_part,
    default_import_skip_substrings,
    is_attachment_empty,
    is_cockpit_part,
    is_glass_part,
    is_livery_material,
    is_nozzle_mesh,
    is_nozzle_part,
    is_wingtip_part,
    merge_config_overrides,
    point_in_expanded_bounds,
    should_skip_gear_clip_part,
    skip_part_substrings,
)


class TcaMappingTests(unittest.TestCase):
    def test_shared_material_canopy_is_glass(self):
        cls = classify_material('Canopy')
        self.assertIsNotNone(cls)
        self.assertEqual(cls.palette_category, 'GLASS')

    def test_shared_material_collider_skips(self):
        cls = classify_material('ColliderMat')
        self.assertIsNotNone(cls)
        self.assertEqual(cls.action, 'skip')

    def test_shared_material_nozzle_is_fx_fire(self):
        cls = classify_material('NozzleInteriorMat')
        self.assertIsNotNone(cls)
        self.assertEqual(cls.palette_category, 'FX_FIRE')

    def test_glass_part_by_mesh_name(self):
        self.assertTrue(is_glass_part('CanopyFront'))
        self.assertTrue(is_glass_part('Canopy'))
        self.assertFalse(is_glass_part('CanopyFrame'))
        self.assertFalse(is_glass_part('Fuselage'))

    def test_wingtip_part_by_mesh_name(self):
        self.assertTrue(is_wingtip_part('WingTipL'))
        self.assertTrue(is_wingtip_part('WingTipR'))
        self.assertTrue(is_wingtip_part('Wingtip'))
        self.assertFalse(is_wingtip_part('WingL'))
        self.assertFalse(is_wingtip_part('ElevatorTipL'))

    def test_nozzle_part_unresolved_material_fallback(self):
        self.assertTrue(is_nozzle_part('NozzleInterior'))
        self.assertTrue(is_nozzle_part('AfterburnerInterior'))
        self.assertTrue(is_nozzle_part('Nozzle'))
        self.assertTrue(is_nozzle_part('NozzleL'))
        self.assertTrue(is_nozzle_part('NozzleInner'))
        self.assertTrue(is_nozzle_part('ABInterior'))
        self.assertFalse(is_nozzle_part('NozzleFairing'))

    def test_point_in_expanded_bounds(self):
        lo = (0.0, 0.0, 0.0)
        hi = (1.0, 1.0, 1.0)
        self.assertTrue(point_in_expanded_bounds((0.5, 0.5, 0.5), lo, hi))
        self.assertTrue(point_in_expanded_bounds((-2.0, 0.5, 0.5), lo, hi))
        self.assertFalse(point_in_expanded_bounds((10.0, 0.5, 0.5), lo, hi))

    def test_skip_part_collider_shadow(self):
        self.assertTrue(classify_part('WingCollider', 'skip'))
        self.assertTrue(classify_part('ShadowMesh', 'skip'))

    def test_surface_rules_first_match(self):
        available = {'ElevatorL', 'AileronL', 'Rudder'}
        surfaces = auto_surface_defs(available)
        roles = {s['role'] for s in surfaces}
        self.assertIn('elevatorLeft', roles)
        self.assertIn('aileronLeft', roles)
        self.assertIn('rudder', roles)

    def test_gear_door_prefix_pattern(self):
        available = {'BGearDoorL', 'Fuselage', 'WLDoor3'}
        names = auto_gear_names(available)
        self.assertIn('BGearDoorL', names)
        self.assertIn('WLDoor3', names)
        self.assertNotIn('Fuselage', names)

    def test_gear_substring_all_door_and_gear(self):
        available = {'MyGearDoorPanel'}
        names = auto_gear_names(available)
        self.assertIn('MyGearDoorPanel', names)

    def test_gear_clip_skip_handle(self):
        self.assertTrue(should_skip_gear_clip_part('GearHandle'))
        self.assertTrue(should_skip_gear_clip_part('LeftNavLight'))
        self.assertFalse(should_skip_gear_clip_part('GearDoorL'))

    def test_animated_part_control_fields(self):
        self.assertEqual(animated_part_control({'AngleByPitch': []}), 'pitch')
        self.assertEqual(animated_part_control({'AngleByBrake': []}), 'airbrake')
        self.assertEqual(animated_part_control({'FlapInfluence': 1.0}), 'flaps')
        self.assertIsNone(animated_part_control({}))

    def test_config_override_merges_glass_parts(self):
        tca = merge_config_overrides({'glassParts': ['CustomGlass']})
        self.assertTrue(is_glass_part('CustomGlass', tca))
        self.assertTrue(is_glass_part('CanopyFront', tca))

    def test_config_override_merges_skip_name_parts(self):
        tca = merge_config_overrides({'skipNameParts': ['Gauge']})
        subs = skip_part_substrings(tca)
        self.assertIn('Gauge', subs)
        self.assertIn('Collider', subs)

    def test_livery_material_excludes_glass_and_weapons(self):
        self.assertFalse(is_livery_material('CanopyGlass'))
        self.assertFalse(is_livery_material('MissileMat'))
        self.assertTrue(is_livery_material('F16_Livery'))

    def test_default_import_skip_includes_clutter_not_collider_dup(self):
        subs = default_import_skip_substrings()
        self.assertIn('Weapon', subs)
        self.assertIn('Pylon', subs)
        self.assertNotIn('Cockpit', subs)
        self.assertNotIn('Empty', subs)
        self.assertNotIn('Collider', subs)

    def test_cockpit_part_detection(self):
        self.assertTrue(is_cockpit_part('Cockpit'))
        self.assertTrue(is_cockpit_part('CockpitInterior'))
        self.assertFalse(is_cockpit_part('CanopyFront'))

    def test_attachment_empty_detection(self):
        self.assertTrue(is_attachment_empty('PylonL1'))
        self.assertTrue(is_attachment_empty('Hardpoint1'))
        self.assertTrue(is_attachment_empty('Pilot'))
        self.assertFalse(is_attachment_empty('Fuselage'))

    def test_is_nozzle_mesh_by_name_or_material(self):
        self.assertTrue(is_nozzle_mesh('NozzleInterior', ('SomeLivery',)))
        self.assertTrue(is_nozzle_mesh('Engine', ('NozzleInteriorMat',)))
        self.assertFalse(is_nozzle_mesh('Fuselage', ('SomeLivery',)))

    def test_skip_clutter_can_be_disabled(self):
        tca = merge_config_overrides({'skipClutter': False, 'skipNameParts': []})
        subs = skip_part_substrings(tca)
        self.assertNotIn('Weapon', subs)
        self.assertIn('Collider', subs)

    def test_skip_clutter_adds_weapon_skip(self):
        tca = merge_config_overrides({'skipClutter': True, 'skipNameParts': []})
        subs = skip_part_substrings(tca)
        self.assertIn('Weapon', subs)
        self.assertNotIn('Cockpit', subs)


if __name__ == '__main__':
    unittest.main()
