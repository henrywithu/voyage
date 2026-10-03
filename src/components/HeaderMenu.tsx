import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SourceArt, findArt } from "./SourceArt";
import { NoisyBorder } from "./NoisyBorder";
import { readingSession } from "../engine/session";
interface Props {
  mode: string;
  onExperience: () => void;
  onCollection: () => void;
  onHover: (hover: boolean) => void;
}
/** Original four independent noisy SVG borders, refreshed at eight frames per second. */
export function HeaderMenu({
  mode,
  onExperience,
  onCollection,
  onHover,
}: Props) {
  const element = useRef<HTMLElement>(null);
  useEffect(() => {
    const root = element.current!,
      background = root.querySelector(".header__background"),
      content = [...root.querySelectorAll(".header__link,.header__ornament")];

    const animation = gsap.timeline();
    animation.fromTo(
      background,
      { scaleX: 0 },
      { scaleX: 1, duration: 1.1, ease: "power2.out" },
      4,
    );
    content.forEach((el, i) =>
      animation.fromTo(
        el,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
        4.2 + i * 0.1,
      ),
    );
    animation.seek(readingSession.time);
    return () => {
      animation.kill();
    };
  }, []);
  return (
    <nav
      ref={element}
      className="HeaderMenu"
      onPointerEnter={() => onHover(true)}
      onPointerLeave={() => onHover(false)}
    >
      <div className="header__background">
        <NoisyBorder />
      </div>
      <div className="header__content">
        <button
          className={"header__link " + (mode === "experience" ? "active" : "")}
          aria-pressed={mode === "experience"}
          onClick={onExperience}
        >
          <span>Experience</span>
        </button>
        <SourceArt node={findArt("HeaderMenu", "ornament")} />
        <button
          className={"header__link " + (mode === "collection" ? "active" : "")}
          aria-pressed={mode === "collection"}
          onClick={onCollection}
        >
          <span>Collection</span>
        </button>
      </div>
    </nav>
  );
}
