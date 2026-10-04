"""The Pearl Grotto: a sea cave walled with hexagonal basalt columns, tide pools on the floor,
and a shell altar at the far end where the three pendants turn.

    python3 grotto.py

Authored in world units of the Cathedral scene and stored in the layers' local
frame (position FRAME_POS, uniform scale FRAME_SCALE), so the scene layout and its
shading uniforms (vertical gradient in local y) carry over.
"""
import math
import os

import numpy as np

import basalt
import meshkit as mk

HERE = os.path.dirname(os.path.abspath(__file__))
DEC = os.path.join(HERE, '../../public/assets/decoded/story/grotto')

FRAME_POS = np.array([0.0, -5.92, -1.68])
FRAME_SCALE = 0.424
FLOOR = -6.24
ALTAR_Z = -21.3


def to_local(m):
    return m.transformed(np.eye(3), -FRAME_POS / FRAME_SCALE, 1 / FRAME_SCALE)


BAYS = (-5.2, -9.6, -13.8, -17.8)


def buttress(z):
    return max(math.exp(-((z - b) / 0.95) ** 4) for b in BAYS)


def inner_x(z):
    """Half-width of the nave at depth z: buttresses of columns stand out from recessed bays, and
    the walls close in toward the altar."""
    narrow = np.clip((z + 18.5) / -4.0, 0, 1)
    return 3.75 - 1.15 * buttress(z) + 0.18 * math.sin(z * 1.3) - 1.1 * narrow ** 1.5


def walls(m, rng):
    for side in (-1, 1):
        pts = basalt.hex_grid(0.0, 1.9, -23.0, -3.2, 0.98, 0.05, rng)
        for u, z in pts:
            xi = inner_x(z)
            x = side * (xi + u)
            r = rng.uniform(0.47, 0.55)
            rot = rng.uniform(0, np.pi / 3)
            if u < 0.5 and rng.random() < 0.45 and buttress(z) < 0.5:
                # A broken column at the foot of the wall: a step or a seat.
                top = FLOOR + rng.uniform(0.25, 1.4)
                basalt.column(m, x, z, r, FLOOR - 0.3, top, rot, basalt.joints_for(FLOOR, top, rng, (0.35, 0.8)),
                              top_tilt=(rng.normal(0, 0.05), rng.normal(0, 0.05)), tag=1)
                continue
            top = 9.0 + rng.uniform(0, 4.5)
            # Cross joints where the light reaches; above, the columns climb into the dark.
            low = basalt.joints_for(FLOOR, FLOOR + 4.2, rng, (0.7, 1.6)) if u < 1.0 else []
            basalt.column(m, x, z, r, FLOOR - 0.3, top, rot, low, tag=1)
    # Columns stepping in at the far end, framing the light behind the altar.
    for side in (-1, 1):
        for k in range(6):
            z = -22.9 - rng.uniform(0, 0.8)
            x = side * (1.3 + 0.95 * k + rng.uniform(-0.1, 0.1))
            top = FLOOR + (0.5 + 0.8 * k) ** 1.4 + rng.uniform(0, 0.5)
            basalt.column(m, x, z, rng.uniform(0.46, 0.53), FLOOR - 0.3, top, rng.uniform(0, 1),
                          basalt.joints_for(FLOOR, top, rng, (0.4, 1.0)), tag=1)


def floor_stones(m, rng):
    """Column heads paving the floor, with gaps of still water between them (the tide pools)."""
    pts = basalt.hex_grid(-3.6, 3.6, -20.6, -2.5, 0.92, 0.05, rng)
    for x, z in pts:
        if abs(x) > inner_x(z) - 0.3:
            continue
        # Pools: low-frequency holes in the paving, and a clear channel of water up the middle.
        pool = math.sin(x * 1.3 + 0.7) * math.sin(z * 0.45) + 0.5 * math.sin(z * 0.9 + x)
        if pool > 0.45 or (abs(x - 0.25 * math.sin(z * 0.3)) < 0.6 and z < -7):
            continue
        top = FLOOR + rng.uniform(0.03, 0.14)
        basalt.column(m, x, z, rng.uniform(0.4, 0.46), FLOOR - 0.35, top, rng.uniform(0, 1), (),
                      chamfer=0.02, top_tilt=(rng.normal(0, 0.02), rng.normal(0, 0.02)), tag=2)


def scallop(m, center, R, tilt_deg, depth, ribs=15, nr=14, nt=46, flip=False, tag=4):
    """One valve of a scallop: a ribbed fan, cupped, hinged at `center`, opening along +Y of its own
    frame, then tilted back about X by tilt_deg."""
    th = np.linspace(-1.15, 1.15, nt)
    rho = np.linspace(0.04, 1.0, nr)
    P = []
    for r in rho:
        for t in th:
            # Fan outline: a rounded fan with a slightly scalloped edge.
            edge = 1.0 - 0.05 * (1 - np.cos(ribs * t)) * r
            x = R * r * edge * math.sin(t)
            y = R * r * edge * math.cos(t)
            cup = depth * (1 - (r * edge) ** 2) - depth
            rib = 0.035 * R * r * (0.5 + 0.5 * math.cos(ribs * t))
            P.append((x, y, (cup + rib) * (-1 if flip else 1)))
    P = np.array(P)
    G = np.arange(nr * nt).reshape(nr, nt)
    F = mk.grid(G)
    # Give the valve a thickness: back skin and a closed rim.
    N = mk.normals(P, F)
    back = P - N * 0.025 * R
    n = len(P)
    Pf = np.vstack([P, back])
    Ff = np.vstack([F, F[:, ::-1] + n])
    rim = list(G[-1]) + list(G[:, -1][::-1])[1:] + list(G[0][::-1])[1:] + list(G[:, 0])[1:-1]
    for a, b in zip(rim, rim[1:] + rim[:1]):
        Ff = np.vstack([Ff, [(a, b, b + n), (a, b + n, a + n)]])
    a = math.radians(tilt_deg)
    Rx = np.array([[1, 0, 0], [0, math.cos(a), -math.sin(a)], [0, math.sin(a), math.cos(a)]])
    Pf = Pf @ Rx.T + np.asarray(center)
    m.add(Pf, Ff, tag=tag)
    # Ears at the hinge.
    for s in (-1, 1):
        P2, F2 = mk.box((0, 0, 0), (0.22 * R, 0.12 * R, 0.03 * R))
        P2 = (P2 + (s * 0.13 * R, 0.02 * R, 0)) @ Rx.T + np.asarray(center)
        m.add(P2, F2, smooth=False, tag=tag)


def altar(rng):
    m = mk.Mesh()
    tops = []
    for (dx, dz, h) in ((-0.33, 0.05, 0.42), (0.02, -0.12, 0.62), (0.36, 0.08, 0.5), (-0.05, 0.42, 0.24)):
        top = FLOOR + h
        tops.append(top)
        basalt.column(m, dx, ALTAR_Z + dz, 0.29, FLOOR - 0.3, top, rng.uniform(0, 1),
                      basalt.joints_for(FLOOR, top, rng, (0.25, 0.4)), tag=3)
    # The scallop: the lower valve cupped on the altar, the upper valve standing open behind it.
    c = np.array([0.02, tops[1] + 0.03, ALTAR_Z - 0.05])
    scallop(m, c + (0, 0, 0.06), 0.62, 82, 0.12, tag=4)       # lying, opening toward the viewer
    scallop(m, c + (0, 0.02, -0.08), 0.72, -8, 0.16, flip=True, tag=4)   # standing behind
    return m


def build(seed=21):
    rng = np.random.default_rng(seed)
    hall = mk.Mesh()
    walls(hall, rng)
    floor_stones(hall, rng)
    return hall, altar(rng)


if __name__ == '__main__':
    hall, alt = build()
    # The altar and shell are built at a modest size, then enlarged about the altar's foot so
    # they read from the far end of the hall.
    c = np.array([0.0, FLOOR, ALTAR_Z])
    alt = alt.transformed(np.eye(3), c - 1.4 * c, 1.4)
    P, F, N = mk.write(os.path.join(DEC, 'hall.bin.mesh'), to_local(hall), ao=True, ao_rays=16, ao_dist=3.0)
    print('hall local bounds', P.min(0).round(2), P.max(0).round(2))
    P, F, N = mk.write(os.path.join(DEC, 'altar.bin.mesh'), to_local(alt), ao=True, ao_rays=16, ao_dist=1.5)
    print('altar local bounds', P.min(0).round(2), P.max(0).round(2))
