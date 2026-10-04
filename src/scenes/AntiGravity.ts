import * as THREE from "three";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { SceneSection } from "../engine/SceneSection";
import { SkeletalMesh } from "../engine/SkeletalMesh";
import { loadGeometry, texture } from "../engine/assets";
import { CurveParticles } from "../engine/CurveParticles";
import { windLines } from "../engine/WindLines";
import { worldHeight } from "../data/sections";
import { tideColor } from "../data/theme";
gsap.registerPlugin(CustomEase);
const speedUpEase = CustomEase.create("source-speed-up", "0.52,0.02,0.02,1");
const reveal = new WeakMap<SceneSection, () => void>();
export function openAntiGravity(section: SceneSection) {
  reveal.get(section)?.();
}
export async function setupAntiGravity(section: SceneSection) {
  if (section.name !== "AntiGravityScene") return;
  const outer = new THREE.Group(),
    root = new THREE.Group();
  root.position.set(0, -1, -1);
  outer.add(root);
  section.group.add(outer);
  const character = section.layers.characterRoot,
    light = section.mesh("lightbeam"),
    floor = section.mesh("floor");
  for (const name of [
    "characterRoot",
    "lightbeam",
    "particleRoot",
    "curveLeaves",
    "curveLines",
  ])
    root.add(section.layers[name]);
  outer.add(floor);
  // This cylinder is an interaction surface, not a visible object in the production scene.
  section.layers.cyclinderProjection.visible = false;
  // Chaewon lifted by the tide, the pendant at her throat and the lace in the tide's colour.
  const skin = new SkeletalMesh(
    await loadGeometry("assets/geometry/story/antigravity/chaewon-float.bin"),
    "SkinShader",
    {
      tAtlas: texture("assets/images/story/chaewon/atlas.png"),
      tTrim: texture("assets/images/story/chaewon/trim.png"),
      tLines: texture("assets/images/story/lines.jpg"),
      tNoise: texture("assets/images/story/perlin.png"),
      uColor: new THREE.Vector3(241 / 255, 236 / 255, 225 / 255),
      uDrinkColor: new THREE.Color(99 / 255, 196 / 255, 244 / 255),
      uLinesTile: 2.25,
      uLightDir: new THREE.Vector3(0.1, 0.25, 0.9).normalize(),
      uAxis: new THREE.Vector3(1, 1, 2.5),
      uAngle: 0.5,
      uColorScan: 1,
      uScanDown: 1,
      uClasp: 1,
      uPearl: 1,
    },
  );
  await skin.loadAnimation(
    "assets/geometry/story/antigravity/chaewon-float-anim.bin",
  );
  character.add(skin.mesh, skin.outline);
  skin.mesh.renderOrder = 3;
  skin.outline.renderOrder = 4;
  character.rotation.y = 0.3 * Math.PI;
  const skinMaterial = skin.mesh.material as THREE.RawShaderMaterial,
    inverse = skin.outline.material as THREE.RawShaderMaterial;
  inverse.uniforms = {
    ...skinMaterial.uniforms,
    uDisplacement: { value: 1 },
  };
  section.meshes.push(skin.mesh as any, skin.outline as any);
  light.renderOrder = 2;
  light.material.uniforms.uDraw ??= { value: 0 };
  light.material.transparent = true;
  section.mesh("bg").renderOrder = 0;
  section.group.updateMatrixWorld(true);
  const points = section.layers.curveLines.children.map((child) =>
    child.getWorldPosition(new THREE.Vector3()),
  );
  const curve = new THREE.CatmullRomCurve3(points);
  const path = {
    curves: [{ position: curve.getPoints(256).flatMap((p) => p.toArray()) }],
  };
  const winds = await Promise.all(
    [0, 1, 2].map(async (i) => {
      const mesh = await windLines(
        section,
        path,
        {
          uAnimatePosition: 0,
          uThreshold: i === 0 ? 0.55 : 0.5,
          uScroll: 0.4,
          uTile: i === 0 ? 10 : 5,
          uSpeed: 0.8,
          uTime: 0,
        },
        "WindLinesSketchShader",
      );
      mesh.material.transparent = true;
      mesh.position.set(0, i === 1 ? -0.1 : i === 2 ? 0.3 : 0, 1);
      root.add(mesh);
      return mesh;
    }),
  );
  const leaves = new CurveParticles(
    "LeafParticles",
    section,
    section.layers.particleRoot,
    5,
  );
  leaves.group.position.y = 1;
  leaves.setCurve(
    new THREE.CatmullRomCurve3(
      section.layers.curveLeaves.children.map((child) =>
        child.getWorldPosition(new THREE.Vector3()),
      ),
    ),
  );
  const drawn = new CurveParticles("DrawnParticles", section, section.group, 1),
    flavor = new THREE.Color();
  // Holding wakes the tide from one fixed point of the whirlpool, in front of its axis by her knees: the
  // petals sweep across in front of her, around the light and back (the vortex in DrawnParticles turns
  // about x = -0.5, z = -3 in section space, carrying the near side to the right).
  drawn.source = new THREE.Vector3(-0.95, -2.3, -1.5);
  drawn.sourceRadius = 0.22;
  const originalScale = light.scale.clone(),
    originalPosition = light.position.clone(),
    floorPosition = floor.position.clone();
  const speed = { light: 1, wind: 1, skin: 1, shake: 0 };
  let lastStep = 0,
    beamTime = 0,
    held = false,
    revealed = false;
  section.disposables.push(()=>gsap.killTweensOf(speed));
  reveal.set(section, () => {
    if (revealed) return;
    revealed = true;
    gsap.to(light.material.uniforms.uAnimateInMask, {
      value: 1,
      duration: 4,
      ease: "power4.out",
    });
    gsap.to(light.material.uniforms.uAnimateNoise, {
      value: 1,
      duration: 5,
      ease: "power4.out",
    });
    gsap.to(character.position, {
      y: -1.45,
      duration: 3,
      delay: 0.4,
      ease: "power4.out",
    });
  });
  section.animate = (frame) => {
    const t = frame.time,
      dt = frame.delta * 60;
    flavor
      .set(tideColor(frame.selected))
      .convertLinearToSRGB();
    drawn.setColor(flavor);
    leaves.setHeld(frame.pressed);
    drawn.setHeld(frame.pressed);
    // Holding quickens the spiral; her hair and limbs drift faster with it.
    skin.update(frame.delta * (0.6 + 0.4 * speed.skin));
    skinMaterial.uniforms.uDrinkColor.value
      .set(tideColor(frame.selected))
      .convertLinearToSRGB();
    character.rotation.y +=
      (0.1 * Math.PI - 0.2 * frame.pointer.x - character.rotation.y) *
      (1 - Math.pow(0.95, dt));
    if (held !== frame.pressed) {
      if (held) section.onAudio("antigravity_release");
      held = frame.pressed;
      gsap.to(speed, {
        light: held ? 8 : 1,
        wind: held ? 4 : 1,
        skin: held ? 3.5 : 1,
        shake: held ? 1 : 0,
        duration: 3,
        ease: speedUpEase,
        overwrite: true,
      });
      gsap.to(character.rotation, {
        z: held ? 0.045 * Math.PI : 0,
        duration: 6,
        ease: speedUpEase,
        overwrite: true,
      });
      gsap.to(character.position, {
        x: held ? 0.4 : 0,
        y: -1.45,
        duration: 6,
        ease: speedUpEase,
        overwrite: true,
      });
      gsap.to(frame.camera, {
        zoom: held ? 1.1 : 1,
        duration: 6,
        ease: speedUpEase,
        overwrite: true,
        onUpdate: () => frame.camera.updateProjectionMatrix(),
      });
      gsap.to(light.material.uniforms.uDraw, {
        value: held ? 1 : 0,
        duration: 6,
        ease: speedUpEase,
        overwrite: true,
      });
    }
    if (t - lastStep >= 1 / 24) {
      lastStep = t;
      beamTime += 5 * frame.delta * speed.light;
      light.material.uniforms.uTime.value = beamTime;
      light.material.uniforms.uTimeUp.value = 4 * beamTime;
      for (const wind of winds)
        wind.material.uniforms.uTime.value += 5 * frame.delta * speed.wind;
      const shake = speed.shake < 0.1 ? 0 : speed.shake,
        x = 0.0035 * Math.sin(10000 * t) * shake,
        y = 0.0035 * Math.cos(10000 * (t + 0.01)) * shake;
      root.position.set(x, y - 1, -1);
      floor.position.set(
        floorPosition.x + x,
        floorPosition.y + y,
        floorPosition.z,
      );
    }
    section.audioState.shake = speed.shake;
    for (const wind of winds) wind.material.uniforms.uScroll.value = 0.4;
  };
  section.onResize = (w, h) => {
    const mobile = w / h < 1;
    drawn.behavior.uniforms.uPullValue.value = mobile ? 0.01 : 0.005;
    section
      .mesh("bg")
      .scale.set(((worldHeight * w) / h) * 3, section.height, 1);
    outer.position.set(0, mobile ? 0.2 : 0, mobile ? -1 : 0);
    outer.rotation.x = 0;
    light.scale.copy(originalScale);
    light.position.copy(originalPosition);
    light.scale.x = mobile ? 1.1 : 2.75;
    light.scale.y = mobile ? 0.9 : 0.85;
  };
}
