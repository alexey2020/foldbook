"""Validation for foldbook content JSON files."""

from __future__ import annotations

import sys

CELL_NAMES = ("A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2")

# Reading-order page number shown in each cell (the JSON content keys stay
# grid coordinates A1..D2; this only controls the printed label).
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


class ContentValidationError(Exception):
    """Raised when a content JSON document is structurally invalid."""


def validate_content(data: object) -> dict[str, str]:
    """Validate a parsed JSON document and return a cell-name -> text mapping.

    Missing cells are left out of the result (callers should treat that as
    blank). Unknown keys are warned about on stderr and skipped. Any value
    that is not a string or null raises ContentValidationError.
    """
    if not isinstance(data, dict):
        raise ContentValidationError(
            "content.json must contain a JSON object mapping cell names to text"
        )

    result: dict[str, str] = {}
    for key, value in data.items():
        if key not in CELL_NAMES:
            print(f'Warning: ignoring unknown cell "{key}" in content.json', file=sys.stderr)
            continue
        if value is None:
            result[key] = ""
        elif isinstance(value, str):
            result[key] = value
        else:
            raise ContentValidationError(
                f'Cell "{key}" must be a string or null, got {type(value).__name__}'
            )
    return result
