import * as THREE from "three";
import gsap from "gsap";
import { material, particleMaterial, shared } from "./shaders";
import { black, texture } from "./assets";
import type { Frame, SceneSection } from "./SceneSection";
import settings from "../data/particle-settings.json";
import lifeSource from "../shaders/original/AntimatterSpawn.fs?raw";
const sources = import.meta.glob("../shaders/particles/*.glsl", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
type Kind = keyof typeof settings;
function dataTexture(data: Float32Array, width: number, height = width) {
  const texture = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  texture.needsUpdate = true;
  return texture;
}
function target(size: number) {
  return new THREE.WebGLRenderTarget(size, size, {
    type: THREE.FloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
  });
}
/** The recovered Antimatter lifecycle and UIL GLSL, with instanced Three.js render geometry. */
export class CurveParticles {
  readonly group = new THREE.Group();
  readonly behavior: THREE.RawShaderMaterial;
  readonly lifecycle: THREE.RawShaderMaterial;
  readonly shaders: THREE.RawShaderMaterial[] = [];
  readonly spawnPoint = new THREE.Vector3();
  /** Voyage: when set, held DrawnParticles stream from this fixed point (section space) instead of the cursor. */
  source?: THREE.Vector3;
  sourceRadius = 0.1;
  private readonly computeScene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly origin: THREE.DataTexture;
  private readonly random: THREE.DataTexture;
  private readonly events: THREE.DataTexture;
  private readonly positions: THREE.WebGLRenderTarget[];
  private readonly lives: THREE.WebGLRenderTarget[];
  private curveTextures: THREE.DataTexture[] = [];
  private readonly eventData: Float32Array;
  private readonly count: number;
  private readonly size: number;
  private slot = 0;
  private index = -1;
  private initialized = false;
  private lastStep = -1;
  private disposed = false;
  private accumulator = 0;
  private interval = 0;
  private emitting = false;
  private drawTimer?: ReturnType<typeof setInterval>;
  private releasedA: number[] = [];
  private releasedB: number[] = [];
  private lastHzUpdate = -Infinity;
  private held = false;
  private readonly color = new THREE.Color();
  private readonly projected = new THREE.Vector3();
  private readonly raycaster = new THREE.Raycaster();
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  constructor(
    readonly kind: Kind,
    section: SceneSection,
    parent: THREE.Object3D,
    renderOrder = 0,
  ) {
    const config = settings[kind];
    this.count = Number(config.count);
    this.size = Math.ceil(Math.sqrt(this.count));
    const randomData = new Float32Array(this.size * this.size * 4),
      origins = new Float32Array(randomData.length),
      lookup = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
      for (let j = 0; j < 4; j++) {
        randomData[i * 4 + j] = Math.random();
        origins[i * 4 + j] = j === 3 ? 1 : Math.random() * 2 - 1;
      }
      lookup.set(
        [
          ((i % this.size) + 0.5) / this.size,
          (Math.floor(i / this.size) + 0.5) / this.size,
          i,
        ],
        i * 3,
      );
    }
    this.origin = dataTexture(origins, this.size);
    this.random = dataTexture(randomData, this.size);
    this.eventData = new Float32Array(randomData.length);
    this.events = dataTexture(this.eventData, this.size);
    this.positions = [target(this.size), target(this.size)];
    this.lives = [target(this.size), target(this.size)];
    const common = {
      tInput: { value: this.origin as THREE.Texture },
      fSize: { value: this.size },
      uMaxCount: { value: this.count },
      HZ: { value: 1 },
      tAttribs: { value: this.random },
    };
    this.lifecycle = particleMaterial("AntimatterSpawn", lifeSource, {
      ...common,
      uSetup: { value: 1 },
      decay: { value: config.decay },
      decayRandom: {
        value: new THREE.Vector2(...(config.decayRandom as [number, number])),
      },
      tLife: { value: this.events },
    });
    const behaviorUniforms: Record<string, THREE.IUniform> = {};
    for (const [key, value] of Object.entries(config.uniforms))
      behaviorUniforms[key] = {
        value:
          value === null
            ? key.includes("Matrix")
              ? new THREE.Matrix4()
              : black
            : Array.isArray(value)
              ? new THREE.Vector3(...(value as [number, number, number]))
              : value,
      };
    this.behavior = particleMaterial(
      kind,
      sources[`../shaders/particles/${kind}.frag.glsl`],
      {
        ...behaviorUniforms,
        ...common,
        tOrigin: { value: this.origin },
        tSpawn: { value: this.lives[0].texture },
      },
    );
    if (kind === "LeafParticles") {
      this.behavior.uniforms.tFluid = shared.tFluid;
      this.behavior.uniforms.tFluidMask = shared.tFluidMask;
    }
    const base =
      kind === "LeafParticles"
        ? new THREE.PlaneGeometry(1, 1, 10, 10)
        : new THREE.SphereGeometry(1, 8, 6);
    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.index = base.index;
    for (const [key, attribute] of Object.entries(base.attributes))
      this.geometry.setAttribute(key, attribute);
    this.geometry.setAttribute(
      "random",
      new THREE.InstancedBufferAttribute(randomData, 4),
    );
    this.geometry.setAttribute(
      "lookup",
      new THREE.InstancedBufferAttribute(lookup, 3),
    );
    this.geometry.instanceCount = this.count;
    const name =
      kind === "LeafParticles"
        ? "LeafShader"
        : kind === "DrawnParticles"
          ? "BlobShaderDrawn"
          : "BlobShader";
    for (let pass = 0; pass < (kind === "LeafParticles" ? 1 : 2); pass++) {
      const shader = material(name, {
        tMap: texture(
          kind === "LeafParticles"
            ? "assets/images/story/antigrav/leaf-outline.png"
            : "assets/images/story/antigrav/leaf.png",
        ),
        uColor: this.color,
        uInverse: pass === 0 ? 1 : 0,
        uAnimate: 0,
        tPos: this.origin,
        tPrevPos: this.origin,
        tLife: this.lives[0].texture,
        tVelocity: black,
      });
      shader.transparent = true;
      shader.side =
        kind === "LeafParticles" || pass === 1
          ? THREE.DoubleSide
          : THREE.BackSide;
      const mesh = new THREE.Mesh(this.geometry, shader);
      mesh.frustumCulled = false;
      mesh.renderOrder = renderOrder;
      this.group.add(mesh);
      this.shaders.push(shader);
    }
    parent.add(this.group);
    this.computeScene.add(this.quad);
    section.beforeRender.push((renderer, frame) =>
      this.update(renderer, frame),
    );
    section.disposables.push(() => this.dispose());
    if (kind === "LeafParticles") {
      this.spawnPoint.set(0, -2, -3);
      this.emitting = true;
      this.interval = 0.1;
    }
  }
  setColor(color: THREE.Color) {
    this.color.copy(color);
  }
  setCurve(curve: THREE.Curve<THREE.Vector3>) {
    this.curveTextures.forEach((t) => t.dispose());
    const position = new Float32Array(1024),
      tangent = new Float32Array(1024);
    for (let i = 0; i < 256; i++) {
      const point = curve.getPoint(i / 255),
        direction = curve.getTangent(i / 255);
      position.set([...point.toArray(), 1], i * 4);
      tangent.set([...direction.toArray(), 1], i * 4);
      if (i === 0) this.spawnPoint.copy(point);
    }
    this.curveTextures = [
      dataTexture(position, 256, 1),
      dataTexture(tangent, 256, 1),
    ];
    this.behavior.uniforms.tCurvePos.value = this.curveTextures[0];
    this.behavior.uniforms.tCurveTangent.value = this.curveTextures[1];
  }
  shareCurve(other: CurveParticles) {
    this.behavior.uniforms.tCurvePos.value =
      other.behavior.uniforms.tCurvePos.value;
    this.behavior.uniforms.tCurveTangent.value =
      other.behavior.uniforms.tCurveTangent.value;
    this.spawnPoint.copy(other.spawnPoint);
  }
  start() {
    this.emitting = true;
    this.interval = 0.12;
    this.accumulator = 0;
    this.emit(this.spawnPoint);
    this.shaders.forEach((shader) => {
      gsap.killTweensOf(shader.uniforms.uAnimate);
      shader.uniforms.uAnimate.value = 0;
    });
  }
  stop() {
    this.emitting = false;
    this.shaders.forEach((shader) =>
      gsap.to(shader.uniforms.uAnimate, {
        value: 1,
        duration: 0.2,
        ease: "power2.out",
        overwrite: true,
      }),
    );
  }
  setHeld(held: boolean) {
    if (held === this.held) return;
    this.held = held;
    if (this.kind === "DrawnParticles") {
      clearInterval(this.drawTimer);
      this.drawTimer = held
        ? setInterval(() => {
            if (!this.disposed && this.initialized)
              this.emit(this.source ?? this.projected, this.source ? this.sourceRadius : 0.1);
          }, 7)
        : undefined;
      gsap.to(this.behavior.uniforms.uSpeedUp, {
        value: held ? 1 : 0,
        duration: 3,
        ease: "power4.inOut",
        overwrite: true,
      });
    }
    if (this.kind === "LeafParticles")
      gsap.to(this.lifecycle.uniforms.decay, {
        value: settings.LeafParticles.decay * (held ? 3 : 1),
        duration: 3,
        ease: "power2.out",
        overwrite: true,
      });
  }
  private emit(position: THREE.Vector3, radius = 0) {
    // Source increments before wrapping; the extra slot has no rendered instance.
    const index = ++this.index;
    if (this.index >= this.count) this.index = -1;
    this.eventData.set(
      [
        1,
        position.x + (Math.random() * 2 - 1) * radius,
        position.y + (Math.random() * 2 - 1) * radius,
        position.z + (Math.random() * 2 - 1) * radius,
      ],
      index * 4,
    );
    this.events.needsUpdate = true;
    this.releasedB.push(index);
  }
  private run(
    renderer: THREE.WebGLRenderer,
    shader: THREE.RawShaderMaterial,
    target: THREE.WebGLRenderTarget,
  ) {
    this.quad.material = shader;
    renderer.setRenderTarget(target);
    renderer.render(this.computeScene, this.camera);
  }
  private update(renderer: THREE.WebGLRenderer, frame: Frame) {
    if (this.disposed) return;
    // AntimatterSpawn clears event flags every render, ahead of the FPS-gated GPU passes.
    for (const index of this.releasedA) this.eventData[index * 4] = 0;
    if (this.releasedA.length) this.events.needsUpdate = true;
    this.releasedA.length = 0;
    [this.releasedA, this.releasedB] = [this.releasedB, this.releasedA];
    if (this.emitting) {
      this.accumulator += frame.delta;
      if (this.accumulator >= this.interval) {
        this.accumulator = 0;
        this.emit(
          this.kind === "LeafParticles"
            ? new THREE.Vector3(0, -2, -3)
            : this.spawnPoint,
        );
      }
    }
    if (this.held && this.kind === "DrawnParticles") {
      this.raycaster.setFromCamera(frame.pointer, frame.camera);
      if (this.raycaster.ray.intersectPlane(this.plane, this.projected)) {
        // DrawnParticles subtracts the owning section position, while its mesh remains a direct child of that section.
        this.projected.sub(this.group.parent!.position);
      }
    }
    const fps = this.kind === "DrawnParticles" ? 40 : 30;
    if (frame.time - this.lastStep < 1 / fps) return;
    this.lastStep = frame.time;
    const read = this.slot,
      write = 1 - read,
      life = this.lifecycle.uniforms,
      behavior = this.behavior.uniforms;
    // Lifecycle HZ is captured at setup; Proton refreshes only behavior HZ at 10 Hz.
    if (frame.time - this.lastHzUpdate >= 0.1) {
      this.lastHzUpdate = frame.time;
      behavior.HZ.value = frame.hz;
    }
    life.tInput.value = this.initialized
      ? this.lives[read].texture
      : this.origin;
    life.uSetup.value = this.initialized ? 0 : 1;
    this.run(renderer, this.lifecycle, this.lives[write]);
    behavior.tInput.value = this.initialized
      ? this.positions[read].texture
      : this.origin;
    behavior.tSpawn.value = this.lives[write].texture;
    if (this.kind === "LeafParticles") {
      this.group.updateWorldMatrix(true, false);
      behavior.uModelMatrix.value.copy(this.group.matrixWorld);
      behavior.uProjMatrix.value.multiplyMatrices(
        frame.camera.projectionMatrix,
        frame.camera.matrixWorldInverse,
      );
      behavior.uProjNormalMatrix.value.copy(frame.camera.matrixWorldInverse);
    }
    this.run(renderer, this.behavior, this.positions[write]);
    for (const shader of this.shaders) {
      shader.uniforms.tPos.value = this.positions[write].texture;
      shader.uniforms.tPrevPos.value = this.initialized
        ? this.positions[read].texture
        : this.origin;
      shader.uniforms.tLife.value = this.lives[write].texture;
    }
    this.slot = write;
    this.initialized = true;
  }
  dispose() {
    this.disposed = true;
    clearInterval(this.drawTimer);
    this.origin.dispose();
    this.random.dispose();
    this.events.dispose();
    this.positions.forEach((t) => t.dispose());
    this.lives.forEach((t) => t.dispose());
    this.curveTextures.forEach((t) => t.dispose());
    this.shaders.forEach((s) => {
      gsap.killTweensOf(s.uniforms.uAnimate);
      s.dispose();
    });
    gsap.killTweensOf(this.lifecycle.uniforms.decay);
    gsap.killTweensOf(this.behavior.uniforms.uSpeedUp);
    this.geometry.dispose();
    this.quad.geometry.dispose();
    this.behavior.dispose();
    this.lifecycle.dispose();
  }
}
