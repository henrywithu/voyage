import * as THREE from "three";
import { material } from "../engine/shaders";
import { texture } from "../engine/assets";
import { clamp } from "../data/sections";
import { frequencyBands } from "./catalog";
/** Original AudioToggleGl geometry and AudioToggleShader; the DOM button owns input/accessibility. */
export class AudioMeter {
  readonly group = new THREE.Group();
  readonly levels = [0, 0, 0, 0];
  private readonly shader = material("AudioToggleShader", {
    tNoise: texture("assets/images/story/clouds_noise.png"),
    uShow: 0,
    uHover: 0,
  });
  private readonly geometry = new THREE.PlaneGeometry();
  private readonly bars = Array.from(
    { length: 4 },
    () => new THREE.Mesh(this.geometry, this.shader),
  );
  constructor() {
    this.shader.transparent = true;
    this.shader.depthTest = this.shader.depthWrite = false;
    this.group.add(...this.bars);
  }
  update(width: number, height: number, time: number, scene: THREE.Texture) {
    this.shader.uniforms.tScene.value = scene;
    this.shader.uniforms.uShow.value = Math.sin(
      (clamp((time - 3) / 0.8) * Math.PI) / 2,
    );
    this.bars.forEach((bar, i) => {
      const value = 1 - Math.cos((this.levels[i] * Math.PI) / 2),
        scale = Math.max(1, value * 8 * frequencyBands[i].sensitivity);
      bar.scale.set(6, 6 * scale, 1);
      bar.position.set(width - 24 - (4 - i) * 8 + 3, -height + 40, 3);
    });
  }
  dispose() {
    this.geometry.dispose();
    this.shader.dispose();
  }
}
