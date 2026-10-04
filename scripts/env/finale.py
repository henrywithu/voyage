"""The finale on the sea: drifting basalt fragments, the distant arch, her sloop and ripples.

    python3 finale.py

World units of the Colosseum scene (layers set to identity transforms), except the
fragment, which is a local mesh shared by the six floating-rock layers.
"""
import json
import math
import os

import numpy as np

import boat
import meshkit as mk
import arch

HERE = os.path.dirname(os.path.abspath(__file__))
DEC = os.path.join(HERE, '../../public/assets/decoded/story/finale')
GEO = os.path.join(HERE, '../../public/assets/geometry/story/finale')

SEA = -4.133          # where her soles rest
FEET = np.array([0.0, SEA, -0.194])


def fragment(seed=3, L=1.8, r=0.47):
    """A broken drum of a hexagonal column lying along X, with jagged ends; plus its inverse hull
    (colorid 1) for the floating-rock shader's built-in outline."""
    rng = np.random.default_rng(seed)
    a = np.arange(6) * np.pi / 3 + 0.2
    ring = np.c_[np.cos(a), np.sin(a)] * r
    m = mk.Mesh()
    # Each end: the hexagon edge broken into a jagged profile.
    ends = []
    for sgn in (-1, 1):
        x = sgn * L / 2 + rng.uniform(-0.12, 0.12, 6)
        ends.append(np.c_[x, ring[:, 1], ring[:, 0]])
    for k in range(6):
        k2 = (k + 1) % 6
        P = np.array([ends[0][k], ends[0][k2], ends[1][k2], ends[1][k]])
        F = np.array([(0, 1, 2), (0, 2, 3)])
        fn = mk.face_normals(P, F)[0]
        c = P.mean(0)
        if np.dot(fn, np.r_[0, c[1], c[2]]) < 0:
            F = F[:, ::-1]
        m.add(P, F, smooth=False)
    for sgn, e in zip((-1, 1), ends):
        c = e.mean(0) + np.array([sgn * rng.uniform(-0.1, 0.18), rng.uniform(-0.08, 0.08), rng.uniform(-0.08, 0.08)])
        # Break the cap into a few facets around an off-centre peak.
        P = np.vstack([e, c])
        F = np.array([(6, k, (k + 1) % 6) for k in range(6)])
        fn = mk.face_normals(P, F)
        if np.dot(fn.mean(0), [sgn, 0, 0]) < 0:
            F = F[:, ::-1]
        m.add(P, F, smooth=False)
    P, F, N, _, _ = m.arrays()
    uv = np.c_[P[:, 0] * 0.5 + 0.5, P[:, 1] * 0.5 + P[:, 2] * 0.5 + 0.5]
    n = len(P)
    Pa = np.vstack([P, P])
    Fa = np.vstack([F, F[:, ::-1] + n])
    Na = np.vstack([N, N])
    uva = np.vstack([uv, uv])
    colorid = np.r_[np.zeros(n), np.ones(n)][:, None].astype(np.float32)
    return Pa, Fa, Na, uva, colorid


def horizon():
    """The sea arch far off on the horizon (left), her sloop waiting behind her (right)."""
    m = mk.Mesh()
    a = arch.build()
    # The sky is a plane at z -35: the arch stands just in front of it.
    s = 0.75
    m.extend(a.transformed(np.eye(3), (-9.5, SEA - arch.SEA * s, -31.0), s))
    b, _ = boat.build(furled=True)
    ang = math.radians(-115)
    R = np.array([[math.cos(ang), 0, math.sin(ang)], [0, 1, 0], [-math.sin(ang), 0, math.cos(ang)]])
    m.extend(b.transformed(R, (4.2, SEA - boat.WATERLINE + 0.05, -9.5), 1.0))
    return m


def ripples():
    curves = []
    for k, r in enumerate((0.32, 0.55, 0.85, 1.25, 1.75)):
        n = 48 + 16 * k
        t = np.linspace(0, 2 * np.pi, n)
        x = FEET[0] + r * np.cos(t)
        z = FEET[2] + r * 0.62 * np.sin(t)
        curves.append(np.c_[x, np.full(n, SEA + 0.004), z])
    return curves


if __name__ == '__main__':
    os.makedirs(DEC, exist_ok=True)
    P, F, N, uv, cid = fragment()
    import meshio
    meshio.write(os.path.join(DEC, 'fragment.bin.mesh'),
                 {'position': P.astype(np.float32), 'normal': N.astype(np.float32), 'uv': uv.astype(np.float32),
                  'colorid': cid}, F.astype(np.uint32))
    print('fragment', len(P))
    P, F, N = mk.write(os.path.join(DEC, 'horizon.bin.mesh'), horizon(), ao=True, ao_rays=12, ao_dist=1.5)
    print('horizon', P.min(0).round(1), P.max(0).round(1))
    os.makedirs(GEO, exist_ok=True)
    data = {'data': {'curves': [{'position': [round(float(v), 4) for v in c.ravel()]} for c in ripples()]}}
    json.dump(data, open(os.path.join(GEO, 'ripples.json'), 'w'), separators=(',', ':'))
