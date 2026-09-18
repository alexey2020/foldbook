import unittest

from foldbook.markdown_lite import render


class TestMarkdownLite(unittest.TestCase):
    def test_bold(self):
        self.assertEqual(render("**hi**"), "<p><strong>hi</strong></p>")

    def test_star_italic(self):
        self.assertEqual(render("*hi*"), "<p><em>hi</em></p>")

    def test_underscore_italic(self):
        self.assertEqual(render("_hi_"), "<p><em>hi</em></p>")

    def test_unordered_list(self):
        self.assertEqual(render("- one\n- two"), "<ul><li>one</li><li>two</li></ul>")

    def test_ordered_list(self):
        self.assertEqual(render("1. one\n2. two"), "<ol><li>one</li><li>two</li></ol>")

    def test_plain_lines_join_with_br_within_a_paragraph(self):
        self.assertEqual(render("line one\nline two"), "<p>line one<br>line two</p>")

    def test_blank_line_starts_a_new_paragraph(self):
        self.assertEqual(render("first\n\nsecond"), "<p>first</p><p>second</p>")

    def test_html_is_escaped_before_markdown_is_applied(self):
        html = render("<script>alert(1)</script> **bold**")
        self.assertNotIn("<script>", html)
        self.assertIn("&lt;script&gt;", html)
        self.assertIn("<strong>bold</strong>", html)

    def test_empty_text_renders_empty(self):
        self.assertEqual(render(""), "")

    def test_list_then_paragraph(self):
        html = render("- one\n- two\n\nafter")
        self.assertEqual(html, "<ul><li>one</li><li>two</li></ul><p>after</p>")

    def test_divider_produces_a_row_grid_of_bordered_cells(self):
        html = render("Mon 09/14\n---\nTue 09/15")
        self.assertEqual(
            html,
            '<div class="row-grid">'
            '<div class="row-cell"><p>Mon 09/14</p></div>'
            '<div class="row-cell"><p>Tue 09/15</p></div>'
            "</div>",
        )

    def test_row_grid_supports_seven_rows(self):
        html = render("\n---\n".join(["A", "B", "C", "D", "E", "F", "G"]))
        self.assertEqual(html.count('<div class="row-cell">'), 7)

    def test_dashes_shorter_than_three_are_not_a_divider(self):
        self.assertEqual(render("--"), "<p>--</p>")

    def test_two_char_list_marker_is_not_confused_with_a_divider(self):
        # "- x" is a one-item list, not a divider, even though it starts with a dash.
        self.assertEqual(render("- x"), "<ul><li>x</li></ul>")

    def test_row_grid_cell_supports_bold(self):
        html = render("**Mon**\n---\nTue")
        self.assertIn("<strong>Mon</strong>", html)


if __name__ == "__main__":
    unittest.main()
