// Screenshot a story moment from the dev server for the social card.
// usage: node capture.mjs out.png Section+offset [width height]
// Needs playwright resolvable from the working directory (see scripts/character/svgrender.py)
// and `npm run dev` serving http://127.0.0.1:5173/ (development exposes window.__exp).
import { chromium } from "playwright";
const [, , out, target = "CathedralScene+2.8", w = 1600, h = 840] = process.argv;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto(process.env.VOYAGE_URL || "http://127.0.0.1:5173/");
await page.waitForSelector(".action", { timeout: 240000 });
await page.waitForTimeout(3000);
await page.locator(".action").first().click();
await page.waitForTimeout(3000);
await page.addStyleTag({ content: ".HeaderMenu, .brand { visibility: hidden !important }" });
await page.evaluate((t) => {
  const [name, offset] = t.split("+");
  const exp = window.__exp;
  const section = exp.sections.find((s) => s.name === name);
  exp.restoreScroll(section.pixelTop + (+offset || 0) * innerHeight);
}, target);
await page.waitForTimeout(4500);
await page.screenshot({ path: out });
await browser.close();
