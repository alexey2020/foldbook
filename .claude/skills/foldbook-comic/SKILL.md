---
name: foldbook-comic
description: Create a new printable foldbook comic sheet — one A4 sheet with two 8-page comics (front and back), drawn in inline SVG or with pictures generated through the Pollinations image API, saved as comics/<name>.html in the foldbook repo and printed straight from the browser. Claude invents the stories from a theme, a hero or nothing at all. Use whenever the user asks for a comic, a comic book, a mini-comic, a zine story, "комикс", "сделай комикс про…", "нарисуй историю для книжечки", or new content with pictures for the folded booklet, even if they don't say "foldbook" or "skill".
---

# Foldbook comic

A foldbook is one A4 sheet cut and folded into an 8-page pocket booklet.
Printed double-sided it holds two booklets: the front side folds into one
comic, and flipping the sheet and refolding gives the other. This skill
makes one such sheet: a new HTML file in `comics/` with two comics, printed
from the browser. Don't generate a PDF; the user prints the HTML directly
(headless-browser PDFs broke the layout).

`comics/comics.html` is the reference example: two finished comics built
exactly the way this skill describes.

## Art mode

- **SVG** (default): every picture is drawn by hand in inline SVG. No
  network, no cost, and characters are identical in every panel by
  construction. See `references/drawing.md`.
- **Generated art**: the pictures inside the panels come from an image
  model (Pollinations: a reference image of each hero, then FLUX Klein
  draws every panel from it); frames, bubbles, captions and titles are
  still SVG on top. Richer pictures, costs a little API quota, needs the
  key in `~/.pollinations-key`. See `references/generated-art.md`; the
  example is `comics/moon-fishing-art.html`.

Use generated art when the user asks for it ("с картинками",
"сгенерируй картинки", "AI art", "как moon-fishing-art", "not SVG").
Otherwise use SVG.

## Page structure (per comic)

| Page | Front comic | Back comic | Content |
|---|---|---|---|
| cover | 1 (`a-1`) | 9 (`b-1`) | title, hero, issue badge |
| 2 | 2 (`a-2`) | 10 (`b-2`) | setup: who, where, what they want |
| 3 | 3 (`a-3`) | 11 (`b-3`) | something happens |
| spread | 4-5 (`a-45`) | 12-13 (`b-45`) | one wide panel: the big moment |
| 6 | 6 (`a-6`) | 14 (`b-6`) | consequence or complication |
| 7 | 7 (`a-7`) | 15 (`b-7`) | resolution, a small twist or warm ending |
| back cover | 8 (`a-8`) | 16 (`b-8`) | "The End", series line, hint to flip for the other comic |

Pages 2, 3, 6 and 7 usually have two panels each. The spread is a single
panel across both pages; it's the payoff the story builds to.

## Workflow

### 1. Decide the two stories

- **Theme**: take it from the request. One theme → two different stories
  on it, usually with the same hero (two adventures of one character), or
  one story plus a contrasting one if the theme is narrow. Two themes → one
  each. No theme → invent both, with different heroes and moods.
- **Language**: write all text in the language the user wrote the
  request in, unless they ask otherwise.
- **Issue numbers**: continue the series. Look for `FOLDBOOK COMICS · No.`
  in the existing `comics/*.html` and use the next two numbers.
- **File name**: a short latin slug from the titles, e.g.
  `comics/hedgehog-and-rain.html`. Never overwrite an existing file.

Write a quick beat sheet for yourself (one line per page, above) before
drawing. Don't ask the user to approve it; they asked for the finished
comic. Good stories at this size:

- One hero, one clear want, one surprising turn, a warm or funny ending.
- Show, don't tell: the pictures carry the story, text is a few words per
  bubble. About 10-15 short lines of text per comic in total is plenty.
- The spread is the image the reader will remember: big, dramatic, a
  sound effect if it fits.
- The two comics can nod to each other on their back covers ("flip the
  sheet for No. 4: …").

### 2. Build the file

1. Copy `assets/template.html` (next to this file) to `comics/<slug>.html`.
2. Fill in the placeholders: `{{LANG}}` (e.g. `ru`, `en`), `{{TITLE}}`
   (both comic titles, e.g. `Hedgehog & Rain / The Lost Kite`),
   `{{LABEL_A}}` and `{{LABEL_B}}` (screen-only labels, e.g.
   `Front · No. 3 “Hedgehog & Rain” · pages 1–8`).
3. Replace `<!-- ART GOES HERE -->` with the artwork: first shared
   definitions (characters with separate face parts, props, gradients),
   then the 14 page groups `a-1 a-2 a-3 a-45 a-6 a-7 a-8` and
   `b-1 b-2 b-3 b-45 b-6 b-7 b-8`.

Write the file with the Write/Edit tools (UTF-8, which Cyrillic and other
non-Latin text needs; Windows PowerShell's `Set-Content` and `Out-File`
don't write plain UTF-8). Don't touch the sheet markup below the defs: the
cell order, rotation classes and spread viewBoxes encode how the paper
folds, and the template already has them right. The example files use the
same `a-*` / `b-*` page ids, so their pages can be copied as patterns.

Read `references/drawing.md` before drawing. It covers the page coordinate
system, panel layouts, character reuse, bubbles, text sizing and the
spread's fold line. All of it applies in both modes.

In generated-art mode, also read `references/generated-art.md`, and do
this in order: decide each page's panel layout first (the panel shapes
set the picture sizes), write the two specs, generate and review the
pictures, and only then place bubbles and captions over the pictures
you actually got. Pictures go in `comics/<slug>/` next to the HTML,
together with the specs.

### 3. Check it

Render a preview (Windows, needs Edge or Chrome). Run it with the
PowerShell tool from the repo root; launching the browser from Git Bash
hangs.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .claude\skills\foldbook-comic\scripts\preview.ps1 -Html comics\<slug>.html -OutDir <scratch dir>
```

It first checks the artwork (well-formed XML, unique ids, all 14 page
groups present) and prints warnings; fix those before looking at the
pictures. Then it writes `book.png` (both comics upright, laid out as an open book: cover,
2|3, 4|5, 6|7, back cover) and `sheet.png` (the real rotated print sheets).
Look at `book.png` and fix what you see:

- text running out of its bubble or caption, or cut off by a frame;
- bubbles covering faces, tails pointing at the wrong character;
- characters floating (not sitting on what they sit on) or missing;
- something important sitting on the fold in the middle of the spread;
- pages that read the same; each page should move the story on.

Then check `sheet.png` once to confirm the pages sit in the grid. One or
two fix-and-preview rounds is normal; stop once nothing is broken.

### 4. Hand it over

Tell the user, in their language:

- the file path (and, in generated-art mode, that the picture folder
  must stay next to it);
- a one-line summary of each story;
- how to print: open the file in a browser, Ctrl+P, A4, margins None,
  scale 100%, headers/footers off, background graphics on, two-sided;
- that to read the second comic they unfold the sheet, flip it over and
  fold it again.

Don't commit unless asked.
