import * as THREE from "three";
import gsap from "gsap";
import { SceneSection } from "../engine/SceneSection";
import { SkeletalMesh } from "../engine/SkeletalMesh";
import { loadGeometry, texture } from "../engine/assets";
import { material } from "../engine/shaders";
import { outline } from "../engine/outline";
import { range, clamp, worldHeight } from "../data/sections";
import { PourStream } from "./PourStream";
import { tideColor } from "../data/theme";
const states = new WeakMap<
  SceneSection,
  { progress: number; drinkFrame: number }
>();
export const getDrinkFrame = (section: SceneSection) =>
  states.get(section)?.drinkFrame;
export const getPourProgress = (section: SceneSection) =>
  states.get(section)?.progress ?? 0;
export async function setupDrinkPour(section: SceneSection) {
  if (section.name !== "DrinkPourScene") return;
  const state = { progress: 0, drinkFrame: 90 };
  states.set(section, state);
  section.disposables.push(()=>gsap.killTweensOf(state));
  const root = new THREE.Group(),
    armRoot = new THREE.Group(),
    characterRoot = new THREE.Group();
  root.add(armRoot, characterRoot);
  section.group.add(root);
  armRoot.position.y = 5.25;
  characterRoot.position.set(0, -8.75, -1.25);
  characterRoot.scale.setScalar(3);
  for (const name of [
    "background_plinth",
    "foreground_plinth",
    "glass",
    "glass_front",
    "glassshadow",
    "armshadow",
  ])
    root.add(section.layers[name]);
  for (const name of ["background_plinth", "foreground_plinth"])
    outline(
      section,
      section.mesh(name),
      "StaticObjectBaseShaderInverse",
      name === "foreground_plinth" ? 0.002 : 0.0005,
      root,
    );
  const common = {
    tAtlas: texture("assets/images/story/chaewon/atlas.png"),
    tLines: texture("assets/images/story/lines.jpg"),
    tNoise: texture("assets/images/story/perlin.png"),
  };
  const arm = new SkeletalMesh(
    await loadGeometry("assets/geometry/story/drinkpour/saint-pour-arm.bin"),
    "SkinShader",
    {
      ...common,
      tTrim: texture("assets/images/story/chaewon/trim.png"),
      uColor: new THREE.Vector3(1, 1, 1),
      uDrinkColor: new THREE.Vector3(1, 1, 1),
      uLinesTile: 12,
      uLightDir: new THREE.Vector3(0, 0.5, 0.95).normalize(),
      uAxis: new THREE.Vector3(1, 0.77, -0.6),
      uThreshold: new THREE.Vector2(0, 0.7),
      uAngle: -2.008,
    },
  );
  await arm.loadAnimation(
    "assets/geometry/story/drinkpour/saint-pour-arm-animation.bin",
  );
  armRoot.add(arm.mesh, arm.outline);
  const character = new SkeletalMesh(
    await loadGeometry("assets/geometry/story/drinkpour/saint-drink.bin"),
    "SkinShader",
    {
      ...common,
      tTrim: texture("assets/images/story/chaewon/trim.png"),
      uColor: new THREE.Vector3(232 / 255, 225 / 255, 208 / 255),
      uDrinkColor: new THREE.Color(99 / 255, 196 / 255, 244 / 255),
      uLinesTile: 3.5,
      uLightDir: new THREE.Vector3(0.13, 0.3, 0.74).normalize(),
      uAxis: new THREE.Vector3(0, 0, 1),
      uThreshold: new THREE.Vector2(0, 0),
      uAngle: -1.53,
      uColorScan: 0,
    },
  );
  await character.loadAnimation(
    "assets/geometry/story/drinkpour/saint-drink-animation.bin",
  );
  characterRoot.add(character.mesh, character.outline);
  for (const skin of [arm, character]) {
    section.meshes.push(skin.mesh as any, skin.outline as any);
    (skin.outline.material as THREE.RawShaderMaterial).uniforms = {
      ...(skin.mesh.material as THREE.RawShaderMaterial).uniforms,
      uDisplacement: { value: 1 },
    };
  }
  // Keep the bone palette in model space, and mirror attachment matrices beneath the animated arm root.
  const attachment = new THREE.Group();
  attachment.matrixAutoUpdate = false;
  armRoot.add(attachment);
  const bottle = section.addMesh(
    (
      await loadGeometry(
        "assets/geometry/story/drinkpour/chaewon-pour-flask.bin",
      )
    ).geometry,
    material("DrinkPourBottleShader", {
      ...common,
      tNoise: texture("assets/images/story/drinkpour/T_Noise15.png"),
      tMap: texture(
        "assets/images/story/drinkselection/trapnest-voyage-flask.png",
        false,
      ),
      uColorHighlight: new THREE.Vector3(1, 1, 1),
      uColor: new THREE.Color(110 / 255, 192 / 255, 240 / 255),
      uLinesTile: 10,
      uLightDir: new THREE.Vector3(0, 0.1, 1).normalize(),
      uAxis: new THREE.Vector3(1, 0, 0),
      uAngle: Math.PI / 2,
      uDistanceCompensation: 0,
      uThreshold: new THREE.Vector2(0.5, 0.1),
      uPourStrength: 0,
      uWaterLineOffset: 0.1,
    }),
    attachment,
  );
  bottle.rotation.z = 4.4;
  arm.update(0, 0);
  character.update(0, 90);
  attachment.matrix.copy(arm.bones[0].matrixWorld);
  const stream = new PourStream(
    section,
    root,
    arm.bones[0].scale.y,
    arm.bones[0].position.z,
  );
  const glass = section.mesh("glass");
  glass.geometry.computeBoundingBox();
  stream.base.position.y =
    glass.position.y -
    0.35 * stream.base.scale.y +
    (glass.geometry.boundingBox!.max.y - glass.geometry.boundingBox!.min.y) *
      glass.scale.y;
  const shadow = section.mesh("armshadow"),
    shadowX = shadow.position.x,
    shadowLines = shadow.material.uniforms.uLinesStrength.value;
  const base = new THREE.Vector3(),
    tip = new THREE.Vector3();
  let held = false;
  section.control = {
    label: "HOLD &\nPOUR",
    top: 0.025,
    height: 1.5,
    mobilePosition: new THREE.Vector2(),
  };
  section.animate = (frame) => {
    if (frame.pressed !== held) {
      held = frame.pressed;
      gsap.to(state, {
        progress: held ? 1 : 0,
        duration: held ? 3 : 1,
        ease: "none",
        overwrite: true,
      });
    }
    const mobile = frame.width / frame.height < 1,
      p = state.progress,
      t = frame.time;
    const x =
      range(
        frame.pointer.x,
        -0.5,
        0.5,
        mobile ? -0.4 : -0.25,
        mobile ? 0.11 : 0.25,
      ) * p;
    armRoot.position.x +=
      (x - armRoot.position.x) * (1 - Math.pow(0.9, frame.delta * 60));
    armRoot.position.x -=
      Math.sin(0.7 * t) * Math.cos(0.6 * (t + 0.12)) * 0.005;
    const y = 5.25 + range(frame.pointer.y, -0.5, 0.5, 0, 0.6) * p;
    armRoot.position.y +=
      (y - armRoot.position.y) * (1 - Math.pow(0.92, frame.delta * 60));
    armRoot.position.y +=
      0.01 *
      ((0.5 * Math.sin(0.4 * t) + 0.5) * Math.cos(0.6 * (t + 0.01)) * 0.5 +
        0.5);
    arm.update(0, p * 60);
    state.drinkFrame += frame.delta * 30;
    if (state.drinkFrame >= 319)
      state.drinkFrame = 141 + (state.drinkFrame % 319);
    character.update(0, state.drinkFrame);
    section.audioState.pour = p;
    section.audioState.drinkFrame = state.drinkFrame;
    attachment.matrix.copy(arm.bones[0].matrixWorld);
    section.group.updateMatrixWorld(true);
    base.setFromMatrixPosition(attachment.matrixWorld);
    tip
      .setFromMatrixPosition(arm.bones[4].matrixWorld)
      .applyMatrix4(armRoot.matrixWorld);
    stream.update(
      frame.delta,
      t,
      base,
      tip,
      root.scale.length(),
      frame.selected,
    );
    shadow.material.uniforms.uLinesStrength.value = THREE.MathUtils.lerp(
      shadowLines,
      0.6,
      clamp(p * 2),
    );
    shadow.position.x +=
      (shadowX + x - shadow.position.x) *
      (1 - Math.pow(0.82, frame.delta * 60));
    bottle.material.uniforms.uPourStrength.value = stream.strength;
    bottle.material.uniforms.uWaterLineOffset.value = THREE.MathUtils.lerp(
      0.4,
      0.05,
      -(Math.cos(Math.PI * range(p, 0, 0.7, 0, 1)) - 1) / 2,
    );
    const color = tideColor(frame.selected);
    bottle.material.uniforms.uColor.value.set(color).convertLinearToSRGB();
    const u = (character.mesh.material as THREE.RawShaderMaterial).uniforms;
    u.uDrinkColor.value.set(color).convertLinearToSRGB();
    u.uColorScan.value =
      (section.top - (frame.scroll / frame.height) * worldHeight) / worldHeight;
    for (const name of ["background", "background_plinth"]) {
      const uniform = section.mesh(name).material.uniforms.uDiscardTop;
      uniform.value -= 0.1;
    }
    glass.getWorldPosition(tip).project(frame.camera);
    section.control!.mobilePosition!.set(
      (tip.x + 1) * 0.5 * frame.width + 0.125 * frame.width,
      (1 - tip.y) * 0.5 * frame.height - 400,
    );
  };
  section.onResize = (w, h) => {
    section.uniform("border", "uPadX", range(w, 1600, 393, 0.18, 0.08));
    section.uniform("border", "uPadY", 0.05);
    character.mesh.position.y = character.outline.position.y =
      w / h < 1 ? 0.1 : 0;
  };
}
