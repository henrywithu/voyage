import * as THREE from "three";
import { SceneSection } from "../engine/SceneSection";
import { material, ensureAttributes } from "../engine/shaders";
import { texture } from "../engine/assets";

/**
 * Voyage's atmosphere kit: the life around the story's set pieces, drawn in the
 * same ink and paper as everything else. Seabirds over the open water, specks of
 * light in the air, glints on the sea, the sun's halo and shafts of light in the
 * grotto. Every helper adds its mesh to a section (so it is clipped to the
 * section and disposed with it) and is deterministic for a given seed.
 */
export const INK = new THREE.Color(18 / 255, 18 / 255, 18 / 255);
export const PAPER = new THREE.Color(243 / 255, 241 / 255, 233 / 255);
export const SUN = new THREE.Color(244 / 255, 189 / 255, 40 / 255);
/** Pale gold: light itself, on a yellow ground. */
export const LIGHT = new THREE.Color(1, 0.95, 0.78);

type Vec3 = [number, number, number];
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const transparent = (mat: THREE.RawShaderMaterial, depthTest = true) => {
  mat.transparent = true;
  mat.depthWrite = false;
  mat.depthTest = depthTest;
  return mat;
};

export interface GullOptions {
  count?: number;
  /** Centre of the flight box in the parent's space. */
  center: Vec3;
  /** Half-size of the box; birds wrap around it along their drift. */
  box: Vec3;
  /** Direction and pace of travel (units per second). */
  drift?: Vec3;
  /** Wingspan in the parent's units. */
  span?: number;
  /** Stroke weight relative to the span. */
  thickness?: number;
  color?: THREE.Color;
  frameRate?: number;
  seed?: number;
}

/** Seabirds: a loose flock of ink gulls, flapping in bursts between glides. */
export function addGulls(
  section: SceneSection,
  parent: THREE.Object3D,
  options: GullOptions,
) {
  const {
    count = 7,
    center,
    box,
    drift = [0.25, 0, 0],
    span = 0.3,
    thickness = 0.07,
    color = INK,
    frameRate = 12,
    seed = 1,
  } = options;
  const random = rng(seed);
  const geometry = new THREE.InstancedBufferGeometry();
  const segments = 12,
    position: number[] = [],
    index: number[] = [];
  for (let i = 0; i <= segments * 2; i++) {
    const u = i / segments - 1;
    position.push(u, -1, 0, u, 1, 0);
    if (i < segments * 2) {
      const a = i * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(position, 3),
  );
  geometry.setIndex(index);
  const birds = new Float32Array(count * 4),
    flight = new Float32Array(count * 4);
  // A loose formation: a leader and stragglers, all keeping roughly together.
  for (let i = 0; i < count; i++) {
    birds.set(
      [
        (random() * 2 - 1) * box[0],
        (random() * 2 - 1) * box[1] * 0.7,
        (random() * 2 - 1) * box[2],
        random(),
      ],
      i * 4,
    );
    flight.set(
      [
        0.8 + random() * 0.4,
        0.55 + random() * 0.6,
        0.8 + random() * 0.45,
        random() * 2 - 1,
      ],
      i * 4,
    );
  }
  geometry.setAttribute("aBird", new THREE.InstancedBufferAttribute(birds, 4));
  geometry.setAttribute(
    "aFlight",
    new THREE.InstancedBufferAttribute(flight, 4),
  );
  geometry.instanceCount = count;
  const mesh = section.addMesh(
    geometry,
    transparent(
      material("GullShader", {
        uColor: color.clone(),
        uBox: new THREE.Vector3(...box),
        uDrift: new THREE.Vector3(...drift),
        uSpan: span,
        uThickness: thickness,
        uFrameRate: frameRate,
        uAlpha: 1,
      }),
    ),
    parent,
  );
  mesh.position.set(...center);
  mesh.name = "gulls";
  return mesh;
}

export interface MoteOptions {
  count?: number;
  min: Vec3;
  max: Vec3;
  /** 'drift' floats through the box; 'glint' flashes at random places in it. */
  mode?: "drift" | "glint";
  shape?: "dot" | "star";
  velocity?: Vec3;
  /** Radius range in the parent's units. */
  size?: [number, number];
  wobble?: number;
  color?: THREE.Color;
  /** Width of an ink rim (fraction of the radius), 0 for none. */
  outline?: number;
  /** Seconds a glint lasts. */
  period?: number;
  /** Glints gather toward the box's centre line in x as this grows. */
  spread?: number;
  frameRate?: number;
  alpha?: number;
  seed?: number;
}

/** Specks of light: dust in a sunbeam, bubbles in the tide, glints on the sea. */
export function addMotes(
  section: SceneSection,
  parent: THREE.Object3D,
  options: MoteOptions,
) {
  const {
    count = 60,
    min,
    max,
    mode = "drift",
    shape = "dot",
    velocity = [0, 0.05, 0],
    size = [0.01, 0.025],
    wobble = 0.05,
    color = PAPER,
    outline = 0,
    period = 1.2,
    spread = 0,
    frameRate = 24,
    alpha = 1,
    seed = 1,
  } = options;
  const random = rng(seed);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0],
      3,
    ),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = random();
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
  geometry.instanceCount = count;
  const mesh = section.addMesh(
    geometry,
    transparent(
      material("MoteShader", {
        uColor: color.clone(),
        uInk: INK.clone(),
        uBoxMin: new THREE.Vector3(...min),
        uBoxMax: new THREE.Vector3(...max),
        uVelocity: new THREE.Vector3(...velocity),
        uSize: new THREE.Vector2(...size),
        uWobble: wobble,
        uMode: mode === "glint" ? 1 : 0,
        uShape: shape === "star" ? 1 : 0,
        uOutline: outline,
        uPeriod: period,
        uSpread: spread,
        uFrameRate: frameRate,
        uAlpha: alpha,
      }),
    ),
    parent,
  );
  mesh.name = mode === "glint" ? "glints" : "motes";
  return mesh;
}

export interface SunOptions {
  /** World radius of the sun's disc (the halo is measured in these radii). */
  radius: number;
  /** How far the halo reaches, in sun radii. */
  extent?: number;
  /** Draw the disc too (1), or only the light around a disc the scene already has (0). */
  disc?: number;
  discColor?: THREE.Color;
  rays?: number;
  rayAlpha?: number;
  /** Where rays start (sun radii) and how long they grow. */
  rayLength?: [number, number];
  rayWidth?: number;
  rayColor?: THREE.Color;
  rings?: number;
  ringAlpha?: number;
  ringColor?: THREE.Color;
  /** Reach of the halftone glow, in sun radii. */
  glow?: number;
  glowAlpha?: number;
  glowColor?: THREE.Color;
  dotSize?: number;
  /** Hide everything below this height (sun radii from the centre): the horizon. */
  clipBelow?: number;
  seed?: number;
}

/** The sun's light: a halftone glow, broken rings and fine radiating strokes. */
export function addSunHalo(
  section: SceneSection,
  parent: THREE.Object3D,
  position: Vec3,
  options: SunOptions,
) {
  const {
    radius,
    extent = 4,
    disc = 0,
    discColor = SUN,
    rays = 90,
    rayAlpha = 1,
    rayLength = [1.25, 2],
    rayWidth = 0.16,
    rayColor = INK,
    rings = 3,
    ringAlpha = 1,
    ringColor = SUN,
    glow = 2,
    glowAlpha = 1,
    glowColor = SUN,
    dotSize = 5,
    clipBelow = -1e4,
    seed = 1,
  } = options;
  const mesh = section.addMesh(
    new THREE.PlaneGeometry(2, 2),
    transparent(
      material("SunHaloShader", {
        uDiscColor: discColor.clone(),
        uRayColor: rayColor.clone(),
        uRingColor: ringColor.clone(),
        uGlowColor: glowColor.clone(),
        uExtent: extent,
        uDisc: disc,
        uRays: rays,
        uRayAlpha: rayAlpha,
        uRayLength: new THREE.Vector2(...rayLength),
        uRayWidth: rayWidth,
        uRings: rings,
        uRingAlpha: ringAlpha,
        uGlow: glow,
        uGlowAlpha: glowAlpha,
        uDotSize: dotSize,
        uClipBelow: clipBelow,
        uSeed: seed,
        uAlpha: 1,
      }),
    ),
    parent,
  );
  mesh.position.set(...position);
  mesh.scale.setScalar(radius);
  mesh.name = "sunHalo";
  return mesh;
}

export interface SkyOptions {
  color?: THREE.Color;
  /** The light's colour, centre (the plane's uv) and radii (uv). */
  light?: THREE.Color;
  glowCenter?: [number, number];
  glowRadius?: [number, number];
  glow?: number;
  /** Shade toward the top: colour, strength and the uv heights where it starts and is full. */
  shade?: THREE.Color;
  shadeAmount?: number;
  shadeRange?: [number, number];
  /** Clouds: strength, colour and band (bottom uv, top uv, scale, drift speed). */
  clouds?: number;
  cloudColor?: THREE.Color;
  cloudBand?: [number, number, number, number];
  dotSize?: number;
}

/** Re-print a flat colour field (a background plane) as a sky: halftone glow, shade, clouds. */
export function skyTone(
  section: SceneSection,
  layer: string,
  options: SkyOptions = {},
) {
  const mesh = section.mesh(layer);
  if (!mesh) return;
  const {
    color = SUN,
    light = new THREE.Color(1, 0.87, 0.48),
    glowCenter = [0.5, 0.5],
    glowRadius = [0.3, 0.5],
    glow = 0,
    shade = new THREE.Color(0.86, 0.6, 0.06),
    shadeAmount = 0,
    shadeRange = [0.5, 1],
    clouds = 0,
    cloudColor = PAPER,
    cloudBand = [0.0, 0.3, 3, 0.004],
    dotSize = 5,
  } = options;
  const previous = mesh.material;
  const mat = material("SkyToneShader", {
    tMap: texture("assets/images/story/clouds_noise.png"),
    uColor: color.clone(),
    uLight: light.clone(),
    uShade: shade.clone(),
    uCloudColor: cloudColor.clone(),
    uInk: INK.clone(),
    uGlowCenter: new THREE.Vector2(...glowCenter),
    uGlowRadius: new THREE.Vector2(...glowRadius),
    uGlow: glow,
    uShadeAmount: shadeAmount,
    uShadeRange: new THREE.Vector2(...shadeRange),
    uClouds: clouds,
    uCloudBand: new THREE.Vector4(...cloudBand),
    uDotSize: dotSize,
  });
  mat.depthTest = previous.depthTest;
  mat.depthWrite = previous.depthWrite;
  mat.transparent = previous.transparent;
  mat.side = previous.side;
  ensureAttributes(mesh.geometry, mat);
  mesh.material = mat;
  previous.dispose();
  return mesh;
}

export interface ShaftOptions {
  /** Number of shafts across the quad. */
  count?: number;
  /** Half-width of a shaft as a fraction of the quad's width. */
  width?: number;
  color?: THREE.Color;
  /** Opacity of the wash. */
  alpha?: number;
  /** Strength of the halftone screen in the shafts' cores. */
  dots?: number;
  dotSize?: number;
  seed?: number;
}

/** Shafts of light on a quad (place, tilt and size it in the parent's space). */
export function addLightShafts(
  section: SceneSection,
  parent: THREE.Object3D,
  options: ShaftOptions = {},
) {
  const {
    count = 3,
    width = 0.08,
    color = LIGHT,
    alpha = 0.22,
    dots = 0.5,
    dotSize = 5,
    seed = 1,
  } = options;
  const mesh = section.addMesh(
    new THREE.PlaneGeometry(1, 1),
    transparent(
      material("LightShaftShader", {
        tNoise: texture("assets/images/story/clouds_noise.png"),
        uColor: color.clone(),
        uCount: count,
        uWidth: width,
        uAlpha: alpha,
        uDots: dots,
        uDotSize: dotSize,
        uSeed: seed,
      }),
    ),
    parent,
  );
  mesh.name = "lightShafts";
  return mesh;
}
