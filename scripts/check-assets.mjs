import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const json = async (file) =>
  JSON.parse(await readFile(path.join(root, file), "utf8"));
const errors = [];
const inventory = await json("reference/asset-provenance.json");
// Trapnest Voyage replaces or removes some of the Spirit sources; those are
// checked for presence (or absence) instead of their original hashes.
const voyage = await json("reference/voyage-assets.json");
const replaced = new Set(voyage.replaced.map((item) => item.path));
const removed = new Set(voyage.removed.map((item) => item.path));
for (const file of removed) {
  try {
    await readFile(path.join(root, "public", file));
    errors.push(`${file}: listed as removed but still present`);
  } catch {}
}
const originals = inventory.filter(
  (item) =>
    item.status === "downloaded" &&
    !replaced.has(item.path) &&
    !removed.has(item.path),
);
for (const file of replaced)
  if (!file.startsWith("assets/decoded/"))
    try {
      await readFile(path.join(root, "public", file));
    } catch (error) {
      errors.push(`${file}: replacement missing (${error.message})`);
    }
for (const item of originals) {
  try {
    const bytes = await readFile(path.join(root, "public", item.path));
    if (bytes.length !== item.bytes)
      errors.push(`${item.path}: byte count changed`);
    if (createHash("sha256").update(bytes).digest("hex") !== item.sha256)
      errors.push(`${item.path}: SHA-256 changed`);
  } catch (error) {
    errors.push(`${item.path}: ${error.message}`);
  }
}

const meshes = (await json("reference/geometry-inventory.json")).filter(
  (mesh) => !removed.has(mesh.output),
);
for (const mesh of meshes) {
  const rebuilt = replaced.has(mesh.output);
  try {
    const bytes = await readFile(path.join(root, "public", mesh.output));
    if (!rebuilt && bytes.length !== mesh.bytes)
      errors.push(`${mesh.output}: byte count changed`);
    const size = bytes.readUInt32LE(0),
      base = size + 4;
    const header = JSON.parse(bytes.toString("utf8", 4, base));
    for (const [name, attribute] of Object.entries({
      ...header.attributes,
      ...(header.index ? { index: header.index } : {}),
    })) {
      if (
        base + attribute.offset + attribute.count * 4 > bytes.length ||
        (base + attribute.offset) % 4
      )
        errors.push(`${mesh.output}: invalid ${name} payload`);
    }
    // Rebuilt meshes keep the payload layout but may change attributes and rigs.
    if (!rebuilt) {
      for (const name of mesh.attributes)
        if (!header.attributes[name])
          errors.push(`${mesh.output}: missing ${name}`);
      if ((header.bones?.length ?? 0) !== mesh.bones)
        errors.push(`${mesh.output}: bone count changed`);
    } else if (!header.attributes.position && header.frameCount === undefined)
      errors.push(`${mesh.output}: missing position`);
  } catch (error) {
    errors.push(`${mesh.output}: ${error.message}`);
  }
}

async function sourceFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await sourceFiles(file)));
    else if (/\.[cm]?[jt]sx?$/.test(file)) output.push(file);
  }
  return output;
}
for (const file of await sourceFiles(path.join(root, "src"))) {
  const source = await readFile(file, "utf8");
  // GSAP's ambient types otherwise let a missing runtime import pass tsc.
  if (
    /\bgsap\./.test(source) &&
    !/import\s+gsap\s+from\s+["']gsap["']/.test(source)
  )
    errors.push(
      `${path.relative(root, file)}: GSAP calls lack an explicit runtime import`,
    );
  if (
    /(?:import|from|fetch)\s*\(?\s*["'][^"']*(?:reference\/|app\.1782836328290\.js)/.test(
      source,
    )
  )
    errors.push(
      `${path.relative(root, file)}: production evidence used at runtime`,
    );
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Verified ${originals.length} original SHA-256 hashes and ${meshes.length} decoded geometry payloads (${replaced.size} Voyage replacements, ${removed.size} removals); application imports exclude production evidence.`,
  );
  console.log(
    `${inventory.length - originals.length} historical HTML-fallback candidates remain recorded as unavailable.`,
  );
}
