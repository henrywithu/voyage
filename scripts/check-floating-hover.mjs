import assert from "node:assert/strict";
import * as THREE from "three";
import gsap from "gsap";
import { FloatingFrameHover } from "../src/engine/FloatingFrameHover.ts";

const makePanel = (z) => {
  const material = new THREE.RawShaderMaterial({
    uniforms: { uHover: { value: 0 } },
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  panel.position.z = z;
  return panel;
};
const back = makePanel(-1),
  front = makePanel(0);
const hover = new FloatingFrameHover([back, front]);
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
camera.position.z = 5;
camera.updateMatrixWorld();
const settle = () => {
  for (const panel of [back, front])
    gsap
      .getTweensOf(panel.material.uniforms.uHover)
      .forEach((tween) => tween.progress(1));
};
const value = (panel) => panel.material.uniforms.uHover.value;
hover.request({ target: null });
hover.update(new THREE.Vector2(), camera);
settle();
assert.equal(value(front), 1, "nearest intersected panel receives hover");
assert.equal(value(back), 0);
hover.update(new THREE.Vector2(5, 5), camera);
assert.equal(value(front), 1, "scroll alone does not recompute source hover");
hover.request({ target: { closest: () => ({}) } });
hover.update(new THREE.Vector2(5, 5), camera);
settle();
assert.equal(value(front), 1, "UI controls preserve the source hover state");
hover.release({ type: "pointerup", pointerType: "mouse" });
settle();
assert.equal(value(front), 1, "mouse release preserves hover");
hover.release({ type: "pointercancel", pointerType: "mouse" });
settle();
assert.equal(value(front), 0, "cancel releases hover");
hover.request({ target: null });
hover.update(new THREE.Vector2(), camera);
settle();
hover.release({ type: "pointerup", pointerType: "touch" });
settle();
assert.equal(value(front), 0, "touch release clears hover");
hover.request({ target: null });
hover.update(new THREE.Vector2(), camera);
assert.equal(gsap.getTweensOf(front.material.uniforms.uHover).length, 1);
hover.dispose();
assert.equal(gsap.getTweensOf(front.material.uniforms.uHover).length, 0);
gsap.ticker.sleep();
console.log(
  "Verified floating-panel hit ordering, event gates, release and tween cleanup.",
);
