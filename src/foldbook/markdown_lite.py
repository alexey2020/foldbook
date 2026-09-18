"""A deliberately tiny markdown subset: bold, italic, lists and dividers.

Cell content is plain text typed by the user or imported from a .md file.
This converts it into safe, print-ready HTML: raw text is HTML-escaped
first, then a handful of inline/block markdown patterns are turned into
real tags. Anything not matching those patterns is left as plain text.

A line of three or more dashes (`---`) is a row divider. If a cell's text
contains at least one, the whole cell is laid out as a CSS grid of
equal-height, individually bordered rows — the exact same technique
(layout.css: grid-auto-rows + a border per item) used to divide the sheet
itself into its 8 pages. This is how the web editor's Week template lays
out 7 same-size day rows, but it works in any cell.
"""

from __future__ import annotations

import html
import re

_BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
_STAR_ITALIC_RE = re.compile(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)")
_UNDERSCORE_ITALIC_RE = re.compile(r"_(.+?)_")
_UL_RE = re.compile(r"^[-*]\s+(.*)$")
_OL_RE = re.compile(r"^\d+\.\s+(.*)$")
_HR_RE = re.compile(r"^-{3,}$")


def _inline(escaped_text: str) -> str:
    text = _BOLD_RE.sub(r"<strong>\1</strong>", escaped_text)
    text = _STAR_ITALIC_RE.sub(r"<em>\1</em>", text)
    text = _UNDERSCORE_ITALIC_RE.sub(r"<em>\1</em>", text)
    return text


def _render_blocks(text: str) -> str:
    """Render paragraphs and lists (no dividers) into HTML."""
    html_parts: list[str] = []
    para_buffer: list[str] = []
    list_buffer: list[str] = []
    list_type: str | None = None

    def flush_para() -> None:
        if para_buffer:
            joined = "<br>".join(_inline(html.escape(line)) for line in para_buffer)
            html_parts.append(f"<p>{joined}</p>")
            para_buffer.clear()

    def flush_list() -> None:
        nonlocal list_type
        if list_buffer:
            items = "".join(f"<li>{_inline(html.escape(item))}</li>" for item in list_buffer)
            html_parts.append(f"<{list_type}>{items}</{list_type}>")
            list_buffer.clear()
            list_type = None

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        ul_match = _UL_RE.match(line)
        ol_match = _OL_RE.match(line)
        if ul_match:
            flush_para()
            if list_type != "ul":
                flush_list()
                list_type = "ul"
            list_buffer.append(ul_match.group(1))
        elif ol_match:
            flush_para()
            if list_type != "ol":
                flush_list()
                list_type = "ol"
            list_buffer.append(ol_match.group(1))
        elif line == "":
            flush_list()
            flush_para()
        else:
            flush_list()
            para_buffer.append(line)

    flush_list()
    flush_para()
    return "".join(html_parts)


def _render_row_grid(text: str) -> str:
    """Split text on '---' dividers into a grid of equal-height bordered rows."""
    segments: list[list[str]] = [[]]
    for raw_line in text.splitlines():
        if _HR_RE.match(raw_line.rstrip()):
            segments.append([])
        else:
            segments[-1].append(raw_line)

    rows = "".join(
        f'<div class="row-cell">{_render_blocks(chr(10).join(segment))}</div>'
        for segment in segments
    )
    return f'<div class="row-grid">{rows}</div>'


def render(text: str) -> str:
    """Convert plain/markdown-lite cell text into safe print-ready HTML."""
    if any(_HR_RE.match(line.rstrip()) for line in text.splitlines()):
        return _render_row_grid(text)
    return _render_blocks(text)
