/** Original Noise.cnoise2d; its apparent noise is a sum of eight sinusoids. */
export function cnoise2d(x: number, y = 0) {
  const t = x * 0.3;
  y *= 0.8;
  return (
    0.3 *
    (Math.sin(1.8 * x + 10 * t) +
      Math.sin(4.8 * x + 15 * t) +
      Math.sin(-7 * x + 4 * t) +
      Math.sin(-5 * x + 7.1 * t) +
      Math.sin(-0.6 * y + 18 * t) +
      Math.sin(3.2 * y + 18 * t) +
      Math.sin(5.2 * y + 8 * t) +
      Math.sin(-5.2 * y + 4.5 * t))
  );
}
