"""Ink-stroke curves for the sea (rendered by the WindLines shader as travelling dashes).

    python3 sea_curves.py

wander-sea-curves.json: wave crests across the open sea, in Chaewon's bow-pose
space (the boat's space), on the waterline.
wake-curves.json: the bow wave, the foam along the hull and the wake.
"""
import json
import math
import os

import numpy as np

import boat

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '../../public/assets/geometry/story/sea')
Y = boat.WATERLINE + 0.005


def save(name, curves):
    os.makedirs(OUT, exist_ok=True)
    data = {'data': {'curves': [{'position': [round(float(v), 4) for v in np.asarray(c).ravel()]} for c in curves]}}
    with open(os.path.join(OUT, name), 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    print(name, len(curves), 'curves')


def crests(seed=3, rows=95, z_near=9.0, z_far=-90.0, half_width=30.0):
    """Long gently undulating crest lines, denser toward the horizon, broken into strokes."""
    rng = np.random.default_rng(seed)
    curves = []
    s = np.linspace(0, 1, rows)
    zs = z_near + (z_far - z_near) * s ** 1.6
    for z in zs:
        width = half_width * (0.5 + 0.5 * (z_near - z) / (z_near - z_far)) + 6
        x = -width
        while x < width:
            L = rng.uniform(2.5, 9.0)
            n = max(4, int(L / 0.25))
            xs = np.linspace(x, min(x + L, width), n)
            ph = rng.uniform(0, 2 * np.pi)
            zz = z + 0.08 * np.sin(xs * rng.uniform(0.5, 1.1) + ph) + rng.uniform(-0.4, 0.4)
            # A crest is a shallow arc: ends dip back a little.
            u = (xs - xs[0]) / max(xs[-1] - xs[0], 1e-6)
            zz = zz - 0.12 * (2 * u - 1) ** 2 * (L / 6)
            curves.append(np.c_[xs, np.full(n, Y), zz])
            x += L + rng.uniform(0.6, 3.5)
    return curves


def waterline_half_beam(t):
    xy = boat.section(t, 200)
    y = xy[:, 1]
    i = np.flatnonzero(y <= boat.WATERLINE)
    if not len(i):
        return 0.0
    return float(np.max(np.abs(xy[i, 0] - boat.CL)))


def wake():
    curves = []
    ts = np.linspace(0.02, 0.985, 50)
    zs = boat.Z_STERN + ts * (boat.Z_BOW - boat.Z_STERN)
    hb = np.array([waterline_half_beam(t) for t in ts])
    # Stem at the waterline (the raked stem sits a little aft of the deck's bow).
    bow_z = zs[hb > 0.02].max() + 0.05
    for sgn in (1, -1):
        # Foam along the hull, bow -> stern.
        for off in (0.03, 0.11):
            x = boat.CL + sgn * (hb + off)
            c = np.c_[x, np.full(len(zs), Y), zs][::-1]
            c = c[hb[::-1] > 0.01]
            curves.append(c)
        # Kelvin bow waves: fan out at about 19 degrees, a few echoes.
        for k, (start, ang, L) in enumerate(((0.0, 20, 11.0), (0.5, 18.5, 12.5), (1.3, 17.5, 13.0), (2.4, 16.5, 12.0))):
            u = np.linspace(0, 1, 40)
            z = bow_z - start - u * L
            spread = math.tan(math.radians(ang)) * (u * L + start * 0.6) + 0.12 + 0.05 * k
            wob = 0.05 * np.sin(u * 9 + k)
            curves.append(np.c_[boat.CL + sgn * (spread + wob), np.full(len(u), Y), z])
        # Transverse ripples behind the stern.
        for k in range(5):
            z0 = boat.Z_STERN - 0.6 - 1.5 * k
            w = 0.7 + 0.35 * k
            xs = np.linspace(0.15, w, 10)
            curves.append(np.c_[boat.CL + sgn * xs, np.full(10, Y), z0 - 0.25 * (xs / w) ** 2])
    # Ripples standing off the hull: short strokes reaching out from the waterline.
    rng = np.random.default_rng(4)
    for sgn in (1, -1):
        for t in np.linspace(0.08, 0.92, 26):
            hbt = waterline_half_beam(t)
            if hbt < 0.05:
                continue
            z = boat.Z_STERN + t * (boat.Z_BOW - boat.Z_STERN) + rng.uniform(-0.1, 0.1)
            L = rng.uniform(0.25, 0.9)
            u = np.linspace(0, 1, 6)
            x = boat.CL + sgn * (hbt + 0.06 + u * L)
            curves.append(np.c_[x, np.full(6, Y), z - u * L * 0.35])
    # Stern wake: a widening band of turbulence.
    rng = np.random.default_rng(9)
    for k in range(7):
        x0 = rng.uniform(-0.45, 0.45)
        u = np.linspace(0, 1, 40)
        z = boat.Z_STERN - 0.2 - u * rng.uniform(10, 18)
        x = boat.CL + x0 * (1 + 2.5 * u) + 0.12 * np.sin(u * rng.uniform(6, 12) + k)
        curves.append(np.c_[x, np.full(len(u), Y), z])
    return curves


if __name__ == '__main__':
    save('wander-sea-curves.json', crests())
    # Approach: the camera rides behind the boat, the crests run on ahead toward the arch.
    save('approach-sea-curves.json', crests(seed=5, rows=110, z_near=-14.0, z_far=140.0, half_width=55.0))
    save('wake-curves.json', wake())
