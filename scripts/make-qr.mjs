// ─────────────────────────────────────────────────────────────────────────────
// Print-ready QR for a SHORT LINK — never for a tracked URL.
//
//   node scripts/make-qr.mjs https://sell.curbio.com/expcon docs/expcon/qr/curbio-expcon-qr
//
// Writes <out>.svg (vector, for the printer) and <out>.png (raster, for slides
// and screens), then prints what it encoded so the output can be read back
// against the argument.
//
// WHY THIS EXISTS BESIDE THE LINKS SCREEN'S QR BLOCK: that block encodes a
// row's `trackedUrl` — the long sell.curbio.com URL with its UTMs baked in.
// Ink cannot be repointed, so anything printed has to encode the redirect we
// control instead (lib/marketingLinks.ts, rule 1). The tags live on the
// redirect's target, where they can still be corrected after the paper exists.
//
// Level H (~30% recoverable) on purpose: these go on booth signs, postcards
// and a slide photographed from the back of a room — glare, creases and a
// thumb over one corner are the normal case, not the edge case.
//
// The URL is encoded EXACTLY as given. Lowercase it yourself: an upper-case
// path packs into fewer modules but only resolves if the redirect ignores
// case, and a QR that depends on a plugin setting is a QR that can break
// without anyone touching it.
// ─────────────────────────────────────────────────────────────────────────────

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import QRCode from "qrcode";

const [, , url, outBase] = process.argv;
if (!url || !outBase) {
  console.error("usage: node scripts/make-qr.mjs <short-link-url> <output-path-without-extension>");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error(`not a valid URL: ${url}`);
  process.exit(1);
}
if (parsed.search) {
  console.error(
    "refusing to encode a URL with a query string — print the short link and put the tags on its redirect target"
  );
  process.exit(1);
}

// Quiet zone of 4 modules is the spec minimum; scanners use it to find the
// symbol's edge, so it is part of the code and must survive any cropping.
const MARGIN = 4;
const OPTIONS = { errorCorrectionLevel: "H", margin: MARGIN, color: { dark: "#000000", light: "#ffffff" } };
const PNG_MIN_WIDTH = 2400;

const out = resolve(outBase);
mkdirSync(dirname(out), { recursive: true });

const { version, modules } = QRCode.create(url, { errorCorrectionLevel: "H" });

// A whole number of pixels per module. Asking the library for a WIDTH makes it
// divide that width across the modules, which here is 58.5px each — so some
// modules come out a pixel wider than their neighbours. Harmless to a scanner,
// but it is the kind of unevenness a print shop notices at proof.
const cells = modules.size + MARGIN * 2;
const scale = Math.ceil(PNG_MIN_WIDTH / cells);

const svg = await QRCode.toString(url, { ...OPTIONS, type: "svg" });
writeFileSync(`${out}.svg`, svg);
await QRCode.toFile(`${out}.png`, url, { ...OPTIONS, scale });

console.log(`encoded   ${url}`);
console.log(`symbol    version ${version} · ${modules.size}×${modules.size} modules · level H · ${MARGIN}-module quiet zone`);
console.log(`wrote     ${out}.svg`);
console.log(`wrote     ${out}.png  (${cells * scale}px, ${scale}px per module)`);
