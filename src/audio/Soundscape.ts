import type { Frame, SceneSection } from "../engine/SceneSection";
import type { NarrativeBox } from "../scenes/Narration";
import { range, clamp, worldHeight } from "../data/sections";
import { tracks, loopIds, roundRobins, frequencyBands } from "./catalog";
import { mp3LoopBounds } from "./loopBounds";

/** Web Audio graph reconstructed from AudioManager, AudioConfig, Story and scene controllers. */
export class Soundscape {
  private ctx?: AudioContext;
  private master?: GainNode;
  private main?: GainNode;
  private effects?: GainNode;
  private analyser?: AnalyserNode;
  private readonly frequencies = new Uint8Array(128);
  readonly bands = [0, 0, 0, 0];
  private loops = new Map<
    string,
    { gain: GainNode; source: AudioBufferSourceNode }
  >();
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private readonly fileType = document.createElement("audio").canPlayType("audio/ogg") &&
    !new URLSearchParams(location.search).has("forceMP3") ? "ogg" : "mp3";
  private readonly loopBounds = new WeakMap<AudioBuffer, { start: number; end: number }>();
  private sources = new Set<AudioBufferSourceNode>();
  private playing = new Map<
    string,
    { source: AudioBufferSourceNode; gain: GainNode }
  >();
  private robin = new Map<string, number>();
  private disposed = false;
  private starting?: Promise<void>;
  private drone?: GainNode;
  private portal?: GainNode;
  private portalFilter?: BiquadFilterNode;
  private panner?: StereoPannerNode;
  private vortexInput?: GainNode;
  private vortexDry?: GainNode;
  private vortexWet?: GainNode;
  private visibility = () => {
    if (this.ctx && this.master)
      this.master.gain.setTargetAtTime(
        document.hidden || this.muted ? 0 : 1,
        this.ctx.currentTime,
        0.05,
      );
  };
  muted = false;
  async start() {
    if (this.disposed) return;
    if (this.ctx) {
      await this.ctx.resume();
      return this.starting;
    }
    const ctx = (this.ctx = new AudioContext());
    this.master = ctx.createGain();
    this.main = ctx.createGain();
    this.main.connect(this.master).connect(ctx.destination);
    this.effects = ctx.createGain();
    this.effects.connect(this.main);
    this.main.gain.value = this.master.gain.value = this.muted ? 0 : 1;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.main.connect(this.analyser);
    this.drone = ctx.createGain();
    this.drone.connect(this.main);
    this.portal = ctx.createGain();
    this.portalFilter = ctx.createBiquadFilter();
    this.portalFilter.type = "lowpass";
    this.portalFilter.frequency.value = 350;
    this.portal.connect(this.portalFilter).connect(this.effects);
    this.panner = ctx.createStereoPanner();
    this.panner.connect(this.effects);
    this.vortexInput = ctx.createGain();
    this.vortexDry = ctx.createGain();
    this.vortexWet = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;
    this.vortexWet.gain.value = 0;
    this.vortexInput.connect(this.vortexDry).connect(this.main);
    this.vortexInput.connect(filter).connect(this.vortexWet).connect(this.main);
    document.addEventListener("visibilitychange", this.visibility);
    this.starting = Promise.all(
      Object.values(tracks).map((track) => this.buffer(track.path)),
    ).then(() => {
      if (this.disposed) return;
      for (const id of loopIds) {
        const track = tracks[id],
          source = ctx.createBufferSource(),
          gain = ctx.createGain();
        gain.gain.value = 0;
        source.loop = true;
        source.connect(gain).connect(this.output(id));
        this.loops.set(id, { source, gain });
        void this.buffer(track.path).then((buffer) => {
          if (this.disposed) return;
          source.buffer = buffer;
          const bounds = this.loopBounds.get(buffer);
          if (bounds) {
            source.loopStart = bounds.start;
            source.loopEnd = bounds.end;
          }
          source.start();
        });
      }
    });
    await ctx.resume();
    return this.starting;
  }
  private output(id: string): AudioNode {
    return tracks[id]?.chain === "drone"
      ? this.drone!
      : tracks[id]?.chain === "portalMove"
        ? this.portal!
        : tracks[id]?.chain === "panWithCursor"
          ? this.panner!
          : tracks[id]?.chain === "vortexFocus"
            ? this.vortexInput!
            : this.effects!;
  }
  private async buffer(path: string) {
    if (this.buffers.has(path)) return this.buffers.get(path)!;
    const context = this.ctx!;
    const isVoice = path.startsWith("vo/");
    const extension = isVoice ? "mp3" : this.fileType;
    const result = fetch(
      "/assets/audio/" + path + "." + extension,
    )
      .then((r) => {
        if (!r.ok) throw new Error("Missing audio " + path);
        return r.arrayBuffer();
      })
      .then((b) => context.decodeAudioData(b))
      .then((buffer) => {
        if (!isVoice && extension === "mp3")
          this.loopBounds.set(buffer, mp3LoopBounds(buffer));
        return buffer;
      });
    this.buffers.set(path, result);
    return result;
  }
  async play(idOrPath: string, volume = 1) {
    if (!this.ctx || !this.main || this.disposed) return;
    const track = tracks[idOrPath],
      buffer = await this.buffer(track?.path ?? idOrPath);
    if (this.disposed) return;
    const src = this.ctx.createBufferSource();
    if (!idOrPath.startsWith("textbox_"))
      this.playing.get(idOrPath)?.source.stop();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = volume * (track?.baseGain ?? 1);
    src.connect(gain).connect(this.output(idOrPath));
    this.sources.add(src);
    this.playing.set(idOrPath, { source: src, gain });
    src.onended = () => {
      this.sources.delete(src);
      if (this.playing.get(idOrPath)?.source === src)
        this.playing.delete(idOrPath);
      src.disconnect();
      gain.disconnect();
    };
    src.start();
    return src;
  }
  roundRobin(id: keyof typeof roundRobins, volume = 1) {
    const index = this.robin.get(id) ?? 1;
    // Retain AudioUtils' original two-position advance, including its even-count cycle.
    this.robin.set(id, ((index + 1) % roundRobins[id]) + 1);
    void this.play(`${id}_${index}`, volume);
  }
  toggle() {
    this.muted = !this.muted;
    if (this.master && this.main && this.ctx) {
      const when = this.ctx.currentTime + (this.muted ? 0.05 : 0.2);
      for (const node of [this.master, this.main])
        node.gain.setTargetAtTime(this.muted ? 0 : 1, when, 0.25);
    }
    return this.muted;
  }
  private volume(id: string, value: number, smoothing = 0.02) {
    if (!this.ctx) return;
    (this.loops.get(id) ?? this.playing.get(id))?.gain.gain.setTargetAtTime(
      Math.max(0, value) * tracks[id].baseGain,
      this.ctx.currentTime,
      smoothing,
    );
  }
  private pouring = false;
  private drinking = false;
  private suppressed = false;
  private suppressionStart = 0;
  private droneSmoothingUntil = 0;
  private lastTransitionScroll = 0;
  private pillarVisible = false;
  private pendingCrack = false;
  beginNavigation() {
    if (!this.ctx || !this.effects) return;
    this.suppressed = true;
    this.suppressionStart = this.ctx.currentTime;
    this.pendingCrack = false;
    this.effects.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
  }
  update(frame: Frame, sections: SceneSection[]) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (
      this.suppressed &&
      now - this.suppressionStart > 0.2 &&
      Math.abs(frame.rawScrollDelta) <= 10
    ) {
      this.suppressed = false;
      this.droneSmoothingUntil = now + 0.6;
      this.effects!.gain.setTargetAtTime(1, now, 0.1);
    }
    const scene = (name: string) => sections.find((s) => s.name === name);
    const progress = (name: string) => {
      const s = scene(name);
      if (!s) return -10;
      const margin = name === "CathedralScene" ? -0.5 * worldHeight : 0;
      return (
        ((frame.scroll / frame.height) * worldHeight -
          s.top +
          worldHeight +
          0.1 -
          margin) /
        (s.height + worldHeight + 0.2 - margin)
      );
    };
    const mixes = [
      progress("ApproachScene"),
      progress("CathedralScene"),
      range(progress("AntiGravityScene"), -0.5, 0.5, 0, 1, false),
      range(progress("TasteScene"), -0.25, 0.5, 0, 1, false),
    ];
    const droneSmoothing = now < this.droneSmoothingUntil ? 0.6 : 0.02;
    for (let i = 0; !this.suppressed && i < mixes.length; i++) {
      const mix = mixes[i],
        from = `drone_${i + 1}`,
        to = `drone_${i + 2}`;
      if (mix < 0) {
        this.volume(to, 0, droneSmoothing);
        if ((mixes[i - 1] ?? Infinity) >= 1)
          this.volume(from, 1, droneSmoothing);
      } else if (mix <= 1) {
        this.volume(from, Math.cos((mix * Math.PI) / 2));
        this.volume(to, Math.sin((mix * Math.PI) / 2));
      } else {
        this.volume(from, 0, droneSmoothing);
        if ((mixes[i + 1] ?? -Infinity) < 0) this.volume(to, 1, droneSmoothing);
      }
    }
    this.volume("jazz", range(progress("TasteScene"), 0, 1.25, 0, 1));
    const scroll = (frame.scroll / frame.height) * worldHeight;
    this.volume(
      "wind",
      scroll <= 10 ? range(scroll, 0, 1.5, 0, 1) : range(scroll, 22, 30, 1, 0),
    );
    const selection = scene("DrinkSelectionScene"),
      sp = progress("DrinkSelectionScene");
    this.volume(
      "bottle_levitate",
      selection?.group.visible
        ? sp <= 0.9
          ? range(sp, 0.45, 0.55, 0, 1)
          : range(sp, 0.9, 1, 1, 0)
        : 0,
    );
    const hand = scene("HandScene"),
      hp = progress("HandScene"),
      contact = hand?.group.visible ? (hand.audioState.contact ?? 0) : 0,
      portal = hand?.group.visible
        ? hp <= 0.9
          ? range(hp, 0, 0.15, 0, 1)
          : range(hp, 0.8, 0.95, 1, 0)
        : 0;
    this.volume("portal_base", portal);
    this.volume("portal_move", portal);
    this.volume("portal_contact", contact);
    this.portal?.gain.setTargetAtTime(1.5 * contact, now, 0.02);
    this.drone?.gain.setTargetAtTime(1 - 0.66 * contact, now, 0.4);
    this.portalFilter?.frequency.setTargetAtTime(
      hand?.audioState.frequency ?? 0,
      now,
      0.1,
    );
    const pour = scene("DrinkPourScene"),
      pourProgress = pour?.group.visible ? (pour.audioState.pour ?? 0) : 0;
    this.volume("pouring", range(pourProgress, 0.24, 0.28, 0, 1));
    if (pourProgress >= 0.24 && !this.pouring) {
      this.pouring = true;
      void this.play("pouring_start");
    } else if (pourProgress <= 0.24 && this.pouring) {
      this.pouring = false;
      void this.play("pouring_stop");
    }
    const drinkFrame = pour?.audioState.drinkFrame ?? 0,
      p = progress("DrinkPourScene");
    const drinkVolume = pour?.group.visible
      ? p <= 0.8
        ? range(p, 0.5, 0.6, 0, 1)
        : range(p, 0.8, 0.9, 1, 0)
      : 0;
    this.volume("drinking", drinkVolume);
    if (drinkFrame < 132) this.drinking = false;
    if (pour?.group.visible && drinkFrame >= 132 && !this.drinking) {
      this.drinking = true;
      void this.play("drinking", drinkVolume);
    }
    const anti = scene("AntiGravityScene"),
      shake = anti?.group.visible ? (anti.audioState.shake ?? 0) : 0;
    this.volume("antigravity_speed_up", shake, 0.2);
    this.volume("antigravity_spawn", shake, 0.2);
    this.vortexWet?.gain.setValueAtTime(
      Math.sin((clamp(shake) * Math.PI) / 2),
      now,
    );
    this.vortexDry?.gain.setValueAtTime(
      Math.cos((clamp(shake) * Math.PI) / 2),
      now,
    );
    const pillar = scene("PillarCrumbleScene");
    if (
      pillar?.group.visible &&
      !this.pillarVisible &&
      frame.scroll > this.lastTransitionScroll &&
      !this.suppressed
    )
      this.pendingCrack = true;
    if (
      this.pendingCrack &&
      progress("PillarCrumbleScene") > 0.1 &&
      !this.suppressed
    ) {
      this.pendingCrack = false;
      void this.play("transition_crack");
    }
    this.pillarVisible = Boolean(pillar?.group.visible);
    this.lastTransitionScroll = frame.scroll;
    this.panner?.pan.setTargetAtTime(frame.pointer.x, now, 0.1);
    this.analyser!.getByteFrequencyData(this.frequencies);
    frequencyBands.forEach((band, i) => {
      const lo = Math.floor((band.min * 128) / (this.ctx!.sampleRate / 2)),
        hi = Math.floor((band.max * 128) / (this.ctx!.sampleRate / 2));
      let sum = 0;
      for (let j = lo; j < Math.min(hi, 128); j++) sum += this.frequencies[j];
      this.bands[i] = sum / Math.max(1, hi - lo) / 255;
    });
  }
  private lastActivity = 0;
  private voice?: {
    source: AudioBufferSourceNode;
    gain: GainNode;
    box: NarrativeBox;
  };
  private voiceLoading = false;
  private voiceGeneration = 0;
  private voiceFadingUntil = 0;
  private resetTimer?: ReturnType<typeof setTimeout>;
  private boxes: NarrativeBox[] = [];
  private queue = new Set<string>();
  resetNarration(delay = 0) {
    this.voiceGeneration++;
    this.voiceLoading = false;
    this.queue.clear();
    clearTimeout(this.resetTimer);
    if (this.voice && this.ctx) {
      this.voice.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.voice.source.stop(this.ctx.currentTime + 0.4);
      this.voice.box.stopVoice();
      this.voice = undefined;
    }
    this.resetTimer = setTimeout(
      () => this.boxes.forEach((box) => box.reset()),
      delay * 1000,
    );
  }
  narrate(frame: Frame, boxes: NarrativeBox[]) {
    for (const box of boxes) box.muted = this.muted;
    if (!this.ctx || !this.master) return;
    if (Math.abs(frame.rawScrollDelta) > 0.6) this.lastActivity = frame.time;
    if (this.voice && !this.voice.box.visible) {
      const old = this.voice;
      this.voice = undefined;
      old.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
      old.source.stop(this.ctx.currentTime + 0.4);
      this.voiceFadingUntil = this.ctx.currentTime + 0.4;
      setTimeout(() => {
        if (!this.disposed) old.box.stopVoice();
      }, 400);
    }
    for (const box of boxes) if (!box.visible) this.queue.delete(box.id);
    if (
      this.voice ||
      this.voiceLoading ||
      this.ctx.currentTime < this.voiceFadingUntil ||
      frame.time - this.lastActivity < 0.1
    )
      return;
    const next = boxes
      .filter((box) => this.queue.has(box.id))
      .sort((a, b) => Number(a.id) - Number(b.id))[0];
    if (!next) return;
    next.played = true;
    this.queue.delete(next.id);
    this.voiceLoading = true;
    const generation = this.voiceGeneration;
    void this.buffer("vo/" + next.id).then((buffer) => {
      if (generation !== this.voiceGeneration) return;
      this.voiceLoading = false;
      if (this.disposed || !this.ctx || !this.master || !next.visible) return;
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = 1.25;
      source.connect(gain).connect(this.effects!);
      this.voice = { source, gain, box: next };
      const context = this.ctx;
      const started = context.currentTime;
      next.startVoice(() => context.currentTime - started);
      source.start();
      source.onended = () => {
        if (this.voice?.source === source) {
          this.voice = undefined;
          next.stopVoice();
        }
        source.disconnect();
        gain.disconnect();
      };
    });
  }
  registerBoxes(boxes: NarrativeBox[]) {
    this.boxes = boxes;
    for (const box of boxes)
      box.onReveal = () => {
        this.queue.add(box.id);
        this.roundRobin("textbox");
      };
  }
  dispose() {
    this.disposed = true;
    clearTimeout(this.resetTimer);
    this.voiceGeneration++;
    document.removeEventListener("visibilitychange", this.visibility);
    this.loops.forEach((x) => {
      try {
        x.source.stop();
      } catch {}
      x.source.disconnect();
      x.gain.disconnect();
    });
    this.sources.forEach((source) => source.stop());
    void this.ctx?.close();
    this.loops.clear();
    this.buffers.clear();
  }
}
