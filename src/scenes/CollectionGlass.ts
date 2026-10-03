import * as THREE from "three";
import gsap from "gsap";
import {isMobileDevice} from "../engine/device";
import { CustomEase } from "gsap/CustomEase";
import { SceneSection } from "../engine/SceneSection";
import { RefractionTexture } from "../engine/RefractionTexture";
import { LiquidMotion } from "../engine/LiquidMotion";
import { worldHeight, range } from "../data/sections";
import settings from "../data/product-settings.json";
gsap.registerPlugin(CustomEase);
const ease = CustomEase.create("source-collection", "0.30,0.09,0.00,1.05"),
  config = settings.Collection;
export function setupCollectionGlass(section: SceneSection) {
  if (section.name !== "CollectionScene") return;
  const root = section.layers.root,
    interaction = section.layers.glassInteraction,
    quad = section.mesh("textQuad"),
    title = section.mesh("title"),
    glass = section.mesh("glass"),
    liquid = section.mesh("liquid"),
    lineRoot = section.layers.lineRoot,
    line = section.mesh("line"),
    left = section.mesh("endLeft"),
    right = section.mesh("endRight"),
    glyph = section.mesh("cardBottomGlyph"),
    bg = section.mesh("bg");
  const center = new THREE.Group();
  center.position.z = 0.002;
  center.add(quad);
  section.group.add(center);
  interaction.add(root);
  section.group.add(interaction);
  const cards = [
    "cardBottomText",
    "cardTopText",
    "cardLeftText",
    "cardRightText",
  ].map((name) => section.mesh(name));
  quad.add(title, ...cards, glyph);
  title.scale.set(0.532, 0.532 * 0.8, 0.532 * 0.8);
  cards.forEach((card) => {
    card.material.uniforms.uTranslate.value.set(
      0,
      card.name === "cardBottomText" ? 0.025 : -0.025,
      0,
    );
    card.material.uniforms.uTransition.value = 0.001;
  });
  cards.slice(0, 2).forEach((card) => (card.material.depthWrite = false));
  bg.renderOrder = line.renderOrder = left.renderOrder = right.renderOrder = -1;
  line.material.uniforms.uBillboard ??= { value: 1 };
  const refraction = new RefractionTexture(0.8),
    liquidTarget = new THREE.WebGLRenderTarget(1, 1, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
    });
  glass.material.uniforms.tLiquid.value = liquidTarget.texture;
  glass.material.uniforms.tRefraction.value = refraction.text.texture;
  liquid.material.uniforms.tRefraction.value = refraction.blurred;
  const motion = new LiquidMotion(config),
    colors = [
      ["blueColor", "blueColorDark"],
      ["greenColor", "greenColorDark"],
      ["yellowColor", "yellowColorDark"],
    ] as const;
  const fill = liquid.material.uniforms.uFillAmount.value;
  let lineScale = 1,
    animated = false,
    t = 0,
    mouse = 0;
  const tweens: gsap.core.Tween[] = [];
  const tween = (target: any, vars: gsap.TweenVars) => {
    const handle = gsap.to(target, vars);
    tweens.push(handle);
    return handle;
  };
  const element = document.querySelector<HTMLElement>(
      '[data-scene="CollectionScene"]',
    )!,
    domLeft = element.querySelector<HTMLElement>(
      '[data-source-ref="leftText"]',
    )!,
    domRight = element.querySelector<HTMLElement>(
      '[data-source-ref="rightText"]',
    )!;
  section.onEnter = () => {
    tweens.splice(0).forEach((t) => t.kill());
    animated = false;
    cards.forEach((card) => (card.material.uniforms.uTransition.value = 0.001));
    lineRoot.scale.x = 0;
    line.material.uniforms.alpha.value = 0;
    root.position.y = -worldHeight;
    center.scale.x = 0;
    quad.material.uniforms.alpha.value = 0;
    title.material.uniforms.uTranslateIn.value = 0;
    for (const mesh of [left, right, glyph])
      mesh.material.uniforms.uAlpha.value = 0;
    const landscape = innerWidth > innerHeight;
    gsap.set(domLeft, { x: landscape ? "33vw" : 0, y: landscape ? 0 : "33vh" });
    gsap.set(domRight, {
      x: landscape ? "-33vw" : 0,
      y: landscape ? 0 : "-33vh",
    });
    for (const el of [domLeft, domRight])
      tween(el, {
        x: 0,
        y: 0,
        opacity: 1,
        duration: 2,
        ease,
        clearProps: "transform",
      });
    tween(line.material.uniforms.alpha, { value: 1, duration: 2, ease });
    for (const mesh of [left, right])
      tween(mesh.material.uniforms.uAlpha, { value: 1, duration: 2, ease });
    tween(lineRoot.scale, { x: lineScale, duration: 2, ease });
    tween(glyph.material.uniforms.uAlpha, {
      value: 1,
      duration: 2,
      delay: 2.05,
      ease,
    });
    tween(center.scale, { x: 1, duration: 0.667, delay: 0.55, ease });
    tween(quad.material.uniforms.alpha, {
      value: 1,
      duration: 0.167,
      delay: 0.55,
      ease: "none",
    });
    tween(title.material.uniforms.uTranslateIn, {
      value: 1,
      duration: 2,
      delay: 0.55,
      ease: "none",
    });
    for (const card of cards)
      tween(card.material.uniforms.uTransition, {
        value: 1,
        duration: 3,
        delay: card.name === "cardTopText" ? 0.55 : 1.05,
        ease,
      });
    tween(root.position, {
      y: -0.7,
      duration: 3,
      ease,
      onComplete: () => {
        animated = true;
      },
    });
  };
  section.onResize = (w, h) => {
    const factor = worldHeight / h,
      proxy = element
        .querySelector<HTMLElement>('[data-source-ref="textQuadProxy"]')!
        .getBoundingClientRect();
    quad.position.x = (proxy.left + proxy.width / 2 - w / 2) * factor;
    quad.scale.set(proxy.width * factor, proxy.height * factor, 1);
    bg.scale.set((3 * worldHeight * w) / h, section.height, 1);
    const landscape = w > h;
    lineRoot.visible = !(w < 1280 && landscape);
    const l = domLeft.getBoundingClientRect(),
      r = domRight.getBoundingClientRect();
    lineScale =
      ((landscape ? r.left - l.right : r.top - l.bottom) -
        (landscape ? 120 : 80)) *
      factor;
    lineRoot.rotation.z = landscape ? 0 : Math.PI / 2;
    left.scale.x = right.scale.x = 0.08 / lineScale;
    if (animated) lineRoot.scale.x = lineScale;
    else root.position.y = -worldHeight;
    root.scale.setScalar(range(w, 320, 1728, 2, 3, false));
    liquid.material.uniforms.uFillAmount.value = fill / (3 / root.scale.x);
    title.material.uniforms.uBoundsX.value.set(
      -0.5 * quad.scale.x,
      0.5 * quad.scale.x,
    );
    refraction.resize(w, h);
    liquidTarget.setSize(w, h);
  };
  section.animate = (frame) => {
    motion.update(
      interaction.position,
      interaction.rotation,
      frame.delta,
      liquid.material,
    );
    t += frame.delta * 10;
    if (isMobileDevice) {
      interaction.position.y = 0.17 + 0.1 * Math.sin(0.7 * frame.time);
      interaction.position.x = 0.11 * Math.sin(0.54 * frame.time);
      interaction.rotation.z = 0.13 * Math.cos(0.4 * frame.time);
    } else {
      mouse += (2 * frame.pointer.x - mouse) * config.posLerp;
      interaction.position.x = -range(
        mouse,
        -1,
        1,
        -config.posRangeX,
        config.posRangeX,
        false,
      );
      interaction.position.y = 0.1 * Math.sin(0.15 * t);
      interaction.rotation.z =
        0.1 * Math.cos(0.1 * t) +
        range(mouse, -1, 1, -config.rotRangeZ, config.rotRangeZ, false);
    }
    liquid.material.uniforms.uObjectPosition.value
      .copy(root.position)
      .add(interaction.position)
      .add(section.group.position);
    const [normal, dark] = colors[frame.selected];
    for (const key of ["uColor", "uColor2"])
      liquid.material.uniforms[key].value
        .set(config[normal])
        .convertLinearToSRGB();
    for (const key of ["uColorDark", "uColor2Dark"])
      liquid.material.uniforms[key].value
        .set(config[dark])
        .convertLinearToSRGB();
  };
  section.beforeRender.push((renderer, frame) => {
    title.material.uniforms.uColor.value.setRGB(1, 1, 1);
    refraction.render(renderer, frame.camera, [title]);
    refraction.render(renderer, frame.camera, [liquid], liquidTarget);
    title.material.uniforms.uColor.value.setRGB(0, 0, 0);
    refraction.renderBlur(renderer);
  });
  section.disposables.push(() => {
    tweens.forEach((t) => t.kill());
    refraction.dispose();
    liquidTarget.dispose();
  });
}
