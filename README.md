# Foldbook

Turn a single A4 sheet into a printable 8-panel foldable booklet (16 with
double-sided printing) — like pocketmod.com, but with no login. A pure
static web page: open `web/index.html` in a browser, no server, no build
step, no install, no account.

The A4 sheet is a 2-column × 4-row grid, addressed internally by grid
coordinate (A1..D2) but printed with the booklet's reading-order page
number:

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
this reading-order number, never by coordinate.

Text in the left column (A1, B1, C1, D1) is rotated 90°. Text in the right
column (A2, B2, C2, D2) is rotated 270°.

The editor shows two sheets, front (pages 1-8) and back (pages 9-16) — see
"Double-sided printing" below for how to actually get content onto both
sides of one physical sheet, and how the two sides line up once folded.

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
- **Show page numbers** toggles the small printed page number on every page.
  Unchecked, it's hidden and that space is freed up for content instead.
- **Export MD** downloads all 16 pages as a single `content.md`, one `## 1`
  through `## 16` section per page (in reading order).
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

Printing always produces 2 pages: the front sheet (1-8), then the back
sheet (9-16) on its own page, so a duplex printer puts them on opposite
sides of one physical A4 sheet. If you only want the front, print just
page 1 of the print dialog's page range.

## Double-sided printing

To use pages 9-16: print duplex, then unfold the sheet flat, flip it over
(left-to-right, like turning a book page), and fold it again the same way.

Both of your printer's duplex modes work — pick whichever it defaults to.
Physically verified by test print (front page N ends up back-to-back with
back page):

| Front page | Flip on Long Edge | Flip on Short Edge |
|---|---|---|
| 1 | 14 | 10 |
| 2 | 13 | 9  |
| 3 | 12 | 16 |
| 4 | 11 | 15 |
| 5 | 10 | 14 |
| 6 | 9  | 13 |
| 7 | 16 | 12 |
| 8 | 15 | 11 |

In practice it doesn't matter much which mode you pick: refolding the sheet
from the back reverses every crease's fold direction anyway, so neither
mode gives a "more correct" result than the other — both just land the
back's 8 pages in a different pairing with the front's 8.

## Content .md format

```md
## 1
text for page 1

## 2
text for page 2
```

- Headings are reading-order page numbers ("1".."16"), not grid coordinates
  — see the tables above for which page prints where, front and back.
- All 16 headings are optional; a missing one renders as a blank page (the
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
