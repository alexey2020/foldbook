# Drawing foldbook comic pages in SVG

The complete worked example is `comics/comics.html` in the repo (two
comics, every technique below; `comics/hedgehog-and-dark.html` is a second
one, in Russian). When unsure how something looks in
practice, open it and copy the pattern.

## Contents

1. Coordinates and page groups
2. Panels
3. Characters and props
4. Speech bubbles, captions, sound effects
5. Text sizing and fitting
6. The spread
7. Covers
8. Pitfalls

## 1. Coordinates and page groups

A page is a 660 x 960 box in reading orientation (portrait). On paper that
is about 68 x 99 mm, so 1 unit ≈ 0.1 mm — a 30-unit font prints at ~3 mm.

Every page is one group in `<defs>`:

```svg
<g id="a-2" font-family="'Comic Sans MS', 'Comic Neue', 'Chalkboard SE', cursive"
   font-weight="700" stroke-linejoin="round" stroke-linecap="round">
  ...panels...
</g>
```

The font attributes must be on every page group (and on the spread group):
the cells show pages through `<use>`, and cloned content inherits from the
`<use>`, not from anything around the original. Without them, text falls
back to a serif font. Comic Sans MS covers Latin and Cyrillic.

## 2. Panels

A panel is a nested `<svg>` with its own origin and automatic clipping,
followed by its frame:

```svg
<svg x="10" y="10" width="640" height="440">
  <rect width="640" height="440" fill="#1d2b53"/>   <!-- background -->
  ...scene in local coordinates 0..640 x 0..440...
</svg>
<rect x="10" y="10" width="640" height="440" fill="none" stroke="#222" stroke-width="7"/>
```

Anything that sticks out of the panel is clipped, so characters can be cut
by the frame for close-ups, and bubble tails can point "off panel".

Proven layouts (10-unit outer margin, 20-unit gutter):

| Layout | Panels (x, y, w, h) |
|---|---|
| one full page | (10,10,640,940) |
| two stacked, equal | (10,10,640,440) + (10,470,640,480) |
| two stacked, taller top | (10,10,640,460) + (10,490,640,460) |
| three stacked | (10,10,640,300) + (10,330,640,300) + (10,650,640,300) |
| top wide + two side by side | (10,10,640,440) + (10,470,310,480) + (340,470,310,480) |

Two panels per content page read best at this size. Three is the most that
still fits readable text; use it for a quick beat (a sequence of small
actions), not for dialogue.

## 3. Characters and props

Define each recurring character once in `<defs>`, in its own coordinates,
and place it with a transform. Keep face parts as separate groups so each
panel can pick an expression:

```svg
<g id="pip" stroke="#222" stroke-width="6" stroke-linejoin="round">  <!-- body, no face -->
  ...
</g>
<g id="pip-eyes">...</g>
<path id="pip-eyes-closed" .../>
<path id="pip-smile" .../>

<!-- in a panel: -->
<g transform="translate(215 150) scale(.75)">
  <use href="#pip"/><use href="#pip-eyes-closed"/><use href="#pip-smile"/>
</g>
```

Style that reads well at pocket size:

- Chunky geometric shapes (circles, ellipses, rounded rects, triangles),
  flat fills, dark outline `#222` at stroke-width 5-6 in the character's
  own units. Strokes scale with the transform, which keeps close-ups bold.
- Eyes do most of the acting: open dots, closed arcs (sleep/content),
  upward arcs (happy), big white circles with small pupils (surprise).
  Pair with a small mouth variant.
- Thick limbs with an outline: draw the same path twice, dark and wide
  first, then coloured and narrower on top:
  `<path d="M.." stroke="#222" stroke-width="24"/><path d="M.." stroke="#8a9199" stroke-width="12"/>`
  Draw limbs before the body when the body should cover the shoulder.
- Recolour one drawing for several characters or objects with
  `fill="currentColor"` inside the definition and `color="..."` on each
  `<use>` (all robots in the example are one drawing; so are all flowers).
- Hide a character's lower half behind something by drawing the covering
  object afterwards (a cat in a boat: cat first, then the hull). Work out
  where the cover's top edge lands in the character's coordinates and keep
  the face (eyes and mouth) at least 20 units above it; a blanket or table
  drawn too high swallows the face.
- Where two outlined shapes of one character overlap (a face and a snout),
  the outline of the lower shape shows through as a seam. Draw every part
  once with its stroke, then the parts that should merge again with
  `stroke="none"` on top, so only the outer silhouette keeps its outline.

Pick a palette of 5-8 colours per comic and a distinct mood per side
(e.g. night blues vs. morning pastels), so the two comics on one sheet feel
like different books.

## 4. Speech bubbles, captions, sound effects

Speech bubble — rounded rect, then a tail whose two top points sit 3 units
inside the bubble edge so its white fill covers the border there:

```svg
<rect x="24" y="24" width="420" height="120" rx="28" fill="#fff" stroke="#222" stroke-width="5"/>
<path d="M290 141 L335 182 L325 141" fill="#fff" stroke="#222" stroke-width="5"/>
<text x="234" y="74" font-size="34" text-anchor="middle" fill="#222">First line</text>
<text x="234" y="122" font-size="34" text-anchor="middle" fill="#222">second line</text>
```

The tail tip should stop just short of the speaker's head. A tail can also
leave from a side edge (points on x = right edge - 3).

Caption box (narration): square corners, pale yellow `#fff3b0`, text left
aligned 16 units in, usually in a panel corner.

Sound effect: big outlined text, slightly rotated:

```svg
<text x="1000" y="190" font-size="110" text-anchor="middle" fill="#bfe3ff"
      stroke="#222" stroke-width="14" paint-order="stroke"
      transform="rotate(-6 1000 190)">SPLOOSH!</text>
```

`paint-order="stroke"` keeps the outline behind the fill.

## 5. Text sizing and fitting

SVG text does not wrap, so every line is its own `<text>`.

- Dialogue 30-38, captions 28-30, never below 24 (≈2.5 mm on paper).
- Width estimate for bold Comic Sans: characters x font-size x 0.6 for
  mixed-case text, x 0.7 for ALL CAPS (titles, sound effects), Latin and
  Cyrillic alike. "Tonight I'll catch" = 18 x 34 x 0.6 ≈ 367, so the
  bubble is 420 wide. Leave 20+ units of padding each side.
- Line spacing: baseline step ≈ font-size x 1.35.
- Keep a bubble to 1-3 short lines (about 20 characters per line). If it
  doesn't fit, rewrite the line shorter rather than shrinking the font.
- Russian lines run longer than English; plan for it when writing dialogue.

## 6. The spread

Pages 4|5 (a-45) and 12|13 (b-45) are one drawing in a 1320 x 960 box: page
4 shows x 0..660, page 5 shows x 660..1320. The template's cells already
set those viewBoxes; you only define the group.

```svg
<g id="a-45" font-family="..." font-weight="700" ...>
  <svg x="10" y="10" width="1300" height="940"> ... </svg>
  <rect x="10" y="10" width="1300" height="940" fill="none" stroke="#222" stroke-width="7"/>
</g>
```

The two halves meet at x = 660, which is the fold (there's a small padding
gap on paper). Keep faces, bubbles and words at least 40 units away from
it; let scenery, water, lines and motion cross it. This is the comic's big
moment: put the main character on one half and the thing they react to on
the other.

## 7. Covers

- Front cover (a-1 / b-1): one full-page panel. Title in big outlined
  letters (font-size 100-140, stroke 10-12, paint-order stroke), the hero
  large, an issue badge ("No.3") in a corner circle, optional subtitle.
  Measure the title with the ALL CAPS estimate and keep it clear of the
  badge; drop the title lower or make it smaller rather than overlap.
- Back cover (a-8 / b-8): calm closing image, "THE END" (or the language's
  equivalent, e.g. «КОНЕЦ»), a series line such as "FOLDBOOK COMICS · No. 3",
  and a hint to flip the sheet and refold for the other comic, naming it.

## 8. Pitfalls

- A panel's `<svg>` background `<rect>` must come first, or it paints over
  the scene.
- Escape `&` as `&amp;` in text and titles.
- Every `id` in the file must be unique (both comics share one `<defs>`);
  prefix per comic if two characters would clash.
- Don't hide the defs `<svg>` with `display:none`: gradients and patterns
  stop working. The template positions it off-screen instead.
- Gradients and patterns (`<linearGradient>`, `<pattern>`) go directly in
  `<defs>` and are referenced with `fill="url(#id)"`; they work inside
  `<use>` clones.
