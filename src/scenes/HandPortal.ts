import * as THREE from "three";
import { SceneSection, type Frame } from "../engine/SceneSection";
import { loadGeometry, texture } from "../engine/assets";
import { material, fragmentMaterial } from "../engine/shaders";
import { SkeletalMesh } from "../engine/SkeletalMesh";
import { WiggleBoneSpring } from "../engine/WiggleBoneSpring";
import { cnoise2d } from "../engine/noise";
import { isMobileDevice } from "../engine/device";
import { clamp, range, worldHeight } from "../data/sections";
/** Original arm skeleton, portal information pass and 256-square finite difference water solver. */
export async function setupHand(section: SceneSection) {
  const pivot = section.layers.pivotGroup,
    character = section.layers.characterGroup;
  const hand = new SkeletalMesh(
    await loadGeometry("assets/geometry/story/hand/arm-skin.bin"),
    "SkinHandShader",
    {
      tTrim: texture("assets/images/story/chaewon/trim.png"),
      tLines: texture("assets/images/story/lines.jpg"),
      tNoise: texture("assets/images/story/perlin.png"),
      uLinesTile: 12,
      uColor: new THREE.Vector3(0.9451, 0.92549, 0.88235),
      uLightDir: new THREE.Vector3(-1.5, 0.5, 2),
      uAxis: new THREE.Vector3(0.1, -0.5, 0),
      uAngle: 1.5,
      uPortalPlane: new THREE.Vector4(0, 0, 1, -1.4),
      uPortalFeather: 0.005,
      uDiscard: new THREE.Vector2(1, 0),
    },
    "InverseSkinHandShader",
  );
  await hand.loadAnimation("assets/geometry/story/hand/arm.bin");
  const fingers = hand.bones.filter((bone) =>
    [
      "pinky2",
      "middle2",
      "index2",
      "ring2",
      "pinky3",
      "middle3",
      "index3",
      "ring3",
      "thumb2",
      "thumb3",
    ].includes(bone.name),
  );
  const wrists = hand.bones.slice(2, 4);
  const arm = hand.bones.find((bone) => bone.name.startsWith("arm_lower"))!;
  const springs = hand.bones
    .filter(
      (bone) =>
        bone.name.startsWith("sleeve_wiggle") ||
        bone.name.startsWith("hand_bone_parent"),
    )
    .map((bone) => new WiggleBoneSpring(bone));
  character.add(hand.mesh, hand.outline);
  hand.mesh.visible = hand.outline.visible = false;
  const colorScene = new THREE.Scene(),
    infoScene = new THREE.Scene(),
    quadScene = new THREE.Scene(),
    quadCamera = new THREE.Camera();
  const clones = [hand.mesh, hand.outline].map((source) => {
    const color = new THREE.Mesh(source.geometry, source.material);
    color.matrixAutoUpdate = false;
    color.frustumCulled = false;
    colorScene.add(color);
    // Preserve RGB behind the portal (alpha zero): the inverse pass reads it.
    (color.material as THREE.RawShaderMaterial).transparent = false;
    const infoMat = material(
      (source.material as THREE.Material).name,
      {},
      false,
      "HandInfo",
    );
    infoMat.uniforms = (source.material as THREE.RawShaderMaterial).uniforms;
    infoMat.side = (source.material as THREE.Material).side;
    infoMat.transparent = false;
    const info = new THREE.Mesh(source.geometry, infoMat);
    info.matrixAutoUpdate = false;
    info.frustumCulled = false;
    infoScene.add(info);
    return { source, color, info };
  });
  const colorRT = new THREE.WebGLRenderTarget(1, 1),
    infoRT = new THREE.WebGLRenderTarget(1, 1);
  const inverseColorRT = new THREE.WebGLRenderTarget(1, 1),
    inverseInfoRT = new THREE.WebGLRenderTarget(1, 1),
    inverseOutputRT = new THREE.WebGLRenderTarget(1, 1);
  // The reverse view inherits BaseCamera's 30-degree FOV, not Story's 35.
  const inverseCamera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000);
  let read = new THREE.WebGLRenderTarget(256, 256, {
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
    }),
    write = read.clone();
  const compute = fragmentMaterial(
    "InteractiveWaterHeightmap.fs",
    {
      heightmap: { value: read.texture },
      tHand: { value: infoRT.texture },
      resolution: { value: new THREE.Vector2(256, 256) },
      uScroll: { value: 0 },
      viscosityConstant: { value: 0.98 },
      WIDTH: { value: 256 },
    },
    "uniform sampler2D heightmap;\n",
  );
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compute));
  const water = section.addMesh(
    new THREE.PlaneGeometry(),
    material("WaterHandShader", {
      heightmap: read.texture,
      tHand: infoRT.texture,
      uFixed: 0,
    }),
  );
  water.material.transparent = false;
  water.position.z = isMobileDevice ? -0.25 : 0;
  const inversePass = fragmentMaterial("InverseHandPass.fs", {
    ...water.material.uniforms,
    tDiffuse: { value: inverseColorRT.texture },
    tHand: { value: inverseInfoRT.texture },
    tHeightmap: { value: read.texture },
    resolution: { value: new THREE.Vector2(320, 180) },
  });
  const inversePassScene = new THREE.Scene();
  inversePassScene.add(
    new THREE.Mesh(new THREE.PlaneGeometry(2, 2), inversePass),
  );
  const inset = section.addMesh(
    new THREE.PlaneGeometry(),
    material("FloatingFrameHandShader", {
      tMap: inverseOutputRT.texture,
      tNoise: texture("assets/images/story/perlin.png"),
      uBorderWidth: 0.013,
      uDPR: 1,
      uAspectRatio: 1,
    }),
  );
  inset.renderOrder = 1000;
  inset.position.z = 0.5;
  inset.material.transparent = true;
  const output = section.addMesh(
    new THREE.PlaneGeometry(2, 2),
    material("HandOutputRender", { tMap: colorRT.texture }),
  );
  output.material.transparent = true;
  output.material.depthTest = false;
  output.material.depthWrite = false;
  output.renderOrder = 100;
  const previousPivot = new THREE.Vector3();
  let boneX = 0,
    boneY = 0,
    contact = 0;
  const start = character.position.clone(),
    end = start.clone();
  end.y = -0.05;
  const position = new THREE.Vector3();
  let progress = 0,
    lastWaterTime = -Infinity,
    lastSize = "",
    initialized = false;
  section.onResize = (w, h) => {
    water.scale.set(((worldHeight * w) / h) * 1.05, worldHeight * 1.05, 1);
    water.position.y = (section.height - worldHeight) / 2;
    section.uniform("border", "uPadX", -1);
    section.uniform("border", "uPadY", 0.1);
    section.uniform("border", "uFluidEdge", new THREE.Vector4());
    const frameScale = w / h < 1 ? 1 : 1.5,
      fw = frameScale * Math.min(1, w / h),
      fh = frameScale * Math.min(1, h / w);
    inset.scale.set(fw, fh, 1);
    inset.position.set(
      (-worldHeight * w) / h / 2 + fw / 2 + (w / h < 1 ? 0.2 : 0.3),
      section.height / 2 - fh / 2 - worldHeight + fh + 0.3,
      0.5,
    );
    inset.material.uniforms.uAspectRatio.value = fw / fh;
    inset.visible = !isMobileDevice;
  };
  section.animate = (frame: Frame) => {
    const mobile = isMobileDevice,
      down = frame.pressed;
    progress +=
      (Number(down) - progress) * (1 - Math.pow(0.95, frame.delta * 60));
    end.x = start.x + (mobile ? 0.5 : 0);
    character.position.copy(start).lerp(end, progress);
    const mx =
      mobile && !down
        ? 0.5
        : range(
            frame.pointer.x * 0.5 + 0.5,
            0,
            1,
            down ? (mobile ? 0 : 0.65) : 0.2,
            down ? (mobile ? 1 : 0.75) : 1,
          );
    const my =
      mobile && !down
        ? 0.5
        : range(
            0.5 - frame.pointer.y * 0.5,
            0,
            1,
            down ? (mobile ? 0.05 : 0.1) : 0.2,
            down ? (mobile ? 1 : 0.6) : 0.9,
          );
    const distance = range(progress, 0, 1, mobile ? 3 : 2.5, mobile ? 4 : 3.5),
      xm = mobile ? 0.88 : 0.8,
      ym = mobile ? 0.7 : 0.6;
    position
      .set((mx * xm + 1 - xm) * 2 - 1, 1 - (my * ym + 1 - ym) * 2, 0)
      .unproject(frame.camera)
      .sub(frame.camera.position)
      .normalize()
      .multiplyScalar(distance)
      .add(frame.camera.position);
    section.group.worldToLocal(position);
    if (mobile) position.x += 0.15;
    pivot.position.lerp(position, mobile ? 0.2 : 0.3);
    pivot.rotation.y = THREE.MathUtils.degToRad(
      range(progress, 0, 1, mobile ? 10 : 0, -30),
    );
    pivot.rotation.z = THREE.MathUtils.degToRad(
      range(progress, 0, 1, mobile ? -30 : -40, mobile ? -40 : 0),
    );
    const nextBoneX =
        boneX +
        ((down && !mobile ? 0.2 - frame.pointer.x * 0.8 : 0) - boneX) * 0.07,
      deltaX = nextBoneX - boneX;
    boneX = nextBoneX;
    // The source's wrist/finger modifier reads the desktop cursor, even on phones.
    const boneDown = down && !mobile;
    boneY += ((boneDown ? 0.2 + frame.pointer.y * 0.2 : 0) - boneY) * 0.04;
    springs.forEach((spring) => spring.update(frame.delta * 1000));
    hand.update(
      0,
      range(1 - Math.cos((progress * Math.PI) / 2), 0, 1, 25, 55),
      () => {
        arm.rotation.y += boneX;
        arm.rotation.x += boneY;
        const now = performance.now();
        const fingerNoise = cnoise2d(now * 0.0006) * 0.15;
        const wristNoise = cnoise2d(now * 0.0001) * 0.1;
        fingers.forEach((bone) => {
          bone.rotation.x += fingerNoise;
        });
        wrists.forEach((bone) => {
          bone.rotation.y += wristNoise;
          bone.rotation.z += wristNoise;
        });
      },
    );
    contact += ((down ? range(boneX, 0.25, 0.2, 0, 1) : 0) - contact) * 0.05;
    const velocity = mobile
      ? range(pivot.position.distanceTo(previousPivot), 0, 0.2, 0, 1)
      : range(Math.abs(deltaX), 0, 0.05, 0, 1);
    previousPivot.copy(pivot.position);
    section.audioState.contact = contact;
    section.audioState.frequency = range(velocity, 0, 1, 200, 12000) * contact;
    const scrollTop = (frame.scroll / frame.height) * worldHeight,
      limitTop = section.top,
      limitBottom = section.top + section.height - worldHeight;
    const discard = (hand.mesh.material as THREE.RawShaderMaterial).uniforms
      .uDiscard.value as THREE.Vector2;
    discard.set(
      (section.top + section.height - scrollTop) / worldHeight,
      (section.top - scrollTop) / worldHeight,
    );
    const sticky = -clamp(
      scrollTop - limitTop,
      0,
      section.height - worldHeight,
    );
    water.position.y = (section.height - worldHeight) / 2 + sticky;
    const scrollAmount =
      scrollTop < limitTop
        ? limitTop - scrollTop
        : scrollTop > limitBottom
          ? limitBottom - scrollTop
          : 0;
    const parallax = worldHeight * (1 + (1 - (5 - 1.4) / 5) / 2);
    const scroll = range(scrollAmount, -parallax, parallax, -1, 1, false);
    inset.position.y =
      section.height / 2 -
      inset.scale.y / 2 -
      worldHeight +
      inset.scale.y +
      0.3 +
      sticky;
    compute.uniforms.uScroll.value = scroll;
    water.material.uniforms.uScroll.value = scroll;
    water.material.uniforms.uPageScroll.value = -scrollTop;
  };
  section.disposables.push(() => {
    for (const rt of [
      colorRT,
      infoRT,
      inverseColorRT,
      inverseInfoRT,
      inverseOutputRT,
      read,
      write,
    ])
      rt.dispose();
    for (const scene of [colorScene, infoScene, quadScene, inversePassScene])
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          object.material.dispose();
        }
      });
  });
  section.beforeRender.push((renderer, frame) => {
    const size = `${frame.width}:${frame.height}:${renderer.getPixelRatio()}`;
    if (size !== lastSize) {
      lastSize = size;
      colorRT.setSize(
        frame.width * renderer.getPixelRatio(),
        frame.height * renderer.getPixelRatio(),
      );
      infoRT.setSize(
        frame.width * renderer.getPixelRatio(),
        frame.height * renderer.getPixelRatio(),
      );
      inverseColorRT.setSize(frame.width * 0.25, frame.height * 0.25);
      inverseInfoRT.setSize(frame.width * 0.25, frame.height * 0.25);
      inverseOutputRT.setSize(frame.width * 0.25, frame.height * 0.25);
      inverseCamera.aspect = frame.width / frame.height;
      inverseCamera.updateProjectionMatrix();
      inversePass.uniforms.resolution.value.set(
        frame.width * 0.25,
        frame.height * 0.25,
      );
    }
    section.group.updateMatrixWorld(true);
    for (const clone of clones) {
      clone.color.matrix.copy(clone.source.matrixWorld);
      clone.info.matrix.copy(clone.source.matrixWorld);
    }
    const clear = new THREE.Color();
    renderer.getClearColor(clear);
    const alpha = renderer.getClearAlpha();
    if (!initialized) {
      initialized = true;
      renderer.setClearColor(0, 1);
      for (const target of [read, write]) {
        renderer.setRenderTarget(target);
        renderer.clear();
      }
    }
    renderer.setClearColor(0, 0);
    renderer.setRenderTarget(infoRT);
    renderer.render(infoScene, frame.camera);
    renderer.setRenderTarget(colorRT);
    renderer.render(colorScene, frame.camera);
    if (inset.visible) {
      const discard = (hand.mesh.material as THREE.RawShaderMaterial).uniforms
        .uDiscard.value as THREE.Vector2;
      const previousX = discard.x,
        previousY = discard.y;
      discard.set(1, 0);
      inverseCamera.position.set(
        0,
        (-frame.scroll / frame.height) * worldHeight,
        -2.8,
      );
      inverseCamera.lookAt(0, (-frame.scroll / frame.height) * worldHeight, 0);
      renderer.setRenderTarget(inverseInfoRT);
      renderer.render(infoScene, inverseCamera);
      renderer.setRenderTarget(inverseColorRT);
      renderer.render(colorScene, inverseCamera);
      inversePass.uniforms.tHeightmap.value = read.texture;
      inversePass.uniforms.uScroll.value = compute.uniforms.uScroll.value;
      renderer.setRenderTarget(inverseOutputRT);
      renderer.render(inversePassScene, quadCamera);
      discard.set(previousX, previousY);
    }
    // Render.start(loop, 60) gates by elapsed time, without catch-up substeps.
    if (frame.time - lastWaterTime >= 1 / 60) {
      lastWaterTime = frame.time;
      compute.uniforms.heightmap.value = read.texture;
      renderer.setRenderTarget(write);
      renderer.render(quadScene, quadCamera);
      [read, write] = [write, read];
    }
    water.material.uniforms.heightmap.value = read.texture;
    renderer.setClearColor(clear, alpha);
  });
}
