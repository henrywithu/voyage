import * as THREE from "three";
import { FontAtlas } from "./FontAtlas";
import { material } from "./shaders";
import settingsJson from "../data/text3d.json";
import type { Layer } from "./SceneSection";
interface TextSettings {
  font: string;
  size: number;
  color: string;
  align: "left" | "center" | "right";
  lineHeight?: number;
  text?: string;
  anchor2D: boolean;
}
const settings = settingsJson as Record<string, TextSettings>,
  fonts = new Map<string, Promise<FontAtlas>>();
export class SourceText extends THREE.Mesh<
  THREE.BufferGeometry,
  THREE.RawShaderMaterial
> {
  private text = "";
  static async create(scene: string, layer: Layer) {
    const config = settings[`Element_${layer.id}_${scene}`];
    if (!config?.text) return null;
    if (!fonts.has(config.font))
      fonts.set(config.font, FontAtlas.load(config.font));
    return new SourceText(await fonts.get(config.font)!, config);
  }
  private constructor(
    readonly font: FontAtlas,
    readonly config: TextSettings,
  ) {
    super(
      new THREE.BufferGeometry(),
      material("Text3D", {
        tMap: font.map,
        uColor: new THREE.Color(config.color).convertLinearToSRGB(),
        uOpacity: 1,
        uAlpha: 1,
        uTransition: 1,
        uTranslate: new THREE.Vector3(),
        uRotate: new THREE.Vector3(),
        uPadding: 0.3,
      }),
    );
    this.frustumCulled = false;
    this.material.transparent = true;
    this.setText(config.text ?? "");
  }
  setText(text: string) {
    if (text === this.text) return;
    this.text = text;
    const layout = this.font.layout(
      text,
      this.config.size,
      Infinity,
      this.config.lineHeight ?? 1.4,
      [],
      this.config.align,
    );
    if (!this.config.anchor2D)
      layout.geometry.translate(0, layout.advanceHeight / 2, 0);
    this.geometry.dispose();
    this.geometry = layout.geometry;
    const u = this.material.uniforms;
    u.uLetterCount.value = layout.letters;
    u.uWordCount.value = layout.words;
    u.uLineCount.value = layout.lines;
    u.uBoundingMin.value.copy(this.geometry.boundingBox!.min);
    u.uBoundingMax.value.copy(this.geometry.boundingBox!.max);
  }
}
