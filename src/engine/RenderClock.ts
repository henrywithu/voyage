/** Hydra Render's sampled display-rate multiplier, distinct from per-frame delta. */
export class RenderClock {
  private readonly rates = [30, 60, 72, 90, 100, 120, 144, 240];
  private samples: number[] | undefined = [];
  private lastSample = 0;
  private sampled = false;
  private last = 0;
  private refreshRate = 60;

  tick(milliseconds: number) {
    const elapsed = this.last ? milliseconds - this.last : 1000 / 60;
    this.last = milliseconds;
    if (milliseconds - this.lastSample >= 3000) {
      this.lastSample = milliseconds;
      this.samples = [];
    }
    if (this.samples && elapsed > 0) {
      this.samples.push(1000 / elapsed);
      if (this.samples.length > 30) {
        this.samples.sort((a, b) => a - b);
        const median = this.samples[Math.round(this.samples.length / 2)];
        const rate = this.rates.reduce((a, b) =>
          Math.abs(b - median) < Math.abs(a - median) ? b : a,
        );
        this.refreshRate = this.sampled ? Math.max(this.refreshRate, rate) : rate;
        this.sampled = true;
        this.samples = undefined;
      }
    }
    return { delta: Math.min(200, elapsed) / 1000, hz: 60 / this.refreshRate };
  }
}
