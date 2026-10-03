import { useEffect, useRef } from "react";
import gsap from "gsap";
import { findArt, SourceArt } from "./SourceArt";
import { isMobileDevice } from "../engine/device";
import type { AgeGatePresentation } from "../engine/AgeGateControls";
interface Props {
  onEnter: () => void;
  onExit: () => void;
  onState: (state: AgeGatePresentation) => void;
  onSound: () => void;
}
/** AgeGate's original DOM hierarchy, clipped text motion, pointer tilt and GLUIButton bridge. */
export function AgeGate({ onEnter, onExit, onState, onSound }: Props) {
  const root = useRef<HTMLDivElement>(null),
    choose = useRef<(yes: boolean) => void>(() => {}),
    callbacks = useRef({ onEnter, onExit, onState, onSound });
  callbacks.current = { onEnter, onExit, onState, onSound };
  useEffect(() => {
    const element = root.current!,
      tilt = element.querySelector<HTMLElement>(".tilt")!,
      intro = element.querySelector<HTMLElement>(".intro")!,
      top = element.querySelector<HTMLElement>(".top")!,
      bottom = element.querySelector<HTMLElement>(".bottom")!,
      text1 = top.querySelector("h2")!,
      text2 = bottom.querySelector("h2")!,
      actions = element.querySelector<HTMLElement>(".actions")!,
      decor = element.querySelector(".decor")!,
      denied = element.querySelector<HTMLElement>(".denied")!,
      buttons = [...element.querySelectorAll<HTMLButtonElement>(".action")];
    const state: AgeGatePresentation = {
        visible: true,
        alpha: 0,
        centers: [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
        hover: [false, false],
        x: 0,
        y: 0,
        rotationX: 0,
        rotationY: 0,
      },
      motion = { strength: 0 },
      pointer = { x: 0, y: 0 },
      smooth = { x: 0, y: 0 };
    let clicked = false,
      animated = false,
      raf = 0;
    const timers: ReturnType<typeof setTimeout>[] = [],
      tweens: gsap.core.Tween[] = [];
    const tween = (target: gsap.TweenTarget, vars: gsap.TweenVars) => {
      const t = gsap.to(target, vars);
      tweens.push(t);
      return t;
    };
    gsap.set([text1, text2, actions], { opacity: 0 });
    gsap.set(text1, { yPercent: 110 });
    gsap.set(text2, { yPercent: -110 });
    gsap.set(decor, { scale: 0 });
    gsap.set(denied, { display: "none", opacity: 0 });
    const narrow = innerWidth < 768;
    gsap.set(buttons[0], { xPercent: narrow ? -100 : 100 });
    gsap.set(buttons[1], { xPercent: narrow ? 100 : -100 });
    const measure = () => {
      if (!animated) return;
      gsap.set(text1, {
        yPercent: 0,
        y: -(top.offsetHeight - text1.getBoundingClientRect().height),
      });
      gsap.set(text2, {
        yPercent: 0,
        y: bottom.offsetHeight - text2.getBoundingClientRect().height,
      });
    };
    const move = (e: PointerEvent) => {
      pointer.x = (2 * e.clientX) / innerWidth - 1;
      pointer.y = 1 - (2 * e.clientY) / innerHeight;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("resize", measure);
    const loop = () => {
      if (!isMobileDevice) {
        smooth.x += (pointer.x - smooth.x) * 0.1;
        smooth.y += (pointer.y - smooth.y) * 0.1;
        const strength = 0.25 * motion.strength;
        state.x = smooth.x * -80 * strength;
        state.y = smooth.y * 20 * strength;
        state.rotationX = -smooth.y * 10 * strength;
        state.rotationY = smooth.x * -20 * strength;
      }
      tilt.style.transform = "none";
      buttons.forEach((button, i) => {
        const rect = button.getBoundingClientRect();
        state.centers[i].x = rect.x + rect.width / 2;
        state.centers[i].y = rect.y + rect.height / 2;
        state.hover[i] =
          !clicked &&
          (button.matches(":hover") || button === document.activeElement);
      });
      tilt.style.transform = `translate3d(${state.x}px,${state.y}px,0) rotateX(${state.rotationX}deg) rotateY(${state.rotationY}deg)`;
      callbacks.current.onState(state);
      raf = requestAnimationFrame(loop);
    };
    loop();
    timers.push(
      setTimeout(() => {
        tween(text1, {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: "power2.inOut",
        });
        tween(text2, {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: "power2.inOut",
        });
      }, 1000),
    );
    timers.push(
      setTimeout(() => {
        animated = true;
        tween(actions, { opacity: 1, duration: 1, ease: "power2.inOut" });
        tween(text1, {
          y: -(top.offsetHeight - text1.getBoundingClientRect().height),
          duration: 1,
          ease: "power3.inOut",
        });
        tween(text2, {
          y: bottom.offsetHeight - text2.getBoundingClientRect().height,
          duration: 1,
          ease: "power3.inOut",
        });
        for (const button of buttons)
          tween(button, { xPercent: 0, duration: 1, ease: "power2.inOut" });
        tween(state, { alpha: 1, duration: 1, ease: "power2.inOut" });
        tween(decor, { scale: 1, duration: 1, ease: "power2.inOut" });
        tween(motion, {
          strength: 1,
          duration: 2,
          delay: 0.4,
          ease: "power2.inOut",
        });
      }, 2200),
    );
    choose.current = (yes) => {
      if (clicked) return;
      clicked = true;
      callbacks.current.onSound();
      tween(state, { alpha: 0, duration: 1, ease: "power2.inOut" });
      tween(top, {
        y: -top.getBoundingClientRect().height,
        duration: 1,
        ease: "power2.inOut",
      });
      tween(bottom, {
        y: bottom.getBoundingClientRect().height,
        duration: 1,
        ease: "power2.inOut",
      });
      if (yes) {
        callbacks.current.onEnter();
        tween(element, {
          opacity: 0,
          duration: 1,
          delay: 0.3,
          ease: "power2.inOut",
          onComplete: () => {
            state.visible = false;
            callbacks.current.onExit();
          },
        });
      } else {
        gsap.set(denied, { display: "flex" });
        tween(intro, {
          opacity: 0,
          duration: 1,
          ease: "power2.inOut",
          onComplete: () => {
            intro.style.display = "none";
          },
        });
        tween(denied, {
          opacity: 1,
          duration: 1,
          delay: 0.5,
          ease: "power2.inOut",
        });
      }
    };
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      tweens.forEach((t) => t.kill());
      window.removeEventListener("pointermove", move);
      window.removeEventListener("resize", measure);
      state.visible = false;
      callbacks.current.onState(state);
    };
  }, []);
  return (
    <div
      ref={root}
      className="AgeGate"
      role="dialog"
      aria-modal="true"
      aria-label="L.A.S.T. entry question"
    >
      <div className="tilt">
        <div className="intro">
          <div className="top">
            <h2 className="heading2">Do you know</h2>
          </div>
          <div className="bottom">
            <h2 className="heading2">L.A.S.T.?</h2>
          </div>
          <div className="actions">
            <button
              className="action body-bold"
              onClick={() => choose.current(true)}
            >
              Yes
            </button>
            <div className="decor">
              <SourceArt node={findArt("AgeGate")} />
            </div>
            <button
              className="action body-bold"
              onClick={() => choose.current(false)}
            >
              No
            </button>
          </div>
        </div>
        <div className="denied">
          <h2 className="heading3">
            Access
            <br />
            Denied
          </h2>
          <p className="body-bold">You may want to visit Trapnest.</p>
        </div>
      </div>
    </div>
  );
}
