"""Pendant sound effects for Trapnest Voyage (replacing Spirit's glass-bottle and pouring sounds).

    python3 scripts/music/sfx.py

  interactions/bottle/hovers/1-3   a pendant turning on its chain: fine links and a small gold charm
  interactions/bottle/interact     a pendant chosen: a music-box sparkle over the charm and the chain
  interactions/bottle/levitate     the three pendants floating (loop): a soft glassy shimmer
  interactions/pouring/start       picking up the chain at the nape
  interactions/pouring/hold        holding the chain ends (loop): faint link rustle and a rising air
  interactions/pouring/stop        letting the chain fall back
  interactions/pendant/clasp       the clasp closing: a metal click and the pearl waking

All 48 kHz stereo, written as .mp3 and .ogg like the other assets.
"""
import os
import sys

import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from engine import (SR, Part, bandpass, cyclic_convolve, encode, highpass, lowpass, make_ir, midi,  # noqa: E402
                    render_part)

OUT = os.path.join(HERE, '../../public/assets/audio/interactions')
MUSIC_BOX, CELESTA, CRYSTAL, BOWED_GLASS = 10, 8, 98, 92


def t_axis(n):
    return np.arange(n) / SR


def link(rng, gain=1.0):
    """One tiny link-on-link collision: a few high damped partials and a breath of noise."""
    n = int(0.06 * SR)
    t = t_axis(n)
    x = np.zeros(n)
    for _ in range(rng.integers(3, 6)):
        f = rng.uniform(3200, 11500)
        x += np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / rng.uniform(0.004, 0.018)) * rng.uniform(0.3, 1)
    noise = highpass(rng.normal(size=n), 5000) * np.exp(-t / 0.002) * 0.6
    return (x + noise) * gain


def jingle(rng, dur=0.45, density=45, start_gain=1.0, decay=0.25):
    """A burst of links settling: Poisson-timed collisions, panned, quieter as they settle."""
    n = int((dur + 0.1) * SR)
    out = np.zeros((n, 2))
    t = rng.uniform(0, 0.01)
    while t < dur:
        g = start_gain * np.exp(-t / decay) * rng.uniform(0.35, 1.0)
        x = link(rng, g)
        i = int(t * SR)
        pan = rng.uniform(-0.6, 0.6)
        seg = out[i:i + len(x)]
        m = len(seg)
        seg[:, 0] += x[:m] * np.sqrt(0.5 * (1 - pan))
        seg[:, 1] += x[:m] * np.sqrt(0.5 * (1 + pan))
        t += rng.exponential(1 / density)
    return out


def charm(f0, dur=1.6, gain=1.0, rng=None):
    """A small gold charm struck lightly: bell-like inharmonic partials, the upper ones dying first."""
    n = int(dur * SR)
    t = t_axis(n)
    x = np.zeros(n)
    for ratio, amp, tau in ((1.0, 1.0, 0.55), (2.32, 0.45, 0.28), (4.25, 0.25, 0.14), (6.63, 0.12, 0.08),
                            (9.38, 0.06, 0.05)):
        beat = 1 + 0.0008 * (rng.normal() if rng is not None else 0)
        x += amp * np.sin(2 * np.pi * f0 * ratio * beat * t) * np.exp(-t / tau)
    attack = np.minimum(1, t / 0.0015)
    return x * attack * gain


def stereo_spread(x, width=0.3, delay_ms=7):
    d = int(delay_ms * SR / 1000)
    left = x
    right = np.r_[np.zeros(d), x[:-d]] if d else x
    return np.c_[left * (1 + width) / 2 + right * (1 - width) / 2, right * (1 + width) / 2 + left * (1 - width) / 2]


def place(out, x, at):
    i = int(at * SR)
    m = min(len(x), len(out) - i)
    out[i:i + m] += x[:m]


def reverb(x, t60=1.6, wet=0.3, seed=1):
    ir = make_ir(t60=t60, predelay=0.012, damping=0.5, seed=seed)
    tail = np.zeros((len(x) + len(ir) - 1, 2))
    for c in range(2):
        tail[:, c] = signal.fftconvolve(x[:, c], ir[:, c])
    tail = tail[:len(x)]
    return x * (1 - wet) + tail * wet * (np.abs(x).max() / max(np.abs(tail).max(), 1e-9))


def fade_out(x, sec=0.25):
    k = int(sec * SR)
    x[-k:] *= np.linspace(1, 0, k)[:, None]
    return x


def normalize(x, peak_db=-3.0):
    return x * (10 ** (peak_db / 20) / max(np.abs(x).max(), 1e-9))


def music_box(notes, length, preset=MUSIC_BOX, vel=70):
    part = Part(preset)
    for t, key, d in notes:
        part.note(t, d, key, vel)
    return render_part(part, length, cycles=1)


# ---------------------------------------------------------------- effects

def hovers():
    for k, (note, seed) in enumerate((('A6', 3), ('D7', 5), ('F#6', 8)), 1):
        rng = np.random.default_rng(seed)
        L = 1.8
        out = np.zeros((int(L * SR), 2))
        place(out, jingle(rng, dur=0.35, density=55, start_gain=0.5), 0.0)
        place(out, stereo_spread(charm(440 * 2 ** ((midi(note) - 69) / 12), 1.6, 0.55, rng)), 0.03)
        out = reverb(out, 1.3, 0.28, seed)
        encode(normalize(fade_out(out), -6), os.path.join(OUT, f'bottle/hovers/{k}'))


def interact():
    rng = np.random.default_rng(11)
    L = 3.0
    out = np.zeros((int(L * SR), 2))
    # A rising D major sparkle on the music box, a charm on the top note, and the chain settling.
    sparkle = music_box([(0.00, 'D6', 1.6), (0.07, 'F#6', 1.5), (0.14, 'A6', 1.4), (0.22, 'D7', 1.8)], L, vel=78)
    out += sparkle * 0.9
    place(out, stereo_spread(charm(midi_hz('D7'), 2.2, 0.35, rng)), 0.22)
    place(out, jingle(rng, dur=0.6, density=60, start_gain=0.55, decay=0.3), 0.0)
    out = reverb(out, 2.2, 0.35, 12)
    encode(normalize(fade_out(out, 0.4), -4), os.path.join(OUT, 'bottle/interact'))


def midi_hz(name):
    return 440 * 2 ** ((midi(name) - 69) / 12)


def levitate():
    """Seamless loop: a soft crystal shimmer with occasional faint charms."""
    rng = np.random.default_rng(21)
    L = 4.248
    n = int(L * SR)
    out = np.zeros((n, 2))
    # A sustained airy shimmer: band-limited noise around 6-9 kHz, breathing slowly (cyclic).
    t = t_axis(n)
    for c in range(2):
        noise = bandpass(rng.normal(size=n), 5200, 9500)
        breath = 0.6 + 0.4 * np.sin(2 * np.pi * t / L * 2 + c * 1.3)
        out[:, c] += noise * breath * 0.05
    # Faint charms on D-major tones, wrapped around the loop end.
    for at, note in ((0.3, 'A6'), (1.4, 'D7'), (2.5, 'F#6'), (3.5, 'E7')):
        x = stereo_spread(charm(midi_hz(note), 2.0, 0.18, rng))
        idx = (int(at * SR) + np.arange(len(x))) % n
        np.add.at(out, idx, x)
    ir = make_ir(t60=2.0, predelay=0.015, damping=0.5, seed=3)
    wet = cyclic_convolve(out, ir)
    out = out * 0.75 + wet * 0.25 * (np.abs(out).max() / max(np.abs(wet).max(), 1e-9))
    encode(normalize(out, -10), os.path.join(OUT, 'bottle/levitate'))


def pouring():
    rng = np.random.default_rng(31)
    # start: picking up the chain ends
    out = np.zeros((int(0.9 * SR), 2))
    place(out, jingle(rng, dur=0.35, density=70, start_gain=0.6, decay=0.2), 0.0)
    encode(normalize(fade_out(reverb(out, 0.9, 0.2, 31), 0.2), -8), os.path.join(OUT, 'pouring/start'))
    # hold loop: faint link rustle and a soft rising air (seamless)
    L = 2.4
    n = int(L * SR)
    loop = np.zeros((n, 2))
    t = 0.0
    while t < L:
        x = link(rng, rng.uniform(0.08, 0.25))
        idx = (int(t * SR) + np.arange(len(x))) % n
        pan = rng.uniform(-0.5, 0.5)
        np.add.at(loop, (idx, 0), x * (1 - pan) / 2)
        np.add.at(loop, (idx, 1), x * (1 + pan) / 2)
        t += rng.exponential(1 / 14)
    air = np.c_[bandpass(rng.normal(size=n), 2500, 7000), bandpass(rng.normal(size=n), 2500, 7000)] * 0.03
    loop += air
    encode(normalize(loop, -14), os.path.join(OUT, 'pouring/hold'))
    # stop: letting the chain fall back against the skin
    out = np.zeros((int(0.8 * SR), 2))
    place(out, jingle(rng, dur=0.25, density=50, start_gain=0.35, decay=0.12), 0.0)
    encode(normalize(fade_out(reverb(out, 0.8, 0.2, 32), 0.2), -12), os.path.join(OUT, 'pouring/stop'))


def clasp():
    rng = np.random.default_rng(41)
    L = 3.2
    out = np.zeros((int(L * SR), 2))
    # The lobster clasp: a short bright click (two transients), then the pearl wakes on the music box.
    n = int(0.03 * SR)
    tt = t_axis(n)
    for at, g in ((0.0, 1.0), (0.018, 0.6)):
        click = highpass(rng.normal(size=n), 3000) * np.exp(-tt / 0.0025) * g
        click += np.sin(2 * np.pi * 6200 * tt) * np.exp(-tt / 0.006) * 0.5 * g
        place(out, np.c_[click, click], at)
    wake = music_box([(0.10, 'A6', 2.0), (0.10, 'D7', 2.4)], L, preset=CELESTA, vel=70)
    out += wake * 0.8
    place(out, stereo_spread(charm(midi_hz('A7'), 2.4, 0.22, rng)), 0.12)
    out = reverb(out, 2.4, 0.35, 41)
    encode(normalize(fade_out(out, 0.5), -4), os.path.join(OUT, 'pendant/clasp'))


if __name__ == '__main__':
    hovers()
    interact()
    levitate()
    pouring()
    clasp()
    print('done')
