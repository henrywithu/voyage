import * as THREE from "three";

export function applySourceSide(
  material: THREE.RawShaderMaterial,
  side?: string,
) {
  if (side?.includes("double")) {
    material.side = THREE.DoubleSide;
    // RawShaderMaterial defaults to one pass; Hydra's transparency mode does not.
    material.forceSinglePass = side !== "shader_double_side_trasparency";
  } else if (side?.includes("back")) material.side = THREE.BackSide;
  else if (side?.includes("front")) material.side = THREE.FrontSide;
}

/**
 * Hydra culls FRONT for a back-face pass without reversing the winding.
 * Three.js instead reverses frontFace and keeps culling BACK. Restore the
 * source shader's gl_FrontFacing meaning, including two-pass glass draws.
 */
export function preserveSourceFacing(material: THREE.RawShaderMaterial) {
  if (!/\bgl_FrontFacing\b/.test(material.fragmentShader)) return;
  material.customProgramCacheKey = () =>
    material.side === THREE.BackSide
      ? "source-facing-back"
      : "source-facing-front";
  material.onBeforeCompile = (program) => {
    if (material.side === THREE.BackSide)
      program.fragmentShader = program.fragmentShader.replace(
        /\bgl_FrontFacing\b/g,
        "(!gl_FrontFacing)",
      );
  };
}
