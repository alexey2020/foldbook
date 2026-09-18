"""Validation for foldbook content JSON files."""

from __future__ import annotations

import sys

CELL_NAMES = ("A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2")

# Reading-order page number shown in each cell — also the public content.json
# key (see PAGE_TO_CELL): the JSON/​.md boundary format addresses pages by
# number ("1".."8"), never by internal grid coordinate.
PAGE_NUMBERS = {
    "B1": 1,
    "C1": 2,
    "D1": 3,
    "D2": 4,
    "C2": 5,
    "B2": 6,
    "A2": 7,
    "A1": 8,
}

# "1".."8" -> cell coordinate, the reverse of PAGE_NUMBERS.
PAGE_TO_CELL = {str(page): cell for cell, page in PAGE_NUMBERS.items()}


class ContentValidationError(Exception):
    """Raised when a content JSON document is structurally invalid."""


def validate_content(data: object) -> dict[str, str]:
    """Validate a parsed JSON document and return a cell-name -> text mapping.

    Keys in `data` are page numbers as strings ("1".."8", see PAGE_TO_CELL),
    not grid coordinates. Missing pages are left out of the result (callers
    should treat that as blank). Unknown keys are warned about on stderr and
    skipped. Any value that is not a string or null raises
    ContentValidationError.
    """
    if not isinstance(data, dict):
        raise ContentValidationError(
            "content.json must contain a JSON object mapping page numbers (1-8) to text"
        )

    result: dict[str, str] = {}
    for key, value in data.items():
        cell = PAGE_TO_CELL.get(key)
        if cell is None:
            print(f'Warning: ignoring unknown page "{key}" in content.json', file=sys.stderr)
            continue
        if value is None:
            result[cell] = ""
        elif isinstance(value, str):
            result[cell] = value
        else:
            raise ContentValidationError(
                f'Page "{key}" must be a string or null, got {type(value).__name__}'
            )
    return result
