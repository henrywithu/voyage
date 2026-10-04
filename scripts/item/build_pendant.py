"""The Trapnest Voyage compass pendant for the product showcase and the collection (PBR meshes).

    python3 scripts/item/build_pendant.py

Outputs public/assets/decoded/fpo/voyage-pendant-{gold,pearl}.bin.mesh, fitted to the
frame of the flask it replaces (base at y = 0, top at y ~= 1.375), so the showcase
layout and camera need no changes. Gold: rose, rings, bail and chain; pearl: the
sphere at the heart, tinted with the tide in the scene.
"""
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '../..')
sys.path.insert(0, os.path.join(ROOT, 'scripts/env'))
sys.path.insert(0, os.path.join(ROOT, 'scripts/character'))
import meshio  # noqa: E402
import meshkit as mk  # noqa: E402
import pendant as pd  # noqa: E402

DEC = os.path.join(ROOT, 'public/assets/decoded/fpo')


def rose_solid(m, cy, thick=0.05):
    """Eight-point rose with bevelled, ridged points: front and back pyramids per point, joined."""
    for k in range(8):
        ang = math.pi / 2 - k * math.pi / 4
        L = 0.36 if k % 2 == 0 else 0.235
        w = 0.085 if k % 2 == 0 else 0.065
        d = np.array([math.cos(ang), math.sin(ang), 0])
        side = np.array([-d[1], d[0], 0])
        c = np.array([0, cy, 0])
        tip = c + d * L
        l = c + side * w + d * 0.02
        r = c - side * w + d * 0.02
        for sz in (1, -1):
            ridge = c + d * 0.02 + np.array([0, 0, sz * thick])
            P = np.array([tip, l, ridge, r])
            F = np.array([(0, 2, 1), (0, 3, 2)]) if sz > 0 else np.array([(0, 1, 2), (0, 2, 3)])
            m.add(P, F, smooth=False)


def build():
    gold, pearl = mk.Mesh(), mk.Mesh()
    cy = pd.CY
    P, F = mk.cylinder((0, cy, -0.014), (0, cy, 0.014), 0.2, 0.2, sides=64, segs=1)
    gold.add(P, F)
    rose_solid(gold, cy)
    gold.add(*pd.torus((0, cy, 0), (0, 0, 1), pd.R_RING, 0.022, nu=96, nv=16))
    gold.add(*pd.torus((0, cy, 0), (0, 0, 1), 0.13, 0.01, nu=72, nv=10))
    # Engraved ticks around the ring, at the eight winds.
    for k in range(32):
        a = k * math.pi / 16
        r0, r1 = 0.155, 0.17 if k % 4 else 0.19
        p0 = np.array([r0 * math.cos(a), cy + r0 * math.sin(a), 0.016])
        p1 = np.array([r1 * math.cos(a), cy + r1 * math.sin(a), 0.016])
        gold.add(*mk.cylinder(p0, p1, 0.004, 0.004, sides=6, segs=1))
    gold.add(*pd.torus((0, cy + pd.R_RING + 0.045, 0), (1, 0, 0), 0.035, 0.012, nu=32, nv=10))
    # A finer, denser chain for the close showcase.
    t = np.linspace(0, 2 * np.pi, 600)
    a, b = 0.21, 0.31
    bottom = cy + pd.R_RING + 0.07
    pts = np.c_[a * np.sin(t) * (0.75 + 0.25 * (1 - np.cos(t)) / 2), bottom + b * (1 - np.cos(t)), np.zeros_like(t)]
    seg = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
    links = 52
    for i in range(links):
        s0 = (i + 0.5) / links * seg[-1]
        k = min(np.searchsorted(seg, s0), len(pts) - 2)
        c = pts[k]
        d = pts[k + 1] - pts[max(k - 1, 0)]
        d /= np.linalg.norm(d)
        n = np.array([0, 0, 1.0]) if i % 2 == 0 else np.cross(d, [0, 0, 1.0])
        P, F, N = pd.torus(c, n, 0.012, 0.0042, nu=16, nv=8)
        rel = P - c
        P = c + rel + d * (rel @ d)[:, None] * 0.45
        gold.add(P, F, N=N)
    P, F, N = pd.sphere((0, cy, 0), 0.088, nu=48, nv=32)
    pearl.add(P, F, N=N)
    return gold, pearl


def fit(meshes, top=1.375):
    allP = np.vstack([m.arrays()[0] for m in meshes])
    lo, hi = allP[:, 1].min(), allP[:, 1].max()
    s = top / (hi - lo)
    return [m.transformed(np.eye(3), (0, -lo * s, 0), s) for m in meshes], s


if __name__ == '__main__':
    (gold, pearl), s = fit(build())
    os.makedirs(DEC, exist_ok=True)
    for name, m in (('gold', gold), ('pearl', pearl)):
        P, F, N, _, _ = m.arrays()
        uv = np.full((len(P), 2), 0.5, np.float32)
        meshio.write(os.path.join(DEC, f'voyage-pendant-{name}.bin.mesh'),
                     {'position': P.astype(np.float32), 'normal': N.astype(np.float32), 'uv': uv}, F.astype(np.uint32))
        print(name, len(P), 'verts', P.min(0).round(3), P.max(0).round(3), 'scale', round(s, 3))
