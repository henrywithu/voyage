import * as THREE from "three";
import gsap from "gsap";
import { SceneSection } from "../engine/SceneSection";
import { loadGeometry, texture } from "../engine/assets";
import { material } from "../engine/shaders";
import { outline } from "../engine/outline";
import { windLines } from "../engine/WindLines";
import { SkeletalMesh } from "../engine/SkeletalMesh";
import { SourceText } from "../engine/SourceText";
import { worldHeight, range, clamp } from "../data/sections";
import {
  addGulls,
  addSunHalo,
  INK,
  PAPER,
  SUN,
  type GullOptions,
} from "./Atmosphere";

export const characterTextures = {
  tAtlas: texture("assets/images/story/chaewon/atlas.png"),
  tTrim: texture("assets/images/story/chaewon/trim.png"),
  tLines: texture("assets/images/story/lines.jpg"),
  tNoise: texture("assets/images/story/perlin.png"),
};
export async function setupNarrative(scene: SceneSection) {
  const layers = scene.layers;
  const border = scene.mesh("border");
  if (border) {
    border.material.transparent = true;
    scene.uniform("border", "uTransition", 1);
  }
  if (scene.name === "WanderScene") {
    const wind = await windLines(
      scene,
      "assets/geometry/story/wander/wind-curves.json",
      { uThreshold: 0.78, uSpeed: 1 },
    );
    wind.scale.set(0.5, 1.1, 0.4);
    const title = (await SourceText.create("WanderScene", {
      id: 999,
      name: "trapnestTitle",
      uniforms: {},
    }))!;
    scene.group.add(title);
    scene.meshes.push(title);
    title.position.z = -1;
    title.material.depthTest = false;
    title.renderOrder = 10;
    title.material.uniforms.uAlpha.value = 0;
    title.material.uniforms.uTransition.value = 0.0001;
    title.material.uniforms.uTranslate.value.set(0, 0.16, 0);
    const characterGroup = new THREE.Group();
    // Seen from her left bow: the bow points off to the left, the sail fills the right.
    characterGroup.position.set(-1.1, 0.6, -2);
    characterGroup.scale.setScalar(0.85);
    characterGroup.rotation.y = (-50 * Math.PI) / 180;
    scene.group.add(characterGroup);
    const character = new SkeletalMesh(
      await loadGeometry("assets/geometry/story/sea/chaewon-bow.bin"),
      "SkinShader",
      {
        ...characterTextures,
        uColor: new THREE.Vector3(0.969, 0.957, 0.933),
        uLinesTile: 1.25,
        uLightDir: new THREE.Vector3(0.1, 0.1, 0.5).normalize(),
        uAxis: new THREE.Vector3(1, 0, 2.5),
        uAngle: 0.5,
      },
    );
    await character.loadAnimation(
      "assets/geometry/story/sea/chaewon-bow-anim.bin",
    );
    characterGroup.add(character.mesh, character.outline);
    // Her sloop: she stands on the foredeck, the forestay in her hand.
    await addBoat(scene, characterGroup);
    // The sea does not ride the swell: a twin of the character group without the bob.
    const seaGroup = new THREE.Group();
    scene.group.add(seaGroup);
    // A golden sea: the dusk light lies on the water ahead of her bow, off to the left.
    await addSea(scene, seaGroup, "assets/geometry/story/sea/wander-sea-curves.json", {
      uRoad: new THREE.Vector3(-0.3, 0.15, 1),
    });
    // Seabirds: pale against the dusk sky over the title and inside the panel, ink against
    // the sea fog around the sail. `y` places each flock in screens from the section's top.
    const flocks: (GullOptions & { y: number })[] = [
      {
        y: 0.14,
        color: PAPER,
        center: [0.4, 0, -9],
        box: [8, 0.35, 1.2],
        drift: [0.3, 0.015, 0],
        span: 0.34,
        count: 4,
        seed: 7,
      },
      {
        y: 1.3,
        color: PAPER,
        center: [-1.2, 0, -13],
        box: [7, 0.3, 1.5],
        drift: [0.22, 0, 0],
        span: 0.3,
        count: 4,
        seed: 3,
      },
      {
        y: 2.05,
        color: INK,
        center: [1.8, 0, -10],
        box: [6.5, 0.45, 1.5],
        drift: [-0.24, 0.01, 0],
        span: 0.28,
        count: 4,
        seed: 11,
      },
    ];
    const gulls = flocks.map((flock) => ({
      y: flock.y,
      mesh: addGulls(scene, scene.group, flock),
    }));
    scene.onResize = (w, h) => {
      for (const { y, mesh } of gulls)
        mesh.position.y = scene.height * 0.5 - worldHeight * y;
      wind.position.y = -scene.height * 0.5;
      title.position.y = scene.height * 0.5 - worldHeight * 0.5;
      characterGroup.position.y = 0.6 - scene.height * 0.5;
      seaGroup.position.copy(characterGroup.position);
      seaGroup.rotation.copy(characterGroup.rotation);
      seaGroup.scale.copy(characterGroup.scale);
      const width =
        title.geometry.boundingBox!.max.x - title.geometry.boundingBox!.min.x;
      title.scale.setScalar(Math.min((0.6 * worldHeight * w) / h, 3.8) / width);
      scene.uniform("border", "uPadX", range(w, 1600, 393, 0.18, 0.08));
      scene.uniform("border", "uPadY", range(h, 800, 664, 0.13, 0.06));
    };
    scene.animate = (f) => {
      character.update(f.delta);
      // The swell: a slow pitch and roll about the waterline, the bow lifting first.
      const t = f.time;
      // Behind the age gate the scene renders with time held at 0: keep the sloop (whose mast
      // reaches into the first screen) out of sight, then let it sail up as the sky opens.
      const arrive = 1 - (1 - clamp((t - 0.6) / 4.5)) ** 3;
      characterGroup.visible = seaGroup.visible = t > 0;
      characterGroup.rotation.x = 0.022 * Math.sin(t * 0.9);
      characterGroup.rotation.z = 0.016 * Math.sin(t * 0.62 + 1.3);
      characterGroup.position.y =
        0.6 - scene.height * 0.5 + 0.03 * Math.sin(t * 0.9 - 0.8) - 2.5 * (1 - arrive);
      const titleProgress = 1 - (1 - clamp((f.time - 1) / 7)) ** 2;
      title.material.uniforms.uAlpha.value = titleProgress;
      title.material.uniforms.uTransition.value = Math.max(
        0.0001,
        titleProgress,
      );
      scene.uniform("sky", "uProgress", clamp((f.time - 0.3) / 5.5));
      scene.uniform("background", "uProgress", clamp((f.time - 2) / 3));
    };
  }
  if (scene.name === "ProfileScene") {
    await windLines(
      scene,
      "assets/geometry/story/profile/outward-curves.json",
      { uThreshold: 0.78, uSpeed: 1 },
    );
    const group = new THREE.Group();
    // Voyage: her whole head inside the panel (its frame is drawn over anything above it as it slides in).
    group.scale.setScalar(3.0);
    group.rotation.set(0, -Math.PI / 2 + 0.1, -0.2);
    group.position.set(0.25, -0.86, -1.05);
    scene.group.add(group);
    const geometry = (
      await loadGeometry("assets/geometry/story/wander/saint-pose-3.bin")
    ).geometry;
    const params = {
      ...characterTextures,
      uLinesTile: 5.5,
      // The bust faces +z in its group and the group turns her to profile: light the side the
      // camera sees (her left, the group's +x) so the lace and her skin read as paper white.
      uLightDir: new THREE.Vector3(1.0, 0.6, 0.55).normalize(),
      uLinesAxis: new THREE.Vector3(1, 0, 0.3).normalize(),
      uLinesAngle: -0.4,
      uThreshold: new THREE.Vector2(0.4, 1.8),
      uBreathe: new THREE.Vector3(-0.2, 0.3, 1),
      uWindAxisAngle: new THREE.Vector4(0, 1, 0, 0),
      uWindParams: new THREE.Vector3(0, 1, 1),
      uColor: new THREE.Vector3(0.969, 0.957, 0.933),
      // Chaewon straightens over the source's 2.5-second entrance tween.
      uBend: -0.4,
    };
    const characterMaterial = material("StaticCharacterBaseShader", params),
      inverseMaterial = material("StaticCharacterBaseShaderInverse", {
        ...params,
        uLineWidth: 0.0025,
      }),
      hairMaterial = material("HairShader", {
        ...params,
        tAtlas: texture("assets/images/story/hair_card.png"),
        uLinesTile: 3.5,
        uLightDir: new THREE.Vector3(0, 0.75, 3).normalize(),
      });
    // The source aliases these uniform objects across all three passes so
    // breathing, wind and the entrance bend cannot drift between silhouettes.
    for (const key of ["uWindAxisAngle", "uWindParams", "uBreathe", "uBend"])
      for (const linked of [inverseMaterial, hairMaterial])
        linked.uniforms[key] = characterMaterial.uniforms[key];
    scene.addMesh(geometry, characterMaterial, group);
    scene.addMesh(geometry, inverseMaterial, group);
    scene.addMesh(
      (await loadGeometry("assets/geometry/story/wander/saint-pose-3-hair.bin"))
        .geometry,
      hairMaterial,
      group,
    );
    // What she sees: far off on the horizon at her eye level, the light. A fine horizon and
    // the far sea on the backdrop behind her, and the sun's glint just ahead of her gaze.
    const horizon = scene.addMesh(
      new THREE.PlaneGeometry(1, 1),
      material("HorizonShader", {
        tNoise: texture("assets/images/story/perlin.png"),
        uInk: INK.clone(),
        uGold: SUN.clone(),
        uHorizon: 0.67,
        uDepth: 0.32,
        uRows: 13,
        uSunX: 0.215,
        uRoad: 1,
        uAspect: 1,
      }),
    );
    horizon.material.transparent = true;
    horizon.material.depthWrite = false;
    horizon.position.set(0, 0, -4.5);
    horizon.scale.set(4, 4, 1);
    addSunHalo(scene, scene.group, [-1.12, 0.68, -4.45], {
      radius: 0.072,
      extent: 6,
      disc: 1,
      discColor: SUN,
      rays: 28,
      rayLength: [1.6, 4],
      rayWidth: 0.12,
      rayColor: INK,
      rings: 1,
      ringColor: SUN,
      glow: 2.6,
      glowColor: SUN,
      dotSize: 3,
      seed: 9,
    });
    scene.uniform("border", "uTransition", 0);
    let entered = false;
    scene.animate = (frame) => {
      const trigger = scene.pixelTop - frame.height + scene.pixelHeight * 0.25;
      if (entered || frame.scroll < trigger) return;
      entered = true;
      gsap.to(scene.mesh("border").material.uniforms.uTransition, {
        value: 1,
        duration: 0.8,
        ease: "power2.out",
      });
      gsap.to(characterMaterial.uniforms.uBend, {
        value: 0,
        duration: 2.5,
        ease: "power4.out",
      });
    };
    scene.onResize = (w, h) => {
      const mobile = w / h < 1 || w < 1200;
      // The narrow layout's panel is wide and short: a smaller bust, so her head stays inside it too.
      group.scale.setScalar(mobile ? 2.45 : 3.0);
      group.position.y = mobile ? -0.78 : -0.86;
      scene.uniform("border", "uPadX", mobile ? 0.1 : 0.75);
      scene.uniform("border", "uPadY", 0.375);
      scene.uniform("border", "uSkewCorrection", 0.085);
      scene.uniform("border", "uDepthSkew", 0.75);
      scene.uniform("border", "uFixedWidth", mobile ? 0 : 1);
    };
  }
  if (scene.name === "ApproachScene") {
    const root = new THREE.Group();
    for (const name of ["portal", "background", "structure", "character"])
      if (layers[name]) root.add(layers[name]);
    // No moon over this sea: the sun is caught in the arch.
    for (const name of ["moon", "mooninverse"]) if (layers[name]) layers[name].visible = false;
    scene.group.add(root);
    // The sloop's rigging and the wind streaks reach past the panel as it opens: draw the border (and
    // its paper margins) over everything in the scene.
    const border = scene.mesh("border");
    border.renderOrder = 999;
    border.material.depthTest = false;
    outline(scene, scene.mesh("structure"), "StaticObjectBaseShaderInverse", 0.0025);
    // The sloop under her, sail furled as the wind falls away near the arch, on the open sea.
    const character = scene.mesh("character");
    // Seen from off the starboard quarter, her bow on the sun.
    const boatGroup = new THREE.Group();
    boatGroup.position.set(-2.2, -1.9, -11);
    boatGroup.rotation.y = (155 * Math.PI) / 180;
    boatGroup.scale.setScalar(1.6);
    root.add(boatGroup);
    const hull = new THREE.Group();
    boatGroup.add(hull);
    hull.add(character);
    character.position.set(0, 0, 0);
    character.quaternion.identity();
    character.scale.setScalar(1);
    outline(scene, character, "StaticCharacterBaseShaderInverse", 0.008, hull);
    await addBoat(
      scene,
      hull,
      {
        uLightDir: new THREE.Vector3(-0.6, 0.75, 0.35).normalize(),
        uThreshold: new THREE.Vector2(-0.2, 0.62),
      },
      0.0025,
      "assets/geometry/story/sea/boat-furled.bin",
    );
    // The sea runs on ahead to the arch, and the sun lays a road of gold across it.
    const { surface } = await addSea(
      scene,
      boatGroup,
      "assets/geometry/story/sea/approach-sea-curves.json",
      { uFog: new THREE.Vector2(8, 42), uSpacing: 0.5 },
    );
    // The last sun of summer, caught in the arch: it glows from a gold core, its light rings
    // the opening, and gulls wheel over the basalt in the dusk.
    const portal = scene.mesh("portal");
    sunCore(portal);
    addSunHalo(scene, root, [portal.position.x, portal.position.y, portal.position.z - 0.6], {
      radius: 2.55,
      extent: 2.2,
      rayAlpha: 0,
      rings: 2,
      ringColor: PAPER,
      ringAlpha: 0.85,
      glow: 1.45,
      glowColor: SUN,
      dotSize: 4,
      seed: 5,
    });
    addGulls(scene, root, {
      center: [10, 11.5, -46],
      box: [9, 1.8, 3],
      drift: [-0.6, 0.04, 0],
      span: 1.45,
      color: PAPER,
      count: 6,
      seed: 21,
    });
    const wind = await windLines(
      scene,
      "assets/geometry/story/approach/portal-wind-curves.json",
      { uThreshold: 0.84, uSpeed: 1, uTile: 2, uFrameRate: 18 },
    );
    root.add(wind);
    scene.uniform("border", "uTransition", 0);
    let entered = false;
    scene.animate = (frame) => {
      const t = frame.time;
      hull.rotation.x = 0.012 * Math.sin(t * 0.8);
      hull.rotation.z = 0.01 * Math.sin(t * 0.55 + 1.1);
      hull.position.y = 0.015 * Math.sin(t * 0.8 - 0.8);
      const trigger = scene.pixelTop - frame.height + scene.pixelHeight * 0.25;
      if (entered || frame.scroll < trigger) return;
      entered = true;
      gsap.to(scene.mesh("border").material.uniforms.uTransition, {
        value: 1,
        duration: 0.8,
        ease: "power2.out",
      });
    };
    scene.onResize = (w, h) => {
      const mobile = w / h < 1;
      root.rotation.set(mobile ? 0.05 : 0, mobile ? 0.2 : 0, 0);
      root.position.set(mobile ? 1.6 : 0, mobile ? -0.5 : 0, 0);
      scene.uniform("border", "uPadX", range(w, 1600, 393, 0.18, 0.08));
      scene.uniform("border", "uPadY", range(w, 1600, 393, 0.18, 0.08));
      scene.mesh("background").scale.y = mobile ? 142 : 140;
      // The road's bearing from the eye (the camera sits on the z axis, five units out).
      root.updateMatrixWorld(true);
      const sun = portal.getWorldPosition(new THREE.Vector3());
      surface.material.uniforms.uRoad.value.set(sun.x / (5 - sun.z), 0.05, 1);
      wind.position.y = -scene.height * 0.5 + 0.6;
    };
  }
  if (scene.name === "NearScene") {
    // The arch light is wider than the panel: keep it out of the Approach panel above.
    scene.mesh("portal").material.uniforms.uClipSection = { value: 1 };
    sunCore(scene.mesh("portal"));
    const root = new THREE.Group();
    const group = new THREE.Group();
    for (const name of [
      "portal",
      "structure",
      "background",
      "character",
      "newfloor",
      "shadow",
    ])
      if (layers[name]) root.add(layers[name]);
    for (const name of [
      "structure",
      "portal",
      "character",
      "shadow",
      "newfloor",
    ])
      group.add(layers[name]);
    root.add(group);
    scene.group.add(root);
    outline(
      scene,
      scene.mesh("structure"),
      "StaticObjectBaseShaderInverse",
      0.002,
    );
    // Stepping stones: basalt column heads just clear of the still water, leading into the arch.
    const structure = scene.mesh("structure");
    const causeway = scene.addMesh(
      (await loadGeometry("assets/geometry/story/sea/near-causeway.bin")).geometry,
      material("StaticObjectBaseShader", {
        ...Object.fromEntries(
          ["tLines", "tNoise", "uLinesTile", "uAxis", "uAngle", "uColor", "uColorHighlight"].map(
            (key) => [key, structure.material.uniforms[key]?.value],
          ),
        ),
        uLightDir: new THREE.Vector3(0.2, 1.0, 0.5).normalize(),
        uThreshold: new THREE.Vector2(-0.6, 0.5),
      }),
      group,
    );
    causeway.position.copy(structure.position);
    causeway.scale.copy(structure.scale);
    outline(scene, causeway, "StaticObjectBaseShaderInverse", 0.002, group);
    outline(
      scene,
      scene.mesh("character"),
      "StaticCharacterBaseShaderInverse",
      0.02,
    );
    const wind = await windLines(
      scene,
      "assets/geometry/story/profile/outward-curves.json",
      { uThreshold: 0.78, uSpeed: 1 },
    );
    root.add(wind);
    wind.position.z = -9;
    wind.scale.set(2.5, 2.5, 11);
    wind.renderOrder = 5;
    scene.onResize = (w, h) => {
      const mobile = w / h < 1;
      group.scale.setScalar(mobile ? 0.55 : 1);
      group.position.y = mobile ? -1.6 : 0;
      root.rotation.x = mobile ? -0.05 : 0;
      root.position.set(0, mobile ? 1.2 : 0, mobile ? -3.5 : 0);
      scene.uniform("border", "uPadX", mobile ? 0.1 : 0.15);
      scene.uniform("border", "uPadY", 0.2);
      scene.uniform("border", "uPadTop", mobile ? 0.25 : 0);
      scene.uniform("border", "uSkewCorrection", mobile ? -0.05 : -0.45);
    };
  }
}

/** The sun in the arch glows from within: a gold core screened into its amber disc. */
function sunCore(portal: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>) {
  const u = portal.material.uniforms;
  u.uCore.value = 1;
  u.uCoreColor.value = SUN.clone();
  u.uDotSize.value = 4;
}

const boatParams = () => ({
  tLines: characterTextures.tLines,
  tNoise: characterTextures.tNoise,
  uLinesTile: 2.6,
  uLightDir: new THREE.Vector3(0.75, 0.8, 0.45).normalize(),
  uThreshold: new THREE.Vector2(-0.25, 0.62),
  uAxis: new THREE.Vector3(-0.54, 0, 1),
  uAngle: 1.55,
  uDistanceCompensation: 0,
  uColor: new THREE.Color("#f3f1e9"),
  uColorHighlight: new THREE.Color("#ffffff"),
  uVerticalGrad: new THREE.Vector2(100, 101),
});

/** Chaewon's sloop, modelled in her bow-pose space (scripts/env/boat.py). */
export async function addBoat(
  scene: SceneSection,
  parent: THREE.Object3D,
  params: Record<string, unknown> = {},
  lineWidth = 0.0025,
  path = "assets/geometry/story/sea/boat.bin",
) {
  const geometry = (await loadGeometry(path)).geometry;
  const boat = scene.addMesh(
    geometry,
    material("StaticObjectBaseShader", { ...boatParams(), ...params }),
    parent,
  );
  outline(scene, boat, "StaticObjectBaseShaderInverse", lineWidth, parent);
  return boat;
}

/** The sea in the boat's space: a depth mask on the waterline, the inked surface (`params`
 * override its OpenSeaShader uniforms), crests and the wake. */
export async function addSea(
  scene: SceneSection,
  parent: THREE.Object3D,
  crests: string,
  params: Record<string, unknown> = {},
) {
  const occluder = scene.addMesh(
    new THREE.PlaneGeometry(400, 400),
    material("SeaOccluderShader"),
    parent,
  );
  occluder.material.colorWrite = false;
  occluder.rotation.x = -Math.PI / 2;
  occluder.position.y = -0.8;
  occluder.renderOrder = -1;
  // The water itself: ink ripples on the swell, crowding into the hull's reflection and
  // dissolving into the sea fog. Just above the occluder, so the hull still hides what lies
  // behind it.
  const surface = scene.addMesh(
    new THREE.PlaneGeometry(160, 160),
    material("OpenSeaShader", {
      tNoise: texture("assets/images/story/perlin.png"),
      uInk: INK.clone(),
      uGlintColor: SUN.clone(),
      // Centre (x, z) and half-extents of the hull's waterline in the boat's space.
      uHull: new THREE.Vector4(-0.15, -2.1, 2.0, 5.2),
      uFog: new THREE.Vector2(6.5, 12.5),
      uSpacing: 0.34,
      uDensity: 1,
      uSwell: 0.35,
      uGlints: 1,
      // Bearing (tangent), half-width and strength of the road of light; off by default.
      uRoad: new THREE.Vector3(0, 0.15, 0),
      uAlpha: 1,
      ...params,
    }),
    parent,
  );
  surface.material.transparent = true;
  surface.material.depthWrite = false;
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = -0.797;
  const sea = await windLines(scene, crests, {
    uThreshold: 0.3,
    uSpeed: 0.6,
    uTile: 3,
  });
  parent.add(sea);
  const wake = await windLines(
    scene,
    "assets/geometry/story/sea/wake-curves.json",
    { uThreshold: 0.42, uSpeed: 2.2, uTile: 2.5 },
  );
  parent.add(wake);
  return { occluder, surface, sea, wake };
}
