// Write the Trapnest Voyage emblem, logos, favicons and web-app icons.
//
// The emblem is the story's key image drawn as a porthole: a basalt sea arch
// whose opening holds the last sun of summer, above an ink-stroke sea with a
// road of light. The wordmark is set in Charles Rosie (the experience's
// display face) and converted to outlines, so no SVG depends on a web font.
//
// usage: PW_DIR=<dir with node_modules/playwright and opentype.js> node scripts/brand/build_logos.mjs
// CHROMIUM_PATH may point to a Chromium or Chrome executable for the PNG renders.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(path.resolve(process.env.PW_DIR || "scripts/character/build/pw"), "x.js"));
const opentype = require("opentype.js");
const { chromium } = require("playwright");

export const INK = "#141210";
export const PAPER = "#efe6d2";
export const SUN = "#f4bd28";
const IMG = path.join(ROOT, "public/assets/images");
const FAV = path.join(ROOT, "public/assets/favicon");

const fontBytes = fs.readFileSync(path.join(ROOT, "public/assets/fonts/CharlesRosie.woff"));
const font = opentype.parse(fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.length));
const f = (n) => +n.toFixed(2);

/** Outline a line of text; `width` stretches the tracking so the line spans exactly that width. */
function text(str, x, baseline, size, { width, tracking = 0 } = {}) {
  const glyphs = [...str].map((c) => font.charToGlyph(c));
  const scale = size / font.unitsPerEm;
  const natural = glyphs.reduce((w, g) => w + g.advanceWidth * scale, 0);
  if (width) tracking = (width - natural) / Math.max(1, glyphs.length - 1);
  let cx = x;
  return glyphs
    .map((g) => {
      const d = g.getPath(cx, baseline, size).toPathData(2);
      cx += g.advanceWidth * scale + tracking;
      return d;
    })
    .join("");
}

/** Deterministic jitter so every build draws the same columns. */
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

/** A basalt column: body from its hexagonal head down to the waterline, plus the head itself. */
function column(x, w, top, bottom, capH) {
  const body = `M${f(x)} ${f(bottom)}V${f(top)}L${f(x + w * 0.25)} ${f(top - capH)}H${f(x + w * 0.75)}L${f(x + w)} ${f(top)}V${f(bottom)}Z`;
  const i = Math.min(0.7, w * 0.12);
  const cap =
    `M${f(x + i)} ${f(top)}L${f(x + w * 0.25 + i * 0.3)} ${f(top - capH + i * 0.6)}H${f(x + w * 0.75 - i * 0.3)}` +
    `L${f(x + w - i)} ${f(top)}L${f(x + w * 0.75 - i * 0.3)} ${f(top + capH - i * 0.6)}H${f(x + w * 0.25 + i * 0.3)}Z`;
  return { body, cap };
}

/**
 * The emblem in a 120 x 120 frame centred on (60, 60).
 * mode "color": ink, paper and sun. mode "mono": one ink, everything else transparent
 * (the header shader recolours it). `ink`, `paper` and `sun` override the colours.
 */
export function emblem({ mode = "color", ink = INK, paper = PAPER, sun = SUN, id = "e", ring = true } = {}) {
  const mono = mode === "mono";
  const R = 50;
  const horizon = 80;
  const random = rng(29);
  // The arch: a mass of hexagonal columns standing in open water, highest over the
  // opening and stepping down to broken stubs at either side.
  const cols = [];
  for (let x = 23; x < 96; ) {
    const w = 5.4 + random() * 2.4;
    const cx = x + w / 2;
    const top = 23 + 0.03 * (cx - 60) ** 2 + (random() - 0.5) * 8;
    cols.push({ x, w, top });
    x += w + 0.8;
  }
  for (const [x, w, top] of [[14.5, 5.2, 72], [19.4, 4.6, 66], [97.6, 5.4, 68], [103.4, 4.4, 74]]) cols.push({ x, w, top });
  const parts = cols.map(({ x, w, top }) => column(x, w, top, horizon, 1.9));
  const bodies = parts.map((p) => p.body).join("");
  const caps = parts.map((p) => p.cap).join("");
  // Joints across the columns and an engraved highlight down each.
  const marks = cols
    .map(({ x, w, top }) => {
      const out = [];
      const lx = x + w * (0.28 + random() * 0.12);
      const y0 = top + 4 + random() * 3;
      const y1 = horizon - 4 - random() * 12;
      if (y1 - y0 > 5) out.push(`M${f(lx)} ${f(y0)}V${f(y1)}`);
      for (let j = 0; j < 2; j++) {
        const jy = top + 8 + random() * (horizon - top - 12);
        if (horizon - top > 14) out.push(`M${f(x + w * 0.55)} ${f(jy)}H${f(x + w - 0.6)}`);
      }
      return out.join("");
    })
    .join("");
  // The opening: a round-headed portal down to the waterline.
  const ox = 60, ow = 14.5, oy = 55;
  const portal = `M${ox - ow} ${horizon}V${oy}A${ow} ${ow} 0 0 1 ${ox + ow} ${oy}V${horizon}Z`;
  // The sun caught in the opening, ringed like the engine's engraved disc.
  const sunR = 11.5, sunY = 60;
  // Sea strokes, leaving a road of light under the sun.
  const sea = [];
  const road = [];
  const seaRandom = rng(5);
  for (let i = 0, y = horizon + 4; y < 60 + R; i++, y += 3.4 + i * 0.6) {
    const half = Math.sqrt(Math.max(0, R * R - (y - 60) ** 2));
    const gap = 3.2 + i * 2.1;
    road.push(`M${f(60 - gap + 1.6)} ${f(y)}H${f(60 + gap - 1.6)}`);
    let x = 60 - half - 2 + seaRandom() * 6;
    while (x < 60 + half) {
      const l = Math.max(x, 60 - half);
      const r = Math.min(x + 5 + seaRandom() * 12, 60 + half);
      if (r < 60 - gap || l > 60 + gap) sea.push(`M${f(l)} ${f(y)}H${f(r)}`);
      else {
        if (l < 60 - gap) sea.push(`M${f(l)} ${f(y)}H${f(60 - gap)}`);
        if (r > 60 + gap) sea.push(`M${f(60 + gap)} ${f(y)}H${f(r)}`);
      }
      x = r + 2 + seaRandom() * 4;
    }
  }
  const rings = [4.5, 7.5, 10]
    .map((r) => `M${f(60 - r)} ${sunY}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`)
    .join("");
  const clip = `<clipPath id="${id}c"><circle cx="60" cy="60" r="${R}"/></clipPath>`;
  const bezel = ring
    ? `<circle cx="60" cy="60" r="${R + 3.2}" fill="none" stroke="${ink}" stroke-width="2.4"/>` +
      `<circle cx="60" cy="60" r="${R + 7.2}" fill="none" stroke="${ink}" stroke-width="1"/>`
    : "";
  const mask = (cuts) =>
    `<mask id="${id}m" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">` +
    `<rect width="120" height="120" fill="#fff"/><path d="${portal}" fill="#000"/>${cuts}</mask>`;
  if (mono) {
    // Everything that is paper or sun in colour is a hole here.
    return (
      `<defs>${clip}${mask(
        `<path d="${caps}" fill="#000"/><path d="${marks}" stroke="#000" stroke-width="0.8" stroke-linecap="round"/>`,
      )}</defs>` +
      `<g clip-path="url(#${id}c)">` +
      `<path d="${bodies}" fill="${ink}" mask="url(#${id}m)"/>` +
      `<circle cx="60" cy="${sunY}" r="${sunR}" fill="${ink}"/>` +
      `<path d="M0 ${horizon}H120" stroke="${ink}" stroke-width="1.6"/>` +
      `<path d="${sea.join("")}" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>` +
      `</g>${bezel}`
    );
  }
  return (
    `<defs>${clip}${mask("")}</defs>` +
    `<g clip-path="url(#${id}c)">` +
    `<rect width="120" height="120" fill="${paper}"/>` +
    `<circle cx="60" cy="${sunY}" r="${sunR}" fill="${sun}"/>` +
    `<path d="${rings}" fill="none" stroke="${ink}" stroke-width="0.6" stroke-dasharray="4 2 7 2.6" opacity="0.5"/>` +
    `<g mask="url(#${id}m)">` +
    `<path d="${bodies}" fill="${ink}"/>` +
    `<path d="${marks}" stroke="${paper}" stroke-width="0.7" stroke-linecap="round"/>` +
    `<path d="${caps}" fill="${paper}"/>` +
    `</g>` +
    `<path d="M0 ${horizon}H120" stroke="${ink}" stroke-width="1.6"/>` +
    `<path d="${sea.join("")}" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<path d="${road.join("")}" stroke="${sun}" stroke-width="1.7" stroke-linecap="round"/>` +
    `</g>${bezel}`
  );
}

const svg = (viewBox, body, label = "Trapnest Voyage") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${label}">${body}</svg>\n`;

/** Emblem plus the stacked TRAPNEST / VOYAGE wordmark. */
export function lockup({ wide, mode, ink, paper, sun, id }) {
  const words = wide
    ? text("TRAPNEST", 135, 49, 25, { width: 145 }) + text("VOYAGE", 134, 91, 44, { width: 146 })
    : text("TRAPNEST", 97, 55, 13, { width: 68 }) + text("VOYAGE", 96, 80, 22, { width: 70 });
  const scale = wide ? 1 : 0.72;
  const shift = wide ? "" : ` transform="translate(${f(60 - 60 * scale - 16)} ${f(60 - 60 * scale)}) scale(${scale})"`;
  return svg(
    wide ? "0 0 286 120" : "0 0 168 120",
    `<g${shift}>${emblem({ mode, ink, paper, sun, id })}</g><path d="${words}" fill="${ink}"/>`,
  );
}

/** Favicon tile: the emblem without its bezel, on a rounded ink square. */
function tile({ size = 64, radius = 14, maskable = false } = {}) {
  // Maskable icons keep the art inside the 80% safe zone.
  const s = maskable ? 0.74 : 1.02;
  const t = (120 - 120 * s) / 2;
  return svg(
    "0 0 120 120",
    `<rect width="120" height="120" rx="${maskable ? 0 : radius * (120 / size)}" fill="${INK}"/>` +
      `<g transform="translate(${f(t)} ${f(t)}) scale(${s})">${simple()}</g>`,
  );
}

/** Bold, small-size emblem for the favicon: fewer, fatter columns and a big sun. */
function simple() {
  const horizon = 84;
  const tops = [62, 44, 31, 24, 27, 36, 56];
  const d = tops
    .map((top, i) => column(19 + i * 11.8, 10.4, top, horizon, 3).body)
    .join("");
  const portal = `M42 ${horizon}V62A18 18 0 0 1 78 62V${horizon}Z`;
  return (
    `<defs><mask id="fm" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120"><rect width="120" height="120" fill="#fff"/><path d="${portal}" fill="#000"/></mask></defs>` +
    `<path d="${d}" fill="${PAPER}" mask="url(#fm)"/>` +
    `<circle cx="60" cy="68" r="14" fill="${SUN}"/>` +
    `<path d="M10 ${horizon + 1.5}H110" stroke="${PAPER}" stroke-width="3.4" stroke-linecap="round"/>` +
    `<path d="M51 95H69M46 105H74" stroke="${SUN}" stroke-width="3.4" stroke-linecap="round"/>` +
    `<path d="M18 95H40M80 95H102M28 105H38M82 105H92" stroke="${PAPER}" stroke-width="3.4" stroke-linecap="round" opacity="0.5"/>`
  );
}

/** Pack PNGs into an .ico (PNG-compressed entries, Vista+). */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const o = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, o);
    header.writeUInt8(size >= 256 ? 0 : size, o + 1);
    header.writeUInt16LE(1, o + 4);
    header.writeUInt16LE(32, o + 6);
    header.writeUInt32LE(data.length, o + 8);
    header.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

async function main() {
  const write = (file, data) => {
    fs.writeFileSync(file, data);
    console.log(path.relative(ROOT, file));
  };
  const files = {
    logo: lockup({ wide: true, mode: "mono", ink: "#000", id: "l" }),
    mobile: lockup({ wide: false, mode: "mono", ink: "#000", id: "m" }),
    footer: lockup({ wide: true, mode: "color", ink: PAPER, paper: INK, sun: SUN, id: "f" }),
    emblem: svg("-10 -10 140 140", emblem({ id: "e" })),
    favicon: tile(),
    maskable: tile({ maskable: true }),
  };
  write(path.join(IMG, "trapnest-voyage-logo.svg"), files.logo);
  write(path.join(IMG, "trapnest-voyage-logo-mobile.svg"), files.mobile);
  write(path.join(IMG, "trapnest-voyage-logo-footer.svg"), files.footer);
  write(path.join(IMG, "trapnest-voyage-emblem.svg"), files.emblem);
  write(path.join(FAV, "trapnest-voyage.svg"), files.favicon);

  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage();
  const render = async (markup, w, h, transparent = true) => {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(
      `<html><body style="margin:0;background:transparent;overflow:hidden">${markup.replace("<svg ", `<svg style="display:block" width="${w}" height="${h}" `)}</body></html>`,
    );
    await page.waitForTimeout(100);
    return page.screenshot({ clip: { x: 0, y: 0, width: w, height: h }, omitBackground: transparent });
  };
  // Header logos are alpha masks for the overlay's LogoShader; 3x their CSS size.
  write(path.join(IMG, "trapnest-voyage-logo.png"), await render(files.logo, 858, 360));
  write(path.join(IMG, "trapnest-voyage-logo-mobile.png"), await render(files.mobile, 504, 360));
  write(path.join(IMG, "trapnest-voyage-emblem.png"), await render(files.emblem, 1024, 1024));
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const size of sizes) pngs.push({ size, data: await render(files.favicon, size, size) });
  write(path.join(ROOT, "public/favicon.ico"), ico(pngs));
  write(path.join(FAV, "favicon-32.png"), pngs[1].data);
  write(path.join(ROOT, "public/apple-touch-icon.png"), await render(tile({ maskable: true }), 180, 180, false));
  write(path.join(FAV, "icon-192.png"), await render(files.favicon, 192, 192));
  write(path.join(FAV, "icon-512.png"), await render(files.favicon, 512, 512));
  write(path.join(FAV, "icon-maskable-512.png"), await render(files.maskable, 512, 512, false));
  await browser.close();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
