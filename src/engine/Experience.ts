import * as THREE from "three";
import gsap from "gsap";
import type { AgeGatePresentation } from "./AgeGateControls";
import { isMobileDevice } from "./device";
import { SceneSection, type Frame } from "./SceneSection";
import { shared, material } from "./shaders";
import { texture, pendingTextures, black } from "./assets";
import {
  sections,
  worldHeight,
  clamp,
  type SectionName,
} from "../data/sections";
import { MouseFluid } from "./MouseFluid";
import { RenderClock } from "./RenderClock";
import { renderQuality, qualityUniforms } from "./RenderQuality";
import { InteractionOverlay } from "./InteractionOverlay";
import { setupFloatingFrames } from "../scenes/FloatingFrames";
import { setupAntiGravity } from "../scenes/AntiGravity";
import { setupArchitecture } from "../scenes/Architecture";
import { setupDrinkSelection } from "../scenes/DrinkSelection";
import { setupDrinkPour } from "../scenes/DrinkPour";
import { setupHand } from "../scenes/HandPortal";
import { setupNarrative } from "../scenes/narrative";
import { setupNarration, type NarrativeBox } from "../scenes/Narration";
import { setupProducts } from "../scenes/products";
export class Experience {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
  readonly sections: SceneSection[] = [];
  private readonly fluid = new MouseFluid();
  ready = false;
  boxes: NarrativeBox[] = [];
  readonly pointer = new THREE.Vector2();
  private readonly overlay: InteractionOverlay;
  private readonly fixedCameraMatrix = new THREE.Matrix4();
  readonly targetPointer = new THREE.Vector2();
  private readonly target = new THREE.WebGLRenderTarget(1, 1, {
    depthBuffer: true,
  });
  private readonly compositeScene = new THREE.Scene();
  private readonly compositeCamera = new THREE.Camera();
  private readonly antialiasTarget = new THREE.WebGLRenderTarget(1, 1, {
    depthBuffer: false,
  });
  private readonly antialiasScene = new THREE.Scene();
  private readonly antialias = material("FXAA", {
    tDiffuse: this.target.texture,
    tMask: black,
  });
  private useFxaa = false;
  private readonly composite = material("CompositeShader", {
    tLines: texture("assets/images/story/lines.jpg"),
    tNoise: texture("assets/images/story/clouds_noise.png"),
    tBlueNoise: texture("assets/images/bluenoise/bluenoise0.png"),
    uAgeGate: 0,
    uLoaderFinished: 1,
    uMenuHover: 0,
    uScrollY: 0,
  });
  private raf = 0;
  private readonly clock = new RenderClock();
  private start = 0;
  private active = false;
  private disposed = false;
  scroll = 0;
  targetScroll = 0;
  private inputScroll = 0;
  private inertia = 0;
  private scrollDelta = 0;
  private tilt = 0;
  pressed = false;
  selected = 0;
  onSelect: (index: number) => void = () => {};
  onAudio: (id: string, volume?: number, roundRobin?: boolean) => void =
    () => {};
  setAudioLevels(levels: number[]) {
    this.overlay.audioMeter.levels.splice(0, 4, ...levels);
  }
  onProductChange: (index: number) => void = () => {};
  setAgeGate(state: AgeGatePresentation) {
    this.overlay.ageGateControls.state = state;
  }
  menuHover(hover: boolean) {
    gsap.to(this.composite.uniforms.uMenuHover, {
      value: hover ? 1 : 0,
      duration: 0.8,
      ease: "power2.out",
      overwrite: true,
    });
  }
  productStep(delta: number) {
    this.sections
      .find((s) => s.name === "ProductsScene")
      ?.onProductStep?.(delta);
  }
  onFrame: (frame: Frame) => void = () => {};
  constructor(
    readonly container: HTMLElement,
    readonly pages: HTMLElement,
  ) {
    document.getElementById("shader-diagnostics")?.remove();
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0xffffff, 1);
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.autoClear = true;
    if (import.meta.env.DEV)
      this.renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
        let panel = document.getElementById("shader-diagnostics");
        if (!panel) {
          panel = document.createElement("pre");
          panel.id = "shader-diagnostics";
          panel.setAttribute("role", "alert");
          panel.style.cssText =
            "position:fixed;bottom:0;left:0;max-height:35vh;overflow:auto;background:#fff;color:#b00;z-index:200;font:11px monospace;max-width:100%;";
          container.append(panel);
        }
        panel.textContent += [
          gl.getProgramInfoLog(program),
          gl.getShaderInfoLog(vertex),
          gl.getShaderInfoLog(fragment),
        ].join("\n");
      };
    this.renderer.domElement.className = "experience-canvas";
    container.prepend(this.renderer.domElement);
    this.camera.position.z = 5;
    this.overlay = new InteractionOverlay(pages, (y) => {
      this.inertia = 0;
      gsap.killTweensOf(this);
      this.targetScroll = clamp(y, 0, this.pages.scrollHeight - innerHeight);
    });
    this.composite.uniforms.tDiffuse.value = this.target.texture;
    this.compositeScene.add(
      new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.composite),
    );
    this.antialiasScene.add(
      new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.antialias),
    );
    window.addEventListener("resize", this.resize);
    window.addEventListener("wheel", this.wheel, { passive: false });
    window.addEventListener("keydown", this.key);
    window.addEventListener("pointermove", this.move);
    window.addEventListener("pointerdown", this.down);
    window.addEventListener("pointerup", this.up);
    window.addEventListener("pointercancel", this.cancel);
    this.resize();
  }
  async load(onProgress: (n: number) => void) {
    for (let i = 0; i < sections.length; i++) {
      if (this.disposed) return;
      const section = new SceneSection(sections[i].name);
      await section.load();
      if (this.disposed) {
        section.dispose();
        return;
      }
      section.onProductChange = (index) => this.onProductChange(index);
      section.onAudio = (...args) => this.onAudio(...args);
      section.onSelect = (index) => {
        this.selected = index;
        this.onSelect(index);
      };
      this.sections.push(section);
      this.scene.add(section.group);
      for (const setup of [
        setupNarrative,
        setupArchitecture,
        setupAntiGravity,
        setupDrinkPour,
        setupDrinkSelection,
        setupProducts,
        async (s: SceneSection) => {
          if (s.name === "HandScene") await setupHand(s);
        },
        setupFloatingFrames,
      ]) {
        await setup(section);
        if (this.disposed) {
          section.dispose();
          return;
        }
      }
      onProgress((i + 1) / sections.length);
    }
    this.boxes = await setupNarration(this.sections);
    if (this.disposed) {
      this.sections.forEach((s) => s.dispose());
      return;
    }
    await this.overlay.load();
    if (this.disposed) {
      this.overlay.dispose();
      return;
    }
    await Promise.all(pendingTextures);
    if (this.disposed) return;
    this.resize();
    this.ready = true;
    this.raf = requestAnimationFrame(this.render);
  }
  restoreScroll(y: number) {
    this.scroll = this.targetScroll = this.inputScroll = y;
  }
  enter(elapsed = 0) {
    this.active = true;
    this.start = performance.now() / 1000 - elapsed;
  }
  go(name: SectionName) {
    const section = this.sections.find((s) => s.name === name);
    if (section) {
      this.inertia = 0;
      gsap.killTweensOf(this);
      const y =
        section.pixelTop +
        (name === "ProductsScene" ? (isMobileDevice ? -50 : 50) : 0);
      gsap.to(this, {
        targetScroll: y,
        duration: Math.min(
          3,
          Math.max(
            0.8,
            0.8 +
              (2.2 * (Math.abs(y - this.scroll) - innerHeight)) /
                (9 * innerHeight),
          ),
        ),
        ease: "power2.out",
      });
      return Math.min(
        3,
        Math.max(
          0.8,
          0.8 +
            (2.2 * (Math.abs(y - this.scroll) - innerHeight)) /
              (9 * innerHeight),
        ),
      );
    }
    return 0;
  }
  resize = () => {
    const w = innerWidth,
      h = innerHeight;
    this.overlay.resize(w, h);
    this.fluid.resize(w, h);
    this.renderer.setSize(w, h);
    const gl = this.renderer.getContext();
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const quality = renderQuality(
      {
        renderer: String(
          gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
        ),
        mobile: isMobileDevice,
        ios: /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent),
        pixelRatio: devicePixelRatio,
        width: w,
        height: h,
      },
      new URLSearchParams(location.search).has("compat"),
    );
    qualityUniforms.canvasDpr.value = quality.canvasDpr;
    qualityUniforms.sceneDpr.value = quality.sceneDpr;
    this.renderer.setPixelRatio(quality.canvasDpr);
    if (this.target.samples !== quality.samples) this.target.dispose();
    this.target.samples = quality.samples;
    this.target.setSize(
      Math.round(w * quality.sceneDpr),
      Math.round(h * quality.sceneDpr),
    );
    this.antialiasTarget.setSize(this.target.width, this.target.height);
    this.useFxaa = quality.fxaa;
    this.composite.uniforms.tDiffuse.value = this.useFxaa
      ? this.antialiasTarget.texture
      : this.target.texture;
    shared.resolution.value.set(this.target.width, this.target.height);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    for (const section of this.sections) {
      const el = this.pages.querySelector<HTMLElement>(
        `[data-scene="${section.name}"]`,
      );
      if (el) section.layout(el, w, h);
    }
  };
  private wheel = (e: WheelEvent) => {
    if (!this.active) return;
    e.preventDefault();
    if (this.overlay.blocksScroll || this.sections.some((s) => s.blocksScroll))
      return;
    gsap.killTweensOf(this);
    const mac = /Mac/.test(navigator.platform),
      windows = /Win/.test(navigator.platform);
    const factor = mac ? 0.33 : windows ? 0.25 : 1;
    this.inertia = mac || windows ? e.deltaY * factor : 0;
    this.targetScroll = clamp(
      this.targetScroll + e.deltaY * factor,
      0,
      this.pages.scrollHeight - innerHeight,
    );
  };
  private key = (e: KeyboardEvent) => {
    if (!this.active) return;
    const delta =
      e.key === "ArrowDown"
        ? 80
        : e.key === "ArrowUp"
          ? -80
          : e.key === "PageDown" || e.key === " "
            ? innerHeight * 0.85
            : e.key === "PageUp"
              ? -innerHeight * 0.85
              : 0;
    if (delta) {
      e.preventDefault();
      this.targetScroll = clamp(
        this.targetScroll + delta,
        0,
        this.pages.scrollHeight - innerHeight,
      );
    }
    if (e.key === "Home") this.targetScroll = 0;
    if (e.key === "End")
      this.targetScroll = this.pages.scrollHeight - innerHeight;
  };
  private touchY = 0;
  private pointerDown = false;
  private downPoint = new THREE.Vector2();
  private down = (e: PointerEvent) => {
    this.pointerDown = true;
    this.downPoint.set(e.clientX, e.clientY);
    this.touchY = e.clientY;
    if (this.active) this.overlay.down(e);
    this.pressed = this.overlay.holding;
  };
  private up = (e: PointerEvent) => {
    if (
      this.active &&
      this.pointerDown &&
      this.downPoint.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) < 5 &&
      !(e.target as Element)?.closest("button,a,nav")
    )
      for (const section of this.sections)
        if (section.group.visible) section.onPointerClick?.();
    this.cancel();
  };
  // A browser-canceled touch ends the hold/scrollbar drag, but is not a click.
  private cancel = () => {
    this.pointerDown = false;
    this.overlay.up();
    this.pressed = false;
  };
  private move = (e: PointerEvent) => {
    this.overlay.move(e);
    this.targetPointer.set(
      (e.clientX / innerWidth - 0.5) * 2,
      (0.5 - e.clientY / innerHeight) * 2,
    );
    if (
      e.pointerType === "touch" &&
      this.pointerDown &&
      this.active &&
      !this.overlay.blocksScroll &&
      !this.sections.some((s) => s.blocksScroll)
    ) {
      this.targetScroll = clamp(
        this.targetScroll + this.touchY - e.clientY,
        0,
        this.pages.scrollHeight - innerHeight,
      );
      this.touchY = e.clientY;
    }
  };
  private render = (nowMs: number) => {
    if (this.disposed) return;
    const now = nowMs / 1000;
    const { delta, hz } = this.clock.tick(nowMs);
    const time = this.active ? Math.max(0, now - this.start) : 0;
    shared.time.value = now;
    this.composite.uniforms.uAgeGate.value +=
      ((this.active ? 0 : 1) - this.composite.uniforms.uAgeGate.value) * 0.02;
    this.inertia *= 0.9;
    this.targetScroll = clamp(
      this.targetScroll + this.inertia,
      0,
      this.pages.scrollHeight - innerHeight,
    );
    const previous = this.inputScroll;
    this.inputScroll += (this.targetScroll - this.inputScroll) * 0.5;
    this.scroll +=
      (this.inputScroll - this.scroll) *
      (1 - Math.pow(isMobileDevice ? 0.1 : 0.92, delta * 60));
    this.scrollDelta +=
      (this.inputScroll - previous - this.scrollDelta) *
      (1 - Math.pow(0.92, delta * 60));
    this.tilt = clamp(
      this.tilt +
        (0.002 * this.scrollDelta - this.tilt) *
          (1 - Math.pow(0.95, delta * 60)),
      -0.2,
      0.2,
    );
    this.pointer.lerp(this.targetPointer, 1 - Math.pow(0.96, delta * 60));
    this.camera.position.set(
      isMobileDevice || innerWidth < 768 ? 0 : this.pointer.x * 0.5,
      (-this.scroll / innerHeight) * worldHeight +
        (isMobileDevice || innerWidth < 768 ? 0 : -this.pointer.y * 0.5),
      5,
    );
    this.camera.lookAt(0, (-this.scroll / innerHeight) * worldHeight, 0);
    this.camera.rotateX(this.tilt);
    this.camera.updateMatrixWorld();
    this.pages.style.transform = `translate3d(0,${-this.scroll}px,0)`;
    this.fixedCameraMatrix.makeTranslation(
      0,
      (this.scroll / innerHeight) * worldHeight,
      -5,
    );
    const frame: Frame = {
      scroll: this.scroll,
      time,
      delta,
      hz,
      rawScrollDelta: this.inputScroll - previous,
      width: innerWidth,
      height: innerHeight,
      pointer: this.targetPointer,
      pressed: this.pressed,
      selected: this.selected,
      camera: this.camera,
      fixedCameraMatrix: this.fixedCameraMatrix,
    };
    this.overlay.update(
      frame,
      this.sections,
      this.active,
      this.inputScroll,
      this.scrollDelta,
      this.target.texture,
    );
    this.pressed = this.overlay.holding;
    frame.pressed = this.pressed;
    this.fluid.update(
      this.renderer,
      frame,
      this.inputScroll - previous,
      this.pressed &&
        this.sections.some((s) => s.name === "HandScene" && s.group.visible),
    );
    this.sections.forEach((s) => s.update(frame));
    this.onFrame(frame);
    this.composite.uniforms.uScrollY.value =
      (-this.scroll / innerHeight) * worldHeight;
    this.sections.forEach((s) => {
      if (s.group.visible)
        for (const render of s.beforeRender) render(this.renderer, frame);
    });
    this.renderer.setRenderTarget(this.target);
    this.renderer.render(this.scene, this.camera);
    this.sections.forEach((s) => {
      if (s.group.visible)
        for (const render of s.afterRender) render(this.renderer, frame);
    });
    if (this.useFxaa) {
      this.renderer.setRenderTarget(this.antialiasTarget);
      this.renderer.render(this.antialiasScene, this.compositeCamera);
    }
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.compositeScene, this.compositeCamera);
    this.overlay.render(this.renderer);
    this.raf = requestAnimationFrame(this.render);
  };
  dispose() {
    this.disposed = true;
    document.getElementById("shader-diagnostics")?.remove();
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("wheel", this.wheel);
    window.removeEventListener("keydown", this.key);
    window.removeEventListener("pointermove", this.move);
    window.removeEventListener("pointerdown", this.down);
    window.removeEventListener("pointerup", this.up);
    window.removeEventListener("pointercancel", this.cancel);
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.camera);
    this.sections.forEach((section) => section.dispose());
    this.composite.dispose();
    this.antialias.dispose();
    this.antialiasScene.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    this.compositeScene.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    this.fluid.dispose();
    this.overlay.dispose();
    this.renderer.dispose();
    this.target.dispose();
    this.antialiasTarget.dispose();
    this.renderer.domElement.remove();
  }
}
