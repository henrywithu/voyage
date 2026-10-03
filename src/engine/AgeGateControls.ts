import * as THREE from "three";
import gsap from "gsap";
import { FontAtlas } from "./FontAtlas";
import { material } from "./shaders";
import { texture } from "./assets";
export interface AgeGatePresentation {
  alpha: number;
  visible: boolean;
  centers: { x: number; y: number }[];
  hover: boolean[];
  x: number;
  y: number;
  rotationX: number;
  rotationY: number;
}
export class AgeGateControls {
  readonly group = new THREE.Group();
  state?: AgeGatePresentation;
  private buttons: {
    group: THREE.Group;
    bg: THREE.RawShaderMaterial;
    text: THREE.RawShaderMaterial;
    hover: boolean;
  }[] = [];
  constructor() {
    this.group.visible = false;
  }
  async load(font: FontAtlas) {
    for (const label of ["YES", "NO"]) {
      const group = new THREE.Group(),
        bg = material("GLUIButtonShader", {
          uColor: "#1d1d1d",
          uBorder: "#ffffff",
          alpha: 0,
          uAspectRatio: 2,
          tNoise: texture("assets/images/story/clouds_noise.png"),
          uHover: 0,
        }),
        background = new THREE.Mesh(new THREE.PlaneGeometry(), bg);
      background.scale.set(96 * 1.1, 48 * 1.1, 1);
      group.add(background);
      const layout = font.layout(label, 16, 100, 0.8, [], "center"),
        text = material("DefaultText", {
          tMap: font.map,
          uColor: "#ffffff",
          uAlpha: 0,
        }),
        mesh = new THREE.Mesh(layout.geometry, text);
      mesh.position.set(0, layout.advanceHeight / 2, 1);
      group.add(mesh);
      for (const shader of [bg, text]) {
        shader.transparent = true;
        shader.depthTest = shader.depthWrite = false;
      }
      this.group.add(group);
      this.buttons.push({ group, bg, text, hover: false });
    }
  }
  update(width: number, height: number) {
    const state = this.state;
    this.group.visible = Boolean(state?.visible);
    if (!state) return;
    this.group.position.set(
      width / 2 + state.x * 1.3,
      -height / 2 - state.y * 1.3,
      5,
    );
    this.group.rotation.set(
      ((-state.rotationX * Math.PI) / 180) * 1.3,
      ((state.rotationY * Math.PI) / 180) * 1.3,
      0,
    );
    this.buttons.forEach((button, i) => {
      const center = state.centers[i];
      button.group.position.set(
        center.x - width / 2,
        -center.y + height / 2,
        0,
      );
      button.bg.uniforms.alpha.value = state.alpha;
      button.text.uniforms.uAlpha.value = state.alpha;
      if (button.hover !== state.hover[i]) {
        button.hover = state.hover[i];
        gsap.to(button.bg.uniforms.uHover, {
          value: button.hover ? 1 : 0,
          duration: 0.6,
          ease: "power2.out",
          overwrite: true,
        });
      }
    });
  }
  dispose() {
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const shader = object.material as THREE.RawShaderMaterial;
        for (const uniform of Object.values(shader.uniforms))
          gsap.killTweensOf(uniform);
        shader.dispose();
      }
    });
  }
}
