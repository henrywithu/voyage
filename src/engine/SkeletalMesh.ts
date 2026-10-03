import * as THREE from "three";
import { loadGeometry, type DecodedAsset } from "./assets";
import { ensureAttributes, material } from "./shaders";

/** The reference stores animation time in frame units, at 20 frames/second. */
export class SkeletalMesh {
  readonly root = new THREE.Group();
  readonly bones: THREE.Object3D[] = [];
  readonly inverses: THREE.Matrix4[] = [];
  readonly mesh: THREE.Mesh;
  readonly outline: THREE.Mesh;
  private animation?: DecodedAsset;
  private readonly matrices: Float32Array;
  readonly boneTexture: THREE.DataTexture;
  private readonly matrix = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  elapsed = 0;
  get duration() {
    return this.animation?.header.frameCount ?? 1;
  }
  constructor(
    asset: DecodedAsset,
    shaderName = "SkinShader",
    overrides: Record<string, unknown> = {},
    inverseShader = "InverseSkinShader",
  ) {
    const data = asset.header.bones ?? [];
    for (const b of data) {
      const bone = new THREE.Object3D();
      bone.name = b.name;
      bone.position.fromArray(b.pos);
      bone.quaternion.fromArray(b.rot as number[]).normalize();
      bone.scale.fromArray(b.scl);
      this.bones.push(bone);
    }
    data.forEach((b, i) =>
      (b.parent < 0 ? this.root : this.bones[b.parent]).add(this.bones[i]),
    );
    this.root.updateMatrixWorld(true);
    this.inverses = this.bones.map((b) => b.matrixWorld.clone().invert());
    const size = Math.max(
      4,
      2 ** Math.ceil(Math.log2(Math.sqrt(4 * this.bones.length))),
    );
    this.matrices = new Float32Array(size * size * 4);
    this.boneTexture = new THREE.DataTexture(
      this.matrices,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    this.boneTexture.needsUpdate = true;
    const uniforms = {
      boneTexture: this.boneTexture,
      boneTextureSize: size,
      ...overrides,
    };
    const shader = material(shaderName, uniforms);
    ensureAttributes(asset.geometry, shader);
    shader.addEventListener("dispose", () => this.boneTexture.dispose());
    this.mesh = new THREE.Mesh(asset.geometry, shader);
    this.mesh.frustumCulled = false;
    const inverse = material(inverseShader, { ...uniforms, uDisplacement: 1 });
    ensureAttributes(asset.geometry, inverse);
    this.outline = new THREE.Mesh(asset.geometry, inverse);
    this.outline.frustumCulled = false;
    this.update(0);
  }
  async loadAnimation(path: string) {
    this.animation = await loadGeometry(path);
  }
  update(delta: number, frame?: number, afterPose?: () => void) {
    this.elapsed += delta * 20;
    if (this.animation) {
      const a = this.animation;
      const count = a.header.frameCount ?? 1;
      const elapsed = frame ?? this.elapsed;
      const i = Math.floor(elapsed) % count,
        j = (i + 1) % count,
        t = elapsed % 1;
      for (let n = 0; n < this.bones.length; n++) {
        const b = this.bones[n];
        if (
          b.name.startsWith("sleeve_wiggle") ||
          b.name.startsWith("hand_bone_parent")
        )
          continue;
        for (const [type, key] of [
          ["offset", "position"],
          ["scale", "scale"],
        ] as const) {
          const one = a.geometry.getAttribute(type + "_" + i),
            two = a.geometry.getAttribute(type + "_" + j);
          if (!one || !two) continue;
          b[key].fromBufferAttribute(one, n);
          this.p.fromBufferAttribute(two, n);
          b[key].lerp(this.p, t);
        }
        const one = a.geometry.getAttribute("orientation_" + i),
          two = a.geometry.getAttribute("orientation_" + j);
        if (one && two) {
          b.quaternion
            .set(one.getX(n), one.getY(n), one.getZ(n), one.getW(n))
            .normalize();
          this.q
            .set(two.getX(n), two.getY(n), two.getZ(n), two.getW(n))
            .normalize();
          b.quaternion.slerp(this.q, t);
        }
      }
    }
    afterPose?.();
    this.root.updateMatrixWorld(true);
    this.bones.forEach((bone, i) => {
      this.matrix.multiplyMatrices(bone.matrixWorld, this.inverses[i]);
      this.matrices.set(this.matrix.elements, i * 16);
    });
    this.boneTexture.needsUpdate = true;
  }
}
