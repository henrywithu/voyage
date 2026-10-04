import * as THREE from "three";
import type { SceneSection } from "../engine/SceneSection";

/**
 * Voyage: a key light for Chaewon's static figures, given in world space and kept in her mesh's own space
 * every frame (the static character shader lights in object space, so a light tuned for Spirit's figure
 * turned with its group would leave her in shadow).
 *
 * dir points toward the light; strength scales the lighting term; threshold is the shader's
 * (shadow, highlight) pair.
 */
const keys: Record<string, { dir: [number, number, number]; strength: number; threshold: [number, number] }> = {
  DrinkSelectionScene: { dir: [-0.45, 0.55, 0.7], strength: 1.1, threshold: [-0.2, 0.95] },
  CathedralScene: { dir: [0.35, 0.6, 0.7], strength: 1.0, threshold: [-0.1, 0.95] },
};

export function setupCharacterLight(section: SceneSection) {
  const key = keys[section.name];
  if (!key || !section.layers.character) return;
  const mesh = section.mesh("character");
  const uniforms = mesh.material.uniforms;
  if (!uniforms.uLightDir) return;
  const world = new THREE.Vector3(...key.dir).normalize();
  const inverse = new THREE.Matrix3();
  uniforms.uThreshold?.value.set(...key.threshold);
  section.updates.push(() => {
    mesh.updateWorldMatrix(true, false);
    inverse.setFromMatrix4(mesh.matrixWorld).invert();
    uniforms.uLightDir.value
      .copy(world)
      .applyMatrix3(inverse)
      .normalize()
      .multiplyScalar(key.strength);
  });
}
