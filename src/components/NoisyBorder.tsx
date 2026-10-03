import { useEffect, useRef } from "react";

/** Shared source border renderer; the header has six side samples and the notice has nine. */
export function NoisyBorder({ notice = false }: { notice?: boolean }) {
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const paths = [...svg.current!.querySelectorAll("path")];
    const draw = () => {
      const time = performance.now();
      const noise = (x: number, y: number) =>
        ((43758.5453 * Math.sin(12.9898 * (x + time) + 78.233 * y)) % 1) * 0.8;
      const d = ["M0 0", "M100 0", "M0 100", "M0 0"];
      for (let i = 0; i < 11; i++) {
        const x = i * 10;
        d[0] += `L${x} ${noise(x, 0)}`;
        d[2] += `L${x} ${100 + noise(x, 100)}`;
      }
      const count = notice ? 9 : 6,
        edge = notice ? 1 : 3;
      for (let i = 0; i < count; i++) {
        const y = -edge + (i / (count - 1)) * (100 + edge * 2);
        d[1] += `L${100 + 0.2 * noise(100, y)} ${y}`;
        d[3] += `L${0.2 * noise(0, y)} ${y}`;
      }
      paths.forEach((path, i) => path.setAttribute("d", d[i]));
    };
    draw();
    const interval = setInterval(draw, 125);
    return () => clearInterval(interval);
  }, [notice]);
  return (
    <svg
      ref={svg}
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          className="border-path"
          stroke="#111111"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
