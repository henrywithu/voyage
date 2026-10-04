"""The sea arch: a massif of hexagonal basalt columns with a great round-headed arch through it.

    python3 arch.py      # public/assets/decoded/story/sea/arch.bin.mesh

Built in the frame of the Approach/Near 'structure' layer (the old portal), so the
sun disc layer (centre about (-0.05, 1.53, 1.5) here, radius 1.8) sits inside the
opening. Sea level in this frame is about y = -2.7 in the Approach scene.
"""
import math
import os

import numpy as np

import basalt
import meshkit as mk

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '../../public/assets/decoded/story/sea/arch.bin.mesh')

CX, CY = -0.05, 1.53       # disc centre
R_OPEN = 2.45              # opening radius (the disc is ~1.8)
SEA = -2.75
BOTTOM = -4.2


def massif_top(x, z, rng):
    """Height of the column tops: a sheer-sided stack with a ragged plateau, falling to the sea in
    terraces at the flanks and stepping down toward the front like a giant's stair."""
    ax = abs(x - CX)
    plateau = 8.3 + 0.45 * math.sin(x * 0.63 + 0.4) + 0.3 * math.sin(x * 1.7)
    fall = np.clip((ax - 4.6) / 4.8, 0, 1)
    fall = math.floor(fall * 6 + rng.uniform(-0.35, 0.35)) / 6      # terraces
    fall = float(np.clip(fall, 0, 1)) ** 1.25
    core = plateau * (1 - fall) + (SEA + 0.3) * fall
    front = -1.0 * max(0.0, z - 0.7) - 0.6 * max(0.0, -z - 1.7)
    return core + front + rng.normal(0, 0.22)


def ceiling(x):
    dx = x - CX
    if abs(dx) >= R_OPEN:
        return None
    return CY + math.sqrt(R_OPEN ** 2 - dx ** 2)


def build(seed=7):
    rng = np.random.default_rng(seed)
    m = mk.Mesh()
    pts = basalt.hex_grid(-11.5, 11.5, -2.6, 2.9, 0.66, 0.06, rng)
    for cx, cz in pts:
        r = rng.uniform(0.34, 0.4)
        rot = rng.uniform(0, np.pi / 3)
        top = massif_top(cx, cz, rng)
        if top < SEA + 0.4:
            continue
        # Ragged flanks: thin out toward the ends.
        if abs(cx) > 9.5 and rng.random() < (abs(cx) - 9.5) / 2.2:
            continue
        tilt = (rng.normal(0, 0.06), rng.normal(0, 0.06))
        ceil = ceiling(cx)
        if ceil is not None:
            # Through the opening: only the lintel (above the ceiling) remains; the underside is
            # the stepped ends of the columns.
            y0 = ceil + rng.uniform(0.0, 0.35) + 0.25 * (abs(cx - CX) / R_OPEN) ** 4
            if top - y0 < 0.6:
                top = y0 + rng.uniform(0.6, 1.2)
            basalt.column(m, cx, cz, r, y0, top, rot, basalt.joints_for(y0, top, rng), top_tilt=tilt,
                          bottom_cap=True, tag=1)
        else:
            basalt.column(m, cx, cz, r, BOTTOM, top, rot, basalt.joints_for(BOTTOM, top, rng), top_tilt=tilt, tag=1)
    # Broken stumps and fallen drums in the water before the arch.
    for _ in range(26):
        x = rng.uniform(-9, 9)
        z = rng.uniform(3.2, 7.5)
        if abs(x - CX) < 1.6 and z < 6:
            continue
        r = rng.uniform(0.27, 0.35)
        h = SEA + rng.uniform(0.15, 1.6) * (1 - abs(x) / 14)
        basalt.column(m, x, z, r, BOTTOM, h, rng.uniform(0, 1), basalt.joints_for(BOTTOM, h, rng),
                      top_tilt=(rng.normal(0, 0.12), rng.normal(0, 0.12)), tag=2)
    return m


NEAR_WATER = -0.262      # the still water in the Near scene, in this frame
NEAR_STANDING = (-0.066, -0.235, 3.38)   # her soles in the Near scene


def causeway(seed=11):
    """Stepping stones for the Near scene: hexagonal column heads just clear of the still water,
    a ragged causeway leading from the viewer into the arch."""
    rng = np.random.default_rng(seed)
    m = mk.Mesh()
    pts = basalt.hex_grid(-5.5, 5.5, 0.9, 9.5, 0.7, 0.05, rng)
    sx, sy, sz = NEAR_STANDING
    for cx, cz in pts:
        path_x = CX + 0.35 * math.sin(cz * 0.8)
        dist = abs(cx - path_x)
        if np.hypot(cx - sx, cz - sz) < 0.36:
            top = sy        # the stone she stands on
        elif dist < 1.15 + 0.25 * rng.random():
            if rng.random() < 0.12:
                continue
            top = NEAR_WATER + rng.uniform(0.012, 0.06)
        elif dist < 4.5 and rng.random() < 0.28 * (1 - dist / 5):
            top = NEAR_WATER + rng.uniform(0.02, 0.3) * (1 + dist * 0.5)
        else:
            continue
        r = rng.uniform(0.31, 0.37)
        basalt.column(m, cx, cz, r, NEAR_WATER - 0.6, top, rng.uniform(0, np.pi / 3), (),
                      chamfer=0.02, top_tilt=(rng.normal(0, 0.015), rng.normal(0, 0.015)), tag=3)
    return m


if __name__ == '__main__':
    m = build()
    P, F, N = mk.write(OUT, m, ao=True, ao_rays=20, ao_dist=1.6)
    print('bounds', P.min(0).round(2), P.max(0).round(2))
    P, F, N = mk.write(OUT.replace('arch.bin', 'near-causeway.bin'), causeway(), ao=True, ao_rays=16, ao_dist=0.8)
    print('bounds', P.min(0).round(2), P.max(0).round(2))
