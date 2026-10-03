import * as THREE from "three";
import { material } from "./shaders";
import { texture } from "./assets";
/** Source offscreen lettering plus the eight-pass Kawase chain (20% bottles, 80% glass). */
export class RefractionTexture {
  readonly text = new THREE.WebGLRenderTarget(1, 1, {
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
  });
  private readonly buffers = [
    new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false }),
    new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false }),
  ];
  private readonly scene = new THREE.Scene();
  private readonly blurScene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly proxies = new Map<THREE.Mesh, THREE.Mesh>();
  private readonly blur = material("kawaseblur", {
    uStep: 0,
    uBlit: 0,
    uBlurAmount: 0.15,
    tNoise: texture("assets/images/bluenoise/bluenoise0.png"),
  });
  private readonly quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    this.blur,
  );
  constructor(readonly ratio: number) {
    this.blur.depthWrite = this.blur.depthTest = false;
    this.blur.transparent = false;
    this.blurScene.add(this.quad);
  }
  get blurred() {
    return this.buffers[0].texture;
  }
  resize(width: number, height: number) {
    this.text.setSize(width, height);
    this.buffers.forEach((buffer) =>
      buffer.setSize(
        Math.max(1, Math.round(width * this.ratio)),
        Math.max(1, Math.round(height * this.ratio)),
      ),
    );
  }
  render(
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
    meshes: THREE.Mesh[],
    destination = this.text,
  ) {
    this.proxies.forEach((mesh) => (mesh.visible = false));
    for (const mesh of meshes) {
      let proxy = this.proxies.get(mesh);
      if (!proxy) {
        proxy = new THREE.Mesh(mesh.geometry, mesh.material);
        proxy.matrixAutoUpdate = false;
        proxy.frustumCulled = false;
        this.proxies.set(mesh, proxy);
        this.scene.add(proxy);
      }
      mesh.updateWorldMatrix(true, false);
      proxy.matrix.copy(mesh.matrixWorld);
      proxy.geometry = mesh.geometry;
      proxy.material = mesh.material;
      proxy.renderOrder = mesh.renderOrder;
      proxy.visible = true;
    }
    const previous = renderer.getClearColor(new THREE.Color()),
      alpha = renderer.getClearAlpha();
    renderer.setClearColor(0, 0);
    renderer.setRenderTarget(destination);
    renderer.render(this.scene, camera);
    renderer.setClearColor(previous, alpha);
  }
  renderBlur(renderer: THREE.WebGLRenderer) {
    for (let i = 0; i < 8; i++) {
      const target = this.buffers[(i + 1) % 2];
      this.blur.uniforms.tMap.value =
        i === 0 ? this.text.texture : this.buffers[i % 2].texture;
      this.blur.uniforms.uStep.value = i;
      this.blur.uniforms.uBlit.value = i === 0 ? 1 : 0;
      renderer.setRenderTarget(target);
      renderer.render(this.blurScene, this.camera);
    }
  }
  dispose() {
    this.text.dispose();
    this.buffers.forEach((target) => target.dispose());
    this.quad.geometry.dispose();
    this.blur.dispose();
  }
}
