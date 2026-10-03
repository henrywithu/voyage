import * as THREE from "three";
import { footsteps } from "../audio/Footsteps";
import { openAntiGravity } from "./AntiGravity";
import { getDrinkFrame } from "./DrinkPour";
import { SceneSection } from "../engine/SceneSection";
import { SkeletalMesh } from "../engine/SkeletalMesh";
import { FloatingFrameHover } from "../engine/FloatingFrameHover";
import { loadGeometry, texture } from "../engine/assets";
import { material } from "../engine/shaders";
import { worldHeight, clamp, range } from "../data/sections";
import { tideColor, tides } from "../data/theme";
interface FrameParams {
  geometry: string;
  animation?: string;
  shader?: string;
  frameWidth: number;
  frameHeight: number;
  frameZ: number;
  zOffset: number;
  horizontalAlign: string;
  verticalAlign: string;
  padx: number;
  pady: number;
  meshOffsetY?: number;
  meshRotationY?: number;
  meshScale?: number;
}
const layouts: Record<string, (w: number, h: number) => FrameParams[]> = {
  WanderScene: (w, h) => {
    const m = w / h < 1;
    return [
      {
        geometry: "assets/geometry/story/wander/saint-hood.bin",
        frameWidth: 0.45,
        frameHeight: 0.25,
        frameZ: 0.1,
        zOffset: -0.25,
        horizontalAlign: "left",
        verticalAlign: "bottom",
        padx: m ? 0 : 0.3,
        pady: m ? 3.3 : 1.95,
      },
      {
        geometry: "assets/geometry/story/wander/saint-hood-2.bin",
        frameWidth: m ? 0.45 : 0.63,
        frameHeight: m ? 0.25 : 0.33,
        frameZ: 0.1,
        zOffset: -0.25,
        horizontalAlign: "right",
        verticalAlign: "bottom",
        padx: m ? -0.2 : 0.3,
        pady: 1.2,
      },
    ];
  },
  ApproachScene: (w, h) => {
    const m = w / h < 1;
    return [
      {
        geometry: "assets/geometry/story/approach/floating-frame-walk.bin",
        animation: "assets/geometry/story/common/floating-frame-walk-anim.bin",
        shader: "FloatingFrameWalkShader",
        frameWidth: m ? 0.4 : 0.9,
        frameHeight: m ? 0.3 : 0.35,
        frameZ: 0.1,
        zOffset: -0.1,
        horizontalAlign: "right",
        verticalAlign: "bottom",
        padx: m ? 0.05 : 0.5,
        pady: m ? 0 : 0.35,
      },
    ];
  },
  CathedralScene: (w, h) => {
    const m = w / h < 1,
      eyeWidth = w < 1060 ? (0.5 * worldHeight * w) / h : 1.8;
    return [
      {
        geometry: "assets/geometry/story/cathedral/saint-eyes.bin",
        shader: "FloatingFrameEyesShader",
        frameWidth: eyeWidth,
        frameHeight: w < 1060 ? eyeWidth * 0.36 : 0.65,
        frameZ: -0.4,
        zOffset: range(w, 1060, 393, -1.6, -0.6),
        meshScale: range(w, 1060, 393, 1, 0.46),
        horizontalAlign: "center",
        verticalAlign: "center",
        padx: 0,
        pady: 0,
      },
      {
        geometry: "assets/geometry/story/approach/floating-frame-walk.bin",
        animation: "assets/geometry/story/common/floating-frame-walk-anim.bin",
        shader: "FloatingFrameWalkShader",
        frameWidth: m ? 0.53 : 0.9,
        frameHeight: m ? 0.33 : 0.35,
        frameZ: 0.1,
        zOffset: -0.1,
        horizontalAlign: "right",
        verticalAlign: "bottom",
        padx: m ? 0.05 : 1.4,
        pady: m ? 0.3 : 0.35,
      },
    ];
  },
  AntiGravityScene: (w, h) => {
    const m = w / h < 1;
    return [
      {
        geometry: "assets/geometry/story/antigravity/eyes-widen.bin",
        animation: "assets/geometry/story/antigravity/test2-animation.bin",
        shader: "FloatingFrameEyesShaderAG",
        frameWidth:
          ((worldHeight * w) / h) * (0.5 - range(w, 1600, 393, 0.095, 0.04)) +
          (m ? 0.1 : 0),
        frameHeight: range(w, 1728, 393, 0.75, 0.3),
        frameZ: 0,
        zOffset: -range(w, 1728, 393, 3, 4),
        meshScale: range(w, 1728, 393, 2, 1.3),
        meshOffsetY: -3 + range(w, 1728, 393, 0, 1),
        horizontalAlign: "center",
        verticalAlign: "top",
        padx: 0,
        pady: 0,
      },
    ];
  },
  PillarCrumbleScene: (w, h) => {
    const m = w / h < 1;
    return [
      {
        geometry:
          "assets/geometry/story/pillarcrumble/floating-frame-profile.bin",
        shader: "FloatingFramePillarShader",
        frameWidth: m ? 0.4 : 0.65,
        frameHeight: m ? 0.3 : 0.4,
        frameZ: 0.1,
        zOffset: -0.25,
        horizontalAlign: "left",
        verticalAlign: m ? "center" : "bottom",
        padx: m ? 0 : 0.5,
        pady: m ? 0.4 : 1.25,
      },
    ];
  },
  DrinkPourScene: (w, h) => {
    const m = w / h < 1;
    return [
      {
        geometry: "assets/geometry/story/drinkpour/floating-frame-drink.bin",
        animation: "assets/geometry/story/drinkpour/saint-drink-animation.bin",
        shader: "FloatingFrameDrinkShader",
        frameWidth: m ? 0.45 : 0.63,
        frameHeight: m ? 0.25 : 0.33,
        frameZ: 0.1,
        zOffset: -0.3,
        horizontalAlign: "right",
        verticalAlign: "bottom",
        padx: m ? 0 : 0.5,
        pady: m ? 4 : 3.25,
        meshOffsetY: -2.425,
        meshRotationY: 13.614,
        meshScale: 1.38,
      },
    ];
  },
};
export async function setupFloatingFrames(section: SceneSection) {
  const layout = layouts[section.name];
  if (!layout) return;
  const frames = await Promise.all(
    layout(innerWidth, innerHeight).map(async (params, index) => {
      const name = params.shader ?? "FloatingFrameBaseShader";
      const uniforms = {
        uDPR: 1,
        tAtlas: texture("assets/images/story/chaewon/atlas.png"),
        tTrim: texture(
          ["FloatingFrameDrinkShader", "FloatingFramePillarShader"].includes(
            params.shader ?? "",
          )
            ? "assets/images/story/chaewon/trim.png"
            : "assets/images/story/chaewon/trim.png",
        ),
        tLines: texture("assets/images/story/lines.jpg"),
        tNoise: texture("assets/images/story/perlin.png"),
        uLinesTile: params.shader ? 4.5 : 1.8,
        uLightDir: params.shader
          ? new THREE.Vector3(0.1, 1, 0)
          : new THREE.Vector3(0.5, 1, 1),
        uColor1: new THREE.Color(
          params.shader === "FloatingFrameWalkShader"
            ? "#f3f1e9"
            : params.shader
              ? "#f3bc23"
              : "#f1ece1",
        ).convertLinearToSRGB(),
        uColor2: new THREE.Color(
          params.shader ? "#f1ece1" : "#a39b8a",
        ).convertLinearToSRGB(),
        uColor3: new THREE.Color("#3c3c3c").convertLinearToSRGB(),
        uTransition: 0,
        uHover: 0,
        uIdleAnimationOffset: index * 0.5,
        uIdleAnimationStrength: index === 1 ? 0.5 : 1,
      };
      if (section.name === "AntiGravityScene")
        Object.assign(uniforms, {
          tTrim: texture("assets/images/story/chaewon/trim.png"),
          uLinesTile: 2.5,
          uLightDir: new THREE.Vector3(0.25, 0.25, 0.2),
          uColor: new THREE.Vector3(127 / 255, 114 / 255, 97 / 255),
          uColorBG: new THREE.Vector3(243 / 255, 187 / 255, 34 / 255),
          uColorFlavor: new THREE.Vector3(99 / 255, 196 / 255, 244 / 255),
          uOpenEyesWeight: 0,
          uTransitionEyeColor: 0,
        });
      if (section.name === "CathedralScene") {
        Object.assign(
          uniforms,
          params.shader === "FloatingFrameEyesShader"
            ? {
                uLinesTile: 0.8,
                uLightDir: new THREE.Vector3(0.25, 0.25, 0.2),
                uColor: new THREE.Vector3(127 / 255, 114 / 255, 97 / 255),
              }
            : {
                uColor1: new THREE.Vector3(243 / 255, 187 / 255, 34 / 255),
                uColor3: new THREE.Vector3(18 / 255, 18 / 255, 18 / 255),
              },
        );
      }
      const asset = await loadGeometry(params.geometry);
      let skin: SkeletalMesh | undefined;
      let mesh: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>;
      if (params.animation) {
        skin = new SkeletalMesh(asset, name, uniforms);
        await skin.loadAnimation(params.animation);
        mesh = skin.mesh as typeof mesh;
        section.group.add(mesh);
        section.meshes.push(mesh);
      } else mesh = section.addMesh(asset.geometry, material(name, uniforms));
      mesh.material.side = THREE.DoubleSide;
      mesh.material.transparent = true;
      mesh.renderOrder = 1000;
      const window = new THREE.Object3D();
      section.group.add(window);
      return {
        params,
        mesh,
        skin,
        window,
        started: -1,
        eyesStarted: -1,
        baseY: 0,
      };
    }),
  );
  const resize = section.onResize;
  section.onResize = (w, h) => {
    resize(w, h);
    layout(w, h).forEach((p, i) => {
      const f = frames[i];
      f.params = p;
      const halfWidth =
        ((worldHeight * w) / h) * 0.5 * (w > 2100 ? 2100 / w : 1);
      const x =
        p.horizontalAlign === "left"
          ? -halfWidth + p.padx + p.frameWidth
          : p.horizontalAlign === "center"
            ? p.padx
            : halfWidth - p.padx - p.frameWidth;
      const y =
        p.verticalAlign === "bottom"
          ? -section.height * 0.5 + p.pady + p.frameHeight
          : p.verticalAlign === "center"
            ? p.pady
            : section.height * 0.5 - p.pady - p.frameHeight;
      f.window.position.set(x, y, p.frameZ);
      f.mesh.position.set(x, y + (p.meshOffsetY ?? 0), p.frameZ + p.zOffset);
      f.baseY = f.mesh.position.y;
      f.mesh.rotation.y = p.meshRotationY ?? 0;
      f.mesh.scale.setScalar(p.meshScale ?? 1);
    });
  };
  const matrix = new THREE.Matrix4(),
    point = new THREE.Vector4(),
    world = new THREE.Vector3();
  const hover = new FloatingFrameHover(frames.map((frame) => frame.mesh));
  const requestHover = (event: PointerEvent) => {
    if (section.group.visible) hover.request(event);
  };
  window.addEventListener("pointermove", requestHover);
  window.addEventListener("pointerdown", requestHover);
  window.addEventListener("pointerup", hover.release);
  window.addEventListener("pointercancel", hover.release);
  const leave = section.onLeave;
  section.onLeave = (frame) => {
    leave?.(frame);
    hover.clear();
  };
  section.disposables.push(() => {
    window.removeEventListener("pointermove", requestHover);
    window.removeEventListener("pointerdown", requestHover);
    window.removeEventListener("pointerup", hover.release);
    window.removeEventListener("pointercancel", hover.release);
    hover.dispose();
  });
  section.updates.push((frame) => {
    for (const f of frames) {
      const p = f.params;
      f.window.updateWorldMatrix(true, false);
      matrix
        .copy(frame.camera.projectionMatrix)
        .multiply(frame.camera.matrixWorldInverse)
        .multiply(f.window.matrixWorld);
      for (const [key, x, y] of [
        ["uPoint1", -p.frameWidth, p.frameHeight],
        ["uPoint2", p.frameWidth, p.frameHeight],
        ["uPoint3", p.frameWidth, -p.frameHeight],
        ["uPoint4", -p.frameWidth, -p.frameHeight],
        ["uCenter", 0, 0],
      ] as const) {
        point.set(x, y, p.frameZ, 1).applyMatrix4(matrix);
        f.mesh.material.uniforms[key]?.value
          .set(point.x, point.y, point.z)
          .divideScalar(point.w);
      }
      f.window.getWorldPosition(world);
      if (
        f.started < 0 &&
        world.y + (frame.scroll / frame.height) * worldHeight >
          -worldHeight * 0.5
      )
        f.started = frame.time;
      f.mesh.material.uniforms.uTransition.value =
        f.started < 0
          ? 0
          : 1 - (1 - clamp((frame.time - f.started) / 0.8)) ** 3;
      if (section.name === "AntiGravityScene") {
        const offset =
          (section.top +
            section.height -
            (frame.scroll / frame.height) * worldHeight) /
            worldHeight -
          (0.9 * section.height) / worldHeight;
        f.mesh.position.y =
          f.baseY + (frame.width > frame.height ? 1 : -1) * (offset - 0.5);
        if (offset < 0.75 && f.eyesStarted < 0) {
          f.eyesStarted = frame.time;
          openAntiGravity(section);
        }
        const age = f.eyesStarted < 0 ? 0 : frame.time - f.eyesStarted;
        f.skin?.update(0, 75 * clamp(age / 5));
        f.mesh.material.uniforms.uOpenEyesWeight.value = clamp(age / 2);
        f.mesh.material.uniforms.uTransitionEyeColor.value = clamp(
          (age - 0.7) / 2,
        );
        f.mesh.material.uniforms.uColorFlavor.value
          .set(tideColor(frame.selected))
          .convertLinearToSRGB();
      } else
        f.skin?.update(
          section.name === "DrinkPourScene" ? 0 : frame.delta,
          getDrinkFrame(section),
        );
      if (section.name === "PillarCrumbleScene")
        f.mesh.material.uniforms.uColor2.value
          .set(tideColor(frame.selected))
          .convertLinearToSRGB();
      if (f.mesh.material.uniforms.uDrinkColor)
        f.mesh.material.uniforms.uDrinkColor.value.set(
          tides[frame.selected].drink,
        );
    }
    hover.update(frame.pointer, frame.camera);
  });
  const walk = frames.find(
    (f) => f.params.shader === "FloatingFrameWalkShader",
  );
  if (walk?.skin) footsteps(section, walk.skin);
}
