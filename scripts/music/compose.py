"""Compose and render the Trapnest Voyage soundtrack.

Five drones follow the story (they crossfade on scroll exactly like Spirit's)
plus the editorial bossa loop and the shore ambience. Lengths and loudness
match the Spirit tracks they replace so the soundscape mix stays balanced.

  drones/1  Golden Shore   79.0 s  -19.3 LUFS  Wander -> Approach: warm Lydian pads, sea haze, celesta
  drones/2  The Gate       43.0 s  -19.2 LUFS  Approach -> Cathedral: deep D pedal, horns, low strings
  drones/3  Golden Hall    65.0 s  -21.9 LUFS  Cathedral -> Antigravity: swelling choir and strings
  drones/4  Lift           46.0 s  -16.7 LUFS  Antigravity: pulsing arpeggios, tremolo strings, choir
  drones/5  Open Sky       36.1 s  -21.7 LUFS  Pillar crumble -> editorial: sparse plucks over air
  ambient/jazz  Bossa      15.6 s  -13.9 LUFS  editorial: nylon guitar, brushes, vibes, Rhodes
  ambient/wind  Sea breeze 12.0 s  -25.7 LUFS  shore wind and surf

Usage: python3 scripts/music/compose.py [track ...]
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine import (SR, Mix, Part, additive, bandpass, cyclic_convolve, cyclic_lfo, cyclic_noise, encode, highpass,  # noqa: E402
                    hz, last_cycle, loop_hz, lowpass, make_ir, master, midi, pingpong, render_part, shelf, smooth_env,
                    stereo, t_axis)

OUT = os.environ.get('VOYAGE_AUDIO_OUT', os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../public/assets/audio'))

# General MIDI / GeneralUser GS presets.
CELESTE, MUSIC_BOX, VIBES, HARP, KALIMBA = 8, 10, 11, 46, 108
NYLON, GTR_HARMONICS, AC_BASS = 24, 31, 32
TINE_EP = 4
CELLO, CONTRABASS, TREMOLO, SLOW_STRINGS, FAST_STRINGS = 42, 43, 44, 49, 48
CHOIR, OOHS, HORNS, FLUTE, TIMPANI, TAIKO, REV_CYMBAL = 52, 53, 60, 73, 47, 116, 119
WARM_PAD, POLYSYNTH, HALO_PAD, BOWED_GLASS, CRYSTAL, ATMOSPHERE = 89, 90, 94, 92, 98, 99


def stem(part, L):
    return last_cycle(render_part(part, L, cycles=2, period=L), L)


def notes(names):
    return [midi(n) for n in names.split()]


def sea_haze(n, rng, cycles, lo=180, hi=2400):
    """Breathing filtered noise like distant surf (loops seamlessly)."""
    left, right = cyclic_noise(n, rng), cyclic_noise(n, rng)
    x = np.c_[bandpass(left, lo, hi), bandpass(right, lo, hi)]
    swell = 0.55 + 0.45 * cyclic_lfo(n, cycles)
    swell = swell ** 2.2
    return x * swell[:, None]


def twinkles(part, L, rng, scale, rate, vel=(38, 66), dur=(2.0, 4.0), avoid=()):
    t = rng.uniform(0, 1.2)
    while t < L - 0.5:
        if not any(a <= t < b for a, b in avoid):
            part.note(t, rng.uniform(*dur), rng.choice(scale), rng.integers(*vel))
        t += rng.exponential(rate)
    return part


# ---------------------------------------------------------------- 1. Golden Shore

def golden_shore():
    L = 79.0
    rng = np.random.default_rng(11)
    n = int(L * SR)
    chords = [  # (bass, voicing)
        ('D2', 'A3 C#4 E4 F#4'), ('B1', 'F#3 A3 D4 E4'), ('G2', 'B3 D4 F#4 C#5'), ('A1', 'E3 B3 C#4 F#4'),
        ('F#2', 'A3 C#4 E4 A4'), ('G2', 'B3 D4 F#4 A4'), ('E2', 'G3 B3 D4 F#4'), ('A1', 'A3 B3 D4 E4'),
    ]
    step = L / len(chords)
    pad, strings, oohs, bass, cello = (Part(WARM_PAD), Part(SLOW_STRINGS, pan=0.2), Part(OOHS, pan=-0.25),
                                       Part(CONTRABASS), Part(CELLO, pan=-0.3))
    for i, (b, v) in enumerate(chords):
        t = i * step
        vs = notes(v)
        pad.chord(t, step + 1.6, vs, 64)
        strings.chord(t + 0.4, step + 1.2, [k + 12 for k in vs[1:]], 50)
        oohs.chord(t + 1.2, step, vs[-2:], 44)
        bass.note(t, step + 0.8, midi(b), 62)
        cello.note(t + 0.2, step + 0.6, midi(b) + 12, 46)
    bell = Part(CELESTE, pan=0.35)
    box = Part(MUSIC_BOX, pan=-0.4)
    scale = notes('D5 E5 F#5 A5 B5 D6 E6 F#6 A6')
    twinkles(bell, L, rng, scale, 3.1)
    twinkles(box, L, rng, scale[3:], 6.5, vel=(30, 50))
    # A slow motif on the strings' high register, once per loop.
    motif = Part(SLOW_STRINGS, pan=0.1)
    for t, d, k in [(20, 3.5, 'F#5'), (23.5, 2.5, 'E5'), (26, 5, 'A5'), (40, 3, 'B5'), (43, 2.5, 'A5'),
                    (45.5, 5.5, 'F#5'), (60, 3, 'E5'), (63, 6, 'C#5')]:
        motif.note(t, d, k, 48)

    m = Mix(L)
    swell = 0.75 + 0.25 * smooth_env(n, [(i * step + step * 0.55, 1.0) for i in range(8)] +
                                    [(i * step + step * 0.05, 0.0) for i in range(8)])
    m.add(stem(pad, L), 1.0, {'hall': 0.6}, swell)
    m.add(stem(strings, L), 0.9, {'hall': 0.7}, swell)
    m.add(stem(oohs, L), 0.7, {'hall': 0.8})
    m.add(stem(bass, L), 0.9, {'hall': 0.25})
    m.add(stem(cello, L), 0.55, {'hall': 0.4})
    m.add(stem(motif, L), 0.55, {'hall': 0.9})
    sparkle = stem(bell, L) * 0.6 + stem(box, L) * 0.4
    m.add(sparkle, 0.9, {'hall': 1.0, 'echo': 0.7})
    # Sub sine under the bass and the sea haze.
    sub = np.zeros(n)
    for i, (b, _) in enumerate(chords):
        a, z = int(i * step * SR), int((i + 1) * step * SR)
        f = hz(midi(b)) if hz(midi(b)) > 40 else hz(midi(b) + 12)
        seg = np.sin(2 * np.pi * f * t_axis(z - a))
        sub[a:z] = seg
    sub = lowpass(sub, 120) * smooth_env(n, [(i * step, 0.0) for i in range(8)] +
                                         [(i * step + 1.5, 1.0) for i in range(8)] +
                                         [(i * step + step - 1.5, 1.0) for i in range(8)])
    m.add(stereo(sub), 0.05)
    m.add(sea_haze(n, rng, 8), 0.035, {'hall': 0.3})
    hall = cyclic_convolve(m.bus('hall'), make_ir(5.5, 0.04, 0.6, 1.2, seed=3))
    echo = pingpong(m.bus('echo'), 60 / 72 * 0.75, 0.5, 7)
    x = m.dry + hall * 0.55 + echo * 0.35 + cyclic_convolve(echo, make_ir(3.5, 0.02, 0.6, seed=4)) * 0.25
    return master(shelf(x, 6000, -2), -19.3)


# ---------------------------------------------------------------- 2. The Gate

def the_gate():
    L = 43.0
    rng = np.random.default_rng(22)
    n = int(L * SR)
    t = t_axis(n)
    # Sub drone on D1/A1 with slow beating and breathing filter.
    d1, a1 = loop_hz(hz(midi('D1')), L), loop_hz(hz(midi('A1')), L)
    drone = (np.sin(2 * np.pi * d1 * t) + 0.6 * np.sin(2 * np.pi * (d1 + 6 / L) * t) +
             0.5 * np.sin(2 * np.pi * a1 * t) + 0.25 * additive(d1 * 2, n, 12, 1.4, rng=rng, phase=0.0) / 3)
    drone = lowpass(drone, 160) * (0.75 + 0.25 * cyclic_lfo(n, 3))
    rumble = lowpass(cyclic_noise(n, rng, 'white'), 90, 4)
    rumble = rumble / np.abs(rumble).max() * (0.6 + 0.4 * cyclic_lfo(n, 2, 1.0))
    harmony = [(0, 'D2 A2'), (10.75, 'Bb1 F2'), (21.5, 'C2 G2'), (32.25, 'D2 A2')]
    horns_v = [(0, 'D3 A3'), (10.75, 'D3 F3 Bb3'), (21.5, 'E3 G3 C4'), (32.25, 'F#3 A3 D4')]
    lows, cello, horns, glass, timp = Part(CONTRABASS), Part(CELLO, pan=0.25), Part(HORNS, pan=-0.2), Part(
        BOWED_GLASS, pan=0.3), Part(TIMPANI)
    for (t0, v), (_, hv) in zip(harmony, horns_v):
        lows.chord(t0, 11.6, notes(v), 70)
        cello.note(t0 + 0.5, 11.0, notes(v)[0] + 12, 52)
        horns.chord(t0 + 3.0, 7.5, notes(hv), 46)
    for t0, k in [(4, 'D6'), (15, 'A6'), (26, 'F6'), (36, 'E6')]:
        glass.note(t0, 6.0, k, 34)
    # A soft timpani roll swelling into each chord change.
    for t0 in (8.0, 29.5):
        for k in range(26):
            tt = t0 + k * 0.095
            timp.note(tt, 0.3, 'D2', int(20 + 50 * (k / 25) ** 2))
    m = Mix(L)
    swell = 0.7 + 0.3 * smooth_env(n, [(0, 0.2), (6, 1), (10.75, 0.3), (17, 1), (21.5, 0.3), (28, 1), (32.25, 0.3),
                                       (38, 1)])
    m.add(stereo(drone), 0.55, {'hall': 0.2})
    m.add(np.c_[rumble, np.roll(rumble, n // 3)], 0.10)
    m.add(stem(lows, L), 1.2, {'hall': 0.35}, swell)
    m.add(stem(cello, L), 0.7, {'hall': 0.5}, swell)
    m.add(stem(horns, L), 0.55, {'hall': 0.8}, swell)
    m.add(stem(glass, L), 0.25, {'hall': 1.0})
    m.add(stem(timp, L), 0.6, {'hall': 0.6})
    hall = cyclic_convolve(m.bus('hall'), make_ir(6.0, 0.05, 0.75, 1.1, seed=5))
    x = m.dry + hall * 0.5
    x = shelf(x, 1500, -6)
    return master(x, -19.2)


# ---------------------------------------------------------------- 3. Golden Hall

def golden_hall():
    L = 65.0
    rng = np.random.default_rng(33)
    n = int(L * SR)
    chords = ['B3 D4 F#4 A4', 'A3 C#4 E4 F#4', 'A3 C#4 E4 F#4 A4', 'B3 D4 F#4 C#5', 'B3 D4 F#4 A4 D5',
              'G3 B3 D4 F#4 A4', 'A3 D4 E4 G4', 'A3 C#4 E4 F#4 D5', 'B3 D4 F#4 A4', 'A3 B3 C#4 E4 A4']
    roots = ['G2', 'A2', 'F#2', 'B2', 'G2', 'E2', 'A2', 'D3', 'B2', 'A2']
    step = L / len(chords)
    choir, oohs, strings, pad, harp, low = (Part(CHOIR), Part(OOHS, pan=0.3), Part(SLOW_STRINGS, pan=-0.25),
                                            Part(HALO_PAD), Part(HARP, pan=0.15), Part(CELLO, pan=-0.1))
    for i, (c, r) in enumerate(zip(chords, roots)):
        t = i * step
        vs = notes(c)
        choir.chord(t, step + 1.4, vs, 72)
        oohs.chord(t + 0.3, step + 1.0, [k + 12 for k in vs[-2:]], 50)
        strings.chord(t + 0.1, step + 1.2, vs, 58)
        pad.chord(t, step + 2.0, vs[:3], 52)
        low.note(t, step + 0.8, midi(r), 50)
        for j, k in enumerate(sorted(vs + [vs[0] + 12, vs[1] + 12])):
            harp.note(t + 0.15 * j, 3.0, k + 12, 44 - j * 2)
    m = Mix(L)
    sw = smooth_env(n, [(i * step + 0.2, 0.15) for i in range(10)] + [(i * step + 2.6, 1.0) for i in range(10)] +
                    [(i * step + step - 1.6, 0.85) for i in range(10)])
    m.add(stem(choir, L), 1.0, {'hall': 0.8}, sw)
    m.add(stem(oohs, L), 0.6, {'hall': 0.9}, sw)
    m.add(stem(strings, L), 0.9, {'hall': 0.7}, sw)
    m.add(stem(pad, L), 0.6, {'hall': 0.5}, sw)
    m.add(stem(low, L), 0.45, {'hall': 0.5}, sw)
    m.add(stem(harp, L), 0.55, {'hall': 0.8, 'echo': 0.3})
    air = sea_haze(n, rng, 10, 1500, 9000)
    m.add(air, 0.015, {'hall': 0.5})
    hall = cyclic_convolve(m.bus('hall'), make_ir(6.5, 0.06, 0.5, 1.3, seed=7))
    echo = pingpong(m.bus('echo'), 0.48, 0.45, 6)
    x = highpass(m.dry + hall * 0.6 + echo * 0.3, 140, 3)
    return master(x, -21.9)


# ---------------------------------------------------------------- 4. Lift

def lift():
    L = 46.0
    bars = 24
    beat = L / (bars * 4)
    rng = np.random.default_rng(44)
    n = int(L * SR)
    prog = ['B', 'G', 'D', 'A', 'B', 'G', 'D', 'A', 'E', 'G', 'F#', 'A']
    tones = {'B': ('B1', 'B2 D3 F#3', 'F#4 B4 D5 F#5'), 'G': ('G1', 'G2 B2 D3', 'D4 G4 B4 D5'),
             'D': ('D2', 'D3 F#3 A3', 'F#4 A4 D5 F#5'), 'A': ('A1', 'A2 C#3 E3', 'E4 A4 C#5 E5'),
             'E': ('E2', 'E3 G3 B3', 'E4 G4 B4 E5'), 'F#': ('F#1', 'F#2 A2 D3', 'F#4 A4 D5 F#5')}
    arp, pulse, trem, choir, bass, cello, horns, kick, swell_fx, bell = (
        Part(HARP, pan=-0.3), Part(POLYSYNTH, pan=0.25), Part(TREMOLO), Part(CHOIR), Part(CONTRABASS),
        Part(CELLO, pan=-0.2), Part(HORNS, pan=0.2), Part(TAIKO), Part(REV_CYMBAL), Part(CRYSTAL, pan=0.4))
    for c, name in enumerate(prog):
        t0 = c * 8 * beat
        root, mid, top = tones[name]
        tv = notes(top)
        section = c // 4
        # 16th-note arpeggio, up and down over two octaves.
        seq = tv + [k + 12 for k in tv[1:]]
        seq = seq + seq[-2:0:-1]
        for s in range(32):
            k = seq[s % len(seq)]
            arp.note(t0 + s * beat / 2, beat * 0.9, k, 56 + (14 if s % 4 == 0 else 0) + 8 * section)
        # 8th-note pulse on the middle voicing.
        for s in range(16):
            pulse.chord(t0 + s * beat / 2, beat * 0.42, notes(mid), 48 + (12 if s % 2 == 0 else 0) + 6 * section)
        trem.chord(t0, 8 * beat + 0.2, notes(mid) + [notes(mid)[0] + 12], 54 + 8 * section)
        if section >= 1:
            choir.chord(t0, 8 * beat + 0.4, tv[:3], 52 + 6 * section)
        bass.note(t0, 8 * beat, midi(root), 74)
        for s in range(8):
            cello.note(t0 + s * beat, beat * 0.5, midi(root) + 12, 60 if s % 2 == 0 else 46)
        for b in range(2):
            kick.note(t0 + b * 4 * beat, 1.0, 'C3', 56 + 10 * section)
            kick.note(t0 + (b * 4 + 2.5) * beat, 1.0, 'C3', 38 + 8 * section)
        if c % 4 == 3:
            swell_fx.note(t0 + 8 * beat - 1.9, 2.0, 'C4', 70)
    # Horn melody across the final third.
    for t, d, k in [(0, 4, 'F#4'), (4, 2, 'E4'), (6, 2, 'D4'), (8, 6, 'E4'), (14, 2, 'C#4'),
                    (16, 4, 'D4'), (20, 2, 'E4'), (22, 2, 'F#4'), (24, 8, 'A4')]:
        horns.note(64 * beat + t * beat, d * beat, k, 62)
    for t, k in [(16, 'F#6'), (32, 'A6'), (48, 'B6'), (64, 'D7'), (80, 'C#7')]:
        bell.note(t * beat, 3.0, k, 60)
    m = Mix(L)
    # Pumping swell on the pulse for motion.
    tt = t_axis(n)
    pump = 0.55 + 0.45 * np.minimum(1, ((tt % beat) / (beat * 0.6)) ** 0.8)
    m.add(stem(arp, L), 0.9, {'hall': 0.45, 'echo': 0.35})
    m.add(stem(pulse, L), 0.55, {'hall': 0.3}, pump)
    m.add(stem(trem, L), 0.8, {'hall': 0.5})
    m.add(stem(choir, L), 0.75, {'hall': 0.8})
    m.add(stem(bass, L), 0.8, {'hall': 0.2})
    m.add(stem(cello, L), 0.6, {'hall': 0.3})
    m.add(stem(horns, L), 0.7, {'hall': 0.6})
    m.add(stem(kick, L), 0.9, {'hall': 0.4})
    m.add(stem(swell_fx, L), 0.35, {'hall': 0.5})
    m.add(stem(bell, L), 0.5, {'hall': 1.0, 'echo': 0.6})
    hall = cyclic_convolve(m.bus('hall'), make_ir(3.8, 0.03, 0.5, 1.2, seed=9))
    echo = pingpong(m.bus('echo'), beat * 0.75, 0.42, 6)
    x = m.dry + hall * 0.45 + echo * 0.3
    return master(x, -16.7)


# ---------------------------------------------------------------- 5. Open Sky

def open_sky():
    L = 36.08
    rng = np.random.default_rng(55)
    n = int(L * SR)
    chords = [('D2', 'F#3 A3 C#4 E4'), ('G2', 'B3 D4 F#4 A4'), ('B1', 'D3 F#3 A3 C#4'), ('A1', 'E3 A3 B3 E4')]
    step = L / len(chords)
    pad, air, low = Part(HALO_PAD), Part(WARM_PAD, pan=0.2), Part(CELLO, pan=-0.2)
    for i, (b, v) in enumerate(chords):
        pad.chord(i * step, step + 2.5, notes(v), 58)
        air.chord(i * step + 0.6, step + 2.0, [k + 12 for k in notes(v)[1:3]], 40)
        low.note(i * step, step + 1.5, midi(b) + 12, 40)
    plucks, kal = Part(GTR_HARMONICS, pan=0.3), Part(KALIMBA, pan=-0.35)
    scale = notes('D5 E5 F#5 A5 B5 D6 E6')
    twinkles(plucks, L, rng, scale, 1.6, vel=(44, 76), dur=(1.0, 2.5))
    twinkles(kal, L, rng, scale[:5], 3.0, vel=(40, 64), dur=(0.8, 1.6))
    flute = Part(FLUTE, pan=0.05)
    for t, d, k in [(5, 2.5, 'A5'), (7.5, 1.5, 'F#5'), (9, 4, 'E5'), (23, 2.5, 'D6'), (25.5, 1.5, 'B5'),
                    (27, 4, 'A5')]:
        flute.note(t, d, k, 44)
    m = Mix(L)
    xf = 0.6 + 0.4 * smooth_env(n, [(i * step + 0.1, 0.0) for i in range(4)] + [(i * step + 3.0, 1.0) for i in range(4)] +
                                [(i * step + step - 2.0, 0.9) for i in range(4)])
    m.add(stem(pad, L), 1.0, {'hall': 0.5}, xf)
    m.add(stem(air, L), 0.6, {'hall': 0.6}, xf)
    m.add(stem(low, L), 0.5, {'hall': 0.4}, xf)
    m.add(stem(plucks, L), 0.6, {'hall': 0.7, 'echo': 0.5})
    m.add(stem(kal, L), 0.5, {'hall': 0.7, 'echo': 0.4})
    m.add(stem(flute, L), 0.45, {'hall': 0.8})
    m.add(sea_haze(n, rng, 4, 300, 3500), 0.02, {'hall': 0.3})
    hall = cyclic_convolve(m.bus('hall'), make_ir(4.8, 0.04, 0.6, 1.2, seed=11))
    echo = pingpong(m.bus('echo'), 0.62, 0.45, 6)
    x = m.dry + hall * 0.55 + echo * 0.3
    return master(x, -21.7)


# ---------------------------------------------------------------- jazz: Bossa

def bossa():
    L = 15.576
    bars = 8
    beat = L / (bars * 4)
    e8 = beat / 2
    rng = np.random.default_rng(66)
    prog = [('D2', 'A2', 'F#3 A3 C#4 E4'), ('D2', 'A2', 'F#3 A3 C#4 E4'), ('E2', 'B2', 'G3 B3 D4 F#4'),
            ('A1', 'E2', 'G3 B3 C#4 F#4'), ('D2', 'A2', 'F#3 A3 C#4 E4'), ('B1', 'F#2', 'A3 C4 D#4 F#4'),
            ('E2', 'B2', 'G3 B3 D4 F#4'), ('A1', 'E2', 'G3 B3 C#4 F#4')]
    gtr, bass, ep, vib, kit = Part(NYLON, pan=-0.45), Part(AC_BASS), Part(TINE_EP, pan=0.5), Part(VIBES, pan=0.3), \
        Part(40, drums=True)
    clave = [0, 3, 6, 10, 13]  # 2-bar bossa clave in 8ths
    for b, (root, fifth, voicing) in enumerate(prog):
        t0 = b * 4 * beat
        vs = notes(voicing)
        # Guitar: thumb bass on 1 and 3, chord stabs on the clave.
        gtr.note(t0, beat * 1.8, midi(root) + 12, 70)
        gtr.note(t0 + 2 * beat, beat * 1.8, midi(fifth) + 12, 64)
        for c in clave:
            pos = c - 8 * (b % 2)
            if 0 <= pos < 8:
                gtr.chord(t0 + pos * e8, e8 * 1.6, vs, 58 + rng.integers(-6, 6), spread=0.012)
        # Bass: root (dotted quarter), fifth (8th), fifth (half).
        bass.note(t0, beat * 1.45, midi(root), 92)
        bass.note(t0 + 1.5 * beat, e8 * 0.9, midi(fifth), 78)
        bass.note(t0 + 2 * beat, beat * 1.9, midi(fifth), 84)
        # Rhodes: soft rootless chord on beat 1 every other bar, with a push.
        if b % 2 == 0:
            ep.chord(t0 - e8 if b else t0, 4 * beat, [k + 12 for k in vs[1:]], 46)
        # Drums: brush pattern.
        for s in range(8):
            kit.note(t0 + s * e8, e8, 42, 34 + (10 if s % 2 == 0 else 0) + rng.integers(-4, 4))  # closed hat
            kit.note(t0 + s * e8 + e8 / 2, e8 / 2, 70, 26 + rng.integers(-4, 6))  # shaker 16ths
        for s in range(4):
            kit.note(t0 + s * beat, beat, 38, 30 + rng.integers(-3, 3))  # brush swish
        kit.note(t0, beat, 36, 62)
        kit.note(t0 + 2 * beat, beat, 36, 50)
        kit.note(t0 + 3.5 * beat, e8, 36, 40)
        for c in clave:
            pos = c - 8 * (b % 2)
            if 0 <= pos < 8:
                kit.note(t0 + pos * e8, e8, 37, 58 + rng.integers(-4, 4))  # rim click
    melody = [
        [(0.0, 1.0, 'F#5'), (1.0, 0.5, 'E5'), (1.5, 1.5, 'F#5'), (3.0, 1.0, 'A5')],
        [(0.0, 3.0, 'C#5'), (3.5, 0.5, 'D5')],
        [(0.0, 1.0, 'E5'), (1.0, 0.5, 'F#5'), (1.5, 1.5, 'G5'), (3.0, 1.0, 'B5')],
        [(0.0, 2.5, 'A5'), (3.0, 0.5, 'G5'), (3.5, 0.5, 'E5')],
        [(0.0, 1.5, 'F#5'), (1.5, 0.5, 'E5'), (2.0, 1.0, 'D5'), (3.0, 1.0, 'A4')],
        [(0.0, 1.5, 'D#5'), (1.5, 0.5, 'F#5'), (2.0, 2.0, 'A5')],
        [(0.0, 1.0, 'G5'), (1.0, 0.5, 'F#5'), (1.5, 1.5, 'E5'), (3.0, 1.0, 'D5')],
        [(0.0, 2.0, 'C#5'), (2.0, 1.0, 'E5'), (3.0, 1.0, 'G5')],
    ]
    for b, bar in enumerate(melody):
        for o, d, k in bar:
            vib.note((b * 4 + o) * beat, d * beat * 0.95, k, 70 + rng.integers(-6, 6))
    m = Mix(L)
    m.add(stem(gtr, L), 1.0, {'room': 0.25})
    m.add(stem(bass, L), 1.1, {'room': 0.1})
    m.add(stem(ep, L), 0.45, {'room': 0.35})
    m.add(stem(vib, L), 0.7, {'room': 0.4, 'echo': 0.2})
    m.add(stem(kit, L), 0.8, {'room': 0.2})
    room = cyclic_convolve(m.bus('room'), make_ir(1.4, 0.015, 0.5, 1.5, seed=13))
    echo = pingpong(m.bus('echo'), beat * 0.75, 0.35, 4)
    x = m.dry + room * 0.5 + echo * 0.25
    return master(x, -13.9)


# ---------------------------------------------------------------- wind: Sea breeze

def sea_breeze():
    L = 12.0
    rng = np.random.default_rng(77)
    n = int(L * SR)
    tt = t_axis(n)
    wind = []
    for ch in range(2):
        noise = cyclic_noise(n, rng)
        lfo = 0.5 + 0.5 * cyclic_lfo(n, 3, ch * 1.3) * cyclic_lfo(n, 5, 0.7 + ch)
        lo = bandpass(noise, 250, 900) * (0.4 + 0.6 * lfo)
        hi = bandpass(noise, 900, 3200) * (0.2 + 0.8 * lfo ** 2)
        wind.append(lo + hi * 0.5)
    wind = np.c_[wind[0], wind[1]]
    surf = np.zeros((n, 2))
    for k, t0 in enumerate((0.8, 6.8)):
        period = L
        ph = ((tt - t0) % period) / period * L  # seconds since the wave started, wrapping
        rise = np.clip(ph / 2.2, 0, 1) ** 2
        fall = np.exp(-np.clip(ph - 2.2, 0, None) / 1.4)
        envl = rise * fall
        crash = cyclic_noise(n, rng)
        body = bandpass(crash, 120, 1800) * envl
        onset = np.clip((ph - 1.9) / 0.8, 0, 1)
        onset = onset * onset * (3 - 2 * onset)
        fizz = bandpass(cyclic_noise(n, rng, 'white'), 2500, 9000) * onset * np.exp(-np.clip(ph - 2.7, 0, None) / 2.5)
        pan = 0.3 if k == 0 else -0.3
        mono = body + fizz * 0.18
        surf += np.c_[mono * (1 - pan), mono * (1 + pan)]
    gust = np.c_[lowpass(cyclic_noise(n, rng, 'white'), 220, 3), lowpass(cyclic_noise(n, rng, 'white'), 220, 3)]
    gust = gust / np.abs(gust).max() * (0.5 + 0.5 * cyclic_lfo(n, 2, 0.4))[:, None]
    x = wind * 0.6 + surf * 0.9 + gust * 0.7
    x = cyclic_convolve(x, make_ir(1.6, 0.02, 0.6, 1.4, seed=17)) * 0.3 + x
    return master(x, -25.7, glue=False)


TRACKS = {
    'drones/1': golden_shore, 'drones/2': the_gate, 'drones/3': golden_hall, 'drones/4': lift,
    'drones/5': open_sky, 'ambient/jazz': bossa, 'ambient/wind': sea_breeze,
}

if __name__ == '__main__':
    names = sys.argv[1:] or list(TRACKS)
    for name in names:
        x = TRACKS[name]()
        encode(x, os.path.join(OUT, name))
        print('%-14s %.2f s  peak %.2f' % (name, len(x) / SR, np.abs(x).max()))
