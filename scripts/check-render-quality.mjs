import assert from "node:assert/strict";
import { renderQuality } from "../src/engine/RenderQuality.ts";

// Expected values are from reference/modules/Tests.js and RenderManager.getDPR.
const base = {
  mobile: false,
  ios: false,
  pixelRatio: 2,
  width: 1280,
  height: 720,
};
const fixtures = [
  ["SwiftShader", 0, 1, 1.3, 0, false],
  ["Intel(R) UHD Graphics 620", 1, 1.2, 1.8, 0, false],
  ["NVIDIA GeForce GT 750M", 2, 1.35, 2, 0, true],
  ["NVIDIA GeForce GTX 980", 3, 1.5, 2, 2, false],
  ["Apple M1 Pro", 4, 2, 2, 4, false],
  ["Apple M4 Max", 5, 2, 2, 4, false],
  ["NVIDIA GeForce RTX 3080", 5, 2, 2, 4, false],
];
for (const [renderer, tier, sceneDpr, canvasDpr, samples, fxaa] of fixtures) {
  assert.deepEqual(
    renderQuality({ ...base, renderer }),
    {
      tier,
      oversized: false,
      sceneDpr,
      canvasDpr,
      samples,
      fxaa,
    },
    renderer,
  );
}
for (const [renderer, tier, sceneDpr, canvasDpr, samples] of [
  ["Apple A7 GPU", 0, 1, 2, 0],
  ["Apple A10 GPU", 1, 1.2, 2, 0],
  ["Apple A12 GPU", 2, 1.35, 2, 0],
  ["Apple A14 GPU", 3, 1.4, 3, 2],
  ["Apple A16 GPU", 4, 1.6, 3, 4],
  ["Apple A17 Pro GPU", 5, 1.8, 3, 4],
]) {
  assert.deepEqual(
    renderQuality({
      ...base,
      renderer,
      mobile: true,
      ios: true,
      pixelRatio: 3,
    }),
    {
      tier,
      oversized: false,
      sceneDpr,
      canvasDpr,
      samples,
      fxaa: false,
    },
    renderer,
  );
}
for (const [renderer, tier] of [
  ["Adreno (TM) 630", 2],
  ["Adreno (TM) 640", 3],
  ["Adreno (TM) 650", 4],
  ["Adreno (TM) 740", 5],
  ["Mali-G76", 3],
  ["Mali-G710", 4],
]) {
  assert.equal(
    renderQuality({ ...base, renderer, mobile: true }).tier,
    tier,
    renderer,
  );
}
assert.deepEqual(
  renderQuality({ ...base, renderer: "SwiftShader", width: 1920 }),
  {
    tier: 0,
    oversized: true,
    sceneDpr: 0.8,
    canvasDpr: 1,
    samples: 0,
    fxaa: false,
  },
);
assert.equal(
  renderQuality({
    ...base,
    renderer: "Intel(R) UHD Graphics 620",
    width: 1920,
    pixelRatio: 1,
  }).oversized,
  true,
);
assert.equal(
  renderQuality({ ...base, renderer: "Apple M1 Pro", pixelRatio: 1 }).canvasDpr,
  1.5,
);
assert.equal(
  renderQuality({ ...base, renderer: "Apple M1 Pro", pixelRatio: 1 }).sceneDpr,
  1,
);
const compat = renderQuality({ ...base, renderer: "Apple M1 Pro" }, true);
assert.equal(compat.samples, 0);
assert.equal(compat.fxaa, true);
console.log(
  "Verified desktop/mobile GPU tiers, separate canvas/scene DPR, MSAA, FXAA and oversized fallbacks.",
);
