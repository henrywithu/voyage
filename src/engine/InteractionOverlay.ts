import * as THREE from "three";
import gsap from "gsap";
import { isMobileDevice } from "./device";
import { AgeGateControls } from "./AgeGateControls";
import { AudioMeter } from "../audio/AudioMeter";
import { FontAtlas } from "./FontAtlas";
import { material } from "./shaders";
import { texture } from "./assets";
import { clamp, range, type SectionName } from "../data/sections";
import type { SceneSection, Frame } from "./SceneSection";

const labels: Partial<Record<SectionName, string>> = {
  HandScene: "HOLD &\nMOVE",
  DrinkPourScene: "HOLD &\nPOUR",
  AntiGravityScene: "HOLD",
  DrinkSelectionScene: "CHOOSE\nFLAVOR",
};
/** Screen-space GLUI port. Geometry, deformation, noise and timing come from GLUICursor / Scrollbar. */
export class InteractionOverlay {
  readonly scene = new THREE.Scene();
  readonly audioMeter = new AudioMeter();
  readonly ageGateControls = new AgeGateControls();
  readonly camera = new THREE.OrthographicCamera(0, 1, 0, -1, -100, 100);
  readonly cursor = new THREE.Group();
  private readonly background = material("GLUICursorBGShader", {
    tNoise: texture("assets/images/story/clouds_noise.png"),
    uHover: 0,
    uVelocity: new THREE.Vector2(),
    uDiscard: new THREE.Vector2(0, 1),
  });
  private readonly thumbMaterial = material("ScrollbarThumbShader", {
    tNoise: texture("assets/images/story/clouds_noise.png"),
    uDelta: 0,
    uHover: 0,
    uShow: 0,
  });
  private readonly thumb = new THREE.Mesh(
    new THREE.PlaneGeometry().translate(0.5, 0.5, 0),
    this.thumbMaterial,
  );
  private readonly logoMaterial = material("LogoShader", {
    tLogo: texture("assets/images/trapnest-spirit-logo.png", false),
    tNoise: texture("assets/images/story/clouds_noise.png"),
    tLines: texture("assets/images/story/lines.jpg"),
    uShow: 1,
    uColor: "#121212",
    uColor2: "#ffffff",
    uColor3: "#C82924",
  });
  private readonly logo = new THREE.Mesh(
    new THREE.PlaneGeometry(),
    this.logoMaterial,
  );
  private footerShown = false;
  private readonly texts = new Map<
    string,
    THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>
  >();
  private readonly cursorState = { scale: 0, alpha: 0, hover: 0 };
  private readonly mouse = new THREE.Vector2(-1000, -1000);
  private readonly previousMouse = this.mouse.clone();
  private readonly velocity = new THREE.Vector2();
  private width = 1;
  private height = 1;
  private thumbY = 0;
  private trackWidth = 15;
  private dragOffset = 0;
  private dragging = false;
  private mobile = false;
  private shown = false;
  private held = false;
  private activeLabel = "";
  private activeSection?: SceneSection;
  private onControl = false;
  private scroll = 0;
  private maximum = 0;
  private rawDelta = 0;
  private holdPosition = new THREE.Vector2();
  private releaseAt = 0;
  constructor(
    private readonly pages: HTMLElement,
    private readonly setScroll: (y: number) => void,
  ) {
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(), this.background);
    disc.scale.setScalar(120);
    this.cursor.add(disc);
    this.scene.add(this.cursor, this.thumb);
    this.cursor.scale.setScalar(0);
    this.scene.add(
      this.logo,
      this.audioMeter.group,
      this.ageGateControls.group,
    );
    for (const shader of [
      this.background,
      this.thumbMaterial,
      this.logoMaterial,
    ]) {
      shader.transparent = true;
      shader.depthTest = false;
      shader.depthWrite = false;
      shader.side = THREE.DoubleSide;
    }
  }
  async load() {
    const font = await FontAtlas.load("PPNikkeiMaru-Ultrabold");
    await this.ageGateControls.load(font);
    for (const text of Object.values(labels)) {
      const layout = font.layout(
        text,
        16,
        100,
        text.includes("\n") ? 1 : 0.6,
        [],
        "center",
      );
      const shader = material("DefaultText", {
        tMap: font.map,
        uColor: new THREE.Vector3(24 / 255, 24 / 255, 24 / 255),
        uAlpha: 0,
      });
      shader.depthTest = false;
      shader.depthWrite = false;
      const mesh = new THREE.Mesh(layout.geometry, shader);
      mesh.position.y = layout.advanceHeight / 2;
      mesh.position.z = 1;
      mesh.visible = false;
      this.cursor.add(mesh);
      this.texts.set(text, mesh);
    }
  }
  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.mobile = isMobileDevice;
    this.camera.right = w;
    this.camera.bottom = -h;
    this.camera.updateProjectionMatrix();
    this.trackWidth = range(w, 320, 1600, 10, 15);
    const width = range(w, 320, 1600, 7, 10);
    this.thumb.scale.set(width, -h * 0.15, 1);
    this.thumb.position.x = w - width - 2;
  }
  move(e: PointerEvent) {
    this.mouse.set(e.clientX, e.clientY);
    this.onControl = Boolean((e.target as Element)?.closest("button,a,nav"));
    if (this.dragging)
      this.setScroll(
        clamp((e.clientY - this.dragOffset) / (this.height * 0.85)) *
          this.maximum,
      );
  }
  down(e: PointerEvent) {
    this.move(e);
    if (!this.mobile && e.clientX >= this.width - this.trackWidth) {
      if (
        e.clientY >= this.thumbY &&
        e.clientY <= this.thumbY + this.height * 0.15
      ) {
        this.dragging = true;
        this.dragOffset = e.clientY - this.thumbY;
      } else this.setScroll((e.clientY / this.height) * this.maximum);
      return true;
    }
    const inside = this.mobile
      ? Math.abs(e.clientX - this.cursor.position.x) < 78 &&
        Math.abs(e.clientY + this.cursor.position.y) < 78
      : this.shown;
    if (this.activeSection?.control?.mode === "choose") return false;
    if (
      inside &&
      this.shown &&
      !this.onControl &&
      (!this.mobile || Math.abs(this.rawDelta) < 1)
    ) {
      this.held = true;
      this.holdPosition.copy(this.mouse);
      this.transition(true, true);
      return true;
    }
    return false;
  }
  up() {
    const wasHeld = this.held;
    this.dragging = false;
    this.held = false;
    if (wasHeld) {
      this.transition(this.shown, false);
      if (this.mobile) this.releaseAt = performance.now() + 300;
    }
    return wasHeld;
  }
  get holding() {
    return this.held;
  }
  get blocksScroll() {
    return (
      this.dragging ||
      (this.mobile && (this.held || performance.now() < this.releaseAt))
    );
  }
  private transition(show: boolean, hold: boolean) {
    const duration = show ? (hold ? 0.4 : 0.6) : 0.3;
    gsap.to(this.cursorState, {
      scale: show ? (hold ? (this.mobile ? 0.1 : 0.5) : 1) : 0,
      alpha: show && !hold ? 1 : 0,
      hover: hold ? 1 : 0,
      duration,
      ease: "power2.out",
      overwrite: true,
    });
  }
  update(
    frame: Frame,
    sections: SceneSection[],
    active: boolean,
    rawScroll: number,
    rawDelta: number,
    sceneTexture: THREE.Texture,
  ) {
    this.ageGateControls.update(frame.width, frame.height);
    this.audioMeter.group.visible = active;
    this.audioMeter.update(frame.width, frame.height, frame.time, sceneTexture);
    this.logo.visible = active;
    this.logoMaterial.uniforms.tScene.value = sceneTexture;
    const mobile = isMobileDevice,
      margin = range(frame.width, 393, 1600, 20, 24),
      logoHeight = range(frame.width, 393, 1600, 40, 60),
      logoWidth = logoHeight * (mobile ? 1.4 : 286 / 120),
      logoTop = range(frame.height, 393, 1600, 20, 18);
    this.logo.scale.set(logoWidth, logoHeight, 1);
    this.logo.position.set(
      margin + logoWidth / 2,
      -logoTop - logoHeight / 2,
      2,
    );
    this.logoMaterial.uniforms.tLogo.value = texture(
      mobile
        ? "assets/images/trapnest-spirit-logo-mobile.png"
        : "assets/images/trapnest-spirit-logo.png",
      false,
    );
    const footer = sections.find((s) => s.name === "FooterScene"),
      hide = Boolean(footer && frame.scroll + frame.height > footer.pixelTop);
    if (hide !== this.footerShown) {
      this.footerShown = hide;
      gsap.to(this.logoMaterial.uniforms.uShow, {
        value: hide ? 0 : 1,
        duration: 0.5,
        ease: "sine.out",
        overwrite: true,
      });
    } else if (!hide && frame.time < 6)
      this.logoMaterial.uniforms.uShow.value = Math.sin(
        (clamp((frame.time - 3) / 3) * Math.PI) / 2,
      );
    this.scroll = rawScroll;
    this.maximum = Math.max(0, this.pages.scrollHeight - this.height);
    this.rawDelta = rawDelta;
    const dt = frame.delta * 60,
      a = 1 - Math.pow(0.9, dt),
      sa = 1 - Math.pow(0.87, dt);
    this.velocity.x +=
      (this.mouse.x - this.previousMouse.x - this.velocity.x) * a;
    this.velocity.y +=
      (this.mouse.y - this.previousMouse.y - this.velocity.y) * a;
    this.previousMouse.copy(this.mouse);
    this.background.uniforms.uVelocity.value.set(
      this.mobile ? 0 : this.velocity.x,
      this.mobile ? 0 : -this.velocity.y,
    );
    const hovered = sections.find((section) => {
      if (!labels[section.name]) return false;
      if (section.control?.mode === "choose")
        return !this.mobile && Boolean(section.control.hovered);
      const top =
          section.pixelTop -
          frame.scroll +
          (section.control?.top ?? 0) * section.pixelHeight,
        bottom =
          top +
          (section.control?.height === undefined
            ? section.pixelHeight
            : section.control.height * frame.height);
      const y = this.mobile
        ? (section.control?.mobilePosition?.y ?? bottom * 0.7)
        : this.mouse.y;
      return (
        y > top &&
        y < bottom - (this.mobile ? 0 : 100) &&
        y > 0 &&
        y < this.height &&
        (!this.mobile || bottom >= section.pixelHeight / 3)
      );
    });
    const show =
      active && Boolean(hovered) && !this.onControl && !this.dragging;
    if (hovered !== this.activeSection || show !== this.shown) {
      if (this.held) this.up();
      this.activeSection = hovered;
      this.shown = show;
      this.transition(show, false);
    }
    const label = hovered ? labels[hovered.name]! : "";
    if (label !== this.activeLabel) {
      this.activeLabel = label;
      for (const [name, mesh] of this.texts) mesh.visible = name === label;
    }
    if (hovered) {
      this.background.uniforms.uDiscard.value.set(
        (hovered.pixelTop - frame.scroll) / this.height,
        Math.max(
          1,
          (hovered.pixelTop + hovered.pixelHeight - frame.scroll) / this.height,
        ),
      );
      if (this.mobile) {
        const bottom = hovered.pixelTop + hovered.pixelHeight - frame.scroll;
        const x = this.held
            ? this.mouse.x
            : (hovered.control?.mobilePosition?.x ??
              this.width * (hovered.name === "AntiGravityScene" ? 0.65 : 0.8)),
          y = this.held
            ? this.mouse.y
            : (hovered.control?.mobilePosition?.y ?? bottom * 0.7);
        const lerp = this.held ? 0.08 : 1;
        this.cursor.position.x += (x - this.cursor.position.x) * lerp;
        this.cursor.position.y += (-y - this.cursor.position.y) * lerp;
      }
    }
    if (!this.mobile) {
      this.cursor.position.x +=
        (this.mouse.x - 60 - this.cursor.position.x) * a;
      this.cursor.position.y +=
        (-this.mouse.y - 60 - this.cursor.position.y) * a;
    }
    this.cursor.scale.setScalar(this.cursorState.scale);
    this.background.uniforms.uHover.value = this.cursorState.hover;
    for (const mesh of this.texts.values())
      mesh.material.uniforms.uAlpha.value = this.cursorState.alpha;
    this.pages.style.cursor = show
      ? this.activeSection?.control?.mode === "choose"
        ? "pointer"
        : this.held
          ? "grabbing"
          : "grab"
      : "";
    this.thumb.visible = active && !this.mobile;
    const percent = this.maximum ? this.scroll / this.maximum : 0;
    this.thumbY += (percent * this.height * 0.85 - this.thumbY) * sa;
    this.thumbY += range(percent, 0, 1, -2, 2, false) * dt;
    this.thumb.position.y = -this.thumbY;
    const u = this.thumbMaterial.uniforms;
    u.tScene.value = sceneTexture;
    u.uDelta.value += (rawDelta - u.uDelta.value) * sa;
    u.uHover.value +=
      ((this.mouse.x >= this.width - this.trackWidth ? 1 : 0) -
        u.uHover.value) *
      sa;
    u.uShow.value = Math.sin((clamp((frame.time - 3) / 1.2) * Math.PI) / 2);
  }
  render(renderer: THREE.WebGLRenderer) {
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = auto;
  }
  dispose() {
    this.ageGateControls.dispose();
    this.ageGateControls.group.removeFromParent();
    this.audioMeter.dispose();
    this.audioMeter.group.removeFromParent();
    gsap.killTweensOf(this.logoMaterial.uniforms.uShow);
    gsap.killTweensOf(this.cursorState);
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        object.material.dispose();
      }
    });
    this.pages.style.cursor = "";
  }
}
