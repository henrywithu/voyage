import gsap from "gsap";
import { SceneSection } from "../engine/SceneSection";
import { worldHeight } from "../data/sections";
export function setupTasteEditorial(section: SceneSection) {
  if (section.name !== "TasteScene") return;
  const element = document.querySelector<HTMLElement>(
      '[data-scene="TasteScene"]',
    )!,
    title = section.mesh("title"),
    bg = section.mesh("bg");
  const dom = (name: string) =>
    element.querySelector<HTMLElement>(`[data-source-ref="${name}"]`)!;
  title.renderOrder = -1000;
  title.material.uniforms.uFixed.value = 1;
  title.material.uniforms.uWhiteBits.value = 1;
  title.material.uniforms.uRowCount.value = 2;
  title.material.uniforms.uTranslateIn.value = 0;
  const tweens: gsap.core.Tween[] = [];
  section.onEnter = () => {
    tweens.splice(0).forEach((t) => t.kill());
    title.material.uniforms.uTranslateIn.value = 0;
    const narrow = innerWidth < 1280;
    gsap.set(dom("heading1"), { xPercent: narrow ? 25 : 50, opacity: 1 });
    gsap.set(dom("heading2"), {
      xPercent: narrow ? (innerWidth <= 390 ? 0 : -25) : 0,
      opacity: 1,
    });
    gsap.set(dom("heading3"), {
      xPercent: narrow ? (innerWidth <= 390 ? -25 : 0) : -50,
      opacity: 1,
    });
    for (const [i, name] of [
      "copyheading1",
      "copyheading2",
      "copyheading3",
      "copyheading4",
    ].entries())
      gsap.set(dom(name), { x: i % 2 ? "-23vw" : "23vw", opacity: 0 });
    gsap.set(dom("copyMobileHeading1"), { xPercent: 50, opacity: 0 });
    gsap.set(dom("copyMobileHeading2"), { xPercent: -50, opacity: 0 });
    gsap.set([dom("copy"), dom("rowHeading")], { opacity: 0 });
    tweens.push(
      gsap.to(title.material.uniforms.uTranslateIn, {
        value: 1,
        duration: 2,
        ease: "none",
      }),
      gsap.to(dom("rowHeading"), {
        opacity: 1,
        duration: 0.6,
        delay: 0.6,
        ease: "power2.inOut",
      }),
    );
    for (const name of ["heading1", "heading2", "heading3"])
      tweens.push(
        gsap.to(dom(name), {
          xPercent: 0,
          duration: 1.2,
          delay: 0.6,
          ease: "power2.inOut",
        }),
      );
    for (const name of [
      "copyheading1",
      "copyheading2",
      "copyheading3",
      "copyheading4",
      "copyMobileHeading1",
      "copyMobileHeading2",
    ])
      tweens.push(
        gsap.to(dom(name), {
          x: 0,
          xPercent: 0,
          opacity: 1,
          duration: 1.2,
          delay: 0.2,
          ease: "power2.inOut",
        }),
      );
    tweens.push(
      gsap.to(dom("copy"), {
        opacity: 1,
        duration: 1.2,
        delay: narrow ? 0.2 : 0.4,
        ease: "power2.inOut",
      }),
    );
  };
  section.onResize = (w, h) => {
    const bounds = dom("glBounds"),
      rect = bounds.getBoundingClientRect(),
      owner = element.getBoundingClientRect(),
      factor = worldHeight / h;
    title.position.set(
      (rect.left + rect.width / 2 - w / 2) * factor,
      section.height / 2 - (rect.top - owner.top + rect.height / 2) * factor,
      0,
    );
    title.scale.setScalar(0.33 * rect.width * factor);
    bg.scale.set((3 * worldHeight * w) / h, section.height, 1);
  };
  section.disposables.push(() => tweens.forEach((t) => t.kill()));
}
