import React from "react";
import trees from "../data/ui-trees.json";
import { assetUrl } from "../engine/assetUrl";
export interface ArtNode {
  _type: string;
  children?: ArtNode[];
  [key: string]: any;
}
const ui = trees as unknown as Record<string, ArtNode>;
export const privacyUrl =
  "https://cdn.sanity.io/files/nhqx6ogi/production/d2513cb86f7baedec1e90571f62be07acd158d56.pdf?dl=privacy-policy.pdf";
const rebrand = (value: string) =>
  value
    .replaceAll("Santioni<br>Spirits", "Trapnest<br>Voyage")
    .replaceAll("SANTIONI<br>SPIRITS", "TRAPNEST<br>VOYAGE")
    .replaceAll("Santioni Spirits", "Trapnest Voyage")
    .replaceAll("SANTIONI SPIRITS", "TRAPNEST VOYAGE")
    .replaceAll("Santioni", "Trapnest")
    .replaceAll("SANTIONI", "TRAPNEST")
    .replaceAll("Notturno", "Tides")
    .replaceAll("NOTTURNO", "TIDES")
    .replace(/^Spirits$/, "Voyage")
    .replace(/^SPIRITS$/, "VOYAGE");
export function findArt(name: string, refName?: string): ArtNode | undefined {
  const search = (node: ArtNode): ArtNode | undefined => {
    if (refName ? node.refName === refName : node._type === "svg") return node;
    for (const child of node.children ?? []) {
      const result = search(child);
      if (result) return result;
    }
  };
  return ui[name] ? search(ui[name]) : undefined;
}
/** Static SVG paths and editorial DOM transcribed from the published fragment definitions. */
export function SourceArt({ node }: { node?: ArtNode }): React.ReactNode {
  if (!node) return null;
  if (node._type === "inlinetext") return node._innerText;
  if (node._type === "UI")
    return node.children?.map((c, i) => <SourceArt key={i} node={c} />);
  const originalText = node.text ?? node._innerText;
  const sourceText =
    originalText === "$headingText"
      ? "Select Harbours Forthcoming"
      : originalText;
  const text =
    typeof sourceText === "string" ? rebrand(sourceText) : sourceText;
  const tag = node._type === "XText" ? (node.as ?? "div") : node._type;
  if (!/^[a-z]/.test(tag)) return null;
  const props: Record<string, any> = node.refName
    ? { "data-source-ref": node.refName }
    : {};
  for (const [k, v] of Object.entries(node)) {
    if (
      [
        "as",
        "refName",
        "_type",
        "children",
        "text",
        "_innerText",
        "addSrOnly",
        "noSplit",
        "noResize",
      ].includes(k)
    )
      continue;
    const key =
      k === "class"
        ? "className"
        : k.startsWith("data-") || k.startsWith("aria-")
          ? k
          : k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    if (typeof v === "string" && v.startsWith("$")) {
      if (v === "$copy.privacyPolicy") props[key] = privacyUrl;
      continue;
    }
    props[key] =
      k === "src" && v.startsWith("assets/")
        ? assetUrl(v)
        : typeof v === "string"
          ? rebrand(v)
          : v;
  }
  if (node.refName === "list")
    props.className = (props.className ?? "") + " list";
  if (node._type === "XText") {
    props.className = "XText " + (props.className ?? "");
    if (node.refName === "list")
      props.className = (props.className ?? "") + " list";
    props.dangerouslySetInnerHTML = { __html: text ?? "" };
  }
  if (["img", "br", "path", "input"].includes(tag))
    return React.createElement(tag, props);
  return React.createElement(
    tag,
    props,
    props.dangerouslySetInnerHTML
      ? undefined
      : (text ?? node.children?.map((c, i) => <SourceArt key={i} node={c} />)),
  );
}
export function Editorial({ name }: { name: string }) {
  return <SourceArt node={ui[name]} />;
}
