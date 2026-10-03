import * as THREE from "three";
/** Source VelocityTracker retains the last nonzero velocity and normalizes it by the refresh interval. */
export class LiquidMotion {
  private readonly position = new THREE.Vector3();
  private readonly rotation = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private readonly angular = new THREE.Vector3();
  private readonly next = new THREE.Vector3();
  private x = 0;
  private z = 0;
  private time = 0;
  constructor(
    readonly config: {
      wobbleDecay: number;
      wobbleMax: number;
      wobblePulseFrequency: number;
      wobbleVelMultiplier: number;
    },
  ) {}
  update(
    position: THREE.Vector3,
    rotation: THREE.Euler,
    dt: number,
    material: THREE.RawShaderMaterial,
  ) {
    this.next.subVectors(position, this.position).divideScalar(dt * 60);
    if (this.next.lengthSq() > 0) this.velocity.copy(this.next);
    this.position.copy(position);
    this.next
      .set(rotation.x, rotation.y, rotation.z)
      .sub(this.rotation)
      .divideScalar(dt * 60);
    if (this.next.lengthSq() > 0) this.angular.copy(this.next);
    this.rotation.set(rotation.x, rotation.y, rotation.z);
    const delta = dt * 10;
    this.time += delta;
    this.x = THREE.MathUtils.lerp(
      this.x,
      0,
      Math.min(1, delta * this.config.wobbleDecay),
    );
    this.z = THREE.MathUtils.lerp(
      this.z,
      0,
      Math.min(1, delta * this.config.wobbleDecay),
    );
    const pulse = 2 * Math.PI * this.config.wobblePulseFrequency;
    material.uniforms.uWobbleX.value = this.x * Math.sin(pulse * this.time);
    material.uniforms.uWobbleZ.value = this.z * Math.sin(pulse * this.time);
    this.x += THREE.MathUtils.clamp(
      (this.velocity.x + this.angular.x) * this.config.wobbleVelMultiplier,
      -this.config.wobbleMax,
      this.config.wobbleMax,
    );
    this.z += THREE.MathUtils.clamp(
      (this.velocity.z + this.angular.z) * this.config.wobbleVelMultiplier,
      -this.config.wobbleMax,
      this.config.wobbleMax,
    );
  }
}
