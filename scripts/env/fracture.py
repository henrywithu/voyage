"""A hexagonal basalt column broken into convex Voronoi pieces, for the breaking-columns scene.

    python3 fracture.py     # public/assets/decoded/story/pillarcrumble/basalt_fracture.bin.mesh

Matches the source fracture's frame: radius about 0.1, height 1.0, base at y = 0.
Each vertex carries its piece's centroid as `pivot` (the shader breaks the column
apart about it, more strongly near the top). Pieces are denser toward the top.
"""
import os

import numpy as np
from scipy.spatial import ConvexHull, HalfspaceIntersection, cKDTree

import meshkit as mk

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '../../public/assets/decoded/story/pillarcrumble/basalt_fracture.bin.mesh')

R = 0.104
H = 1.0
ROT = 0.3


def prism_halfspaces():
    """Halfspaces A x + b <= 0 for the hexagonal prism (6 sides, bottom, top)."""
    hs = []
    apothem = R * np.cos(np.pi / 6)
    for k in range(6):
        a = ROT + np.pi / 6 + k * np.pi / 3
        n = np.array([np.cos(a), 0, np.sin(a)])
        hs.append(np.r_[n, -apothem])
    hs.append(np.array([0, -1.0, 0, 0.0]))       # y >= 0
    hs.append(np.array([0, 1.0, 0, -H]))         # y <= H
    return np.array(hs)


def seeds(n=300, seed=4):
    rng = np.random.default_rng(seed)
    pts = []
    apothem = R * np.cos(np.pi / 6) * 0.95
    while len(pts) < n:
        y = H * (1 - rng.random() ** 2.2)          # denser near the top
        x, z = rng.uniform(-R, R, 2)
        # Inside the hexagon?
        ok = True
        for k in range(6):
            a = ROT + np.pi / 6 + k * np.pi / 3
            if x * np.cos(a) + z * np.sin(a) > apothem:
                ok = False
        if ok:
            pts.append((x, y, z))
    # Cross joints: a few seeds layered in thin slabs give the column its drums.
    for y in (0.18, 0.41, 0.63):
        for k in range(3):
            a = rng.uniform(0, 2 * np.pi)
            pts.append((0.5 * R * np.cos(a), y + rng.uniform(-0.01, 0.01), 0.5 * R * np.sin(a)))
    return np.array(pts)


def build():
    S = seeds()
    tree = cKDTree(S)
    base = prism_halfspaces()
    m = mk.Mesh()
    pivots = []
    for i, s in enumerate(S):
        _, nb = tree.query(s, k=min(28, len(S)))
        hs = [base]
        for j in nb[1:]:
            d = S[j] - s
            mid = (S[j] + s) / 2
            hs.append(np.r_[d, -d @ mid][None])
        hs = np.vstack(hs)
        try:
            inter = HalfspaceIntersection(hs, s)
        except Exception:
            continue
        V = inter.intersections
        if len(V) < 4:
            continue
        hull = ConvexHull(V)
        F = hull.simplices.copy()
        c = V.mean(0)
        fn = mk.face_normals(V, F)
        flip = np.einsum('ij,ij->i', fn, V[F].mean(1) - c) < 0
        F[flip] = F[flip][:, ::-1]
        # Flat shading: split vertices per face.
        Pf = V[F].reshape(-1, 3)
        Ff = np.arange(len(Pf)).reshape(-1, 3)
        Nf = np.repeat(mk.face_normals(Pf, Ff), 3, axis=0)
        m.add(Pf, Ff, N=Nf)
        pivots.append(np.tile(c, (len(Pf), 1)))
    return m, np.vstack(pivots)


if __name__ == '__main__':
    m, pivot = build()
    P, F, N = mk.write(OUT, m, ao=True, ao_rays=10, ao_dist=0.08, extra={'pivot': pivot.astype(np.float32)})
    print('bounds', P.min(0).round(3), P.max(0).round(3), 'pieces', len(np.unique(pivot.round(5), axis=0)))
