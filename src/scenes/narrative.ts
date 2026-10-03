import * as THREE from "three";
import gsap from "gsap";
import { footsteps } from "../audio/Footsteps";
import { SceneSection } from "../engine/SceneSection";
import { loadGeometry, texture } from "../engine/assets";
import { material } from "../engine/shaders";
import { outline } from "../engine/outline";
import { windLines } from "../engine/WindLines";
import { SkeletalMesh } from "../engine/SkeletalMesh";
import { SourceText } from "../engine/SourceText";
import { worldHeight, range, clamp } from "../data/sections";

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
    const ground = await windLines(
      scene,
      "assets/geometry/story/wander/ground-curves.json",
      { uThreshold: 0.81, uSpeed: 0.4 },
    );
    ground.scale.setScalar(1.25);
    ground.position.z = -1;
    const vertical = await windLines(
      scene,
      "assets/geometry/story/wander/ground-curves-vertical.json",
      { uThreshold: 0.6, uAnimatePosition: 1 },
    );
    vertical.scale.setScalar(1.25);
    vertical.position.z = -1;

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
    characterGroup.position.set(0, 0.35, -2);
    characterGroup.scale.setScalar(1.3);
    characterGroup.rotation.y = (25 * Math.PI) / 180;
    scene.group.add(characterGroup);
    const character = new SkeletalMesh(
      await loadGeometry("assets/geometry/story/wander/saint-walk-2.bin"),
      "SkinShader",
      {
        ...characterTextures,
        uColor: new THREE.Vector3(0.94510, 0.92549, 0.88235),
        uLinesTile: 1.25,
        uLightDir: new THREE.Vector3(0.1, 0.1, 0.5).normalize(),
        uAxis: new THREE.Vector3(1, 0, 2.5),
        uAngle: 0.5,
      },
    );
    await character.loadAnimation(
      "assets/geometry/story/wander/saint-walk-2-anim.bin",
    );
    footsteps(scene, character);
    characterGroup.add(character.mesh, character.outline);
    const shadow = scene.addMesh(
      new THREE.PlaneGeometry(),
      material("WanderShadow", {
        tMap: texture("assets/images/story/wander/shadow1.png"),
        tLines: characterTextures.tLines,
        tNoise: characterTextures.tNoise,
        uLinesTile: 1.3,
      }),
      characterGroup,
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(3, 2, 1);
    shadow.position.x = 0.5;
    scene.onResize = (w, h) => {
      wind.position.y = -scene.height * 0.5;
      ground.position.y = vertical.position.y = -scene.height * 0.5 + 0.25;
      title.position.y = scene.height * 0.5 - worldHeight * 0.5;
      characterGroup.position.y = 0.35 - scene.height * 0.5;
      const width =
        title.geometry.boundingBox!.max.x - title.geometry.boundingBox!.min.x;
      title.scale.setScalar(Math.min((0.6 * worldHeight * w) / h, 3.8) / width);
      scene.uniform("border", "uPadX", range(w, 1600, 393, 0.18, 0.08));
      scene.uniform("border", "uPadY", range(h, 800, 664, 0.13, 0.06));
    };
    scene.animate = (f) => {
      character.update(f.delta);
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
    group.scale.setScalar(3.6);
    group.rotation.set(0, -Math.PI / 2 + 0.1, -0.2);
    group.position.set(0.25, -0.35, -1.05);
    scene.group.add(group);
    const geometry = (
      await loadGeometry("assets/geometry/story/wander/saint-pose-3.bin")
    ).geometry;
    const params = {
      ...characterTextures,
      uLinesTile: 5.5,
      uLightDir: new THREE.Vector3(0, 0.5, 2).normalize(),
      uLinesAxis: new THREE.Vector3(1, 0, 0.3).normalize(),
      uLinesAngle: -0.4,
      uThreshold: new THREE.Vector2(0.4, 1.8),
      uBreathe: new THREE.Vector3(-0.2, 0.3, 1),
      uWindAxisAngle: new THREE.Vector4(0, 1, 0, 0),
      uWindParams: new THREE.Vector3(0, 1, 1),
      uColor: new THREE.Vector3(0.94510, 0.92549, 0.88235),
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
      scene.uniform("border", "uPadX", mobile ? 0.1 : 0.75);
      scene.uniform("border", "uPadY", 0.375);
      scene.uniform("border", "uSkewCorrection", 0.085);
      scene.uniform("border", "uDepthSkew", 0.75);
      scene.uniform("border", "uFixedWidth", mobile ? 0 : 1);
    };
  }
  if (scene.name === "ApproachScene") {
    const root = new THREE.Group();
    const moonRoot = new THREE.Group();
    for (const name of [
      "portal",
      "background",
      "landscape",
      "steps",
      "structure",
      "stepsclose",
      "character",
      "charshadow",
    ])
      if (layers[name]) root.add(layers[name]);
    if (layers.moonRoot) moonRoot.add(layers.moonRoot);
    scene.group.add(root, moonRoot);
    let stepsCloseOutline:
      THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial> | undefined;
    for (const name of ["landscape", "steps", "stepsclose", "structure"])
      if (scene.mesh(name)?.visible) {
        const inverse = outline(
          scene,
          scene.mesh(name),
          "StaticObjectBaseShaderInverse",
          0.0025,
        );
        if (name === "stepsclose") stepsCloseOutline = inverse;
      }
    outline(
      scene,
      scene.mesh("character"),
      "StaticCharacterBaseShaderInverse",
      0.008,
    );
    const wind = await windLines(
      scene,
      "assets/geometry/story/approach/portal-wind-curves.json",
      { uThreshold: 0.84, uSpeed: 1, uTile: 2, uFrameRate: 18 },
    );
    root.add(wind);
    const stepsClose = scene.mesh("stepsclose"),
      hiddenPosition = new THREE.Vector3(-0.437, 1 - 2.49, 0.138),
      shownPosition = new THREE.Vector3(-0.437, -2.49, 0.138);
    scene.uniform("border", "uTransition", 0);
    stepsClose.scale.setScalar(0);
    stepsClose.position.copy(hiddenPosition);
    stepsCloseOutline?.scale.setScalar(0);
    stepsCloseOutline?.position.copy(hiddenPosition);
    if (stepsCloseOutline) stepsCloseOutline.visible = false;
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
      for (const mesh of [stepsClose, stepsCloseOutline]) {
        if (!mesh) continue;
        gsap.to(mesh.scale, {
          x: 0.8,
          y: 0.768,
          z: 1,
          duration: 0.5,
          delay: 0.5,
          ease: "power2.out",
        });
        gsap.to(mesh.position, {
          x: shownPosition.x,
          y: shownPosition.y,
          z: shownPosition.z,
          duration: 0.5,
          delay: 0.5,
          ease: "power2.out",
        });
      }
    };
    scene.onResize = (w, h) => {
      const mobile = w / h < 1;
      moonRoot.scale.setScalar(mobile ? 0.75 : 1);
      moonRoot.position.set(mobile ? -0.9 : 0.3, mobile ? 0.25 : 0.4, 0);
      root.rotation.set(mobile ? 0.05 : 0, mobile ? 0.2 : 0, 0);
      root.position.set(mobile ? 1.6 : 0, mobile ? -0.5 : 0, 0);
      scene.uniform("border", "uPadX", range(w, 1600, 393, 0.18, 0.08));
      scene.uniform("border", "uPadY", range(w, 1600, 393, 0.18, 0.08));
      scene.mesh("background").scale.y = mobile ? 142 : 140;
      wind.position.y = -scene.height * 0.5 + 0.6;
      stepsClose.visible = w >= 1600;
      if (stepsCloseOutline) stepsCloseOutline.visible = w >= 1600;
    };
  }
  if (scene.name === "NearScene") {
    const root = new THREE.Group();
    const group = new THREE.Group();
    for (const name of [
      "structure_shadow1",
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
