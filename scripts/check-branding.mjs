import { readFile, stat } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const requireText = async (path, expected) => {
  const source = await read(path);
  for (const value of expected) {
    if (!source.includes(value)) throw new Error(`${path}: missing ${value}`);
  }
  return source;
};

const index = await requireText("index.html", [
  "Trapnest Spirit — The Trapnest Experience",
  "https://spirit.henrywithu.com/",
  "trapnest-spirit-og.jpg",
  "trapnest-spirit.svg",
]);
if (/Santioni|Notturno/i.test(index))
  throw new Error("index.html: legacy public branding remains");

await requireText("src/components/AgeGate.tsx", [
  "Do you know",
  "L.A.S.T.?",
  "You may want to visit Trapnest.",
]);
await requireText("src/App.tsx", [
  "The Trapnest Experience",
  "Made by",
  "https://henrywithu.com/",
]);
await requireText("src/components/Loader.tsx", [
  "trapnest-spirit-logo-footer.svg",
]);
await requireText("src/engine/shaders.ts", [
  "trapnest-merged-bottle-upright.png",
  "trapnest-label-color.png",
]);
await requireText("src/scenes/ProductShowcase.ts", [
  "trapnest-product-n${i + 1}.svg",
]);
await requireText("wrangler.jsonc", [
  '"directory": "./dist"',
  '"not_found_handling": "single-page-application"',
]);

const jpg = await readFile(
  new URL("../public/assets/social/trapnest-spirit-og.jpg", import.meta.url),
);
let width;
let height;
for (let offset = 2; offset + 9 < jpg.length; ) {
  if (jpg[offset] !== 0xff) break;
  const marker = jpg[offset + 1];
  const length = jpg.readUInt16BE(offset + 2);
  if (marker >= 0xc0 && marker <= 0xc3) {
    height = jpg.readUInt16BE(offset + 5);
    width = jpg.readUInt16BE(offset + 7);
    break;
  }
  offset += 2 + length;
}
if (width !== 1200 || height !== 630)
  throw new Error(`OG image: expected 1200x630, received ${width}x${height}`);

for (const path of [
  "public/assets/images/trapnest-label-color.png",
  "public/assets/images/story/drinkselection/trapnest-merged-bottle-upright.png",
  "public/assets/images/trapnest-spirit-logo-footer.svg",
  "public/assets/favicon/trapnest-spirit.svg",
  "public/assets/images/trapnest-product-n1.svg",
  "public/assets/images/trapnest-product-n2.svg",
  "public/assets/images/trapnest-product-n3.svg",
]) {
  const info = await stat(new URL(`../${path}`, import.meta.url));
  if (!info.isFile() || info.size < 100) throw new Error(`${path}: invalid asset`);
}

console.log(
  "Verified Trapnest Spirit metadata, L.A.S.T. gate, footer destination, bottle assets, Workers SPA routing and 1200x630 OG image.",
);
