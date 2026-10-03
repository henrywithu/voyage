import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { isMobileDevice } from "../engine/device";

export function RotatePrompt() {
  const [show, setShow] = useState(isMobileDevice && innerWidth > innerHeight);
  const text = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const query = matchMedia("(orientation: landscape)");
    const change = () => setShow(isMobileDevice && query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!show) return;
    const animation = gsap.fromTo(
      text.current!.querySelectorAll("span"),
      { yPercent: 105 },
      {
        yPercent: 0,
        delay: 0.2,
        duration: 0.8,
        stagger: 0.01,
        ease: "power2.out",
      },
    );
    return () => {
      animation.kill();
    };
  }, [show]);
  return (
    <div
      className="RotatePrompt"
      data-show={show}
      role={show ? "status" : undefined}
    >
      <div ref={text} className="XText heading3">
        <div className="notice-clip">
          <span>Please</span> <span>rotate</span>
        </div>
        <br />
        <div className="notice-clip">
          <span>your</span> <span>device.</span>
        </div>
      </div>
    </div>
  );
}
