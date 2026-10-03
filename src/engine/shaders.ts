import * as THREE from "three";
import settingsJson from "../data/shader-settings.json";
import defaultsJson from "../data/shader-defaults.json";
import { black, white, texture } from "./assets";
import { qualityUniforms } from "./RenderQuality";
import { configurePbrTexture } from "./TextureSampling";
import { preserveSourceFacing } from "./MaterialFacing";
const sources = import.meta.glob("../shaders/original/*", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const library = Object.fromEntries(
  Object.entries(sources).map(([k, v]) => [k.split("/").at(-1)!, v]),
);
for (const source of Object.values(library)) {
  const name = source.match(/#!SHADER:\s*(\w+)\.vs/);
  if (name) library[name[1] + ".glsl"] = source;
}
const defaults = defaultsJson as unknown as Record<
  string,
  Record<string, { value?: unknown; ignoreUIL?: boolean }>
>;
export const shaderMaterials: THREE.RawShaderMaterial[] = [];
export const shared = {
  time: { value: 0 },
  resolution: { value: new THREE.Vector2(1280, 720) },
  tFluid: { value: black as THREE.Texture },
  tFluidMask: { value: black as THREE.Texture },
};
const types: Record<string, number> = {
  float: 1,
  int: 1,
  bool: 1,
  vec2: 2,
  vec3: 3,
  vec4: 4,
};
function trackMaterial(mat: THREE.RawShaderMaterial) {
  mat.onBeforeRender = (renderer) => {
    const target = renderer.getRenderTarget();
    if (target) shared.resolution.value.set(target.width, target.height);
    else renderer.getDrawingBufferSize(shared.resolution.value);
  };
  shaderMaterials.push(mat);
  mat.addEventListener("dispose", () => {
    const index = shaderMaterials.indexOf(mat);
    if (index >= 0) shaderMaterials.splice(index, 1);
  });
}
function expand(source: string, seen = new Set<string>()): string {
  return source
    .replace(
      /#test\s+([^\n]+)\n([\s\S]*?)#endtest/g,
      (_, condition: string, body: string) => {
        const mobile =
          navigator.maxTouchPoints > 0 &&
          /Android|iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
        const conditions: Record<string, boolean> = {
          "Device.mobile": mobile,
          "!Device.mobile": !mobile,
          "!window.Metal": true,
          "!!window.Metal": false,
          "RenderManager.type == RenderManager.VR": false,
          "RenderManager.type != RenderManager.VR": true,
        };
        if (!(condition.trim() in conditions))
          throw new Error("Unmapped source shader condition: " + condition);
        return conditions[condition.trim()] ? body : "";
      },
    )
    .replace(/#require\(([^)]+)\)/g, (_, name: string) => {
      if (seen.has(name)) return "";
      seen.add(name);
      if (!library[name]) throw new Error("Missing shader include " + name);
      return expand(library[name], seen);
    });
}
const prefix = `precision highp float;\nprecision highp int;\nuniform float time;\nuniform vec2 resolution;\nuniform mat4 modelMatrix;\nuniform mat4 modelViewMatrix;\nuniform mat4 projectionMatrix;\nuniform mat4 viewMatrix;\nuniform mat3 normalMatrix;\nuniform vec3 cameraPosition;\n`;
function stages(name: string, drawBuffer = "Color") {
  const source = library[name + ".glsl"]?.replace(
    /#drawbuffer (\w+) ([^\n]*)/g,
    (_, buffer, line) => (buffer === drawBuffer ? line : ""),
  );
  if (!source) throw new Error("Unknown shader " + name);
  const chunks = source.split(/#!SHADER:[^\n]*\n/);
  const header = chunks[0];
  const attrs = header.match(/#!ATTRIBUTES([\s\S]*?)(?=#!|$)/)?.[1] ?? "";
  let rest = header
    .replace(/#!ATTRIBUTES[\s\S]*?(?=#!|$)/, "")
    .replace(/#![^\n]*\n/g, "");
  // Nuke supplies these declarations to its postprocessing passes.
  if (name === "FXAA")
    rest += "\nuniform sampler2D tDiffuse;\nvarying vec2 vUv;\n";
  const strip = (s: string) => {
    const declarations = new Set<string>();
    return s
      .replace(
        /uniform\s+\w+\s+(?:time|resolution|modelMatrix|modelViewMatrix|projectionMatrix|viewMatrix|normalMatrix|cameraPosition)\s*;/g,
        "",
      )
      .replace(
        /\b(uniform|varying|attribute)\s+(\w+)\s+(\w+)\s*;/g,
        (declaration, qualifier, type, name) => {
          const key = qualifier + ":" + name;
          if (declarations.has(key)) return "";
          declarations.add(key);
          return declaration;
        },
      );
  };
  const vert = strip(expand(attrs + rest + (chunks[1] ?? "")));
  const frag = strip(expand(rest + (chunks[2] ?? "")));
  const vertexShader =
    prefix +
    "in vec3 position;\nin vec3 normal;\nin vec2 uv;\n" +
    vert
      .replace(/\battribute\b/g, "in")
      .replace(/\bvarying\b/g, "out")
      .replace(/\btexture2D\b/g, "texture");
  const fragmentShader =
    prefix +
    "out vec4 fragColor;\n" +
    frag
      .replace(/\bvarying\b/g, "in")
      .replace(/\btexture2D\b/g, "texture")
      .replace(/\bgl_FragColor\b/g, "fragColor")
      .replace(/\bgl_FragDepthEXT\b/g, "gl_FragDepth");
  return { vertexShader, fragmentShader };
}
function convert(v: any, type?: string): any {
  if (type === "mat4" && (v === undefined || v === null))
    return new THREE.Matrix4();
  if (v?.kind === "Texture") return v.path ? texture(v.path, v.repeat) : white;
  if (v?.src) return texture(v.src);
  if (v?.kind === "Color")
    return new THREE.Color(v.args[0]).convertLinearToSRGB();
  if (v?.kind?.startsWith("Vector")) {
    const a = v.args ?? [];
    const vec =
      a.length === 4
        ? new THREE.Vector4(...a)
        : a.length === 2
          ? new THREE.Vector2(...a)
          : new THREE.Vector3(...a);
    if (v.normalize) vec.normalize();
    return vec;
  }
  if (Array.isArray(v))
    return v.length === 4
      ? new THREE.Vector4(...v)
      : v.length === 2
        ? new THREE.Vector2(...v)
        : new THREE.Vector3(...v);
  if (typeof v === "string" && v.startsWith("#"))
    return new THREE.Color(v).convertLinearToSRGB();
  if (v === null || v === undefined) {
    if (type?.startsWith("sampler")) return white;
    if (types[type ?? ""] === 2) return new THREE.Vector2();
    if (types[type ?? ""] === 3) return new THREE.Vector3();
    if (types[type ?? ""] === 4) return new THREE.Vector4();
    return 0;
  }
  return v;
}
function uniformValue(key: string, value: any, type?: string) {
  const converted = convert(value, type);
  return /Color/.test(key) && converted instanceof THREE.Vector3
    ? new THREE.Color(converted.x, converted.y, converted.z)
    : converted;
}
export function material(
  name: string,
  overrides: Record<string, any> = {},
  fromUIL = false,
  drawBuffer = "Color",
): THREE.RawShaderMaterial {
  const { vertexShader, fragmentShader } = stages(name, drawBuffer);
  const uniforms: Record<string, THREE.IUniform> = { ...shared };
  const standard: Record<string, any> = {
    uDiscardTop: 10000,
    uDiscardBottom: -10000,
    uOpacity: 1,
    uAlpha: 1,
    alpha: 1,
    uScale: 1,
    uTransition: 1,
    uProgress: 1,
    uDPR: 1,
    uMaxWidth: 2100,
    uTint: new THREE.Vector3(1, 1, 1),
    uTiling: new THREE.Vector2(1, 1),
    uMRON: new THREE.Vector4(1, 1, 1, 1),
    uEnv: new THREE.Vector3(1, 1, 0),
    tLUT: texture("assets/images/pbr/lut.png", false),
    tBaseColor: white,
    tMRO: texture("assets/images/empty_mro-7UPNyD6z.jpg"),
    tNormal: texture("assets/images/empty_normal-1Qg4XGDW.png"),
    tEnvDiffuse: texture("assets/images/glass-diffuse-4aRQD46t.png"),
    tEnvSpecular: texture("assets/images/story/glass-specular.png"),
    tRefraction: white,
    tText: black,
  };
  for (const match of (vertexShader + fragmentShader).matchAll(
    /uniform\s+(\w+)\s+(\w+)\s*;/g,
  )) {
    const [, type, key] = match;
    if (
      key in uniforms ||
      [
        "modelMatrix",
        "modelViewMatrix",
        "projectionMatrix",
        "viewMatrix",
        "normalMatrix",
        "cameraPosition",
      ].includes(key)
    )
      continue;
    let val = defaults[name]?.[key]?.value;
    uniforms[key] = {
      value:
        val === undefined
          ? (standard[key] ?? uniformValue(key, undefined, type))
          : uniformValue(key, val, type),
    };
  }
  for (const [key, value] of Object.entries({
    ...((settingsJson as Record<string, Record<string, any>>)[name] ?? {}),
    ...overrides,
  })) {
    const uniformKey = key.startsWith("_tx") ? key.slice(3) : key;
    if (fromUIL && defaults[name]?.[uniformKey]?.ignoreUIL) continue;
    uniforms[uniformKey] = { value: uniformValue(uniformKey, value) };
  }
  // Runtime branding is deliberately layered over the captured UIL/defaults,
  // which remain authoritative source evidence in src/data.
  if (name === "DrinkSelectionBottleShader")
    uniforms.tMap = {
      value: texture(
        "assets/images/story/drinkselection/trapnest-merged-bottle-upright.png",
        false,
      ),
    };
  if (name === "LabelPBR")
    Object.assign(uniforms, {
      tBaseColor: {
        value: texture("assets/images/trapnest-label-color.png", false),
      },
      // The captured normal/MRO maps emboss the former wordmark. Neutral maps
      // prevent that relief from showing through the new base-color artwork.
      tMRO: { value: texture("assets/images/empty_mro-7UPNyD6z.jpg") },
      tNormal: { value: texture("assets/images/empty_normal-1Qg4XGDW.png") },
    });
  for (const key of [
    "tLUT",
    "tEnvDiffuse",
    "tEnvSpecular",
    "tLightmap",
  ] as const)
    if (uniforms[key]?.value instanceof THREE.Texture)
      configurePbrTexture(uniforms[key].value, key);
  if (uniforms.uDPR)
    uniforms.uDPR =
      /^(BorderShader|WanderBorderShader|DrinkSelectionBorderShader|TargetBorderShader|ColosseumTitleShader)$/.test(
        name,
      )
        ? qualityUniforms.canvasDpr
        : qualityUniforms.sceneDpr;
  const mat = new THREE.RawShaderMaterial({
    name,
    glslVersion: THREE.GLSL3,
    vertexShader,
    fragmentShader,
    uniforms,
    transparent:
      /Border|Title|Text|Hair|Shadow|Glass|Bottle|Label|Texture|Copy/.test(
        name,
      ),
    side: /Inverse/.test(name) ? THREE.BackSide : THREE.FrontSide,
  });
  mat.toneMapped = false;
  preserveSourceFacing(mat);
  trackMaterial(mat);
  return mat;
}
export function setUniform(mat: THREE.Material, key: string, value: any) {
  if (mat instanceof THREE.RawShaderMaterial && mat.uniforms[key])
    mat.uniforms[key].value = value;
}
export function ensureAttributes(
  geometry: THREE.BufferGeometry,
  mat: THREE.RawShaderMaterial,
) {
  const count = geometry.getAttribute("position")?.count ?? 0;
  for (const match of mat.vertexShader.matchAll(
    /\bin\s+(float|vec[234])\s+(\w+)\s*;/g,
  )) {
    const [, type, key] = match;
    if (geometry.hasAttribute(key)) continue;
    const size = types[type];
    const data = new Float32Array(count * size);
    if (key === "color") data.fill(0);
    if (key === "normal") for (let i = 2; i < data.length; i += 3) data[i] = 1;
    geometry.setAttribute(key, new THREE.BufferAttribute(data, size));
  }
}

export function fragmentMaterial(
  name: string,
  uniforms: Record<string, THREE.IUniform>,
  declarations = "",
) {
  const source = library[name];
  if (!source) throw new Error("Unknown compute shader " + name);
  const mat = new THREE.RawShaderMaterial({
    name,
    glslVersion: THREE.GLSL3,
    uniforms: { ...shared, ...uniforms },
    vertexShader:
      prefix + "in vec3 position;void main(){gl_Position=vec4(position,1.0);}",
    fragmentShader:
      prefix +
      "out vec4 fragColor;" +
      declarations +
      expand(source)
        .replace(/\btexture2D\b/g, "texture")
        .replace(/\bgl_FragColor\b/g, "fragColor"),
    depthTest: false,
    depthWrite: false,
  });
  trackMaterial(mat);
  return mat;
}

/** Adapter for original separate vertex/fragment files, used by the fluid passes. */
export function splitMaterial(
  vertex: string,
  fragment: string,
  values: Record<string, unknown>,
) {
  const uniforms: Record<string, THREE.IUniform> = { ...shared };
  for (const [key, value] of Object.entries(values)) uniforms[key] = { value };
  const vs = expand(library[vertex]),
    fs = expand(library[fragment]);
  const mat = new THREE.RawShaderMaterial({
    name: fragment,
    glslVersion: THREE.GLSL3,
    uniforms,
    vertexShader:
      prefix +
      "in vec3 position;in vec2 uv;" +
      vs.replace(/\bvarying\b/g, "out").replace(/\btexture2D\b/g, "texture"),
    fragmentShader:
      prefix +
      "out vec4 fragColor;" +
      fs
        .replace(/\bvarying\b/g, "in")
        .replace(/\btexture2D\b/g, "texture")
        .replace(/\bgl_FragColor\b/g, "fragColor"),
    depthTest: false,
    depthWrite: false,
  });
  trackMaterial(mat);
  return mat;
}

/** Original Antimatter compute passes use fragment coordinates as their texture lookup. */
export function particleMaterial(
  name: string,
  source: string,
  uniforms: Record<string, THREE.IUniform>,
) {
  const code = expand(
    source.replace(/#test !window\.Metal\s*\n/g, "").replace(/#endtest/g, ""),
  );
  const mat = new THREE.RawShaderMaterial({
    name,
    glslVersion: THREE.GLSL3,
    uniforms: { ...shared, ...uniforms },
    vertexShader:
      prefix + "in vec3 position;void main(){gl_Position=vec4(position,1.0);}",
    fragmentShader:
      prefix +
      "uniform sampler2D tInput;uniform float fSize;\n#define vUv (gl_FragCoord.xy / fSize)\nout vec4 fragColor;\n" +
      code
        .replace(/\btexture2D\b/g, "texture")
        .replace(/\bgl_FragColor\b/g, "fragColor"),
    depthTest: false,
    depthWrite: false,
  });
  trackMaterial(mat);
  return mat;
}
