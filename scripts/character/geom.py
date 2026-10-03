"""Small geometry helpers (numpy/scipy) for the character pipeline."""
import numpy as np
from scipy.spatial import cKDTree


def tri_normals(V, F):
    n = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    return n


def vertex_normals(V, F):
    n = tri_normals(V, F)
    vn = np.zeros_like(V)
    for k in range(3):
        np.add.at(vn, F[:, k], n)
    l = np.linalg.norm(vn, axis=1, keepdims=True)
    return vn / np.maximum(l, 1e-12)


def quads_to_tris(faces):
    out = []
    for f in faces:
        if len(f) == 3:
            out.append(f)
        else:
            out.append([f[0], f[1], f[2]])
            out.append([f[0], f[2], f[3]])
    return np.array(out, np.int64)


def ray_mesh(origins, dirs, V, F, chunk=2048):
    """Closest positive hit distance per ray (Moller-Trumbore), inf if none."""
    v0, v1, v2 = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    e1, e2 = v1 - v0, v2 - v0
    out = np.full(len(origins), np.inf)
    for s in range(0, len(origins), chunk):
        o = origins[s:s + chunk, None, :]
        d = dirs[s:s + chunk, None, :]
        p = np.cross(d, e2[None])
        det = (e1[None] * p).sum(-1)
        ok = np.abs(det) > 1e-12
        inv = np.where(ok, 1.0 / np.where(ok, det, 1), 0)
        t0 = o - v0[None]
        u = (t0 * p).sum(-1) * inv
        q = np.cross(t0, e1[None])
        v = (d * q).sum(-1) * inv
        t = (e2[None] * q).sum(-1) * inv
        hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 1e-6)
        t = np.where(hit, t, np.inf)
        out[s:s + chunk] = t.min(1)
    return out


class SurfaceSDF:
    """Approximate signed distance using nearest vertex and its normal."""

    def __init__(self, V, F):
        self.V = V
        self.N = vertex_normals(V, F)
        self.tree = cKDTree(V)

    def __call__(self, P, k=4):
        d, i = self.tree.query(P, k=k)
        i = np.atleast_2d(i)
        w = 1.0 / np.maximum(np.atleast_2d(d), 1e-6)
        w /= w.sum(1, keepdims=True)
        near = (self.V[i] * w[..., None]).sum(1)
        nrm = (self.N[i] * w[..., None]).sum(1)
        nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
        sd = ((P - near) * nrm).sum(1)
        return sd, nrm, near


def rot_between(a, b):
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    v = np.cross(a, b)
    c = float(np.dot(a, b))
    if c < -0.999999:
        axis = np.cross(a, [1, 0, 0])
        if np.linalg.norm(axis) < 1e-6:
            axis = np.cross(a, [0, 1, 0])
        axis /= np.linalg.norm(axis)
        return axis_angle(axis, np.pi)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx * (1 / (1 + c))


def axis_angle(axis, ang):
    axis = np.asarray(axis, float)
    axis = axis / np.linalg.norm(axis)
    x, y, z = axis
    c, s = np.cos(ang), np.sin(ang)
    C = 1 - c
    return np.array([[c + x * x * C, x * y * C - z * s, x * z * C + y * s],
                     [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
                     [z * x * C - y * s, z * y * C + x * s, c + z * z * C]])


def smooth_polyline(P, iters=2):
    P = P.copy()
    for _ in range(iters):
        P[1:-1] = 0.25 * P[:-2] + 0.5 * P[1:-1] + 0.25 * P[2:]
    return P


def laplacian_smooth(V, F, mask, iters=5, lam=0.5):
    """Smooth only vertices where mask is True."""
    nb = [set() for _ in range(len(V))]
    for a, b, c in F:
        nb[a].update((b, c)); nb[b].update((a, c)); nb[c].update((a, b))
    V = V.copy()
    idx = np.where(mask)[0]
    for _ in range(iters):
        new = V.copy()
        for i in idx:
            if nb[i]:
                m = V[list(nb[i])].mean(0)
                new[i] = V[i] + lam * (m - V[i])
        V = new
    return V


def boundary_loops(F):
    """Ordered boundary loops (lists of vertex indices) of a triangle mesh."""
    from collections import defaultdict
    count = defaultdict(int)
    for a, b, c in F:
        for e in ((a, b), (b, c), (c, a)):
            count[e] += 1
    nxt = {}
    for (a, b), n in count.items():
        if (b, a) not in count:
            nxt[a] = b
    loops, seen = [], set()
    for s in list(nxt):
        if s in seen:
            continue
        loop, v = [], s
        while v not in seen and v in nxt:
            seen.add(v)
            loop.append(v)
            v = nxt[v]
        loops.append(loop)
    return loops


def smooth_weights(W, F, iters=20, lam=0.6, mask=None):
    """Laplacian smoothing of per-vertex weight rows over mesh edges."""
    from scipy.sparse import coo_matrix
    n = len(W)
    rows = np.concatenate([F[:, 0], F[:, 1], F[:, 2], F[:, 1], F[:, 2], F[:, 0]])
    cols = np.concatenate([F[:, 1], F[:, 2], F[:, 0], F[:, 0], F[:, 1], F[:, 2]])
    A = coo_matrix((np.ones(len(rows)), (rows, cols)), shape=(n, n)).tocsr()
    A.data[:] = 1
    deg = np.asarray(A.sum(1)).ravel()
    W = W.copy()
    for _ in range(iters):
        avg = (A @ W) / np.maximum(deg, 1)[:, None]
        upd = W + lam * (avg - W)
        if mask is not None:
            W[mask] = upd[mask]
        else:
            W = upd
    return W / np.maximum(W.sum(1, keepdims=True), 1e-9)
