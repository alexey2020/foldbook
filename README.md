# Foldlet

Turn a single A4 sheet into a printable 8-panel foldable booklet (16 with
double-sided printing) — like pocketmod.com, but with no login. A pure
static web page: open `index.html` in a browser, no server, no build
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

On screen the editor shows the 16 pages upright, in reading order: front
side (pages 1-8), then back side (pages 9-16). The rotated sheet layout is
used only for printing — see
"Double-sided printing" below for how to get content onto both sides of
one physical sheet, and how the two sides line up once folded.

## Usage

Open `index.html` directly in a browser (double-click it). No server, no
build step, no network access.

- Demo content loads automatically so you can see the layout immediately.
- Every page shows its **rendered** view by default (bold/italic/lists/
  dividers as real formatting, not raw markdown). Click a page to edit its
  raw text; click anywhere else (or another page) to render it again.
- The **Format** panel's buttons (bold, italic, bullet list, numbered
  list, divider, table, picture, colors) apply to the page being edited,
  or, if none is open, to the last page clicked. The list buttons toggle: pressed on
  lines that are already that kind of list, they turn them back into plain
  lines.
- **Show page numbers** toggles the small printed page number on every page.
  Unchecked, it's hidden and that space is freed up for content instead.
- **Back side (pages 9-16)** unchecked hides the back side on screen and
  leaves it out of printing (one A4 page). Its text is kept, and Export MD
  still saves it.
- **Zoom** scales the on-screen pages.
- The language menu at the top right switches the whole site between
  English (the default), Russian and Esperanto: the interface, the help and
  the words presets print. The choice is remembered. Translations live in
  `web/i18n.js`, keyed by the English text.
- The **Help** tab explains all of this, including how to fold the printed
  sheet.
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
- `{red}text{/red}`: colored text within one line. Colors: `red`,
  `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `gray`. Combines
  with bold/italic (`**{blue}Title{/blue}**`) and can nest.
- Pipe tables: lines starting with `|`, cells separated by `|`. A dash line
  (`|---|---|`) after the first row makes it a header; colons in it align
  columns (`:---`, `:---:`, `---:`). Inline formatting works in cells.
- `![caption][img-1]` on its own line: a picture added to the booklet (picture
  button, Ctrl+V, or drop a file onto a page). Large photos are scaled down to
  1400 px on the long side. `![caption](https://...)` shows a web picture.
  Pictures fill at most the page width and shrink to fit the height left.
  Export MD writes the pictures at the end of the file as reference
  definitions (`[img-1]: data:image/...`), so the file stays self-contained
  and other markdown viewers show them too; Import MD reads them back.
- `---` on its own line: a divider. A page containing one or more dividers
  is split into equal-height rows separated by a dashed line matching the
  main page borders.

### Page presets

Click a page (it gets highlighted, and its number shows in the Preset
panel's heading), choose a **Preset**, and it fills that page with a ready-made layout right
away; changing a preset's options updates the page too. A page with text
of its own is replaced only after a confirmation (unless **Ask before a
preset replaces text** in the View panel is unchecked); a page holding
only a preset line is swapped without asking. **No preset** clears the page
(same rule: it asks first if the page has text of its own). The chosen preset stays when you click a page
without one; **Apply to page N** then puts it there too. A preset is just one directive line in the page's text, so it is
saved by Export MD, loaded by Import MD and can be edited by hand:

| Preset | Directive |
|---|---|
| Calendar | `{{calendar 2026-11 month mon}}`: view `month`, `3months` (previous, this, next), `week` (`2026-11-25`, any day of it; a row per day) or `year` (`2026`); `mon` / `sun` = first day of the week (default: the browser's locale); no date = today |
| Paper | `{{grid}}` (5mm), `{{lines}}` (7mm), `{{dots}}` (5mm), `{{iso}}` (isometric), `{{hex}}` (hexagons): one menu entry, the kind picked in a second menu |
| Checklist | `{{checklist}}` |
| Eisenhower matrix | `{{eisenhower}}` (urgent / important: do now, schedule, delegate, drop) |
| Decision | `{{decision}}` or `{{decision Move to Berlin}}` (a "Decision" line or the given title, then pros and cons columns) |
| Gratitude journal | `{{gratitude}}` (one day: date, grateful for, best moment, mood faces) |
| Mood journal | `{{mood 2026-11}}` (the month's days to color, with a color key) |
| Shared expenses | `{{expenses 3}}` or `{{expenses Anna, Boris, Vika}}` (2-4 people; what, amount, who paid, ticks for who shares; balance per person = paid − share) |
| Maze | `{{maze 483920 medium}}` (seed; `small` / `medium` / `large`; a perfect maze, top-left in, bottom-right out) |
| Wheel of life | `{{wheel Health, Career, Money, ...}}` (3+ comma-separated areas) |
| Sudoku | `{{sudoku 483920 medium 4}}` (seed; `easy` / `medium` / `hard`; 1, 2, 4 or 6 per page; always one solution) |
| Yatzy score sheet | `{{yatzy 4}}` (1-6 players; each row has a small scoring hint) |
| Mandala to color | `{{mandala 483920}}` (the number seeds the pattern; **New mandala** picks a new one; the title shows it) |
| 100 hours | `{{hours 2026-11-25 14:30 squares marks hints}}` |
| 100 days | `{{days 2026-11-25 circles marks}}` |

The block fills whatever height is left on the page, so text above it
(e.g. a `**title**` line) works. Month and weekday names, preset titles
and the wheel's default areas follow the site language; the default first
day of the week follows the browser's locale.

**100 hours / 100 days** prints a "100 hours challenge" / "100 days
challenge" title, Start and End and a 10 × 10 grid, one cell
per hour or day, to shade in with a pencil as you go. In the editor pick
**100 hours / days**, then the unit, the cell shape and the start. The
words after `hours` / `days` can go in any order:

- a date (and for hours a time): the start. Leave it out to print blank
  Start/End lines to fill in by hand.
- `squares` (default) or `circles`: the cell shape.
- `marks`: for hours, the cell in which each midnight falls gets a dark
  edge and the new day's date; for days, each 1st of the month gets the
  month's short name.
- `hints`: a pale hint in every cell saying when to shade it in. For
  hours it's the time that hour ends, in two rows (start 10:23 gives
  11/23, 12/23, ...); for days it's the day itself (start the 25th gives
  25, 26, ...). Either way the 100th cell's hint equals End.

For hours, End is the start plus 100 real hours, so if the clocks change
in between, the wall-clock End moves by an hour. For days, the start date
is day 1 and End is day 100 (start + 99 days).

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
- If a page number appears more than once, the last section with that
  number wins, and Import MD shows a warning listing the repeated numbers.

## Comics

`comics/comics.html` is a ready-to-print pair of comics drawn in inline SVG,
one per side of the sheet: No. 1 "Moon Fishing" on the front (pages 1-8),
No. 2 "Bolt & the Sprout" on the back (9-16). Open it in a browser and
print it with the same settings as above.

Each comic has a front cover (1 / 9), a back cover (8 / 16), and one wide
panel across the 4|5 (12|13) spread. The spread is drawn once and each of
its two cells shows its half through its own `viewBox`, so the picture
lines up across the fold.

## Project structure

```
layout.css     Shared print layout (grid + rotation) — the single source of
               truth for both the on-screen editor and the printed result.
index.html     The web editor page (static, no build).
web/           Its script and styles (app.js, editor.css), help images (img/).
comics/        Printable SVG comics built on the same layout.css.
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
