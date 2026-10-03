import { chromium } from 'playwright';
import fs from 'fs';
const [,, input, output, w, h] = process.argv;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const svg = fs.readFileSync(input, 'utf8');
await page.setContent(`<html><body style="margin:0;background:#fff">${svg.replace(/width="\d+" height="\d+"/, `width="${w}" height="${h}"`)}</body></html>`);
await page.screenshot({ path: output, clip: { x: 0, y: 0, width: +w, height: +h }, omitBackground: false });
await browser.close();
