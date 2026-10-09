import * as THREE from "three";
import gsap from "gsap";
import { windLines } from "../engine/WindLines";
import { SceneSection } from "../engine/SceneSection";
import { outline } from "../engine/outline";
import { range, worldHeight } from "../data/sections";
import { SourceText } from "../engine/SourceText";
import { tideColor } from "../data/theme";
import {
  addGulls,
  addLightShafts,
  addMotes,
  addSunHalo,
  AMBER,
  INK,
  LIGHT,
  PAPER,
  skyTone,
  SUN,
} from "./Atmosphere";

/** Recovered TargetScene, TransitionScene and CathedralScene scene graph and responsive rules. */
export async function setupArchitecture(section: SceneSection) {
  if (section.name === "TargetScene") {
    const root = new THREE.Group();
    section.group.add(root);
    for (const name of ["floor", "structure", "character"])
      root.add(section.layers[name]);
    outline(
      section,
      section.mesh("structure"),
      "StaticObjectBaseShaderInverse",
      0.005,
      root,
    );
    section.onResize = (w, h) => {
      root.scale.setScalar(w / h < 1 ? 0.6 : 1);
      const cutout = range(w / h, 0.591, 2, 0.18, 0.5, false);
      for (const name of ["character", "portal"])
        section.uniform(name, "uCutout", cutout);
    };
    section.animate = () =>
      section.uniform("border", "uProgress", section.progress || 1);
  }
  if (section.name === "TransitionScene") {
    const background = section.mesh("background");
    background.material.transparent = true;
    background.material.depthTest = false;
    background.material.depthWrite = false;
    background.renderOrder = 100000;
    section.onResize = (w, h) =>
      background.scale.set(((worldHeight * w) / h) * 2, section.height, 1);
  }
  if (section.name === "CathedralScene") {
    const root = new THREE.Group();
    root.name = "cathedralRoot";
    section.group.add(root);
    for (const name of [
      "structure",
      "background",
      "floor",
      "table",
      "bottle1",
      "bottle2",
      "bottle3",
      "character",
      "background_floor",
    ])
      root.add(section.layers[name]);
    const outlines: THREE.Mesh[] = [];
    for (const name of ["structure", "table", "bottle1", "bottle2", "bottle3"]) {
      const inverse = outline(
        section,
        section.mesh(name),
        "StaticObjectBaseShaderInverse",
        name.startsWith("bottle") ? 0.003 : 0.009,
        root,
      );
      if (name.startsWith("bottle")) outlines.push(inverse);
    }
    // Golden light falls through openings high in the vault, in shafts down the aisle to the
    // tide pools before the altar; motes drift through it, and the pendants glow on their shell.
    const shafts = addLightShafts(section, root, {
      count: 2,
      width: 0.15,
      alpha: 0.3,
      dots: 0.75,
      dotSize: 5,
      seed: 4,
    });
    shafts.position.set(0.3, 1.2, -17.5);
    shafts.rotation.z = -0.26;
    shafts.scale.set(6.5, 15, 1);
    addSunHalo(section, root, [0, -5.25, -21.9], {
      radius: 0.75,
      extent: 4,
      rays: 48,
      rayLength: [1.5, 2.2],
      rayWidth: 0.1,
      rayColor: LIGHT,
      rayAlpha: 0.9,
      rings: 0,
      glow: 3.6,
      glowColor: LIGHT,
      dotSize: 4,
      seed: 2,
    });
    addMotes(section, root, {
      count: 80,
      min: [-3, -6.1, -20.5],
      max: [3, 2.5, -8],
      velocity: [0.04, -0.05, 0],
      size: [0.025, 0.06],
      wobble: 0.1,
      color: PAPER,
      seed: 12,
    });
    // The three pendants turn slowly above the shell, each at its own pace.
    const pendants = ["bottle1", "bottle2", "bottle3"].map((name) =>
      section.mesh(name),
    );
    const baseY = pendants.map((pendant) => pendant.position.y);
    section.animate = (frame) => {
      const t = frame.time;
      pendants.forEach((pendant, i) => {
        pendant.rotation.y = t * (0.35 + 0.12 * i) + i * 2.1;
        pendant.position.y = baseY[i] + 0.035 * Math.sin(t * 0.9 + i * 1.7);
      });
      outlines.forEach((mesh, i) => {
        mesh.rotation.y = pendants[i].rotation.y;
        mesh.position.y = pendants[i].position.y;
      });
    };
    const character = section.layers.character,
      position = character.position.clone(),
      scale = character.scale.clone();
    section.onResize = (w) => {
      character.position.x = range(w, 1600, 393, position.x, -0.7);
      character.scale.setScalar(range(w, 1600, 393, scale.x, scale.x * 0.9));
    };
  }

  if (section.name === "PillarCrumbleScene") {
    const root = new THREE.Group();
    section.group.add(root);
    for (const name of ["column1", "column2", "background"])
      root.add(section.layers[name]);
    const columns = ["column1", "column2"].map((name) => section.mesh(name));
    for (const column of columns)
      if (column.visible)
        outline(section, column, "PillarFractureShaderInverse", 0.0005, root);
    const wind = await windLines(
      section,
      "assets/geometry/story/pillarcrumble/wind-curves.json",
      {
        uThreshold: 0.78,
        uSpeed: 1,
        uThickness: 0.35,
        uColor: new THREE.Vector3(18 / 255, 18 / 255, 18 / 255),
      },
      "WindDustShader",
    );
    wind.position.set(-0.25, 0, -1.9);
    root.add(wind);
    // The grotto breaks open onto the sky: light pours in from above, clouds show through, and
    // chips of basalt float up from the cracks.
    skyTone(section, "background", {
      light: LIGHT,
      glowCenter: [0.58, 0.82],
      glowRadius: [0.12, 0.42],
      glow: 0.85,
      shadeAmount: 0.45,
      shadeRange: [0.62, 0.95],
      clouds: 1,
      cloudColor: PAPER,
      cloudBand: [0.3, 0.5, 12, 0.003],
      dotSize: 5,
    });
    addMotes(section, root, {
      count: 40,
      min: [-2.6, -3.2, -3.2],
      max: [3.2, 3.2, -0.6],
      velocity: [0.04, 0.16, 0],
      size: [0.012, 0.035],
      wobble: 0.07,
      color: INK,
      seed: 37,
    });
    const mouse = [new THREE.Vector3(), new THREE.Vector3()],
      position = new THREE.Vector3();
    section.animate = (frame) => {
      columns.forEach((column, i) => {
        position
          .set(frame.pointer.x, frame.pointer.y, 0.5)
          .unproject(frame.camera)
          .sub(frame.camera.position)
          .normalize()
          .multiplyScalar((i ? 6.5 : 8) - root.position.z)
          .add(frame.camera.position);
        mouse[i].lerp(position, 1 - Math.pow(0.95, frame.delta * 60));
        column.material.uniforms.uMouse.value.copy(mouse[i]);
      });
    };
    section.onResize = (w, h) => {
      const mobile = w / h < 1,
        pad = range(w, 1600, 393, 0.18, 0.08);
      section.uniform("border", "uPadX", pad);
      section.uniform("border", "uPadY", pad);
      root.position.set(mobile ? 0.3 : 0, 0, mobile ? -1.6 : 0);
    };
  }
  if (section.name === "ColosseumScene") {
    const root = new THREE.Group();
    section.group.add(root);
    for (const name of [
      "structure",
      "foregroundrock",
      "steps",
      "character",
      "shadow",
      "rockshadow",
    ])
      root.add(section.layers[name]);
    for (const name of ["structure", "floatingrocks"]) {
      const layer = section.mesh(name);
      if (layer.visible)
        outline(
          section,
          layer,
          "StaticObjectBaseShaderInverse",
          0.0035,
          name === "structure" ? root : section.group,
        );
    }
    const character = section.mesh("character");
    // Turned from the source's back view to three-quarters, so her glance back over her shoulder meets
    // the reader.
    character.rotation.y = THREE.MathUtils.degToRad(235);
    outline(
      section,
      character,
      "StaticCharacterBaseShaderInverse",
      0.005,
      root,
    );
    // She stands on the still sea: rings of ripples spread from her feet.
    const ripples = await windLines(
      section,
      "assets/geometry/story/finale/ripples.json",
      { uThreshold: 0.35, uSpeed: 0.5, uTile: 2 },
    );
    root.add(ripples);
    const rocks = Array.from({ length: 6 }, (_, i) => {
      const mesh = section.mesh("floatingrock" + (i + 1)),
        parent = new THREE.Group();
      parent.add(mesh);
      section.group.add(parent);
      mesh.geometry.computeBoundingBox();
      return { mesh, parent, hover: false };
    });
    const wind = await windLines(
      section,
      "assets/geometry/story/common/wind-curves-3.json",
      {
        uThreshold: 0.78,
        uSpeed: 1,
        uThickness: 0.25,
        uColor: new THREE.Vector3(18 / 255, 18 / 255, 18 / 255),
      },
      "WindDustShader",
    );
    wind.position.y = -3.5;
    wind.renderOrder = 1000;
    // Golden hour on the open sea: the last sun sits low in the arch on the horizon, pale in a
    // halftone glow that lights the sky around it; the sky deepens to ochre overhead, clouds
    // drift along the horizon, gulls cross the water, and the road of light sparkles.
    const SEA = -4.133;
    addSunHalo(section, root, [-9.5, SEA + 0.62, -31.6], {
      radius: 0.95,
      extent: 5.5,
      disc: 1,
      discColor: AMBER,
      core: 1,
      coreColor: SUN,
      rays: 70,
      rayLength: [1.35, 3.6],
      rayWidth: 0.14,
      rayColor: PAPER,
      rings: 2,
      ringColor: PAPER,
      ringAlpha: 0.8,
      glow: 2.4,
      glowColor: LIGHT,
      dotSize: 5,
      seed: 3,
    });
    skyTone(section, "background", {
      light: LIGHT,
      glowCenter: [0.4475, 0.41],
      glowRadius: [0.055, 0.26],
      glow: 0.9,
      shadeAmount: 0.6,
      shadeRange: [0.6, 0.86],
      clouds: 1,
      cloudColor: PAPER,
      cloudBand: [0.43, 0.62, 8, 0.002],
      dotSize: 5,
    });
    addGulls(section, root, {
      center: [-2.5, 1.2, -20],
      box: [10, 0.9, 3],
      drift: [0.32, 0.01, 0],
      span: 0.5,
      color: INK,
      count: 5,
      seed: 31,
    });
    // Sparkles on the road of light: a box laid along the road from the arch toward her.
    const sparkles = addMotes(section, root, {
      count: 26,
      mode: "glint",
      shape: "star",
      min: [-1.6, SEA + 0.03, -14.5],
      max: [1.6, SEA + 0.03, 14.5],
      size: [0.07, 0.15],
      period: 1.3,
      spread: 1.8,
      color: PAPER,
      outline: 0.22,
      seed: 17,
    });
    sparkles.position.set(-5.8, 0, -17);
    sparkles.rotation.y = Math.atan2(7.4, 28);
    const capturedTitle = section.mesh("title");
    capturedTitle.visible = false;
    const title = (await SourceText.create("ColosseumScene", {
      id: 998,
      name: "trapnestColosseumTitle",
      uniforms: {},
    }))!;
    title.name = "trapnestColosseumTitle";
    title.position.set(0, capturedTitle.position.y, 0.15);
    title.material.depthTest = false;
    title.material.depthWrite = false;
    title.material.uniforms.uAlpha.value = 0;
    title.material.uniforms.uTransition.value = 0.0001;
    title.material.uniforms.uTranslate.value.set(0, 0.2, 0);
    section.group.add(title);
    section.meshes.push(title);
    title.renderOrder = 9991;
    let entered = false;
    const raycaster = new THREE.Raycaster(),
      box = new THREE.Box3(),
      point = new THREE.Vector3();
    section.animate = (frame) => {
      const trigger =
        section.pixelTop -
        frame.height +
        section.pixelHeight * (frame.width < 768 ? 0 : 0.25);
      if (!entered && frame.scroll >= trigger) {
        entered = true;
        title.material.uniforms.uAlpha.value = 1;
        gsap.to(title.material.uniforms.uTransition, {
          value: 1,
          duration: 2.5,
          ease: "sine.out",
        });
      }
      character.material.uniforms.uColor.value
        .set(tideColor(frame.selected))
        .convertLinearToSRGB();
      raycaster.setFromCamera(frame.pointer, frame.camera);
      section.group.updateMatrixWorld(true);
      for (const rock of rocks) {
        box
          .copy(rock.mesh.geometry.boundingBox!)
          .applyMatrix4(rock.mesh.matrixWorld);
        const hit = raycaster.ray.intersectBox(box, point) !== null;
        if (hit && !rock.hover) {
          const angle = rock.mesh.material.uniforms.uAngleAccum;
          gsap.to(angle, {
            value: angle.value + 3.14159,
            duration: 1,
            ease: "power2.out",
            overwrite: true,
          });
        }
        rock.hover = hit;
      }
    };
    section.onResize = (w, h) => {
      const mobile = w / h < 1;
      const titleWidth =
        title.geometry.boundingBox!.max.x - title.geometry.boundingBox!.min.x;
      const screenWidth = (worldHeight * w) / h;
      title.scale.setScalar(
        (Math.min(screenWidth * (mobile ? 0.82 : 0.68), 4.8) / titleWidth) *
          (mobile ? 0.9 : 1),
      );
      root.scale.setScalar(mobile ? 0.9 : 1);
      const size = new THREE.Box3()
        .setFromObject(root)
        .getSize(new THREE.Vector3());
      root.position.y = mobile ? -size.y * 0.1 : 0;
      const offsets = [
        [-0.2, -1.4],
        [-2.5, -0.3],
        [1, 0],
        [-1, 0],
        [0.5, 1.4],
        [0.8, 0],
      ];
      rocks.forEach((rock, i) => {
        rock.parent.position.set(
          range(w, 1600, 393, 0, offsets[i][0]),
          range(w, 1600, 393, 0, offsets[i][1]),
          0,
        );
        rock.parent.visible = true;
        if (i === 4) rock.parent.scale.setScalar(range(w, 1600, 393, 0.7, 1));
      });
    };
  }
}
