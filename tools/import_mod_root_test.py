"""Unit tests for multi-plane livery root selection in import_mod."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from import_mod import select_primary_livery_roots


class SelectPrimaryLiveryRootsTest(unittest.TestCase):
    def test_drops_span_outlier_and_keeps_richest_copy(self):
        # Three F-15-sized copies + one bomber-sized hull sharing one material.
        spans = {1: 15.9, 2: 15.9, 3: 15.9, 4: 30.6}
        counts = {1: 55, 2: 50, 3: 49, 4: 16}
        self.assertEqual(
            select_primary_livery_roots(spans, counts, single_root=True),
            {1},
        )
        self.assertEqual(
            select_primary_livery_roots(spans, counts, single_root=False),
            {1, 2, 3},
        )

    def test_single_root_passthrough(self):
        self.assertEqual(
            select_primary_livery_roots({9: 12.0}, {9: 40}, single_root=True),
            {9},
        )


if __name__ == '__main__':
    unittest.main()
