import * as THREE from "three";

type PbrTextureRole = "tLUT" | "tEnvDiffuse" | "tEnvSpecular" | "tLightmap";

/** Utils3D.getLookupTexture and PBRShader's environment/lightmap sampler rules. */
export function configurePbrTexture(
  texture: THREE.Texture,
  role: PbrTextureRole,
) {
  let changed =
    texture.wrapS !== THREE.ClampToEdgeWrapping ||
    texture.wrapT !== THREE.ClampToEdgeWrapping;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  if (role !== "tLUT") {
    changed ||= texture.premultiplyAlpha;
    texture.premultiplyAlpha = false;
  }
  if (role !== "tLightmap") {
    const filter = role === "tLUT" ? THREE.NearestFilter : THREE.LinearFilter;
    changed ||=
      texture.generateMipmaps ||
      texture.minFilter !== filter ||
      texture.magFilter !== filter;
    texture.generateMipmaps = false;
    texture.minFilter = texture.magFilter = filter;
  }
  if (changed) texture.needsUpdate = true;
  return texture;
}
