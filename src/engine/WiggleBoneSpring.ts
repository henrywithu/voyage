import * as THREE from "three";

/** Source WiggleBoneSpring: wrapper transform, damped world-space endpoint and 0.85 fixed steps. */
export class WiggleBoneSpring {
  private readonly origin: THREE.Vector3;
  private readonly previous = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private readonly goal = new THREE.Vector3();
  private readonly force = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor(private readonly target: THREE.Object3D) {
    const wrapper = target.clone(false);
    target.parent!.add(wrapper);
    wrapper.add(target);
    this.origin = target.position.clone();
    target.getWorldPosition(this.previous);
  }

  update(deltaMilliseconds: number) {
    const dt = deltaMilliseconds * 0.01;
    const count = dt > 20 ? 25 : dt > 0.0085 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const parent = this.target.parent!;
      parent.updateWorldMatrix(true, false);
      this.goal.copy(this.origin).applyMatrix4(parent.matrixWorld);
      this.force.subVectors(this.goal, this.previous).multiplyScalar(0.01);
      this.force.addScaledVector(this.velocity, -0.1);
      this.velocity.addScaledVector(this.force, 0.85);
      this.goal.copy(this.previous).addScaledVector(this.velocity, 0.85);
      this.previous.copy(this.goal);
      parent.worldToLocal(this.target.position.copy(this.goal));
      this.direction.copy(this.target.position).normalize();
      this.target.quaternion.setFromUnitVectors(this.up, this.direction);
      // The original intentionally collapses the endpoint after deriving its rotation.
      this.target.position.set(
        0,
        Math.min(this.target.position.length(), 0),
        0,
      );
      this.target.updateMatrix();
    }
  }
}
