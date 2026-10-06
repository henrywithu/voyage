import { useEffect, useRef } from "react";
import lottie from "lottie-web";
import gsap from "gsap";
import { assetUrl } from "../engine/assetUrl";
interface Props {
  progress: number;
  error: string;
  ready: boolean;
  onReveal: () => void;
  onExit: () => void;
}
/** Original loader composition, half-speed Lottie, minimum three-second sequence and overlapping gate reveal. */
export function Loader({ progress, error, ready, onReveal, onExit }: Props) {
  const root = useRef<HTMLDivElement>(null),
    animation = useRef<HTMLDivElement>(null),
    track = useRef<SVGPathElement>(null),
    fill = useRef<SVGPathElement>(null),
    percent = useRef(progress),
    born = useRef(performance.now()),
    callbacks = useRef({ onReveal, onExit });
  percent.current = progress;
  callbacks.current = { onReveal, onExit };
  useEffect(() => {
    const player = lottie.loadAnimation({
      container: animation.current!,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path: assetUrl("assets/lottie/loader.json"),
    });
    player.setSpeed(0.5);
    const delay = setTimeout(() => player.play(), 200),
      logo = root.current!.querySelector(".logo"),
      bar = root.current!.querySelector(".loading-bar");
    const intro = gsap.timeline();
    intro.fromTo(
      logo,
      { opacity: 0, yPercent: 2 },
      { opacity: 1, yPercent: 0, duration: 1, ease: "sine.inOut" },
      0,
    );
    intro.fromTo(
      bar,
      { opacity: 0 },
      { opacity: 1, duration: 1, ease: "sine.inOut" },
      0.4,
    );
    const draw = () => {
      const noise = (x: number) =>
        ((43758.5453 * Math.sin(12.9898 * (x + 0.8))) % 1) * 0.8;
      let path = `M4 ${noise(0)}`;
      for (let i = 1; i <= 8; i++) {
        const x = (i / 8) * 100;
        path += ` L${x} ${noise(x) * 3}`;
      }
      path += " Z";
      track.current?.setAttribute("d", path);
      fill.current?.setAttribute("d", path);
      const len = fill.current?.getTotalLength() ?? 100;
      fill.current?.setAttribute("stroke-dasharray", String(len));
      fill.current?.setAttribute(
        "stroke-dashoffset",
        String(len * (1 - percent.current)),
      );
    };
    draw();
    const timer = setInterval(draw, 125);
    return () => {
      player.destroy();
      intro.kill();
      clearTimeout(delay);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    let fade: gsap.core.Tween | undefined;
    const timer = setTimeout(
      () => {
        callbacks.current.onReveal();
        fade = gsap.to(root.current, {
          opacity: 0,
          duration: 1,
          delay: 0.5,
          ease: "sine.inOut",
          onComplete: () => callbacks.current.onExit(),
        });
      },
      Math.max(0, 3000 - (performance.now() - born.current)),
    );
    return () => {
      clearTimeout(timer);
      fade?.kill();
    };
  }, [ready]);
  return (
    <div ref={root} className="LoaderView stack">
      <div className="logo">
        <img
          src={assetUrl("assets/images/trapnest-voyage-logo-footer.svg")}
          alt="Trapnest Voyage"
        />
      </div>
      <div className="lottie-container" ref={animation} />
      <div className="loading-bar stack" style={{ height: 8 }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 104 8"
          preserveAspectRatio="none"
          fill="none"
        >
          <path className="loading-bar__track" ref={track} />
          <path className="loading-bar__fill" ref={fill} />
        </svg>
      </div>
      {error && <p className="load-error">{error}</p>}
    </div>
  );
}
