// Generates comic panel pictures with Pollinations (https://pollinations.ai).
//
//   node generate-art.js <spec.json> [panel ids...]
//
// The spec (see references/generated-art.md):
//   {
//     "outDir": "comics/my-comic",            // relative to the current dir
//     "style": "Children's comic book ...",   // prefix for every prompt
//     "reference": {                          // the hero's model sheet
//       "file": "ref-a.jpg",                  // in outDir; reused if it exists
//       "prompt": "An orange tabby cat ..."   // used only to create it
//     },
//     "panels": [ { "id": "a-2-top", "size": "1024x704", "prompt": "..." } ]
//   }
//
// The reference is made once from text (Z-Image). Every panel is then
// drawn by FLUX Klein from that reference, which keeps the hero looking the
// same across panels. Existing panel files are skipped, so a re-run only
// fills in what's missing; pass panel ids to redo exactly those.
//
// The API key is read from ~/.pollinations-key and never printed.

const fs = require("fs");
const path = require("path");
const os = require("os");

const API = "https://gen.pollinations.ai";
const REFERENCE_MODEL = "zimage";
const PANEL_MODEL = "klein";

const [specPath, ...only] = process.argv.slice(2);
if (!specPath) {
  console.error("usage: node generate-art.js <spec.json> [panel ids...]");
  process.exit(2);
}
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
const keyFile = path.join(os.homedir(), ".pollinations-key");
if (!fs.existsSync(keyFile)) {
  console.error(`No API key: create ${keyFile} with a key from https://enter.pollinations.ai/keys`);
  process.exit(1);
}
const key = fs.readFileSync(keyFile, "utf8").replace(/^﻿/, "").trim();
const auth = { Authorization: "Bearer " + key };
const outDir = spec.outDir;
fs.mkdirSync(outDir, { recursive: true });

function explain(status, body) {
  if (status === 401) return "the API key was rejected; check ~/.pollinations-key";
  if (status === 402) return "out of pollen (quota); wait for it to refill or top up";
  if (status === 429) return "rate limited";
  return body.slice(0, 200);
}

async function withRetries(label, fn) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const t = Date.now();
    const res = await fn();
    if (res.ok) {
      const buf = await res.buffer();
      console.log(`${label} ok ${((Date.now() - t) / 1000).toFixed(1)}s`);
      return buf;
    }
    console.log(`${label} attempt ${attempt} failed: ${res.status} ${explain(res.status, res.body)}`);
    if (res.status === 401 || res.status === 402) break;
    await new Promise((r) => setTimeout(r, 5000 * attempt));
  }
  return null;
}

async function call(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) return { ok: false, status: res.status, body: await res.text() };
  const type = res.headers.get("content-type") || "";
  // The edits endpoint answers with JSON (base64), the text endpoint with the image.
  const buffer = type.includes("json")
    ? async () => Buffer.from((await res.json()).data[0].b64_json, "base64")
    : async () => Buffer.from(await res.arrayBuffer());
  return { ok: true, buffer };
}

async function makeReference() {
  const file = path.join(outDir, spec.reference.file);
  if (fs.existsSync(file)) return file;
  const prompt = encodeURIComponent(spec.style + " " + spec.reference.prompt);
  const buf = await withRetries("reference", () =>
    call(`${API}/image/${prompt}?model=${REFERENCE_MODEL}&width=1024&height=1024&nologo=true&seed=1`, { headers: auth })
  );
  if (!buf) process.exit(1);
  fs.writeFileSync(file, buf);
  return file;
}

async function makePanel(panel, refFile) {
  const file = path.join(outDir, panel.id + ".jpg");
  if (fs.existsSync(file) && !only.includes(panel.id)) return;
  const buf = await withRetries(`${panel.id} (${panel.size})`, () => {
    const form = new FormData();
    form.append("model", PANEL_MODEL);
    form.append("prompt", spec.style + " " + panel.prompt);
    form.append("size", panel.size);
    form.append("image", new Blob([fs.readFileSync(refFile)], { type: "image/jpeg" }), "reference.jpg");
    return call(`${API}/v1/images/edits`, { method: "POST", headers: auth, body: form });
  });
  if (buf) fs.writeFileSync(file, buf);
}

(async () => {
  const refFile = await makeReference();
  const todo = spec.panels.filter((p) => only.length === 0 || only.includes(p.id));
  // Three at a time stays well under the per-user rate limit.
  for (let i = 0; i < todo.length; i += 3) {
    await Promise.all(todo.slice(i, i + 3).map((p) => makePanel(p, refFile)));
  }
  const missing = spec.panels.filter((p) => !fs.existsSync(path.join(outDir, p.id + ".jpg")));
  if (missing.length) {
    console.log("missing: " + missing.map((p) => p.id).join(" "));
    process.exit(1);
  }
})();
