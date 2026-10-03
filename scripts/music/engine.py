"""A small offline music engine for the Voyage soundtrack.

Stems are rendered from the GeneralUser GS SoundFont with tinysoundfont, or
synthesised with numpy, then mixed with automation, delays and convolution
reverb, limited, and normalised to a loudness target (ITU-R BS.1770).

Loops are seamless by construction: every track renders its events over two
cycles and keeps the second, so tails from the end of a cycle are already
sounding at its start.
"""
import os
import subprocess

import numpy as np
from scipy import signal

SR = 48000
SOUNDFONT = os.environ.get('VOYAGE_SOUNDFONT', '/home/user/mrbumpy409/generaluser-gs/GeneralUser-GS.sf2')
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def midi(name):
    """'F#4' -> 66."""
    n = NOTE[name[0]]
    rest = name[1:]
    while rest and rest[0] in '#b':
        n += 1 if rest[0] == '#' else -1
        rest = rest[1:]
    return n + 12 * (int(rest) + 1)


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


class Part:
    """A SoundFont instrument part: notes are (time s, duration s, key, velocity)."""

    def __init__(self, preset, bank=0, drums=False, pan=None, cc=None):
        self.preset, self.bank, self.drums, self.pan = preset, bank, drums, pan
        self.cc = cc or {}
        self.notes = []

    def note(self, t, dur, key, vel=90):
        key = midi(key) if isinstance(key, str) else int(key)
        self.notes.append((float(t), float(dur), key, int(np.clip(vel, 1, 127))))
        return self

    def chord(self, t, dur, keys, vel=90, spread=0.0):
        for i, k in enumerate(keys):
            self.note(t + i * spread, dur - i * spread, k, vel)
        return self


def render_part(part, length, cycles=2, period=None):
    """Render a part over `cycles` repeats of its notes (period = loop length)."""
    import tinysoundfont
    period = period or length
    total = int(round(period * cycles * SR)) if cycles > 1 else int(round(length * SR))
    synth = tinysoundfont.Synth(samplerate=SR)
    sf = synth.sfload(SOUNDFONT)
    synth.program_select(0, sf, 128 if part.drums else part.bank, part.preset, is_drums=part.drums)
    if part.pan is not None:
        synth.control_change(0, 10, int(np.clip(64 + part.pan * 63, 0, 127)))
    for c, v in part.cc.items():
        synth.control_change(0, c, v)
    events = []
    for k in range(cycles if cycles > 1 else 1):
        off = k * period
        for t, d, key, vel in part.notes:
            on = int(round((t + off) * SR))
            if on >= total:
                continue
            events.append((on, 1, key, vel))
            events.append((min(int(round((t + d + off) * SR)), total), 0, key, 0))
    events.sort(key=lambda e: (e[0], e[1]))
    out = np.zeros((total, 2), np.float32)
    pos = 0
    for at, kind, key, vel in events:
        if at > pos:
            out[pos:at] = np.frombuffer(synth.generate(at - pos), np.float32).reshape(-1, 2)
            pos = at
        if kind:
            synth.noteon(0, key, vel)
        else:
            synth.noteoff(0, key)
    if pos < total:
        out[pos:] = np.frombuffer(synth.generate(total - pos), np.float32).reshape(-1, 2)
    return out.astype(np.float64)


def last_cycle(x, period):
    n = int(round(period * SR))
    return x[-n:]


# ---------------------------------------------------------------- synthesis

def t_axis(n):
    return np.arange(n) / SR


def pink(n, rng):
    """Pink noise via spectral shaping."""
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec[1:] /= np.sqrt(f[1:])
    spec[0] = 0
    y = np.fft.irfft(spec, n)
    return y / (np.abs(y).max() + 1e-12)


def cyclic_noise(n, rng, kind='pink'):
    """Noise that loops seamlessly (built in the frequency domain over exactly n samples)."""
    y = pink(n, rng) if kind == 'pink' else rng.standard_normal(n)
    return y / (np.abs(y).max() + 1e-12)


def cyclic_lfo(n, cycles, phase=0.0):
    """A sine with an integer number of cycles over n samples (seamless when looped)."""
    return np.sin(2 * np.pi * cycles * np.arange(n) / n + phase)


def additive(freq, n, harmonics=24, rolloff=1.0, detune=0.0, rng=None, phase=None):
    """Band-limited saw-like tone; freq can be an array (Hz per sample)."""
    rng = rng or np.random.default_rng(0)
    f = np.broadcast_to(np.asarray(freq, float), (n,))
    ph0 = np.cumsum(f) / SR * 2 * np.pi
    y = np.zeros(n)
    for h in range(1, harmonics + 1):
        if h * f.max() > SR / 2 * 0.9:
            break
        y += np.sin(h * ph0 * (1 + detune * rng.uniform(-1, 1)) + (rng.uniform(0, 2 * np.pi) if phase is None else phase)) / h ** rolloff
    return y


def _fft_filter(x, response):
    """Zero-phase circular filtering (seamless on loops): multiply the spectrum by a real response."""
    x = np.asarray(x, float)
    n = x.shape[0]
    f = np.fft.rfftfreq(n, 1 / SR)
    h = response(f)
    spec = np.fft.rfft(x, axis=0)
    return np.fft.irfft(spec * (h[:, None] if x.ndim > 1 else h), n, axis=0)


def _butter(f, fc, order, kind):
    """Squared Butterworth magnitude (the response of a forward-backward filter)."""
    r = (np.maximum(f, 1e-9) / fc) ** (2 * order)
    return 1 / (1 + r) if kind == 'low' else r / (1 + r)


def bandpass(x, lo, hi, order=2):
    return _fft_filter(x, lambda f: _butter(f, hi, order, 'low') * _butter(f, lo, order, 'high'))


def lowpass(x, fc, order=2):
    return _fft_filter(x, lambda f: _butter(f, fc, order, 'low'))


def highpass(x, fc, order=2):
    return _fft_filter(x, lambda f: _butter(f, fc, order, 'high'))


def shelf(x, fc, gain_db, kind='high'):
    """First-order shelf, circular."""
    g = 10 ** (gain_db / 20)
    if kind == 'high':
        return _fft_filter(x, lambda f: 1 + (g - 1) * np.sqrt(_butter(f, fc, 1, 'high')))
    return _fft_filter(x, lambda f: 1 + (g - 1) * np.sqrt(_butter(f, fc, 1, 'low')))


def loop_hz(f, length):
    """Snap a frequency to a whole number of cycles per loop, so sustained tones loop seamlessly."""
    return max(1, round(f * length)) / length


def stereo(mono, width=0.0, delay_ms=0.0):
    """Mono to stereo with an optional Haas offset for width."""
    d = int(delay_ms * SR / 1000)
    left = mono
    right = np.roll(mono, d) if d else mono
    m = (left + right) / 2
    s = (left - right) / 2 * (1 + width)
    return np.c_[m + s, m - s]


def cyclic_convolve(x, ir):
    """Convolve a loop with an impulse response circularly (tails wrap to the start)."""
    n = len(x)
    m = len(ir)
    size = int(2 ** np.ceil(np.log2(n + m)))
    out = np.zeros_like(x)
    for ch in range(x.shape[1]):
        y = np.fft.irfft(np.fft.rfft(x[:, ch], size) * np.fft.rfft(ir[:, ch % ir.shape[1]], size), size)[:n + m - 1]
        acc = y[:n].copy()
        tail = y[n:]
        while len(tail):
            k = min(n, len(tail))
            acc[:k] += tail[:k]
            tail = tail[k:]
        out[:, ch] = acc
    return out


def make_ir(t60=4.0, predelay=0.025, damping=0.55, width=1.0, seed=1, early=True):
    """Stereo hall impulse response: band-wise exponential decays of noise plus early reflections."""
    rng = np.random.default_rng(seed)
    n = int(SR * min(12.0, t60 * 1.3))
    t = t_axis(n)
    f = np.fft.rfftfreq(n, 1 / SR)
    bands = [(0, 200, 1.15), (200, 800, 1.0), (800, 2500, 0.85), (2500, 6000, 1 - damping * 0.6),
             (6000, 12000, 1 - damping * 0.85), (12000, SR / 2 + 1, 1 - damping * 0.95)]
    ir = np.zeros((n, 2))
    for ch in range(2):
        spec = np.fft.rfft(rng.standard_normal(n))
        acc = np.zeros(n)
        for lo, hi, k in bands:
            band = np.fft.irfft(spec * ((f >= lo) & (f < hi)), n)
            acc += band * np.exp(-6.91 * t / max(0.05, t60 * k))
        acc *= 1 - np.exp(-t / 0.012)
        ir[:, ch] = acc
    mid, side = ir.mean(1, keepdims=True), (ir[:, :1] - ir[:, 1:]) / 2
    ir = np.c_[mid + side * width, mid - side * width]
    if early:
        for k in range(10):
            d = int(rng.uniform(0.006, 0.07) * SR)
            g = rng.uniform(0.15, 0.4) * np.exp(-k * 0.15)
            ir[d, k % 2] += g * np.sqrt((ir ** 2).sum() / n) * 40
    ir = np.vstack([np.zeros((int(predelay * SR), 2)), ir])
    return ir / np.sqrt((ir ** 2).sum(0).max())


def pingpong(x, delay_s, feedback=0.45, taps=8, tone=4000):
    """Ping-pong echo (cyclic, for loops)."""
    d = int(delay_s * SR)
    out = np.zeros_like(x)
    src = lowpass(x, tone, 1)
    mono = src.mean(1)
    for k in range(1, taps + 1):
        g = feedback ** k
        ch = k % 2
        out[:, ch] += np.roll(mono, d * k) * g
    return out


def compress(x, threshold_db=-18, ratio=2.5, attack=0.02, release=0.25):
    """Feed-forward RMS bus compressor (gentle glue)."""
    level = np.sqrt(lowpass(np.mean(x ** 2, axis=1), 1 / (2 * np.pi * release), 1).clip(1e-12))
    db = 20 * np.log10(level + 1e-12)
    over = np.maximum(0, db - threshold_db)
    gain_db = -over * (1 - 1 / ratio)
    gain = 10 ** (gain_db / 20)
    gain = lowpass(gain, 1 / (2 * np.pi * attack), 1)
    return x * gain[:, None]


def limit(x, ceiling_db=-1.0, lookahead=0.005, release=0.08, cyclic=True):
    from scipy.ndimage import minimum_filter1d
    ceiling = 10 ** (ceiling_db / 20)
    peak = np.abs(x).max(1)
    g = np.minimum(1, ceiling / np.maximum(peak, 1e-12))
    w = max(1, int(lookahead * SR))
    mode = 'wrap' if cyclic else 'nearest'
    g = minimum_filter1d(g, 2 * w + 1, mode=mode)
    a = np.exp(-1 / (release * SR))
    # release smoothing (run twice over the loop so the start sees the end)
    gg = np.concatenate([g, g]) if cyclic else g
    sm = signal.lfilter([1 - a], [1, -a], gg)
    sm = np.minimum(gg, sm)
    g = sm[-len(g):] if cyclic else sm
    y = x * g[:, None]
    return np.clip(y, -ceiling, ceiling)


def k_weight(x):
    # BS.1770 pre-filter (high shelf) and RLB high-pass, coefficients at 48 kHz.
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    return signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=0), axis=0)


def loudness(x):
    """Integrated loudness (LUFS) per ITU-R BS.1770-4 with gating."""
    y = k_weight(x)
    block, hop = int(0.4 * SR), int(0.1 * SR)
    ms = []
    for s in range(0, len(y) - block + 1, hop):
        ms.append(np.mean(y[s:s + block] ** 2, axis=0).sum())
    ms = np.array(ms)
    lk = -0.691 + 10 * np.log10(ms + 1e-15)
    gated = ms[lk > -70]
    rel = -0.691 + 10 * np.log10(gated.mean()) - 10
    gated = ms[(lk > -70) & (lk > rel)]
    return -0.691 + 10 * np.log10(gated.mean())


def master(x, lufs, ceiling_db=-1.0, glue=True):
    if glue:
        x = compress(x)
    for _ in range(3):
        x = x * 10 ** ((lufs - loudness(x)) / 20)
        x = limit(x, ceiling_db)
    return x


def encode(x, out_base, ogg_quality=5, mp3_bitrate='320k'):
    """Write <out_base>.ogg (Vorbis) and <out_base>.mp3 at 48 kHz stereo."""
    raw = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    os.makedirs(os.path.dirname(out_base), exist_ok=True)
    for ext, args in (('ogg', ['-c:a', 'libvorbis', '-q:a', str(ogg_quality)]),
                      ('mp3', ['-c:a', 'libmp3lame', '-b:a', mp3_bitrate])):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-'] + args +
                       ['%s.%s' % (out_base, ext)], input=raw, check=True)


class Mix:
    """Collects stems (stereo arrays of one loop length) with gains, sends and automation."""

    def __init__(self, length):
        self.n = int(round(length * SR))
        self.length = length
        self.dry = np.zeros((self.n, 2))
        self.buses = {}

    def add(self, x, gain=1.0, send=None, auto=None):
        x = np.asarray(x, float)
        if x.ndim == 1:
            x = np.c_[x, x]
        x = x[:self.n]
        if auto is not None:
            x = x * np.asarray(auto)[:self.n, None]
        self.dry += x * gain
        for bus, amount in (send or {}).items():
            self.buses.setdefault(bus, np.zeros((self.n, 2)))
            self.buses[bus] += x * gain * amount

    def bus(self, name):
        return self.buses.get(name, np.zeros((self.n, 2)))


def env_points(n, points, cyclic=True):
    """Piecewise-linear automation from (time s, value) points, wrapping when cyclic."""
    t = t_axis(n)
    pts = sorted(points)
    if cyclic:
        L = n / SR
        pts = [(p - L, v) for p, v in pts] + pts + [(p + L, v) for p, v in pts]
    tp, vp = zip(*pts)
    return np.interp(t, tp, vp)


def smooth_env(n, points, cyclic=True):
    """Like env_points but with cosine easing between points."""
    t = t_axis(n)
    pts = sorted(points)
    if cyclic:
        L = n / SR
        pts = [(p - L, v) for p, v in pts] + pts + [(p + L, v) for p, v in pts]
    tp = np.array([p[0] for p in pts])
    vp = np.array([p[1] for p in pts])
    i = np.clip(np.searchsorted(tp, t) - 1, 0, len(tp) - 2)
    u = (t - tp[i]) / np.maximum(tp[i + 1] - tp[i], 1e-9)
    u = 0.5 - 0.5 * np.cos(np.pi * np.clip(u, 0, 1))
    return vp[i] + (vp[i + 1] - vp[i]) * u
