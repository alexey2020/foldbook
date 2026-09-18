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
The grid coordinate is purely internal (which physical cell, which rotation)
— content.json, .md import/export, and the web editor's Page dropdown all
address pages by this reading-order number (1-8), never by coordinate.

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
- Every page shows its **rendered** view by default (bold/italic/lists/
  dividers as real formatting, not raw markdown). Click a page to edit its
  raw text; click anywhere else (or another page) to render it again.
- **Week** / **Month** fill the page currently selected in the staging
  dropdown with a generated weekly or monthly calendar (current week/month)
  and blank the other 7 pages.
- The unrotated **staging box** below the toolbar is a comfortable place to
  type: pick a page from the **Page** dropdown (it loads that page's current
  text), edit normally, then click **Insert into page** to push it back in.
- **Export JSON** downloads the current content as `content.json`, in the
  same format the CLI reads — so you can keep editing it via the CLI, or
  reload it later with **Import JSON**.
- **Export MD** downloads all 8 pages as a single `content.md`, one `## 1`
  / `## 2` / ... / `## 8` section per page (in reading order), in the same
  heading convention Import MD reads — so Export MD -> Import MD round-trips
  exactly.
- **Import MD** loads a `.md` file split into pages by headings that name a
  page number, e.g. `## 1`. Pages without a matching heading are blanked.
  See "Markdown formatting" below for what's supported inside each section.
- **Print / Save PDF** calls the browser's print dialog.

### Markdown formatting

Cell text supports a small, deliberately limited markdown subset, shown
rendered whenever a page isn't the one currently being edited, and always
rendered in CLI output and at print time:

- `**bold**`
- `*italic*` or `_italic_`
- `- item` / `* item` for a bullet list, `1. item` for a numbered list
- `---` on its own line: a divider. A cell containing one or more dividers
  is split into equal-height rows separated by a dashed line matching the
  main cell borders — this is how the Week template lays out its 7 days,
  and it works in any cell.

Anything else is treated as plain text. This applies to CLI-rendered HTML,
the web editor's Print/Save PDF, and Ctrl+P alike.

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
  "1": "text", "2": "text", "3": "text", "4": "text",
  "5": "text", "6": "text", "7": "text", "8": "text"
}
```

- Keys are reading-order page numbers ("1".."8"), not grid coordinates —
  see the table near the top of this file for which page prints where.
- All 8 keys are optional; a missing key renders as a blank page (the
  printed page number still shows).
- Unknown keys are ignored with a warning (CLI: stderr, web: browser
  console) — this includes the old grid-coordinate keys (`"A1"`, etc.) from
  before pages were addressed by number.
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

## Encoding

Imported/loaded `.json` and `.md` files are read as UTF-8, falling back to
Windows-1252 ("ANSI") if the bytes aren't valid UTF-8 — this covers files
saved by older Windows editors (pre-2019 Notepad, many CSV/text exports) in
the system's legacy codepage, which otherwise corrupts accented Latin
letters (é, ë, etc.) into `�`. This applies to the CLI, Import JSON, and
Import MD alike. Files you create yourself (Export JSON, Export MD, `foldbook
init`) are always written as UTF-8.
