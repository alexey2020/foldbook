# Foldbook

Turn a single A4 sheet into a printable 8-panel foldable booklet — like
pocketmod.com, but with no login and with content that can come from the
command line or from a local web page.

Print on one side of an A4 sheet only. The page is a 2-column × 4-row grid,
addressed internally by grid coordinate (A1..D2) but printed with the
booklet's reading-order page number:

```
A1 A2        8 7
B1 B2   ->   1 6
C1 C2        2 5
D1 D2        3 4
```

Reading order runs down the left column (1, 2, 3), across, then back up the
right column (4, 5, 6, 7), ending on the front/back cover (8 = A1, 7 = A2).

Text in the left column (A1, B1, C1, D1) is rotated 90°. Text in the right
column (A2, B2, C2, D2) is rotated 270°.

## Requirements

- Python 3.10+
- No Node.js, no Docker, no database, no server, no account.

## Install

```powershell
cd C:\dev\foldbook
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
```

## CLI usage

```powershell
# Create a blank content template
foldbook init -o content.json

# Edit content.json, then render it
foldbook render content.json -o booklet.html

# Or just render the built-in Lorem Ipsum demo
foldbook demo -o demo.html
```

If the `foldbook` command isn't on your PATH, run the module directly:
`python -m foldbook render content.json -o booklet.html`.

Open the generated `.html` file in any browser and print it (see below).

## Web editor usage

Open `web\index.html` directly in a browser (double-click it, or
`Invoke-Item web\index.html`). No server, no build step, no network access.

- Demo content loads automatically so you can see the layout immediately.
- Type directly into each cell — the text renders rotated in place.
- **Export JSON** downloads the current content as `content.json`, in the
  same format the CLI reads — so you can keep editing it via the CLI, or
  reload it later with **Import JSON**.
- **Print / Save PDF** calls the browser's print dialog.

## Printing

Ctrl+P (or the Print button), then:

- Destination: **Save as PDF** (or a real printer)
- Paper size: **A4**
- Margins: **None**
- Scale: **100%**
- Uncheck "Headers and footers"
- Check "Background graphics" (so the dashed fold/cut guides print)

## Content JSON schema

```json
{
  "A1": "text", "A2": "text",
  "B1": "text", "B2": "text",
  "C1": "text", "C2": "text",
  "D1": "text", "D2": "text"
}
```

- Keys are grid coordinates, not page numbers — the printed label (1-8) is
  derived automatically from the coordinate; see the table above.
- All 8 keys are optional; a missing key renders as a blank cell (the label
  still shows).
- Unknown keys are ignored with a warning (CLI: stderr, web: browser console).
- A value must be a string or `null` (`null` is treated as `""`); any other
  type is rejected.

## Project structure

```
layout.css              Shared print layout (grid + rotation) — single source
                         of truth for both the CLI output and the web editor.
web/                     Static, no-build web editor (index.html + app.js).
src/foldbook/            Python package: CLI, Jinja2 renderer, JSON schema.
examples/                Demo and blank content JSON.
tests/                   unittest test suite.
```

## Running tests

```powershell
python -m unittest discover -s tests -v
```

## Known limitations

- Very long cell text is clipped rather than auto-shrunk (`overflow: hidden`)
  — keep it to roughly a short paragraph per cell.
- This is a plain 2×4 grid, not pocketmod's diagonal single-cut fold order;
  physical folding/cutting is left to you.
