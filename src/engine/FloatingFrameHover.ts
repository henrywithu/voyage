import * as THREE from "three";
import gsap from "gsap";

type Panel = THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>;

/** FloatingFrame's Interaction3D callback: raycast on input, not on scroll. */
export class FloatingFrameHover {
  private readonly raycaster = new THREE.Raycaster();
  private hovered?: Panel;
  private pending = false;
  private readonly panels: Panel[];

  constructor(panels: Panel[]) {
    this.panels = panels;
  }

  request = (event: PointerEvent) => {
    // Interaction3D leaves its current hover unchanged over prohibited UI.
    if (
      (event.target as Element | null)?.closest?.(
        "button,a,nav,.hit,.prevent_interaction3d",
      )
    )
      return;
    this.pending = true;
  };

  release = (event: PointerEvent) => {
    if (event.type === "pointercancel" || event.pointerType !== "mouse") {
      this.pending = false;
      this.setHovered();
    }
  };

  update(pointer: THREE.Vector2, camera: THREE.Camera) {
    if (!this.pending) return;
    this.pending = false;
    this.panels.forEach((panel) => panel.updateWorldMatrix(true, false));
    this.raycaster.setFromCamera(pointer, camera);
    this.setHovered(
      this.raycaster.intersectObjects(this.panels, false)[0]?.object as
        Panel | undefined,
    );
  }

  private setHovered(panel?: Panel) {
    if (panel === this.hovered) return;
    for (const [target, value] of [
      [this.hovered, 0],
      [panel, 1],
    ] as const) {
      const uniform = target?.material.uniforms.uHover;
      if (uniform)
        gsap.to(uniform, {
          value,
          duration: 1,
          ease: "power2.out",
          overwrite: true,
        });
    }
    this.hovered = panel;
  }

  clear = () => {
    this.pending = false;
    this.setHovered();
  };

  dispose() {
    this.panels.forEach((panel) => {
      const uniform = panel.material.uniforms.uHover;
      if (uniform) gsap.killTweensOf(uniform);
    });
    this.hovered = undefined;
    this.pending = false;
  }
}
