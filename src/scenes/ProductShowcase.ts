import * as THREE from "three";
import gsap from "gsap";
import { isMobileDevice } from "../engine/device";
import { SceneSection } from "../engine/SceneSection";
import { SourceText } from "../engine/SourceText";
import { RefractionTexture } from "../engine/RefractionTexture";
import { LiquidMotion } from "../engine/LiquidMotion";
import { ProductSlider, mod } from "../engine/ProductSlider";
import { qualityUniforms } from "../engine/RenderQuality";
import { material } from "../engine/shaders";
import { texture } from "../engine/assets";
import { worldHeight, range } from "../data/sections";
import settings from "../data/product-settings.json";
const config = settings.Products;
const color = (hex: string) => new THREE.Color(hex).convertLinearToSRGB();
export const products = [
  {
    name: "Orange Chocolate & Cream",
    short: "Orange\nChocolate\n& Cream",
    color: config.blueColor,
    dark: config.blueColorDark,
    uv: 0,
  },
  {
    name: "Mint Chocolate & Cream",
    short: "Mint\nChocolate\n& Cream",
    color: config.greenColor,
    dark: config.greenColorDark,
    uv: 0.5,
  },
  {
    name: "Marshmallow Coffee & Cream",
    short: "Marshmallow\nCoffee\n& Cream",
    color: config.yellowColor,
    dark: config.yellowColorDark,
    uv: 0.25,
  },
];
const angleLerp = (current: number, target: number, alpha: number) =>
  current + (mod(target - current + Math.PI, Math.PI * 2) - Math.PI) * alpha;
export async function setupProductShowcase(section: SceneSection) {
  if (section.name !== "ProductsScene") return;
  const element = document.querySelector<HTMLElement>(
      '[data-scene="ProductsScene"]',
    )!,
    root = section.layers.bottleRoot;
  const bounds = new THREE.Group(),
    bottleGroup = new THREE.Group(),
    transform = new THREE.Group(),
    rotation = new THREE.Group();
  transform.position.z = rotation.position.z = 0.25;
  rotation.add(root);
  transform.add(rotation);
  bottleGroup.add(transform);
  bounds.add(bottleGroup);
  section.group.add(bounds);
  const slides = [0, 1, 2].map((i) => {
    const group = section.layers["group" + (i + 1)],
      text = section.mesh("text" + (i + 1)),
      copy = section.mesh("copy" + (i + 1));
    bounds.add(group);
    copy.material.uniforms.uFixed.value = 1;
    copy.material.uniforms.tMap.value = texture(
      `assets/images/trapnest-product-n${i + 1}.svg`,
      false,
    );
    text.material.uniforms.uTranslateIn.value = 0;
    copy.material.uniforms.uAlpha.value = 0;
    return {
      group,
      text,
      copy,
      copyScale: copy.scale.clone(),
      copyPosition: copy.position.clone(),
    };
  });
  const labels = [
    section.layers.carouselTextLeft,
    section.layers.carouselTextRight,
  ] as SourceText[];
  labels.forEach((l) => {
    l.material.uniforms.uFixed.value = 1;
  });
  const bottle = section.mesh("bottle"),
    liquid = section.mesh("liquid"),
    label = section.mesh("label"),
    bg = section.mesh("bg");
  bottle.renderOrder = 10;
  bg.material.depthTest = bg.material.depthWrite = false;
  bg.renderOrder = -1000;
  const refract = new RefractionTexture(0.2);
  bottle.material.uniforms.tRefraction.value =
    liquid.material.uniforms.tRefraction.value = refract.blurred;
  bottle.material.uniforms.tText.value = refract.text.texture;
  const cursor = section.layers.cursor,
    bgCursor = section.addMesh(
      new THREE.PlaneGeometry(),
      material("CursorShader", { tText: refract.text.texture }),
      cursor,
    ),
    arrow = section.addMesh(
      new THREE.PlaneGeometry(),
      material("TextureMaterial", {
        tMap: texture("assets/images/arrow-C23GEuxK.png", false),
        uAlpha: 1,
      }),
      cursor,
    );
  bgCursor.renderOrder = 8;
  arrow.renderOrder = 8.99;
  bgCursor.material.depthWrite = arrow.material.depthWrite = false;
  bgCursor.material.transparent = arrow.material.transparent = true;
  const slider = new ProductSlider(section, element),
    motion = new LiquidMotion(config);
  section.onProductStep = (delta) => {
    slider.step(delta);
    section.onAudio("carousel", 1, true);
  };
  section.disposables.push(() => refract.dispose());
  const intro = { reveal: 0, copy: 0, labels: 0 };
  let entry = -1,
    sourceSelected = -1,
    reported = -1,
    rotationY = 0,
    previousMouse = 0,
    direction = 0,
    t = 0,
    cursorScale = 0,
    targetLabelLeft = 0,
    targetLabelRight = 0;
  const cursorWorld = new THREE.Vector3();
  function enter(time: number) {
    entry = time;
    intro.reveal = intro.copy = intro.labels = 0;
    bottleGroup.position.y = -section.height * (isMobileDevice ? 1 : 0.5);
    gsap.to(intro, { reveal: 1, duration: 2, ease: "none", overwrite: "auto" });
    gsap.to(intro, {
      copy: 1,
      labels: 1,
      duration: 1,
      delay: 0.2,
      ease: "power2.inOut",
      overwrite: "auto",
    });
    gsap.to(bottleGroup.position, {
      y: 0,
      duration: 2,
      ease: "back.out",
      overwrite: true,
    });
  }
  section.disposables.push(() => {
    gsap.killTweensOf(intro);
    gsap.killTweensOf(bottleGroup.position);
  });
  section.onEnter = (frame) => enter(frame.time);
  section.animate = (frame) => {
    if (frame.selected !== sourceSelected) {
      sourceSelected = frame.selected;
      slider.jump(sourceSelected);
    }
    if (entry < 0 && frame.scroll + frame.height > section.pixelTop)
      enter(frame.time);
    slider.update();
    const elapsed = slider.elapsed,
      current = Math.floor(mod(elapsed + 0.001, 3)),
      transition = mod(elapsed + 0.001, 1),
      next = (current + 1) % 3;
    const display = transition > 0.5 ? next : current;
    if (display !== reported) {
      if (reported >= 0 && slider.dragging)
        section.onAudio("carousel", 1, true);
      reported = display;
      section.onProductChange(display);
      labels[0].setText(products[mod(display - 1, 3)].short.toUpperCase());
      labels[1].setText(products[(display + 1) % 3].short.toUpperCase());
    }
    const screenWidth = (worldHeight * frame.width) / frame.height;
    for (let i = 0; i < 3; i++) {
      const slide = slides[i];
      let offset = i - elapsed;
      const rounded = Math.round(offset),
        left = rounded > 1.01,
        right = rounded < -1.01;
      offset = left ? -offset + 1.01 : right ? offset - 1.01 - 1 : offset;
      offset %= 3;
      offset = left
        ? range(offset, -1, -1.01, -1.01, -1, false)
        : right
          ? range(offset, -1.01, -1, 1, 1.01, false)
          : offset;
      slide.group.position.x = offset * screenWidth;
      if (frame.time - entry > 1.4) {
        slide.text.position.x = slide.copy.position.x =
          -offset * 0.5 * screenWidth;
        slide.text.material.uniforms.uDirection.value = offset;
        slide.text.material.uniforms.uTranslateIn.value = 1 - Math.abs(offset);
        slide.copy.material.uniforms.uAlpha.value = 1 - Math.abs(2 * offset);
      } else {
        slide.text.material.uniforms.uTranslateIn.value =
          i === sourceSelected ? intro.reveal : 0;
        slide.copy.material.uniforms.uAlpha.value =
          i === sourceSelected ? intro.copy : 0;
      }
    }
    labels[0].position.x = THREE.MathUtils.lerp(
      -screenWidth * 0.5,
      targetLabelLeft,
      intro.labels,
    );
    labels[1].position.x = THREE.MathUtils.lerp(
      screenWidth * 0.5,
      targetLabelRight,
      intro.labels,
    );
    labels.forEach((l) => (l.material.uniforms.uOpacity.value = intro.labels));
    motion.update(
      transform.position,
      rotation.rotation,
      frame.delta,
      liquid.material,
    );
    t += frame.delta * 10;
    liquid.material.uniforms.uObjectPosition.value
      .copy(root.position)
      .add(transform.position)
      .add(section.group.position);
    liquid.material.uniforms.uObjectPosition.value.y -= range(
      frame.width,
      1200,
      390,
      0,
      1.07,
    );
    const p = products[current],
      q = products[next];
    for (const [key, value] of Object.entries({
      uColor: p.color,
      uColorDark: p.dark,
      uColor2: q.color,
      uColor2Dark: q.dark,
    }))
      liquid.material.uniforms[key].value.set(value).convertLinearToSRGB();
    liquid.material.uniforms.uTransition.value =
      label.material.uniforms.uTransition.value = transition;
    label.material.uniforms.uUVOffset1.value = p.uv;
    label.material.uniforms.uUVOffset2.value = q.uv;
    const mouseX = (frame.pointer.x + 1) * frame.width * 0.5,
      deltaX = mouseX - previousMouse;
    if (Math.abs(deltaX) > 0.01) direction = Math.sign(deltaX);
    if (!slider.dragging) rotationY += 0.1 * direction * frame.delta * 10;
    previousMouse = mouseX;
    const mx = isMobileDevice
      ? 0.4 * Math.sin(frame.time * 0.3)
      : frame.pointer.x;
    transform.position.x += (0.75 * mx - transform.position.x) * 0.1;
    transform.position.z +=
      ((slider.dragging ? 0.7 : 0.6) * range(frame.width, 500, 600, 0, 1) -
        transform.position.z) *
      0.1;
    rotation.rotation.y = angleLerp(rotation.rotation.y, mx * Math.PI, 0.1);
    root.rotation.y = angleLerp(
      root.rotation.y,
      rotationY -
        elapsed * Math.PI * 2 +
        (bottleGroup.position.x / screenWidth) * Math.PI * 2,
      0.1,
    );
    transform.rotation.z = angleLerp(
      transform.rotation.z,
      0.01 * Math.cos(0.1 * t) + (mx * Math.PI) / 12,
      0.1,
    );
    const overButton = element.querySelector("button:hover"),
      opacity = overButton ? 0 : 1,
      scale = overButton ? 2 : 1;
    cursor.visible = frame.width >= 960;
    cursorScale +=
      ((range(frame.width, 1600, 960, 80, 60, false) / frame.width) *
        screenWidth *
        scale -
        cursorScale) *
      0.1;
    bgCursor.scale.setScalar(cursorScale);
    arrow.scale.setScalar(cursorScale / 4);
    arrow.material.uniforms.uAlpha.value +=
      (opacity - arrow.material.uniforms.uAlpha.value) * 0.2;
    arrow.rotation.z +=
      ((frame.pointer.x > 0 ? 0 : Math.PI) - arrow.rotation.z) * 0.1;
    cursorWorld
      .set(frame.pointer.x, frame.pointer.y, 0.5)
      .unproject(frame.camera)
      .sub(frame.camera.position)
      .normalize();
    const cursorPlaneZ = section.group.position.z + cursor.position.z;
    cursorWorld
      .multiplyScalar(
        (cursorPlaneZ - frame.camera.position.z) / cursorWorld.z,
      )
      .add(frame.camera.position);
    cursor.position.x = cursorWorld.x - section.group.position.x;
    cursor.position.y = cursorWorld.y - section.group.position.y;
  };
  section.beforeRender.push((renderer, frame) => {
    refract.render(renderer, frame.camera, [
      ...slides.map((s) => s.text),
      ...labels,
    ]);
    refract.renderBlur(renderer);
  });
  section.onResize = (w, h) => {
    const screenWidth = (worldHeight * w) / h;
    bg.scale.set(screenWidth * 3, section.height, 1);
    const glBounds = element.querySelector<HTMLElement>(".gl-bounds")!,
      rect = glBounds.getBoundingClientRect(),
      factor = worldHeight / h;
    bounds.position.x = (rect.left + rect.width / 2 - w / 2) * factor;
    const scale = range(w, 1600, 960, 0.3, 0.275, false),
      ratio = range(w / h, 2, 1, 1, range(w, 1200, 600, 0.8, 1), false);
    bounds.scale.set(
      rect.width * factor * scale * ratio,
      rect.height * factor * scale * ratio,
      1,
    );
    slides.forEach((slide) => {
      slide.group.position.y = range(w, 390, 1024, 0.4 * worldHeight, 0);
      slide.copy.scale
        .copy(slide.copyScale)
        .multiplyScalar(range(w, 1600, 390, 1.5, 3));
      slide.copy.position
        .copy(slide.copyPosition)
        .multiplyScalar(range(w, 1600, 390, 1.2, 2));
    });
    bottleGroup.scale.setScalar(
      w < 1440
        ? range(w, 390, 600, 2, 1)
        : w < 1900
          ? range(h, 690, 1080, 0.9, 0.975)
          : w < 3000
            ? range(h, 800, 1080, 0.85, 0.9)
            : range(h, 1400, 2000, 0.7, 0.8),
    );
    root.scale.setScalar(range(w, 1200, 390, 1.9, 1));
    root.position.y = range(w, 1200, 390, -1.15, 0);
    const left = element
        .querySelector<HTMLElement>(".left-text")!
        .getBoundingClientRect(),
      right = element
        .querySelector<HTMLElement>(".right-text")!
        .getBoundingClientRect(),
      textScale = 1 + Math.max(left.width, left.height) * factor;
    targetLabelLeft = (left.left + left.width / 2 - w / 2) * factor;
    targetLabelRight = (right.left + right.width / 2 - w / 2) * factor;
    labels.forEach((l) => {
      l.visible = w >= 960;
      l.scale.setScalar(textScale);
    });
    refract.resize(
      w * qualityUniforms.sceneDpr.value,
      h * qualityUniforms.sceneDpr.value,
    );
    slider.jump(slider.current);
  };
}
