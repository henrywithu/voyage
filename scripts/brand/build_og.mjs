// Compose the 1200 x 630 social card from an engine render.
//
// Capture with the dev server running (development exposes `window.__exp`):
//   node scripts/brand/capture.mjs og.png ColosseumScene+2.1 1200 630 2
// Then: PW_DIR=<dir with playwright and opentype.js> node scripts/brand/build_og.mjs og.png
//
// The finale frame carries the whole story (Chaewon standing on the sea, the
// basalt arch and her sloop under a golden sky), so the card is the image itself
// with the ink lockup set small in the open sky, where the site's header sits.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { lockup, INK } from "./build_logos.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(path.resolve(process.env.PW_DIR || "scripts/character/build/pw"), "x.js"));
const { chromium } = require("playwright");
const OUT = path.join(ROOT, "public/assets/social/trapnest-voyage-og.jpg");
const [, , render] = process.argv;
if (!render) throw new Error("usage: build_og.mjs <render.png>");

const art = fs.readFileSync(render).toString("base64");
const mark = lockup({ wide: true, mode: "mono", ink: INK, id: "o" });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(`<html><body style="margin:0;width:1200px;height:630px;overflow:hidden;position:relative">
  <img src="data:image/png;base64,${art}" style="position:absolute;inset:0;width:1200px;height:630px;object-fit:cover">
  <div style="position:absolute;left:40px;top:28px;width:150px;height:63px">${mark.replace("<svg ", '<svg width="150" height="63" ')}</div>
</body></html>`);
await page.waitForTimeout(200);
await page.screenshot({ path: OUT, type: "jpeg", quality: 88 });
await browser.close();
console.log(path.relative(ROOT, OUT));
