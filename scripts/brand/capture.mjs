// Screenshot a story moment from the dev server for the social card.
// usage: node capture.mjs out.png Section+offset [width height scale]
// PW_DIR must contain node_modules/playwright (see scripts/character/svgrender.py), and `npm run dev` serving http://127.0.0.1:5173/ (development exposes window.__exp).
// CHROMIUM_PATH may point to Chrome; on macOS Chrome renders WebGL on the GPU through Metal.
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(path.join(path.resolve(process.env.PW_DIR || "scripts/character/build/pw"), "x.js"));
const { chromium } = require("playwright");
const [, , out, target = "ColosseumScene+2.1", w = 1200, h = 630, scale = 2] = process.argv;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: process.env.CHROMIUM_PATH
    ? ["--ignore-gpu-blocklist"]
    : ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +scale });
await page.goto(process.env.VOYAGE_URL || "http://127.0.0.1:5173/");
await page.waitForSelector(".action", { timeout: 240000 });
await page.waitForTimeout(3000);
await page.locator(".action").first().click();
await page.waitForTimeout(3000);
await page.addStyleTag({ content: ".HeaderMenu, .brand, .sound-toggle { visibility: hidden !important }" });
await page.evaluate((t) => {
  const [name, offset] = t.split("+");
  const exp = window.__exp;
  const section = exp.sections.find((s) => s.name === name);
  exp.restoreScroll(section.pixelTop + (+offset || 0) * innerHeight);
}, target);
await page.waitForTimeout(4500);
// Hide the WebGL chrome (header logo, audio meter, scroll thumb, cursor).
await page.evaluate(() => (window.__exp.overlay.scene.visible = false));
await page.waitForTimeout(400);
await page.screenshot({ path: out });
await browser.close();
