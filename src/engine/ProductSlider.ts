import gsap from "gsap";
import type { SceneSection } from "./SceneSection";
export const mod = (value: number, divisor: number) =>
  ((value % divisor) + divisor) % divisor;
/** Interaction.Slider's infinite, interpolated X axis and the ProductsScene 20px touch-intent lock. */
export class ProductSlider {
  elapsed = 0;
  dragging = false;
  current = 0;
  readonly values = { x: 0 };
  private x = 0;
  private startX = 0;
  private startY = 0;
  private hold = 0;
  private down = false;
  private vertical = false;
  private lastX = 0;
  private delta = 0;
  private velocity = 0;
  private lastTime = 0;
  private idleFrames = 0;
  private samples: number[] = [];
  private lastSign = 1;
  constructor(
    readonly section: SceneSection,
    readonly element: HTMLElement,
  ) {
    element.addEventListener("pointerdown", this.start);
    window.addEventListener("pointermove", this.move);
    window.addEventListener("pointerup", this.end);
    window.addEventListener("pointercancel", this.end);
    window.addEventListener("keydown", this.key);
    section.disposables.push(() => this.dispose());
  }
  get width() {
    return innerWidth / 2;
  }
  private start = (event: PointerEvent) => {
    if ((event.target as Element).closest("button,a")) return;
    this.down = true;
    this.vertical = false;
    this.dragging = event.pointerType !== "touch";
    this.startX = this.lastX = event.clientX;
    this.startY = event.clientY;
    this.hold = this.values.x + this.width * this.current;
    this.delta = this.velocity = 0;
    this.lastTime = event.timeStamp;
    this.idleFrames = 0;
    gsap.killTweensOf(this.values);
    this.element.style.cursor = "grabbing";
  };
  private move = (event: PointerEvent) => {
    if (!this.down) return;
    if (event.timeStamp - this.lastTime < 16) return;
    const dx = event.clientX - this.startX,
      dy = event.clientY - this.startY;
    if (event.pointerType === "touch") {
      if (Math.abs(dx) >= 20 && !this.vertical) this.dragging = true;
      if (Math.abs(dy) >= 20 && !this.dragging) this.vertical = true;
    }
    if (!this.dragging) return;
    this.section.blocksScroll = event.pointerType === "touch";
    this.delta = event.clientX - this.lastX;
    this.samples.push(
      Math.abs(this.delta) / Math.max(1, event.timeStamp - this.lastTime),
    );
    if (this.samples.length > 5) this.samples.shift();
    this.velocity =
      this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length;
    this.idleFrames = 0;
    if (this.delta) this.lastSign = Math.sign(this.delta);
    this.lastX = event.clientX;
    this.lastTime = event.timeStamp;
    this.values.x =
      -this.width * this.current +
      dx * (event.pointerType === "touch" ? 1.5 : 1) +
      this.hold;
  };
  private end = () => {
    if (!this.down) return;
    this.down = false;
    this.section.blocksScroll = false;
    this.element.style.cursor = "grab";
    if (!this.dragging) return;
    const velocity = this.velocity * this.lastSign;
    if (Math.abs(velocity) > 1.5) {
      const flick = Math.log2(Math.abs(velocity)) * Math.sign(velocity);
      this.current = Math.round(-(this.x + flick) / this.width);
    } else if (Math.abs(velocity) > 0.1) this.current += velocity > 0 ? -1 : 1;
    else this.current = Math.round(-this.x / this.width);
    this.dragging = false;
    this.settle();
  };
  private key = (event: KeyboardEvent) => {
    if (!this.section.group.visible) return;
    if (event.key === "ArrowRight") this.step(1);
    if (event.key === "ArrowLeft") this.step(-1);
  };
  private settle() {
    gsap.to(this.values, {
      x: -this.width * this.current,
      duration: 1.2,
      ease: "power2.out",
      overwrite: true,
    });
  }
  step(delta: number) {
    this.current += delta;
    this.settle();
  }
  jump(index: number) {
    gsap.killTweensOf(this.values);
    this.current = index;
    this.x = this.values.x = -this.width * index;
    this.elapsed = index;
  }
  update() {
    if (this.down && this.idleFrames++ > 10) this.velocity = this.delta = 0;
    this.x += (this.values.x - this.x) * 0.3;
    this.elapsed = -this.x / this.width;
  }
  dispose() {
    gsap.killTweensOf(this.values);
    this.element.removeEventListener("pointerdown", this.start);
    window.removeEventListener("pointermove", this.move);
    window.removeEventListener("pointerup", this.end);
    window.removeEventListener("pointercancel", this.end);
    window.removeEventListener("keydown", this.key);
  }
}
