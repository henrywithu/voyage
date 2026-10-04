"""The 'Through' frame: a basalt rosette, hexagonal columns radiating from the disc of light.

    python3 target.py      # public/assets/decoded/story/grotto/rosette.bin.mesh

At Staffa the columns sometimes curve and splay into rosettes; here concentric
rings of radial columns frame the sun disc of the Target scene. Authored in that
scene's world units and stored in the 'structure' layer frame (uniform scale).
"""
import math
import os

import numpy as np

import basalt
import meshkit as mk

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '../../public/assets/decoded/story/grotto/rosette.bin.mesh')

FRAME_POS = np.array([0.0, -3.128, -3.33])
FRAME_SCALE = 0.5
CENTER = np.array([0.0, 0.0, -3.4])
R_DISC = 3.75
FLOOR = -3.211


def radial_column(dst, angle, r0, r1, z, radius, rng, joints=True):
    tmp = mk.Mesh()
    js = basalt.joints_for(r0, r1, rng, (0.5, 1.1)) if joints else ()
    basalt.column(tmp, 0.0, 0.0, radius, r0, r1, rng.uniform(0, np.pi / 3), js, chamfer=0.03,
                  top_tilt=(rng.normal(0, 0.04), rng.normal(0, 0.04)), bottom_cap=True, tag=1)
    # Canonical column runs along +Y from the origin; turn it to point along `angle` in the XY plane.
    a = angle - math.pi / 2
    R = np.array([[math.cos(a), -math.sin(a), 0], [math.sin(a), math.cos(a), 0], [0, 0, 1.0]])
    moved = tmp.transformed(R, CENTER + np.array([0, 0, z]), 1.0)
    dst.extend(moved)


def build(seed=31):
    rng = np.random.default_rng(seed)
    m = mk.Mesh()
    rings = [(R_DISC + 0.05, 34, 1.5), (R_DISC + 1.6, 44, 1.9), (R_DISC + 3.55, 56, 2.4), (R_DISC + 5.9, 70, 3.2)]
    for k, (r0, n, length) in enumerate(rings):
        off = rng.uniform(0, 2 * np.pi / n)
        width = 2 * np.pi * r0 / n
        for i in range(n):
            ang = off + i * 2 * np.pi / n + rng.normal(0, 0.012)
            start = r0 + rng.normal(0, 0.08) + (0.0 if k == 0 else rng.uniform(-0.1, 0.15))
            end = start + length * rng.uniform(0.82, 1.08)
            # Columns that would end up below the floor are skipped (beyond the floor line).
            y_lo = CENTER[1] + min(start, end) * math.sin(ang)
            if y_lo < FLOOR - 2.5:
                continue
            radial_column(m, ang, start, end, rng.uniform(-0.12, 0.12), width * 0.47, rng)
    # A dark back wall closes the gaps between the splaying columns.
    a = np.linspace(0, 2 * np.pi, 96, endpoint=False)
    inner = np.c_[np.cos(a) * (R_DISC + 0.3), np.sin(a) * (R_DISC + 0.3), np.full(96, -0.55)]
    outer = np.c_[np.cos(a) * 14, np.sin(a) * 14, np.full(96, -0.55)]
    P, F = mk.loft([outer, inner], close_u=True)
    P = P + CENTER
    fn = mk.face_normals(P, F)
    if fn[:, 2].mean() < 0:
        F = F[:, ::-1]
    m.add(P, F, tag=2)
    return m


if __name__ == '__main__':
    m = build()
    local = m.transformed(np.eye(3), -FRAME_POS / FRAME_SCALE, 1 / FRAME_SCALE)
    P, F, N = mk.write(OUT, local, ao=True, ao_rays=14, ao_dist=2.0)
    print('local bounds', P.min(0).round(2), P.max(0).round(2))
