import * as THREE from "three";
import { shared, splitMaterial } from "./shaders";
import { black } from "./assets";
import { range } from "../data/sections";
import type { Frame } from "./SceneSection";
class DoubleBuffer {
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;
  constructor(
    size: number,
    filter: THREE.MagnificationTextureFilter = THREE.LinearFilter,
  ) {
    this.read = new THREE.WebGLRenderTarget(size, size, {
      type: THREE.HalfFloatType,
      minFilter: filter,
      magFilter: filter,
      depthBuffer: false,
    });
    this.write = this.read.clone();
  }
  swap() {
    [this.read, this.write] = [this.write, this.read];
  }
  dispose() {
    this.read.dispose();
    this.write.dispose();
  }
}
/** Source Fluid/MouseFluid: 128-square velocity, 512-square dye, 3 pressure iterations, curl 18. */
export class MouseFluid {
  private readonly velocity = new DoubleBuffer(128);
  private readonly density = new DoubleBuffer(512);
  private readonly pressure = new DoubleBuffer(128, THREE.NearestFilter);
  private readonly curlTarget = new THREE.WebGLRenderTarget(128, 128, {
    type: THREE.HalfFloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
  });
  private readonly divergence = this.curlTarget.clone();
  private readonly display = new THREE.WebGLRenderTarget(1, 1, {
    depthBuffer: false,
  });
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  private readonly shaders: Record<string, THREE.RawShaderMaterial> = {};
  private readonly last = new THREE.Vector2();
  private readonly mouse = new THREE.Vector2();
  private initialized = false;
  private lastSplat = -1;
  private width = 1;
  private height = 1;
  constructor() {
    this.scene.add(this.quad);
    const base = { texelSize: new THREE.Vector2(1 / 128, 1 / 128) };
    const values: Record<string, Record<string, unknown>> = {
      curl: { uVelocity: black },
      vorticity: { uVelocity: black, uCurl: black, curl: 18, dt: 1 / 60 },
      divergence: { uVelocity: black },
      clear: { uTexture: black, value: 0.9 },
      pressure: { uPressure: black, uDivergence: black },
      gradientSubtract: { uPressure: black, uVelocity: black },
      advection: {
        uVelocity: black,
        uSource: black,
        dt: 1 / 60,
        dissipation: 0.95,
        uScrollDelta: new THREE.Vector2(),
      },
      display: { uTexture: black },
      splat: {
        uTarget: black,
        uSplatTexture: black,
        isSplatTexture: 0,
        isSplatSpeed: 0,
        aspectRatio: 1,
        point: new THREE.Vector2(),
        prevPoint: new THREE.Vector2(),
        color: new THREE.Vector3(),
        bgColor: new THREE.Vector3(),
        radius: 0.01,
        canRender: 0,
        uAdd: 1,
      },
    };
    for (const [key, v] of Object.entries(values))
      this.shaders[key] = splitMaterial("fluidBase.vs", key + "Shader.fs", {
        ...base,
        ...v,
      });
  }
  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.display.setSize(w, h);
  }
  private run(
    renderer: THREE.WebGLRenderer,
    name: string,
    target: THREE.WebGLRenderTarget,
    values: Record<string, unknown> = {},
  ) {
    const shader = this.shaders[name];
    for (const [key, value] of Object.entries(values))
      shader.uniforms[key].value = value;
    this.quad.material = shader;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }
  update(
    renderer: THREE.WebGLRenderer,
    frame: Frame,
    scrollDelta: number,
    handDown: boolean,
  ) {
    const hz = frame.hz;
    this.run(renderer, "curl", this.curlTarget, {
      uVelocity: this.velocity.read.texture,
    });
    this.run(renderer, "vorticity", this.velocity.write, {
      uVelocity: this.velocity.read.texture,
      uCurl: this.curlTarget.texture,
    });
    this.velocity.swap();
    this.run(renderer, "divergence", this.divergence, {
      uVelocity: this.velocity.read.texture,
    });
    this.run(renderer, "clear", this.pressure.write, {
      uTexture: this.pressure.read.texture,
      value: Math.pow(0.9, hz),
    });
    this.pressure.swap();
    for (let i = 0; i < 3; i++) {
      this.run(renderer, "pressure", this.pressure.write, {
        uPressure: this.pressure.read.texture,
        uDivergence: this.divergence.texture,
      });
      this.pressure.swap();
    }
    this.run(renderer, "gradientSubtract", this.velocity.write, {
      uVelocity: this.velocity.read.texture,
      uPressure: this.pressure.read.texture,
    });
    this.velocity.swap();
    const advection = this.shaders.advection.uniforms;
    advection.texelSize.value.set(1 / 128, 1 / 128);
    advection.uScrollDelta.value.set(0, scrollDelta / this.height);
    this.run(renderer, "advection", this.velocity.write, {
      uVelocity: this.velocity.read.texture,
      uSource: this.velocity.read.texture,
      dissipation: Math.pow(0.95, hz),
    });
    this.velocity.swap();
    advection.texelSize.value.set(1 / 512, 1 / 512);
    this.run(renderer, "advection", this.density.write, {
      uVelocity: this.velocity.read.texture,
      uSource: this.density.read.texture,
      dissipation: Math.pow(0.97, hz),
    });
    this.density.swap();
    this.run(renderer, "display", this.display, {
      uTexture: this.density.read.texture,
    });
    this.mouse.set(
      (frame.pointer.x + 1) * 0.5 * this.width,
      (1 - frame.pointer.y) * 0.5 * this.height,
    );
    if (!this.initialized) {
      this.last.copy(this.mouse);
      this.initialized = true;
    }
    const length = this.mouse.distanceTo(this.last),
      size = range(length, 0, 5, 0, 60) * 0.8,
      force = range(length, 0, 15, 0, 10);
    if (handDown) {
      const time = frame.time * 4;
      this.splat(
        renderer,
        this.mouse.x + 100 * Math.sin(time),
        this.mouse.y + 100 * Math.cos(time),
        20,
        20,
        range(Math.sin(time), 0, 1, 100, 140),
        frame.time,
      );
    } else if (length > 0.01)
      this.splat(
        renderer,
        this.mouse.x,
        this.mouse.y,
        (this.mouse.x - this.last.x) * force,
        (this.mouse.y - this.last.y) * force,
        size,
        frame.time,
      );
    this.last.copy(this.mouse);
    if (Math.abs(scrollDelta) > 0.01) {
      const magnitude = Math.abs(scrollDelta),
        force = range(magnitude, 0, 40, 0, 10) * Math.sign(scrollDelta);
      this.splat(
        renderer,
        this.mouse.x,
        this.mouse.y,
        0,
        -20 * force,
        range(magnitude, 0, 40, 20, 70),
        frame.time,
      );
    }
    shared.tFluid.value = this.velocity.read.texture;
    shared.tFluidMask.value = this.display.texture;
  }
  private splat(
    renderer: THREE.WebGLRenderer,
    x: number,
    y: number,
    dx: number,
    dy: number,
    radius: number,
    time: number,
  ) {
    const u = this.shaders.splat.uniforms,
      point = new THREE.Vector2(x / this.width, 1 - y / this.height);
    u.prevPoint.value.copy(
      time - this.lastSplat > 0.05 ? point : u.point.value,
    );
    u.point.value.copy(point);
    this.lastSplat = time;
    // A zero-length stroke makes the original line-distance denominator undefined. The subpixel offset is numerical stabilization only.
    if (u.prevPoint.value.distanceToSquared(point) < 1e-12)
      u.prevPoint.value.x -= 1e-6;
    u.radius.value = radius / 200;
    u.aspectRatio.value = this.width / this.height;
    u.color.value.set(dx, -dy, 1);
    this.run(renderer, "splat", this.velocity.write, {
      uTarget: this.velocity.read.texture,
      uAdd: 1,
    });
    this.velocity.swap();
    u.color.value.set(1, 1, 1);
    this.run(renderer, "splat", this.density.write, {
      uTarget: this.density.read.texture,
      uAdd: 1,
    });
    this.density.swap();
    u.canRender.value = 1;
  }
  dispose() {
    this.velocity.dispose();
    this.density.dispose();
    this.pressure.dispose();
    this.curlTarget.dispose();
    this.divergence.dispose();
    this.display.dispose();
    Object.values(this.shaders).forEach((s) => s.dispose());
    this.quad.geometry.dispose();
    shared.tFluid.value = shared.tFluidMask.value = black;
  }
}
