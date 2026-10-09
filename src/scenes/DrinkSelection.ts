import * as THREE from "three";
import gsap from "gsap";
import { SceneSection } from "../engine/SceneSection";
import { outline } from "../engine/outline";
import { CurveParticles } from "../engine/CurveParticles";
import { windLines } from "../engine/WindLines";
import { range } from "../data/sections";
import layoutJson from "../data/scene-layouts.json";
import {
  addLightShafts,
  addMotes,
  addSunHalo,
  LIGHT,
  PAPER,
  skyTone,
} from "./Atmosphere";
const fullTurn = Math.PI * 2;
function nextRotation(current: number) {
  const delta = ((current % fullTurn) + fullTurn) % fullTurn,
    toAlignment = fullTurn - delta;
  return current + toAlignment + (toAlignment < 0.75 * fullTurn ? fullTurn : 0);
}
export async function setupDrinkSelection(section: SceneSection) {
  if (section.name !== "DrinkSelectionScene") return;
  section.control = { label: "CHOOSE\nA TIDE", mode: "choose", hovered: false };
  const layout = Object.values(layoutJson.DrinkSelectionScene) as any[];
  const bottles = Array.from({ length: 3 }, (_, i) => {
    const n = i + 1,
      bottle = section.mesh("bottle" + n),
      group = section.layers["bottle" + n + "Group"],
      root = new THREE.Group(),
      transform = new THREE.Group(),
      rotation = new THREE.Group();
    root.add(transform);
    transform.add(rotation);
    rotation.add(bottle);
    section.group.add(root);
    root.position.copy(group.position);
    root.scale.setScalar(1.15);
    outline(section, bottle, "StaticObjectBaseShaderInverse", 0.003, rotation);
    const hit = new THREE.Mesh(
      new THREE.PlaneGeometry(),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    );
    section.transform(
      hit,
      layout.find((x) => x.name === "hit" + n),
    );
    hit.visible = false;
    group.add(hit);
    const shadow = section.mesh("shadow" + n);
    return {
      bottle,
      group,
      root,
      transform,
      rotation,
      hit,
      shadow,
      shadowScale: shadow.scale.x,
      start: root.position.clone(),
      state: { hover: 0, rotation: 0, offset: 0, progress: 2 },
      magnet: new THREE.Vector2(),
      uv: new THREE.Vector2(0.5, 0.5),
      lines: [] as {
        mesh: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>;
        scroll: number;
      }[],
    };
  });
  for (const name of [
    "landscape",
    "foregroundplinth",
    "backgroundplinth",
    "structure",
    "plinth_bottle1",
    "plinth_bottle2",
    "plinth_bottle3",
  ])
    outline(
      section,
      section.mesh(name),
      "StaticObjectBaseShaderInverse",
      0.003,
      section.group,
    );
  outline(
    section,
    section.mesh("character"),
    "StaticCharacterBaseShaderInverse",
    0.008,
    section.group,
  );
  // The grotto's light gathers on the shell altar: the vault deepens to ochre overhead, a shaft
  // falls on the pendants, they glow in a halftone halo, and motes drift about them.
  skyTone(section, "background", {
    shadeAmount: 0.55,
    shadeRange: [0.4, 0.78],
    dotSize: 5,
  });
  const shaft = addLightShafts(section, section.group, {
    count: 1,
    width: 0.2,
    alpha: 0.26,
    dots: 0.7,
    seed: 8,
  });
  shaft.position.set(0.55, 2.6, -6.5);
  shaft.rotation.z = -0.22;
  shaft.scale.set(4.5, 7, 1);
  addSunHalo(section, section.group, [-0.11, 0.72, -5.1], {
    radius: 0.42,
    extent: 4.5,
    rays: 44,
    rayLength: [1.6, 2.4],
    rayWidth: 0.1,
    rayColor: LIGHT,
    rayAlpha: 0.9,
    rings: 0,
    glow: 3.9,
    glowColor: LIGHT,
    dotSize: 4,
    seed: 6,
  });
  addMotes(section, section.group, {
    count: 45,
    min: [-2.6, -0.9, -6],
    max: [2.6, 3.2, -2.6],
    velocity: [0.03, 0.05, 0],
    size: [0.012, 0.03],
    wobble: 0.06,
    color: PAPER,
    seed: 19,
  });
  const curves = (radius: number) => ({
    curves: [
      {
        position: Array.from({ length: 128 }, (_, i) => {
          const t = i / 127;
          return [
            Math.cos(t * fullTurn) * radius,
            t * 1.4,
            Math.sin(t * fullTurn) * radius,
          ];
        }).flat(),
      },
    ],
  });
  for (const bottle of bottles) {
    for (let i = 0; i < 4; i++) {
      const scroll = i === 1 ? 1.35 : 1.65,
        speed = i === 0 || i === 3 ? 0.5 : 0.25,
        tile = i === 0 || i === 3 ? 10 : 5;
      const mesh = await windLines(
        section,
        curves(i % 2 ? -0.4 : 0.4),
        {
          uScroll: scroll,
          uThreshold: 0.4,
          uSpeed: speed,
          uTile: tile,
          uFrameRate: 60,
          uThickness: 0.0075,
          uAnimate: 2,
        },
        "DrinkLineShader",
      );
      mesh.position.y = i < 2 ? 0.4 : 0.2;
      bottle.group.add(mesh);
      mesh.material.uniforms.uAnimate = {
        get value() {
          return bottle.state.progress;
        },
        set value(v: number) {
          bottle.state.progress = v;
        },
      };
      bottle.lines.push({ mesh, scroll });
    }
  }
  section.disposables.push(() =>
    bottles.forEach((b) => gsap.killTweensOf(b.state)),
  );
  const blobs = bottles.map(
    (b, i) =>
      new CurveParticles("DrinkBlobParticles", section, b.group, 11.7425 + i),
  );
  const blobCurve = new THREE.CatmullRomCurve3(
    Array.from({ length: 6 }, (_, i) => {
      const t = i / 5;
      return new THREE.Vector3(
        Math.cos(t * fullTurn) * 0.4,
        t * 1.4 + 0.4,
        Math.sin(t * fullTurn) * 0.4,
      );
    }),
  );
  blobs[0].setCurve(blobCurve);
  blobs[1].shareCurve(blobs[0]);
  blobs[2].shareCurve(blobs[0]);
  blobs.forEach((b, i) =>
    b.setColor(bottles[i].bottle.material.uniforms.uColorHighlight.value),
  );
  let selected = -1,
    hover = -1,
    started = -1,
    canInteract = false,
    frameTime = 0;
  function rotate(index: number, timeMul = 1) {
    const s = bottles[index].state,
      total = s.rotation + s.offset;
    s.offset = 0;
    s.rotation = total;
    gsap.to(s, {
      rotation: nextRotation(total),
      duration: 0.8 * timeMul,
      ease: "power2.out",
      overwrite: "auto",
    });
  }
  function select(index: number, timeMul = 1) {
    if (selected !== index) {
      blobs.forEach((b, i) => (i === index ? b.start() : b.stop()));
      rotate(index, timeMul);
      if (selected >= 0) rotate(selected, timeMul);
      for (let i = 0; i < 3; i++) {
        const state = bottles[i].state;
        if (i === index) {
          state.progress = 0;
          gsap.to(state, {
            progress: 1,
            duration: 0.6 * timeMul,
            ease: "power2.out",
            overwrite: "auto",
          });
        } else
          gsap.to(state, {
            progress: 2,
            duration: 1.2 * timeMul,
            ease: "power2.out",
            overwrite: "auto",
          });
        gsap.to(state, {
          hover: i === index ? 1 : 0,
          duration: 0.6 * timeMul,
          ease: "power2.out",
          overwrite: "auto",
        });
      }
    }
    selected = index;
    section.onSelect(index);
    section.control!.hovered = false;
  }
  section.onPointerClick = () => {
    if (canInteract && hover >= 0) {
      if (selected !== hover) section.onAudio("bottle_interact");
      select(hover);
    }
  };
  const raycaster = new THREE.Raycaster(),
    world = new THREE.Vector3();
  let pointerSamplePending = false,
    pointerSampleHit = -1;
  const samplePointer = (event: PointerEvent) => {
    if (!section.group.visible) {
      pointerSamplePending = false;
      pointerSampleHit = -1;
      return;
    }
    if (
      (event.target as Element | null)?.closest?.(
        "button,a,nav,.hit,.prevent_interaction3d",
      )
    )
      return;
    pointerSamplePending = true;
  };
  const releasePointer = (event: PointerEvent) => {
    if (event.type === "pointercancel" || event.pointerType !== "mouse") {
      pointerSamplePending = false;
      pointerSampleHit = -1;
    }
  };
  window.addEventListener("pointermove", samplePointer);
  window.addEventListener("pointerdown", samplePointer);
  window.addEventListener("pointerup", releasePointer);
  window.addEventListener("pointercancel", releasePointer);
  section.disposables.push(() => {
    window.removeEventListener("pointermove", samplePointer);
    window.removeEventListener("pointerdown", samplePointer);
    window.removeEventListener("pointerup", releasePointer);
    window.removeEventListener("pointercancel", releasePointer);
  });
  section.animate = (frame) => {
    frameTime = frame.time;
    const dt = frame.delta * 60;
    if (started < 0 && frame.time > 0) {
      bottles[0].bottle.getWorldPosition(world).project(frame.camera);
      if (world.y < 1 && world.y > -1) started = frameTime;
    }
    if (started >= 0 && selected < 0 && frameTime - started >= 0.4)
      // Source starts with Orange; subsequent HMR must preserve the reader's choice.
      select(frame.selected, 4);
    canInteract = started >= 0 && frameTime - started >= 0.8;
    if (canInteract && frame.selected !== selected) select(frame.selected);
    raycaster.setFromCamera(frame.pointer, frame.camera);
    section.group.updateMatrixWorld(true);
    const colliders = [
      ...bottles.map((b) => b.hit),
      section.mesh("foregroundplinth"),
    ];
    const hit = raycaster.intersectObjects(colliders, false)[0],
      index = hit ? bottles.findIndex((b) => b.hit === hit.object) : -1;
    // GLUICursor polls hover through its plinth collider, but Interaction3D's
    // onMove records UV only on pointer input. Scroll must not drag bottles.
    if (pointerSamplePending) {
      pointerSamplePending = false;
      const pointerHit = raycaster.intersectObjects(
        bottles.map((b) => b.hit),
        false,
      )[0];
      const pointerIndex = pointerHit
        ? bottles.findIndex((b) => b.hit === pointerHit.object)
        : -1;
      if (
        canInteract &&
        pointerIndex >= 0 &&
        pointerIndex === pointerSampleHit &&
        pointerHit?.uv
      )
        bottles[pointerIndex].uv.copy(pointerHit.uv);
      pointerSampleHit = pointerIndex;
    }
    if (index !== hover && canInteract) {
      if (hover >= 0 && hover !== selected) rotate(hover);
      if (index >= 0) {
        rotate(index);
        section.onAudio("bottle_hover", 1, true);
      }
      hover = index;
      for (let i = 0; i < 3; i++)
        gsap.to(bottles[i].state, {
          hover: i === selected || i === hover ? 1 : 0,
          duration: index >= 0 ? 0.8 : 0.6,
          ease: "power2.out",
          overwrite: "auto",
        });
    }
    section.control!.hovered = canInteract && hover >= 0 && hover !== selected;
    const y = 0.05 * Math.sin(frameTime) + 0.2,
      shadowNear = range(y, 0, 0.2, 1, 1.2, false);
    for (const b of bottles) {
      b.state.offset += 0.01 * b.state.hover * dt;
      b.magnet.x +=
        ((b.uv.x * 2 - 1) * 0.1 - b.magnet.x) * (1 - Math.pow(0.95, dt));
      b.magnet.y +=
        ((b.uv.y * 2 - 1) * 0.1 - b.magnet.y) * (1 - Math.pow(0.95, dt));
      b.transform.position.set(b.magnet.x, y * b.state.hover + b.magnet.y, 0);
      b.rotation.rotation.y = b.state.rotation + b.state.offset;
      b.transform.rotation.z = 0.05 * Math.cos(frameTime) * b.state.hover;
      b.shadow.scale.x = b.shadow.scale.y = THREE.MathUtils.lerp(
        b.shadowScale,
        b.shadowScale * shadowNear,
        b.state.hover,
      );
      b.shadow.material.uniforms.uLinesStrength.value = THREE.MathUtils.lerp(
        0.6,
        0.55,
        b.state.hover,
      );
      for (const line of b.lines)
        line.mesh.material.uniforms.uScroll.value = line.scroll;
    }
  };
  section.onResize = (w, h) => {
    const mobile = w / h < 1,
      pad = range(w, 1600, 393, 0.18, 0.08);
    section.uniform("border", "uPadX", pad);
    section.uniform("border", "uPadY", pad);
    bottles.forEach((b, i) => {
      b.root.scale.setScalar(mobile ? 0.85 : 1.15);
      b.group.scale.setScalar(mobile ? 0.7 : 1);
      b.root.position.x = b.group.position.x =
        b.start.x + (mobile ? (i === 0 ? 0.3 : i === 2 ? -0.3 : 0) : 0);
    });
  };
}
