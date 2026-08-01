"""Unit tests for OBJ submesh parsing in import_mod."""
from __future__ import annotations

import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from import_mod import parse_obj


class ParseObjSubmeshTest(unittest.TestCase):
    def test_numbered_groups_split_by_submesh(self):
        obj = """
v 0 0 0
v 1 0 0
v 0 1 0
v 1 1 0
v 2 0 0
v 2 1 0
vt 0 0
vt 1 0
vt 0 1
g Mesh
g Mesh_0
f 1/1 2/2 3/3
g Mesh_1
f 2/2 4/1 3/3
f 4/1 5/2 6/3
"""
        verts, uvs, sub_faces, sub_face_t = parse_obj(obj)
        self.assertEqual(len(verts), 6)
        self.assertEqual(len(sub_faces), 2)
        self.assertEqual(len(sub_faces[0]), 1)
        self.assertEqual(len(sub_faces[1]), 2)
        self.assertEqual(len(sub_face_t[0]), 1)
        self.assertEqual(len(sub_face_t[1]), 2)

    def test_single_submesh_group(self):
        obj = """
v 0 0 0
v 1 0 0
v 0 1 0
vt 0 0
g Part
g Part_0
f 1/1 2/1 3/1
"""
        verts, uvs, sub_faces, sub_face_t = parse_obj(obj)
        self.assertEqual(len(sub_faces), 1)
        self.assertEqual(len(sub_faces[0]), 1)

    def test_gap_keeps_material_slot_alignment(self):
        obj = """
v 0 0 0
v 1 0 0
v 0 1 0
vt 0 0
g M_0
f 1/1 2/1 3/1
g M_2
f 1/1 3/1 2/1
"""
        _v, _u, sub_faces, _t = parse_obj(obj)
        self.assertEqual(len(sub_faces), 3)
        self.assertEqual(len(sub_faces[0]), 1)
        self.assertEqual(len(sub_faces[1]), 0)
        self.assertEqual(len(sub_faces[2]), 1)


if __name__ == '__main__':
    unittest.main()
