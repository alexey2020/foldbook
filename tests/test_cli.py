import json
import os
import tempfile
import unittest
from pathlib import Path

from foldbook.cli import main


class TestCli(unittest.TestCase):
    def setUp(self):
        self._tmpdir = tempfile.TemporaryDirectory()
        self._cwd = os.getcwd()
        os.chdir(self._tmpdir.name)

    def tearDown(self):
        os.chdir(self._cwd)
        self._tmpdir.cleanup()

    def test_init_writes_blank_template(self):
        main(["init", "-o", "content.json"])
        data = json.loads(Path("content.json").read_text(encoding="utf-8"))
        self.assertEqual(set(data.keys()), {"1", "2", "3", "4", "5", "6", "7", "8"})
        self.assertTrue(all(v == "" for v in data.values()))

    def test_init_refuses_to_overwrite_without_force(self):
        main(["init", "-o", "content.json"])
        with self.assertRaises(SystemExit):
            main(["init", "-o", "content.json"])

    def test_render_writes_html(self):
        Path("content.json").write_text(json.dumps({"8": "hi there"}), encoding="utf-8")
        main(["render", "content.json", "-o", "out.html"])
        html = Path("out.html").read_text(encoding="utf-8")
        self.assertIn("hi there", html)

    def test_render_rejects_malformed_json(self):
        Path("content.json").write_text("{not valid json", encoding="utf-8")
        with self.assertRaises(SystemExit):
            main(["render", "content.json"])

    def test_render_falls_back_to_cp1252_for_non_utf8_files(self):
        # e.g. saved by an older Windows text editor in the system codepage.
        Path("content.json").write_bytes(
            '{"8": "Lëtzebuergesch"}'.encode("cp1252")
        )
        main(["render", "content.json", "-o", "out.html"])
        html = Path("out.html").read_text(encoding="utf-8")
        self.assertIn("Lëtzebuergesch", html)

    def test_demo_command_produces_html(self):
        main(["demo", "-o", "demo.html"])
        html = Path("demo.html").read_text(encoding="utf-8")
        self.assertIn("Lorem ipsum", html)
        self.assertIn('class="cell-label">8<', html)


if __name__ == "__main__":
    unittest.main()
