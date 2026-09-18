import unittest

from foldbook.render import build_cells, render_html
from foldbook.schema import PAGE_NUMBERS


class TestBuildCells(unittest.TestCase):
    def test_column_assignment(self):
        cells = build_cells({})
        by_name = {c["name"]: c for c in cells}
        for name in ("A1", "B1", "C1", "D1"):
            self.assertEqual(by_name[name]["col"], 1)
        for name in ("A2", "B2", "C2", "D2"):
            self.assertEqual(by_name[name]["col"], 2)

    def test_order_matches_grid_layout(self):
        cells = build_cells({})
        names = [c["name"] for c in cells]
        self.assertEqual(names, ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2"])

    def test_missing_cell_renders_blank(self):
        cells = build_cells({"A1": "hi"})
        by_name = {c["name"]: c for c in cells}
        self.assertEqual(by_name["A1"]["text"], "hi")
        self.assertEqual(by_name["B1"]["text"], "")

    def test_page_numbers_match_reading_order(self):
        cells = build_cells({})
        by_name = {c["name"]: c for c in cells}
        for name, expected_page in PAGE_NUMBERS.items():
            self.assertEqual(by_name[name]["page"], expected_page)


class TestRenderHtml(unittest.TestCase):
    def test_contains_all_labels_and_text(self):
        html = render_html({"A1": "hello there"}, title="Test")
        self.assertIn('class="cell-label">8<', html)
        self.assertIn('class="cell-label">1<', html)
        self.assertIn("hello there", html)
        self.assertIn("<title>Test</title>", html)

    def test_html_escapes_user_content(self):
        html = render_html({"A1": "<script>alert(1)</script>"})
        self.assertNotIn("<script>alert(1)</script>", html)
        self.assertIn("&lt;script&gt;", html)


if __name__ == "__main__":
    unittest.main()
