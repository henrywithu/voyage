import * as THREE from "three";
import gsap from "gsap";
import { SceneSection } from "../engine/SceneSection";
import { SkeletalMesh } from "../engine/SkeletalMesh";
import { loadGeometry, texture } from "../engine/assets";
import { outline } from "../engine/outline";
import { range, worldHeight } from "../data/sections";
import { tideColor } from "../data/theme";
import { addMotes, LIGHT, PAPER, skyTone } from "./Atmosphere";

/**
 * The fastening (Voyage's replacement for Spirit's pour and drink).
 *
 * Top: a close-up of Chaewon with her hands at her nape. Holding scrubs the
 * fastening clip; at 72% the clasp closes, the pearl wakes in the chosen tide's
 * colour and the colour runs down through the lace, then she lets go and rests
 * her hand by the pendant. Below: her full figure in the charm loop, the colour
 * running through the dress as the reader scrolls.
 */
const CLASP = 0.72;
const states = new WeakMap<
  SceneSection,
  { progress: number; drinkFrame: number }
>();
/** Frame of the charm loop, shared with the floating close-up frame. */
export const getDrinkFrame = (section: SceneSection) =>
  states.get(section)?.drinkFrame;
export const getPourProgress = (section: SceneSection) =>
  states.get(section)?.progress ?? 0;
export async function setupDrinkPour(section: SceneSection) {
  if (section.name !== "DrinkPourScene") return;
  const state = { progress: 0, drinkFrame: 0 };
  states.set(section, state);
  const fx = { pearl: 0, scan: 0 };
  section.disposables.push(() => {
    gsap.killTweensOf(state);
    gsap.killTweensOf(fx);
  });
  const root = new THREE.Group(),
    closeRoot = new THREE.Group(),
    characterRoot = new THREE.Group();
  root.add(closeRoot, characterRoot);
  section.group.add(root);
  characterRoot.position.set(0, -8.75, -1.25);
  characterRoot.scale.setScalar(3);
  for (const name of ["background_plinth", "foreground_plinth"]) {
    root.add(section.layers[name]);
    outline(
      section,
      section.mesh(name),
      "StaticObjectBaseShaderInverse",
      0.0025,
      root,
    );
  }
  for (const name of ["glass", "glass_front", "glassshadow", "armshadow"])
    if (section.layers[name]) section.layers[name].visible = false;
  // The grotto's air around her: the vault deepens overhead, a glow gathers behind her as she
  // fastens the clasp and wakes with the pearl, taking its tide; motes drift in the light.
  const sky = skyTone(section, "background", {
    light: LIGHT,
    glowRadius: [0.03, 0.105],
    glow: 0.55,
    shadeAmount: 0.5,
    shadeRange: [0.86, 1.0],
    dotSize: 5,
  })!;
  const skyUniforms = sky.material.uniforms;
  const glowColor = new THREE.Color();
  addMotes(section, root, {
    count: 70,
    min: [-4.5, -9, -1.6],
    max: [4.5, 6, 0.4],
    velocity: [0.02, 0.06, 0],
    size: [0.012, 0.03],
    wobble: 0.06,
    color: PAPER,
    seed: 23,
  });
  const common = {
    tAtlas: texture("assets/images/story/chaewon/atlas.png"),
    tTrim: texture("assets/images/story/chaewon/trim.png"),
    tLines: texture("assets/images/story/lines.jpg"),
    tNoise: texture("assets/images/story/perlin.png"),
    uColor: new THREE.Vector3(247 / 255, 244 / 255, 238 / 255),
    uDrinkColor: new THREE.Color(99 / 255, 196 / 255, 244 / 255),
    uAxis: new THREE.Vector3(1, 0, 2.5),
    uAngle: 0.5,
    uColorScan: 0,
    uScanDown: 1,
    uClasp: 0,
    uPearl: 0,
  };
  const asset = await loadGeometry(
    "assets/geometry/story/grotto/chaewon-fasten.bin",
  );
  const [fastenClip, charmClip] = await Promise.all([
    loadGeometry("assets/geometry/story/grotto/chaewon-fasten-anim.bin"),
    loadGeometry("assets/geometry/story/grotto/chaewon-charm-anim.bin"),
  ]);
  const closeup = new SkeletalMesh(asset, "SkinShader", {
    ...common,
    uLinesTile: 2.4,
    uLightDir: new THREE.Vector3(0.25, 0.35, 1).normalize(),
  });
  closeup.setAnimation(fastenClip);
  closeRoot.add(closeup.mesh, closeup.outline);
  const figure = new SkeletalMesh(asset, "SkinShader", {
    ...common,
    uLinesTile: 3.5,
    uLightDir: new THREE.Vector3(0.13, 0.3, 0.74).normalize(),
    uClasp: 1,
    uPearl: 1,
  });
  figure.setAnimation(charmClip);
  characterRoot.add(figure.mesh, figure.outline);
  for (const skin of [closeup, figure]) {
    section.meshes.push(skin.mesh as any, skin.outline as any);
    // The outline shares the colour pass's uniforms (chain visibility, discard bounds).
    (skin.outline.material as THREE.RawShaderMaterial).uniforms = {
      ...(skin.mesh.material as THREE.RawShaderMaterial).uniforms,
      uDisplacement: { value: 1 },
    };
  }
  const closeUniforms = (closeup.mesh.material as THREE.RawShaderMaterial)
    .uniforms;
  const figureUniforms = (figure.mesh.material as THREE.RawShaderMaterial)
    .uniforms;
  closeup.update(0, 0);
  figure.update(0, 0);
  let held = false,
    fastened = false,
    looping = false;
  section.control = {
    label: "HOLD &\nFASTEN",
    top: 0.025,
    height: 1.5,
    mobilePosition: new THREE.Vector2(),
  };
  const anchor = new THREE.Vector3();
  section.animate = (frame) => {
    if (!fastened && frame.pressed !== held) {
      held = frame.pressed;
      gsap.to(state, {
        progress: held ? CLASP : 0,
        duration: held ? 2.6 : 1,
        ease: held ? "power1.inOut" : "power2.out",
        overwrite: true,
      });
    }
    if (!fastened && state.progress >= CLASP - 1e-3) {
      // The clasp closes: the pearl wakes, the colour runs, and she lets go.
      fastened = true;
      section.audioState.clasp = 1;
      section.onAudio("pendant_clasp");
      gsap.to(state, {
        progress: 1,
        duration: 1.6,
        ease: "power1.inOut",
        overwrite: true,
      });
      gsap.to(fx, { pearl: 1, duration: 0.6, ease: "power2.out" });
      gsap.to(fx, { scan: 0.42, duration: 2.6, delay: 0.25, ease: "sine.inOut" });
    }
    const p = state.progress,
      t = frame.time;
    if (p >= 1 && !looping) {
      looping = true;
      closeup.setAnimation(charmClip);
      closeup.elapsed = 0;
    }
    // A breath of movement while she waits for the reader to hold.
    closeRoot.rotation.y = 0.04 * Math.sin(0.5 * t) * (1 - p);
    if (looping) closeup.update(frame.delta);
    else closeup.update(0, p * 60);
    state.drinkFrame = (state.drinkFrame + frame.delta * 20) % 100;
    figure.update(0, state.drinkFrame);
    // The close-up dissolves into stipple below her waist, inside its panel.
    closeUniforms.uClipY.value = section.group.position.y + section.height / 2 - 1.02 * worldHeight;
    // Below, she stands behind the ledge with her feet past the section's end: nothing of her may hang
    // into the next scene (her legs would show against its light).
    figureUniforms.uClipY.value = section.group.position.y - section.height / 2 - 0.5;
    closeUniforms.uClasp.value = fastened ? 1 : 0;
    closeUniforms.uPearl.value = fx.pearl;
    closeUniforms.uColorScan.value = fx.scan;
    section.audioState.pour = held && !fastened ? p / CLASP : 0;
    const color = tideColor(frame.selected);
    for (const u of [closeUniforms, figureUniforms])
      u.uDrinkColor.value.set(color).convertLinearToSRGB();
    // The glow behind her brightens as the clasp nears and takes the tide when the pearl wakes.
    skyUniforms.uGlow.value = 0.55 + 0.25 * Math.min(p / CLASP, 1) + 0.35 * fx.pearl;
    skyUniforms.uLight.value.copy(LIGHT).lerp(
      glowColor.set(color).convertLinearToSRGB(),
      0.55 * fx.pearl,
    );
    // Below, the colour runs down through her dress as she comes into view.
    const scrollTop = (frame.scroll / frame.height) * worldHeight;
    figureUniforms.uColorScan.value = range(
      scrollTop - section.top,
      section.height - 2.2 * worldHeight,
      section.height - 1.0 * worldHeight,
      0.12,
      1,
    );
    closeup.mesh.getWorldPosition(anchor).project(frame.camera);
    section.control!.mobilePosition!.set(
      (anchor.x + 1) * 0.5 * frame.width + 0.125 * frame.width,
      (1 - anchor.y) * 0.5 * frame.height - 400,
    );
  };
  section.onResize = (w, h) => {
    const mobile = w / h < 1;
    section.uniform("border", "uPadX", range(w, 1600, 393, 0.18, 0.08));
    section.uniform("border", "uPadY", 0.05);
    // Chest-up in the first screen of the section, slightly off centre on wide screens.
    const s = mobile ? 3.2 : 4.0;
    closeRoot.scale.setScalar(s);
    // Tipped a little toward the camera, which sits below her face: we meet her eyes rather than her throat.
    closeRoot.rotation.x = 0.2;
    closeRoot.position.set(
      mobile ? 0 : 0.5,
      section.height / 2 - worldHeight / 2 - 1.66 * s,
      -0.6,
    );
    characterRoot.position.y = mobile ? -8.65 : -8.75;
    const plane = section.mesh("background");
    skyUniforms.uGlowCenter.value.set(
      0.5 + (closeRoot.position.x - plane.position.x) / plane.scale.x,
      0.5 +
        (section.height / 2 - worldHeight / 2 - plane.position.y) /
          plane.scale.y,
    );
  };
}
