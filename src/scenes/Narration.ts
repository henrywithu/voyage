import * as THREE from "three";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { FontAtlas, type TimedWord } from "../engine/FontAtlas";
import { material } from "../engine/shaders";
import { texture } from "../engine/assets";
import { SceneSection, type Frame } from "../engine/SceneSection";
import {
  narrativeLayouts,
  type NarrativeParams,
} from "../data/narrative-layouts";
import { worldHeight, clamp } from "../data/sections";
gsap.registerPlugin(CustomEase);
const textBoxEase = CustomEase.create("source-text-box", "0.45,0.30,0.16,1.00");
export type NarrationData = Record<
  string,
  { text: string; words: TimedWord[] }
>;
export class NarrativeBox {
  readonly group = new THREE.Group();
  readonly container = new THREE.Group();
  readonly text: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>;
  readonly background: THREE.Mesh<
    THREE.BufferGeometry,
    THREE.RawShaderMaterial
  >;
  private translate = new THREE.DataTexture(
    new Float32Array([1]),
    1,
    1,
    THREE.RedFormat,
    THREE.FloatType,
  );
  private opacity = new THREE.DataTexture(
    new Float32Array([1]),
    1,
    1,
    THREE.RedFormat,
    THREE.FloatType,
  );
  private started = -1;
  private world = new THREE.Vector3();
  private dimensions = { width: 1, height: 1 };
  private baseY = 0;
  private isMuted = false;
  private inView = false;
  private voiceElapsed?: () => number;
  get visible() {
    return this.scene.group.visible && this.group.visible && this.inView;
  }
  played = false;
  onReveal: (box: NarrativeBox) => void = () => {};
  constructor(
    readonly scene: SceneSection,
    private params: NarrativeParams,
    readonly font: FontAtlas,
    readonly data: NarrationData,
  ) {
    this.text = scene.addMesh(
      new THREE.BufferGeometry(),
      material("TextBoxTextShader", {
        tMap: font.map,
        uColor: new THREE.Vector3(0, 0, 0),
        uColorHighlight: new THREE.Vector3(200 / 255, 41 / 255, 36 / 255),
        uTranslate: this.translate,
        uOpacity: this.opacity,
        uKaraokeInfluence: 1,
        uKaraokeTime: 0,
      }),
      this.container,
    );
    this.background = scene.addMesh(
      new THREE.PlaneGeometry(),
      material("BorderBGShader", {
        uColor: new THREE.Vector3(1, 1, 1),
        uBorder: new THREE.Vector3(17 / 255, 17 / 255, 17 / 255),
        alpha: 0,
        tNoise: texture("assets/images/story/clouds_noise.png"),
      }),
      this.container,
    );
    for (const m of [this.background, this.text]) {
      m.material.transparent = true;
      m.material.depthTest = false;
      m.material.depthWrite = false;
    }
    this.background.renderOrder = 1001;
    this.text.renderOrder = 1002;
    this.group.add(this.container);
    scene.group.add(this.group);
    this.container.visible = false;
    scene.disposables.push(() => {
      gsap.killTweensOf(this.container.position);
      gsap.killTweensOf(this.container.scale);
      gsap.killTweensOf(this.text.material.uniforms.uKaraokeInfluence);
      this.translate.dispose();
      this.opacity.dispose();
    });
  }
  get id() {
    return String(this.params.id);
  }
  resize(params: NarrativeParams, w: number, h: number) {
    this.params = params;
    const p = params,
      z = p.offsetZ ?? 0.25,
      padding = p.padding ?? 0.2,
      size = p.fontSize ?? 0.044,
      screenHeight = (worldHeight * (5 - z)) / 5,
      screenWidth = (screenHeight * w) / h;
    const sourceTimings = this.data[this.id]?.words;
    const omittedBrandIndex =
      this.id === "13"
        ? (sourceTimings?.findIndex((word) => /Santioni/i.test(word.text)) ?? -1)
        : -1;
    const nextWordIndex =
      omittedBrandIndex < 0
        ? -1
        : (sourceTimings?.findIndex(
            (word, index) => index > omittedBrandIndex && word.type === "word",
          ) ?? -1);
    const omittedDuration =
      omittedBrandIndex < 0 || nextWordIndex < 0
        ? 0
        : sourceTimings![nextWordIndex].start -
          sourceTimings![omittedBrandIndex].start;
    const timings = sourceTimings?.flatMap((word, index) => {
      if (index === omittedBrandIndex || index === omittedBrandIndex + 1)
        return [];
      const shifted = index > omittedBrandIndex + 1 && omittedDuration > 0;
      return [
        {
          ...word,
          start: shifted ? word.start - omittedDuration : word.start,
          end: shifted ? word.end - omittedDuration : word.end,
          text: word.text
            .replace(/Santioni/gi, "Trapnest")
            .replace(/Spirits/gi, "Spirit"),
        },
      ];
    });
    const text = (timings?.map((word) => word.text).join("") ?? p.body)
      .replace(/Santioni Spirits/gi, "Trapnest Spirit")
      .toUpperCase();
    let layout = this.font.layout(
      text,
      size,
      ((p.width ?? Infinity) * worldHeight) / h,
      p.lineHeight ?? 1.7,
      timings,
    );
    const available = screenWidth - padding - (p.padx ?? 0);
    if (layout.width > available) {
      layout.geometry.dispose();
      layout = this.font.layout(
        text,
        size,
        available,
        p.lineHeight ?? 1.7,
        timings,
      );
    }
    this.text.geometry.dispose();
    this.text.geometry = layout.geometry;
    this.text.position.y = layout.advanceHeight * 0.5;
    const totalWidth = layout.width + padding,
      totalHeight = layout.height + padding;
    this.background.position.set(layout.width * 0.5, -0.1 * size, 0);
    this.background.scale.set(totalWidth, totalHeight, 1);
    this.background.material.uniforms.uDimensions.value.set(
      layout.width,
      layout.height,
    );
    this.background.material.uniforms.uAspectRatio.value =
      totalWidth / totalHeight;
    let x = p.padx ?? 0;
    const y =
      p.verticalAlign === "top"
        ? this.scene.height * 0.5 - (p.pady ?? 0)
        : p.verticalAlign === "bottom"
          ? -this.scene.height * 0.5 + (p.pady ?? 0)
          : (p.pady ?? 0);
    if (p.horizontalAlign === "center")
      x += screenWidth * 0.5 - totalWidth * 0.5;
    else if (p.horizontalAlign === "right") x = screenWidth - totalWidth - x;
    this.group.position.set(-screenWidth * 0.5 + padding * 0.5 + x, y, z);
    this.dimensions = layout;
    this.baseY = y;
    this.translate.dispose();
    this.opacity.dispose();
    this.translate = new THREE.DataTexture(
      new Float32Array(layout.lines).fill(this.started < 0 ? 1 : 0),
      layout.lines,
      1,
      THREE.RedFormat,
      THREE.FloatType,
    );
    this.opacity = this.translate.clone();
    this.opacity.image = {
      data: new Float32Array(layout.lines).fill(this.started < 0 ? 1 : 0),
      width: layout.lines,
      height: 1,
    };
    this.translate.needsUpdate = this.opacity.needsUpdate = true;
    this.text.material.uniforms.uTranslate.value = this.translate;
    this.text.material.uniforms.uOpacity.value = this.opacity;
    this.text.material.uniforms.uCount.value.set(
      layout.letters,
      layout.words,
      Math.max(1, layout.lines - 1),
    );
  }
  update(frame: Frame) {
    if (this.scene.name === "HandScene")
      this.group.position.y =
        this.baseY -
        clamp(
          (frame.scroll / frame.height) * worldHeight - this.scene.top,
          0,
          this.scene.height - worldHeight,
        );
    this.group.visible =
      this.scene.name !== "AntiGravityScene" ||
      this.id === ["orange", "14", "marshmallow"][frame.selected];
    this.group.getWorldPosition(this.world);
    const distance = this.world.y + (frame.scroll / frame.height) * worldHeight;
    this.inView =
      this.scene.group.visible &&
      this.group.visible &&
      distance >
        this.dimensions.height * 0.5 -
          ((worldHeight * (5 - (this.params.offsetZ ?? 0.25))) / 5) * 0.6 &&
      distance <
        this.dimensions.height +
          ((worldHeight * (5 - (this.params.offsetZ ?? 0.25))) / 5) * 0.5;
    if (this.visible && this.started < 0 && frame.time > 0) {
      this.started = frame.time;
      this.container.visible = true;
      this.container.position.x = -0.5;
      this.container.scale.x = 0.25;
      gsap.to(this.container.position, {
        x: 0,
        duration: 0.8,
        ease: textBoxEase,
      });
      gsap.to(this.container.scale, {
        x: 1,
        duration: 0.8,
        ease: textBoxEase,
      });
      this.onReveal(this);
    }
    if (this.started < 0) return;
    const elapsed = frame.time - this.started;
    this.background.material.uniforms.alpha.value = clamp(elapsed / 0.333);
    const lines = this.translate.image.width;
    for (let i = 0; i < lines; i++) {
      (this.translate.image.data as Float32Array)[i] =
        (1 - clamp((elapsed - i * (lines > 4 ? 0.15 : 0.2)) / 2)) ** 4;
      (this.opacity.image.data as Float32Array)[i] =
        (1 - clamp((elapsed - 0.3 - i * (lines > 4 ? 0.15 : 0.1)) / 1.2)) ** 4;
    }
    this.translate.needsUpdate = this.opacity.needsUpdate = true;
    if (this.voiceElapsed)
      this.text.material.uniforms.uKaraokeTime.value =
        this.voiceElapsed();
  }
  startVoice(elapsed: () => number) {
    this.voiceElapsed = elapsed;
    this.text.material.uniforms.uKaraokeTime.value = 0;
  }
  set muted(value: boolean) {
    if (this.isMuted === value) return;
    this.isMuted = value;
    gsap.to(this.text.material.uniforms.uKaraokeInfluence, {
      value: value ? 0 : 1,
      duration: 0.4,
      ease: "power2.out",
      overwrite: true,
    });
  }
  stopVoice() {
    this.voiceElapsed = undefined;
    gsap.to(this.text.material.uniforms.uKaraokeInfluence, {
      value: 0,
      duration: 0.6,
      ease: "power2.out",
      overwrite: true,
    });
  }
  reset() {
    this.started = -1;
    this.voiceElapsed = undefined;
    this.played = false;
    this.container.visible = false;
    this.background.material.uniforms.alpha.value = 0;
    this.text.material.uniforms.uKaraokeTime.value = 0;
    this.text.material.uniforms.uKaraokeInfluence.value = this.isMuted ? 0 : 1;
  }
}
export async function setupNarration(scenes: SceneSection[]) {
  const [font, data] = await Promise.all([
    FontAtlas.load(),
    fetch("/assets/data/vo/all_timestamps.json").then((r) =>
      r.json(),
    ) as Promise<NarrationData>,
  ]);
  const boxes: NarrativeBox[] = [];
  for (const scene of scenes) {
    const getLayout = narrativeLayouts[scene.name];
    if (!getLayout) continue;
    const sceneBoxes = getLayout(innerWidth, innerHeight).map(
      (p) => new NarrativeBox(scene, p, font, data),
    );
    boxes.push(...sceneBoxes);
    const resize = scene.onResize;
    scene.onResize = (w, h) => {
      resize(w, h);
      getLayout(w, h).forEach((p, i) => sceneBoxes[i].resize(p, w, h));
    };
    scene.updates.push((frame) =>
      sceneBoxes.forEach((box) => box.update(frame)),
    );
  }
  return boxes;
}
