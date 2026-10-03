import assert from "node:assert/strict";
import * as THREE from "three";
import {
  applySourceSide,
  preserveSourceFacing,
} from "../src/engine/MaterialFacing.ts";

const fragmentShader = "void main() { if (!gl_FrontFacing) discard; }";
const material = new THREE.RawShaderMaterial({ fragmentShader });
applySourceSide(material, "shader_double_side_trasparency");
assert.equal(material.side, THREE.DoubleSide);
assert.equal(material.forceSinglePass, false);
applySourceSide(material, "shader_double_side");
assert.equal(material.side, THREE.DoubleSide);
assert.equal(material.forceSinglePass, true);
applySourceSide(material, "shader_back_side");
assert.equal(material.side, THREE.BackSide);
applySourceSide(material, undefined);
assert.equal(
  material.side,
  THREE.BackSide,
  "unspecified UIL side preserves shader defaults",
);
preserveSourceFacing(material);
const keys = [];
for (const side of [
  THREE.BackSide,
  THREE.FrontSide,
  THREE.DoubleSide,
  THREE.BackSide,
]) {
  material.side = side;
  const program = { fragmentShader };
  material.onBeforeCompile(program);
  keys.push(material.customProgramCacheKey());
  assert.equal(
    program.fragmentShader,
    side === THREE.BackSide
      ? "void main() { if (!(!gl_FrontFacing)) discard; }"
      : fragmentShader,
  );
}
assert.notEqual(keys[0], keys[1]);
assert.equal(keys[1], keys[2]);
assert.equal(keys[0], keys[3]);
assert.equal(
  material.fragmentShader,
  fragmentShader,
  "source shader stays immutable across passes",
);
console.log(
  "Verified original facing semantics and separate cached back/front programs.",
);
