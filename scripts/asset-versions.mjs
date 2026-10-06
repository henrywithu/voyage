// Vite plugin: content hashes of everything under public/assets, served as `virtual:asset-versions`.
// public/_headers caches /assets/* as immutable for a year, but rebuilt assets keep their names: a
// returning visitor would mix files cached from an earlier build with new ones (a new mesh with an old
// animation, a new head with an old face atlas). src/engine/assetUrl.ts appends each file's hash as
// `?v=`, so a file is fetched afresh exactly when its content changes.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ID = "virtual:asset-versions";
const RESOLVED = "\0" + ID;

export function versionTable(publicDir = join(process.cwd(), "public")) {
  const out = {};
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      const rel = relative(publicDir, path).split(sep).join("/");
      if (statSync(path).isDirectory()) {
        // Dev-only previews written by scripts/chaewon/build/devlook.py are never shipped.
        if (rel !== "assets/decoded/dev") walk(path);
      } else
        out["/" + rel] = createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 10);
    }
  };
  walk(join(publicDir, "assets"));
  return out;
}

export default function assetVersions() {
  let table;
  const get = () => (table ??= versionTable());
  return {
    name: "asset-versions",
    enforce: "pre",
    resolveId: (source) => (source === ID ? RESOLVED : undefined),
    load(source) {
      if (source === RESOLVED) return `export default ${JSON.stringify(get())};`;
    },
    // url(/assets/...) in stylesheets (the web fonts).
    transform(code, id) {
      if (!id.split("?")[0].endsWith(".css")) return;
      const versions = get();
      const out = code.replace(/url\((["']?)(\/assets\/[^"')?#]+)\1\)/g, (match, quote, path) =>
        versions[path] ? `url(${quote}${path}?v=${versions[path]}${quote})` : match,
      );
      return out === code ? undefined : { code: out, map: null };
    },
    // Static references in index.html (icons, manifest): versioned unless they already carry a query.
    transformIndexHtml(html) {
      const versions = get();
      return html.replace(/(["'])(\/assets\/[^"'?#]+)\1/g, (match, quote, path) =>
        versions[path] ? `${quote}${path}?v=${versions[path]}${quote}` : match,
      );
    },
  };
}
