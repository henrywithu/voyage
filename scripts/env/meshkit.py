"""Small procedural mesh toolkit for Voyage's environments (numpy; AO via Blender's BVH when available)."""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '../character'))
import meshio  # noqa: E402


class Mesh:
    def __init__(self):
        self.P, self.F, self.N, self.uv, self.tag = [], [], [], [], []
        self.n = 0

    def add(self, P, F, N=None, uv=None, tag=0, smooth=True):
        P = np.asarray(P, float)
        F = np.asarray(F, int)
        if N is None:
            N = normals(P, F) if smooth else None
        if N is None:  # flat: split every face
            P, F = P[F].reshape(-1, 3), np.arange(len(F) * 3).reshape(-1, 3)
            fn = face_normals(P, F)
            N = np.repeat(fn, 3, axis=0)
            uv = None if uv is None else np.asarray(uv)[np.asarray(F).ravel()] if False else None
        self.P.append(P)
        self.F.append(F + self.n)
        self.N.append(N)
        self.uv.append(np.zeros((len(P), 2)) if uv is None else np.asarray(uv, float))
        self.tag.append(np.full(len(P), tag))
        self.n += len(P)
        return self

    def arrays(self):
        return (np.vstack(self.P), np.vstack(self.F), np.vstack(self.N), np.vstack(self.uv),
                np.concatenate(self.tag))

    def transformed(self, R=np.eye(3), t=(0, 0, 0), s=1.0):
        out = Mesh()
        for P, F, N, uv, tag in zip(self.P, self.F, self.N, self.uv, self.tag):
            out.P.append((P @ R.T) * s + np.asarray(t))
            out.F.append(F)
            out.N.append(N @ R.T)
            out.uv.append(uv)
            out.tag.append(tag)
        out.n = self.n
        return out


def face_normals(P, F):
    fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    return fn / np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12)


def normals(P, F):
    fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    N = np.zeros_like(P)
    for k in range(3):
        np.add.at(N, F[:, k], fn)
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)


def grid(G, close_u=False, flip=False):
    """Faces for a (rows, cols) vertex index grid."""
    F = []
    R, C = G.shape
    cols = C if close_u else C - 1
    for i in range(R - 1):
        for j in range(cols):
            a, b = G[i, j], G[i, (j + 1) % C]
            c, d = G[i + 1, (j + 1) % C], G[i + 1, j]
            F += [(a, c, b), (a, d, c)] if flip else [(a, b, c), (a, c, d)]
    return np.array(F)


def loft(rings, close_u=False, flip=False, cap0=False, cap1=False):
    """Loft a list of (k, 3) rings into a surface."""
    rings = [np.asarray(r, float) for r in rings]
    P = np.vstack(rings)
    k = len(rings[0])
    G = np.arange(len(P)).reshape(len(rings), k)
    F = list(grid(G, close_u, flip))
    for cap, ring in ((cap0, 0), (cap1, len(rings) - 1)):
        if cap:
            c = len(P)
            P = np.vstack([P, rings[ring].mean(0)])
            for j in range(k if close_u else k - 1):
                a, b = G[ring, j], G[ring, (j + 1) % k]
                F.append((c, b, a) if (ring == 0) != flip else (c, a, b))
    return P, np.array(F)


def tube(path, radius, sides=8, cap=True):
    """Tube along a polyline; radius may vary per point."""
    path = np.asarray(path, float)
    r = np.broadcast_to(np.asarray(radius, float), (len(path),))
    t = np.gradient(path, axis=0)
    t /= np.maximum(np.linalg.norm(t, axis=1, keepdims=True), 1e-12)
    ref = np.array([0, 1.0, 0]) if abs(t[0, 1]) < 0.9 else np.array([1.0, 0, 0])
    u = np.cross(t[0], ref)
    u /= np.linalg.norm(u)
    rings = []
    for i in range(len(path)):
        u = u - t[i] * u.dot(t[i])
        u /= np.linalg.norm(u)
        v = np.cross(t[i], u)
        a = np.linspace(0, 2 * np.pi, sides, endpoint=False)
        rings.append(path[i] + r[i] * (np.cos(a)[:, None] * u + np.sin(a)[:, None] * v))
    return loft(rings, close_u=True, cap0=cap, cap1=cap)


def cylinder(p0, p1, r0, r1=None, sides=10, segs=2):
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    path = p0 + (p1 - p0) * np.linspace(0, 1, segs + 1)[:, None]
    r = np.linspace(r0, r0 if r1 is None else r1, segs + 1)
    return tube(path, r, sides)


def box(c, size, R=np.eye(3)):
    sx, sy, sz = np.asarray(size) / 2
    P = np.array([[x, y, z] for x in (-sx, sx) for y in (-sy, sy) for z in (-sz, sz)])
    F = np.array([(0, 1, 3), (0, 3, 2), (4, 6, 7), (4, 7, 5), (0, 4, 5), (0, 5, 1), (2, 3, 7), (2, 7, 6),
                  (0, 2, 6), (0, 6, 4), (1, 5, 7), (1, 7, 3)])
    return P @ R.T + np.asarray(c), F


def ao_bvh(P, N, F, rays=24, dist=1.5, seed=1):
    """Hemisphere ambient occlusion per vertex (0 open .. 1 occluded) using Blender's BVHTree."""
    try:
        import bpy  # noqa: F401  (makes Blender's mathutils importable)
        from mathutils import Vector
        from mathutils.bvhtree import BVHTree
    except ImportError:
        return np.zeros(len(P))
    tree = BVHTree.FromPolygons([tuple(p) for p in P], [tuple(int(i) for i in f) for f in F])
    rng = np.random.default_rng(seed)
    dirs = rng.normal(size=(rays, 3))
    dirs /= np.linalg.norm(dirs, axis=1, keepdims=True)
    out = np.zeros(len(P))
    for i, (p, n) in enumerate(zip(P, N)):
        hit = 0
        o = Vector(p + n * 1e-3)
        for d in dirs:
            if d.dot(n) < 0:
                d = -d
            loc, _, _, dd = tree.ray_cast(o, Vector(d), dist)
            if loc is not None:
                hit += 1 - dd / dist
        out[i] = hit / rays
    return out


def write(path, mesh, ao=True, extra=None, ao_rays=16, ao_dist=1.0):
    P, F, N, uv, tag = mesh.arrays()
    A = ao_bvh(P, N, F, rays=ao_rays, dist=ao_dist) if ao else np.zeros(len(P))
    arrays = {'position': P.astype(np.float32), 'normal': N.astype(np.float32), 'ao': A[:, None].astype(np.float32)}
    if np.any(uv):  # the static shaders never sample uv; the loader fills a missing one with zeros
        arrays['uv'] = uv.astype(np.float32)
    for k, v in (extra or {}).items():
        arrays[k] = v
    os.makedirs(os.path.dirname(path), exist_ok=True)
    meshio.write(path, arrays, F.astype(np.uint32))
    print(os.path.basename(path), len(P), 'verts', len(F), 'tris')
    return P, F, N
