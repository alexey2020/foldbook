"""Rendering of foldbook content into a standalone, print-ready HTML file."""

from __future__ import annotations

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from . import markdown_lite
from .schema import CELL_NAMES, PAGE_NUMBERS

PACKAGE_DIR = Path(__file__).resolve().parent
REPO_ROOT = PACKAGE_DIR.parents[1]
TEMPLATES_DIR = PACKAGE_DIR / "templates"
LAYOUT_CSS_PATH = REPO_ROOT / "layout.css"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(enabled_extensions=("j2",), default=True),
)


def load_css() -> str:
    return LAYOUT_CSS_PATH.read_text(encoding="utf-8")


def build_cells(content: dict[str, str]) -> list[dict[str, str]]:
    cells = []
    for name in CELL_NAMES:
        col = 1 if name.endswith("1") else 2
        text = content.get(name, "")
        cells.append({
            "name": name,
            "page": PAGE_NUMBERS[name],
            "col": col,
            "text": text,
            "html": markdown_lite.render(text),
        })
    return cells


def render_html(content: dict[str, str], title: str = "Foldbook") -> str:
    template = _env.get_template("booklet.html.j2")
    return template.render(title=title, css=load_css(), cells=build_cells(content))
