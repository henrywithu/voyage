import * as THREE from "three";
import gsap from "gsap";
import { SceneSection } from "../engine/SceneSection";
import { material } from "../engine/shaders";
import { texture, black } from "../engine/assets";
import { isMobileDevice } from "../engine/device";
/** Original RetailScene background is composited in screen space, extending 20px beyond the DOM row. */
export function setupRetailEditorial(section: SceneSection) {
  if (section.name !== "RetailScene") return;
  const element = document.querySelector<HTMLElement>(
      '[data-scene="RetailScene"]',
    )!,
    scene = new THREE.Scene(),
    camera = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);
  const shader = material("RetailBackgroundShader", {
      uColor: "#ffffff",
      tNoise: texture("assets/images/story/clouds_noise.png"),
      ...(isMobileDevice ? { tFluid: black, tFluidMask: black } : {}),
    }),
    quad = new THREE.Mesh(new THREE.PlaneGeometry(), shader);
  shader.depthTest = shader.depthWrite = false;
  scene.add(quad);
  const dom = (name: string) =>
      element.querySelector<HTMLElement>(`[data-source-ref="${name}"]`)!,
    tweens: gsap.core.Tween[] = [];
  section.onEnter = () => {
    tweens.splice(0).forEach((t) => t.kill());
    gsap.set(dom("headerDecor"), { opacity: 0 });
    tweens.push(
      gsap.to(dom("headerDecor"), {
        opacity: 1,
        duration: 1,
        ease: "power2.inOut",
      }),
    );
    for (const [i, name] of [
      "heading1",
      "heading3",
      "heading1mob",
      "heading3mob",
    ].entries()) {
      gsap.set(dom(name), { x: i % 2 ? "-10vw" : "10vw" });
      tweens.push(
        gsap.to(dom(name), {
          x: 0,
          opacity: 1,
          duration: 1,
          delay: 0.2,
          ease: "power2.inOut",
        }),
      );
    }
    gsap.set(dom("heading2"), { opacity: 0 });
    tweens.push(
      gsap.to(dom("heading2"), {
        opacity: 1,
        duration: 1,
        delay: 0.2,
        ease: "power2.inOut",
      }),
    );
  };
  section.onResize = (w, h) => {
    camera.right = w;
    camera.bottom = -h;
    camera.updateProjectionMatrix();
    quad.scale.set(w, element.clientHeight + 40, 1);
  };
  section.afterRender.push((renderer, frame) => {
    quad.position.set(
      frame.width / 2,
      -(section.pixelTop - frame.scroll + section.pixelHeight / 2),
      0,
    );
    const auto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(scene, camera);
    renderer.autoClear = auto;
  });
  section.disposables.push(() => {
    tweens.forEach((t) => t.kill());
    shader.dispose();
    quad.geometry.dispose();
  });
}
