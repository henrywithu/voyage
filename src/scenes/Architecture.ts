import * as THREE from "three";
import gsap from "gsap";
import { windLines } from "../engine/WindLines";
import { SceneSection } from "../engine/SceneSection";
import { outline } from "../engine/outline";
import { range, worldHeight } from "../data/sections";
import { SourceText } from "../engine/SourceText";

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
      "structure_shadow",
    ])
      root.add(section.layers[name]);
    for (const name of ["structure", "table", "bottle1", "bottle2", "bottle3"])
      outline(
        section,
        section.mesh(name),
        "StaticObjectBaseShaderInverse",
        name.startsWith("bottle") ? 0.003 : 0.009,
        root,
      );
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
    outline(
      section,
      character,
      "StaticCharacterBaseShaderInverse",
      0.005,
      root,
    );
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
        .set(["#63c4f4", "#97f3ad", "#fbeb7f"][frame.selected])
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
