# Generated-art mode

In this mode the pictures inside the panels come from an image model
(Pollinations), and everything else is SVG as usual: panel frames, speech
bubbles, captions, sound effects, cover titles. The worked example is
`comics/moon-fishing-art.html` with its pictures in
`comics/moon-fishing-art/`.

Image models can't be trusted with text (letters come out garbled,
especially Cyrillic), so no words are ever generated; they are overlaid.

## Contents

1. Setup and cost
2. Writing the spec
3. Prompts that work
4. Generating and fixing
5. Putting pictures in the pages

## 1. Setup and cost

- The API key lives in `~/.pollinations-key` (one line). If it's missing,
  ask the user to create a key at https://enter.pollinations.ai/keys and
  save it there themselves (for example `! notepad $HOME\.pollinations-key`).
  Never print the key or pass it on a command line you echo.
- Cost is paid in "pollen" from the user's quota: about 0.005 per panel
  (FLUX Klein) and 0.004 for the reference. A full sheet (2 references and
  about 22 panels) is roughly 0.12.
- Needs Node 18+ (uses built-in `fetch`).

## 2. Writing the spec

Write one spec file per comic (each comic has its own hero). Keep it next
to the pictures so the art can be regenerated later:
`comics/<slug>/spec-a.json` and `spec-b.json`.

```json
{
  "outDir": "comics/<slug>",
  "style": "Children's comic book panel in exactly the same art style as the reference image: flat colors, thick clean black outlines, simple shapes. The hero is the same character as in the reference: <one-line description>. Full-bleed illustration filling the whole image, no border, no frame, no text, no letters, no speech bubbles.",
  "reference": {
    "file": "ref-a.jpg",
    "prompt": "Character model sheet: <hero description>, full body, facing the viewer, plain light background."
  },
  "panels": [
    { "id": "a-1",        "size": "704x1024",  "prompt": "..." },
    { "id": "a-2-top",    "size": "1024x704",  "prompt": "..." },
    { "id": "a-2-bottom", "size": "1024x768",  "prompt": "..." },
    { "id": "a-45",       "size": "1408x1024", "prompt": "..." }
  ]
}
```

Name panels after their page (`a-2-top`, `a-2-bottom`, `a-45`, `b-6-top`,
...), so the file name says where it goes.

Pick `size` from the panel's shape so the picture fills it without
cropping anything important (the page embeds it with "slice"):

| Panel (x, y, w, h) in the page | size |
|---|---|
| full page 640 x 940 (covers) | 704x1024 |
| 640 x 440 | 1024x704 |
| 640 x 480 | 1024x768 |
| 640 x 460 | 1024x736 |
| 640 x 300 | 1024x480 |
| 310 x 480 | 672x1040 |
| spread 1300 x 940 | 1408x1024 |

Both numbers must be multiples of 16; keep the longer side at 1024-1408.

## 3. Prompts that work

- **Say it once, concretely.** One sentence for the composition: who is
  where, doing what, facing which way. "The cat sits in a small red
  rowboat on the left, pulling hard on a bent fishing rod; on the right a
  huge glowing moon is pulled out of the lake with a giant splash."
- **Reserve room for words.** For every bubble or caption, say where the
  empty space must be: "The upper left area is plain dark sky, left
  empty." Covers need an empty band for the title ("the top quarter is
  plain night sky"), back covers one for "The End".
- **Keep the fold clear on the spread.** Put the hero on one half and what
  they react to on the other, and say so ("on the left ... on the right
  ...").
- **Name what must NOT be there** when it matters: "No fishing rod in this
  panel", "the sky has no other moon", "no cat in this panel".
- **Say the emotion through the body**: "eyes wide open in shock, mouth
  open", "both front paws stretched straight up above its head".
- The model follows the reference's pose closely. When a panel needs a
  very different pose, describe the pose first and in detail.
- Panels without the hero (a fish under water) still get the reference;
  add "(No <hero> in this panel; keep the same art style.)" so only the
  style carries over.
- The style prefix already forbids frames and text. If a picture still
  comes with a drawn border, add "The scene fills the entire image edge to
  edge, there is no rectangle, no panel border, no inner frame" to that
  panel's prompt.

## 4. Generating and fixing

Run from the repo root:

```bash
node .claude/skills/foldbook-comic/scripts/generate-art.js comics/<slug>/spec-a.json
node .claude/skills/foldbook-comic/scripts/generate-art.js comics/<slug>/spec-b.json
```

It creates the reference first, then the panels three at a time (about
10-20 s each). Existing files are skipped, so after an error just run it
again. To redo particular panels after changing their prompts, list their
ids: `... spec-a.json a-2-bottom a-7-top`.

Look at the reference before the panels matter: if the hero looks wrong,
delete `ref-*.jpg` and all panels of that comic, fix `reference.prompt`,
and run again (the panels copy whatever the reference shows).

Then look at every picture (a quick contact sheet with the preview browser,
or open them one by one) and regenerate the ones where:

- the hero doesn't look like the reference, or is missing;
- the action or pose isn't what the story needs;
- the empty space for the bubble isn't there;
- a border, text or letters appeared.

One or two retries per panel is normal. If a panel stays wrong after
three prompt changes, simplify the scene rather than keep retrying.

## 5. Putting pictures in the pages

The page structure is exactly the same as in SVG mode (template, page
groups, panel `<svg>` elements, frames). Inside the panel, the picture
replaces the drawn scene and comes first, so the words sit on top:

```svg
<svg x="10" y="470" width="640" height="480">
  <image href="<slug>/a-2-bottom.jpg" width="640" height="480" preserveAspectRatio="xMidYMid slice"/>
  <rect x="24" y="24" width="400" height="120" rx="28" fill="#fff" stroke="#222" stroke-width="5"/>
  <path d="M330 141 L380 196 L370 141" fill="#fff" stroke="#222" stroke-width="5"/>
  <text x="224" y="74" font-size="34" text-anchor="middle" fill="#222">Tonight I'll catch</text>
  <text x="224" y="122" font-size="34" text-anchor="middle" fill="#222">a BIG one!</text>
</svg>
<rect x="10" y="470" width="640" height="480" fill="none" stroke="#222" stroke-width="7"/>
```

- `href` is relative to the comic's HTML file (`comics/`), so it starts
  with the slug folder.
- Place bubbles where you asked for empty space, then check against the
  actual picture in the preview: point each tail at the hero's head as it
  was really drawn, and move a bubble that covers a face.
- Text straight on a busy picture (sound effects, the back cover's small
  lines) needs an outline to stay readable: `stroke="#222"
  stroke-width="5" paint-order="stroke"`.
- Shared SVG characters and props aren't needed in this mode; the defs
  hold only the page groups.
