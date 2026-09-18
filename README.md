# Foldbook

Turn a single A4 sheet into a printable 8-panel foldable booklet — like
pocketmod.com, but with no login. A pure static web page: open `web/index.html`
in a browser, no server, no build step, no install, no account.

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
— .md import/export and the web editor's Page dropdown all address pages by
this reading-order number (1-8), never by coordinate.

Text in the left column (A1, B1, C1, D1) is rotated 90°. Text in the right
column (A2, B2, C2, D2) is rotated 270°.

## Usage

Open `web/index.html` directly in a browser (double-click it). No server, no
build step, no network access.

- Demo content loads automatically so you can see the layout immediately.
- Every page shows its **rendered** view by default (bold/italic/lists/
  dividers as real formatting, not raw markdown). Click a page to edit its
  raw text; click anywhere else (or another page) to render it again.
- The unrotated **staging box** below the toolbar is a comfortable place to
  type: pick a page from the **Page** dropdown (it loads that page's current
  text), edit normally, then click **Insert into page** to push it back in.
- **Export MD** downloads all 8 pages as a single `content.md`, one `## 1`
  / `## 2` / ... / `## 8` section per page (in reading order).
- **Import MD** loads a `.md` file split into pages by headings that name a
  page number, e.g. `## 1`. Pages without a matching heading are blanked.
  See "Markdown formatting" below for what's supported inside each section.
- **Print / Save PDF** calls the browser's print dialog.

### Markdown formatting

Page text supports a small, deliberately limited markdown subset, shown
rendered whenever a page isn't the one currently being edited, and always
rendered at print time:

- `**bold**`
- `*italic*` or `_italic_`
- `- item` / `* item` for a bullet list, `1. item` for a numbered list
- `---` on its own line: a divider. A page containing one or more dividers
  is split into equal-height rows separated by a dashed line matching the
  main page borders.

Anything else is treated as plain text. This applies to the web editor's
rendered view, Print/Save PDF, and Ctrl+P alike.

## Printing

Ctrl+P (or the Print button), then:

- Destination: **Save as PDF** (or a real printer)
- Paper size: **A4**
- Margins: **None**
- Scale: **100%**
- Uncheck "Headers and footers"
- Check "Background graphics" (so the dashed fold/cut guides print)

## Content .md format

```md
## 1
text for page 1

## 2
text for page 2
```

- Headings are reading-order page numbers ("1".."8"), not grid coordinates
  — see the table near the top of this file for which page prints where.
- All 8 headings are optional; a missing one renders as a blank page (the
  printed page number still shows).
- Unrecognized headings are ignored with a console warning.

## Project structure

```
layout.css     Shared print layout (grid + rotation) — the single source of
               truth for both the on-screen editor and the printed result.
web/           Static, no-build web editor (index.html, app.js, editor.css).
```

## Known limitations

- Very long page text is clipped rather than auto-shrunk (`overflow: hidden`)
  — keep it to roughly a short paragraph per page (about 27 lines fit).
- This is a plain 2×4 grid, not pocketmod's diagonal single-cut fold order;
  physical folding/cutting is left to you.

## Encoding

Imported `.md` files are read as UTF-8, falling back to Windows-1252
("ANSI") if the bytes aren't valid UTF-8 — this covers files saved by older
Windows editors (pre-2019 Notepad, many CSV/text exports) in the system's
legacy codepage, which otherwise corrupts accented Latin letters (é, ë,
etc.) into `�`. Files you export yourself (Export MD) are always written as
UTF-8.
