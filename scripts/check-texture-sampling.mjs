import assert from "node:assert/strict";
import * as THREE from "three";
import { configurePbrTexture } from "../src/engine/TextureSampling.ts";

for (const role of ["tLUT", "tEnvDiffuse", "tEnvSpecular", "tLightmap"]) {
  const texture = new THREE.Texture();
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.premultiplyAlpha = true;
  configurePbrTexture(texture, role);
  assert.equal(texture.wrapS, THREE.ClampToEdgeWrapping, role);
  assert.equal(texture.wrapT, THREE.ClampToEdgeWrapping, role);
  assert.equal(texture.premultiplyAlpha, role === "tLUT", role);
  if (role !== "tLightmap") {
    const filter = role === "tLUT" ? THREE.NearestFilter : THREE.LinearFilter;
    assert.equal(texture.minFilter, filter, role);
    assert.equal(texture.magFilter, filter, role);
    assert.equal(texture.generateMipmaps, false, role);
  } else {
    assert.equal(texture.generateMipmaps, true);
    assert.equal(texture.minFilter, THREE.LinearMipmapLinearFilter);
  }
  const version = texture.version;
  configurePbrTexture(texture, role);
  assert.equal(
    texture.version,
    version,
    `${role}: unchanged shared textures must not reupload`,
  );
}
console.log(
  "Verified lookup, environment and lightmap sampling plus idempotent shared-texture updates.",
);
