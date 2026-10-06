"""The compass pendant on its chain, fitted to Chaewon's neck in a given pose (Blender space).

`build(session, mats, pinch)` returns skinned Parts in rest space:
  - the closed chain (color.r = 1): lies around the base of her neck and dips in a V to the bail,
  - the open chain (color.r = 0.5): the same chain parted at the nape, its two ends held at the
    pinch points of her fingers (weighted to the hands), with a clasp and a ring at the ends,
  - the pendant: compass rose, ring and pearl (uv2 = (0.999, 0.999) marks the pearl).
The runtime shows one chain or the other (uClasp), so the clasp can close in a single frame.
"""
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(HERE, '../env'))

import master as M  # noqa: E402
import pendant as pend  # noqa: E402
import meshkit as mk  # noqa: E402

PENDANT_SCALE = 0.05      # the rose ring is 2.5 cm across
LINK = 0.0042             # link pitch along the chain
OFFSET = 0.0032           # chain centre above the skin


def _bvh(P, T):
    import bpy  # noqa: F401
    from mathutils.bvhtree import BVHTree
    return BVHTree.FromPolygons([tuple(p) for p in P], [tuple(int(i) for i in t) for t in T])


def _shrinkwrap(tree, X, offset, pin=None, iters=10, lam=0.35, closed=True):
    from mathutils import Vector
    X = X.copy()
    for it in range(iters):
        for i, p in enumerate(X):
            loc, n, _, _ = tree.find_nearest(Vector(p))
            if loc is None:
                continue
            X[i] = np.array(loc) + np.array(n) * offset
        if it < iters - 1:
            Y = X.copy()
            n = len(X)
            for i in range(n):
                if pin is not None and pin[i]:
                    continue
                a = X[(i - 1) % n] if closed or i > 0 else X[i]
                b = X[(i + 1) % n] if closed or i < n - 1 else X[i]
                Y[i] = X[i] * (1 - lam) + (a + b) * 0.5 * lam
            X = Y
    return X


def _resample(X, step, closed=False):
    if closed:
        X = np.vstack([X, X[:1]])
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(X, axis=0), axis=1))]
    s = np.arange(0, d[-1], step)
    return np.c_[[np.interp(s, d, X[:, k]) for k in range(3)]].T, d[-1]


def _links(points, normal_hint, R=LINK * 0.48, r=0.00055, tag_scale=1.25):
    """A chain of alternately turned oval links centred on `points`."""
    m = mk.Mesh()
    for i in range(len(points)):
        c = points[i]
        a = points[max(i - 1, 0)]
        b = points[min(i + 1, len(points) - 1)]
        d = b - a
        d /= max(np.linalg.norm(d), 1e-9)
        n0 = normal_hint[i] - d * np.dot(normal_hint[i], d)
        n0 /= max(np.linalg.norm(n0), 1e-9)
        n = n0 if i % 2 == 0 else np.cross(d, n0)
        P, F, N = pend.torus(c, n, R, r, nu=10, nv=4)
        rel = P - c
        P = c + rel + d * (rel @ d)[:, None] * (tag_scale - 1)
        m.add(P, F, N=N)
    return m


def _part(mesh, W, uv2, red, bones):
    P, F, N, _, _ = mesh.arrays()
    n = len(P)
    col = np.zeros((n, 3), np.float32)
    col[:, 0] = red
    p = M.Part(P, F, np.tile(M.TRIM_WHITE, (n, 1)), np.tile(uv2, (n, 1)), W, 'strap', color=col)
    return p


def _smoothstep(a, b, x):
    u = min(max((x - a) / (b - a), 0.0), 1.0)
    return u * u * (3 - 2 * u)


class Rope:
    """The parted chain held by its two ends, as she puts it on: a rope pinned at her finger pinches, under
    gravity, lying on her (the posed body's distance field), simulated through the fastening clip. As the
    clasp nears it settles on to the closed chain's own path, so the two coincide when the clasp closes
    and the runtime swaps one for the other. A row of bones (chain00 ...) follows the rope; the open chain's
    links and the pendant (on the middle bone, at the bail) are skinned to them. After the clasp (and in
    clips flagged clasp=True) the bones stay where the clasp closed, carried by her neck. A last bone,
    chain_pendant, carries the pendant (see pendant_frame)."""

    def __init__(self, s, pose_fn, pinch_fn, clasp_at, sdf, frames, t_bind, n=81, bones=29, settle=0.5):
        self.s, self.pose_fn, self.pinch_fn, self.sdf, self.t_bind_req = s, pose_fn, pinch_fn, sdf, t_bind
        self.clasp_at, self.frames, self.n, self.K, self.settle = clasp_at, frames, n, bones, settle
        self.names = ['chain%02d' % k for k in range(bones)] + ['chain_pendant']
        self.nk = s.names.index('neck01')

    def _field(self, X, A):
        """Distance and outward direction of the body (and dress) at points X posed by chest transform A (the
        field is the bind pose's: the chest and dress move with the upper spine)."""
        Ai = np.linalg.inv(A)
        Xb = X @ Ai[:3, :3].T + Ai[:3, 3]
        return self.sdf(Xb), self.sdf.gradient(Xb) @ A[:3, :3].T

    def simulate(self, closed_at, length, t_bind, M_bind, chest_bind):
        """closed_at(u): the closed chain's path (bind pose) at u in [0, 1] from the nape round her left
        side to the throat (u = 0.5) and back; length: the chain's length; t_bind: the clip time of the
        bind pose. Fills self.paths {t: (n, 3)} and self.necks {t: 4x4}."""
        s, n = self.s, self.n
        self.M_bind = M_bind
        cb = s.names.index('spine01')
        self.chest = {}
        seg = length / (n - 1)
        u = np.linspace(0, 1, n)
        ts = sorted(set([f / (self.frames - 1) for f in range(self.frames) if f / (self.frames - 1) <= self.clasp_at + 1e-9]
                        + [self.clasp_at, t_bind]))
        g = np.array([0, 0, -0.0005])
        margin = 0.0055
        X = Xp = None
        pins0 = None
        self.paths, self.necks = {}, {}
        for t in ts:
            self.pose_fn(s, t)
            mats = s.pose_mats()
            A = mats[cb] @ np.linalg.inv(chest_bind)
            self.chest[t] = A
            pins = np.array(self.pinch_fn(s, 'L')), np.array(self.pinch_fn(s, 'R'))
            if X is None:
                X = pins[0][None] * (1 - u[:, None]) + pins[1][None] * u[:, None]
                # (start well in front of her, so it falls on to the front of her dress: started between her
                # skin and the fabric it would stay there)
                fwd = A[:3, :3] @ np.array([0, -1.0, 0])
                X = X + fwd * 0.14 * np.sin(np.pi * u)[:, None]
                Xp = X.copy()
                pins0, steps = pins, 500
            else:
                steps = 90
            for k in range(steps):
                a = (k + 1) / steps
                pl = pins0[0] * (1 - a) + pins[0] * a
                pr = pins0[1] * (1 - a) + pins[1] * a
                V = (X - Xp) * 0.9
                Xp = X.copy()
                X = X + V + g
                for _ in range(6):
                    for par in (0, 1):
                        i = np.arange(par, n - 1, 2)
                        d = X[i + 1] - X[i]
                        L = np.linalg.norm(d, axis=1, keepdims=True)
                        c = (L - seg) / np.maximum(L, 1e-9) * d * 0.5
                        X[i] += c
                        X[i + 1] -= c
                    X[0], X[-1] = pl, pr
                    dist, grad = self._field(X, A)
                    m = dist < margin
                    m[0] = m[-1] = False
                    if m.any():
                        X[m] += grad[m] * (margin - dist[m])[:, None]
            pins0 = pins
            # Settling on to the closed chain's path as the clasp nears (carried by her neck).
            C = np.array([closed_at(v) for v in u])
            Mt = mats[self.nk] @ np.linalg.inv(self.M_bind)
            C = C @ Mt[:3, :3].T + Mt[:3, 3]
            b = _smoothstep(self.settle, self.clasp_at, t)
            self.paths[t] = X * (1 - b) + C * b
            self.necks[t] = mats[self.nk].copy()
        self.t_bind = t_bind
        self.bind = self.frames_of(self.paths[t_bind], self.necks[t_bind][:3, 3], self.chest[t_bind])
        self.clasp = self.frames_of(self.paths[self.clasp_at], self.necks[self.clasp_at][:3, 3], self.chest[self.clasp_at])

    def frames_of(self, path, neck, A):
        """World matrices of the bones along a path: x along the chain (from the left end to the right), z
        out from her (the surface normal where it lies on her, else horizontally away from her neck at
        `neck`), y = z x x."""
        n, K = len(path), self.K
        out = []
        for k in range(K):
            f = k / (K - 1) * (n - 1)
            i = min(int(f), n - 2)
            w = f - i
            p = path[i] * (1 - w) + path[i + 1] * w
            x = path[min(i + 1, n - 1)] - path[max(i - 1, 0)] if 0 < k < K - 1 else path[i + 1] - path[i]
            x /= max(np.linalg.norm(x), 1e-9)
            o = p - neck
            o[2] = 0
            o /= max(np.linalg.norm(o), 1e-9)
            dist, gr = self._field(p[None], A)
            dist, gr = float(dist[0]), gr[0]
            # (at the base of her neck, where the chain closes, it faces straight out from her neck: the field
            # is the chest's, and the neck moves on it)
            c = np.clip(1 - (dist - 0.004) / 0.02, 0, 1) * np.clip((neck[2] - p[2] - 0.05) / 0.04, 0, 1)
            z = o * (1 - c) + gr * c
            z = z - x * np.dot(z, x)
            z /= max(np.linalg.norm(z), 1e-9)
            # (x always runs the same way along the chain, so neighbouring bones never flip against each
            # other: a flip folds the links between them)
            y = np.cross(z, x)
            Mx = np.eye(4)
            Mx[:3, 0], Mx[:3, 1], Mx[:3, 2], Mx[:3, 3] = x, y, z, p
            out.append(Mx)
        out.append(self.pendant_frame(path, neck, A))
        return np.array(out)

    def pendant_frame(self, path, neck, A):
        """The pendant's own frame (origin at its centre): it hangs from the middle of the chain under
        gravity, its face turned out from her (between straight out from her neck and the surface it lies
        on), held clear of her body and dress."""
        n = len(path)
        bail = path[n // 2]
        up = np.array([0.0, 0.0, 1.0])
        o = bail - neck
        o[2] = 0
        o /= max(np.linalg.norm(o), 1e-9)
        below = bail - up * 0.02
        g = self._field(below[None], A)[1][0]
        z = 0.5 * o + 0.5 * g
        z = z - up * np.dot(z, up) * 0.6           # (mostly upright: it hangs, it does not lie flat)
        z /= max(np.linalg.norm(z), 1e-9)
        y = up - z * np.dot(up, z)
        y /= max(np.linalg.norm(y), 1e-9)
        x = np.cross(y, z)
        ring_r = pend.R_RING * PENDANT_SCALE
        c = bail - y * (ring_r + 0.004)
        a = np.linspace(0, 2 * np.pi, 16, endpoint=False)
        for _ in range(12):
            rim = c + (np.cos(a)[:, None] * x + np.sin(a)[:, None] * y) * ring_r
            d = self._field(np.vstack([c[None], rim]), A)[0].min()
            if d >= 0.0045:
                break
            c = c + z * (0.0045 - d + 0.0005)
        Mx = np.eye(4)
        Mx[:3, 0], Mx[:3, 1], Mx[:3, 2], Mx[:3, 3] = x, y, z, c
        return Mx

    def frame(self, t, kw, mats):
        """{bone name: world matrix} at clip time t (kw: the clip's options; mats: its pose)."""
        if kw.get('clasp') or t > self.clasp_at + 1e-6:
            carry = mats[self.nk] @ np.linalg.inv(self.necks[self.clasp_at])
            F = np.einsum('ij,kjl->kil', carry, self.clasp)
        else:
            key = min(self.paths, key=lambda v: abs(v - t))
            F = self.frames_of(self.paths[key], self.necks[key][:3, 3], self.chest[key])
        return dict(zip(self.names, F))

    def weights(self, P, path):
        """Each point skinned to the two bones either side of its place along the rope."""
        from scipy.spatial import cKDTree
        n, K = len(path), self.K
        _, j = cKDTree(path).query(P)
        f = j / (n - 1) * (K - 1)
        i = np.clip(np.floor(f).astype(int), 0, K - 2)
        w = f - i
        Wx = np.zeros((len(P), K + 1), np.float32)
        Wx[np.arange(len(P)), i] = 1 - w
        Wx[np.arange(len(P)), i + 1] += w
        return Wx


def build(s, mats, pinch, rope=None):
    """s: assets.Session; mats: bind pose bone matrices; pinch: {'L': xyz, 'R': xyz} finger pinch points."""
    names = s.names
    Pb = s.posed_body(mats)
    import dress
    # Weights come from the torso, neck and head only: her fingers touch the nape in the bind pose.
    body_mask = dress.labels(names, s.rest['W']) != 1
    T = s.rest['T']
    tree = _bvh(Pb, T)
    head = lambda n: mats[names.index(n)][:3, 3]
    n1, n2 = head('neck01'), head('neck02')
    up = (n2 - n1) / np.linalg.norm(n2 - n1)
    left = head('clavicle.L') - head('clavicle.R')
    left = left - up * np.dot(left, up)
    left /= np.linalg.norm(left)
    fwd = np.cross(left, up)          # toward her front (-Y at rest)
    if fwd[1] > 0:
        fwd = -fwd
    back = -fwd
    c0 = n1 + up * 0.006
    # Closed loop, theta = 0 at the nape, pi at the throat.
    th = np.linspace(0, 2 * np.pi, 220, endpoint=False)
    drop = 0.088 * np.exp(-((th - np.pi) / 0.62) ** 2)  # (the pendant rests on her breastbone, above the neckline)
    sides = -0.012 * np.sin(th) ** 2
    rad = 0.066 + 0.012 * np.sin(th) ** 2 + 0.03 * np.exp(-((th - np.pi) / 0.7) ** 2)
    X0 = c0 + (np.cos(th)[:, None] * back + np.sin(th)[:, None] * left) * rad[:, None] + up * (sides - drop)[:, None]
    front = np.abs(th - np.pi) < 0.06
    X = _shrinkwrap(tree, X0, OFFSET, pin=None, iters=12)
    i_bail = int(np.argmin(np.abs(th - np.pi)))
    bail = X[i_bail].copy()
    # Surface frame at the pendant: hang it just below the bail.
    from mathutils import Vector
    loc, nrm, _, _ = tree.find_nearest(Vector(bail - up * 0.016))
    nrm = np.array(nrm)
    if np.dot(nrm, fwd) < 0:
        nrm = -nrm
    y_axis = up - nrm * np.dot(up, nrm)
    y_axis /= np.linalg.norm(y_axis)
    x_axis = np.cross(y_axis, nrm)
    ring_r = pend.R_RING * PENDANT_SCALE
    centre = np.array(loc) + nrm * 0.0045 - y_axis * 0.0
    centre = bail - y_axis * (ring_r + 0.004) + nrm * 0.003
    Rm = np.c_[x_axis, y_axis, nrm]            # pendant local (x, y, z) -> world

    # ---- closed chain (loop, from the bail round and back)
    order = np.r_[np.arange(i_bail, len(X)), np.arange(0, i_bail)]
    loop, L = _resample(X[order], LINK, closed=True)
    hint = np.array([np.array(tree.find_nearest(Vector(p))[1]) for p in loop])
    closed = _links(loop, hint)
    Pc, _, _, _, _ = closed.arrays()
    Wc = M.nearest_weights(Pc, Pb, s.rest['W'], k=6, mask=body_mask)

    if rope is not None:
        # ---- open chain: the rope's path in the bind pose (simulated through the clip, see Rope)
        Xc = np.vstack([X, X[:1]])
        thc = np.r_[th, 2 * np.pi]
        closed_at = lambda v: np.array([np.interp(2 * np.pi * v, thc, Xc[:, k]) for k in range(3)])
        rope.simulate(closed_at, L, rope.t_bind_req, mats[names.index('neck01')], mats[names.index('spine01')])
        rp = rope.paths[rope.t_bind]
        pts, _ = _resample(rp, LINK)
        pts = np.vstack([pts, rp[-1:]])
        zb = rope.bind[:, :3, 2]
        hint = zb[np.clip(np.round(np.linspace(0, 1, len(pts)) * (rope.K - 1)).astype(int), 0, rope.K - 1)]
        open_mesh = _links(pts, hint)
        for end, dvec, ring in ((rp[0], rp[0] - rp[3], False), (rp[-1], rp[-1] - rp[-4], True)):
            dvec = dvec / max(np.linalg.norm(dvec), 1e-9)
            if not ring:
                ax = np.cross(dvec, up)
                Pq, Fq, Nq = pend.torus(end, ax / max(np.linalg.norm(ax), 1e-9), 0.0032, 0.0011, nu=16, nv=6)
                rel = Pq - end
                Pq = end + rel + dvec * (rel @ dvec)[:, None] * 0.7
            else:
                Pq, Fq, Nq = pend.torus(end, up, 0.0026, 0.0008, nu=14, nv=5)
            open_mesh.add(Pq, Fq, N=Nq)
        Po, _, _, _, _ = open_mesh.arrays()
        Wo = np.zeros((len(Po), len(names)), np.float32)
        Wo_x = rope.weights(Po, rp)
    # ---- open chain: two strands from the bail to the fingers
    open_mesh = open_mesh if rope is not None else mk.Mesh()
    open_W = []
    cut = 0.42                         # radians either side of the nape where the chain is parted
    for side, sgn in ((('L', 1), ('R', -1)) if rope is None else ()):
        if sgn > 0:
            idx = [i for i in range(i_bail, -1, -1) if th[i] >= cut]
        else:
            idx = [i for i in range(i_bail, len(X)) if th[i] <= 2 * np.pi - cut]
        strand = X[idx]
        end = np.asarray(pinch[side], float)
        # Lift the last part of the strand off the skin toward the pinch point.
        tail_n = 18
        a = strand[-1]
        bridge = np.array([a * (1 - u) + end * u + back * 0.006 * math.sin(math.pi * u) for u in np.linspace(0, 1, tail_n)[1:]])
        path = np.vstack([strand, bridge])
        pts, Ls = _resample(path, LINK)
        hint = np.array([np.array(tree.find_nearest(Vector(p))[1]) for p in pts])
        mesh = _links(pts, hint)
        P, _, _, _, _ = mesh.arrays()
        Wbody = M.nearest_weights(P, Pb, s.rest['W'], k=6, mask=body_mask)
        Wh = np.zeros_like(Wbody)
        for bname, w in ((f'finger2-3.{side}', 0.5), (f'finger1-3.{side}', 0.5)):
            Wh[:, names.index(bname)] = w
        # Blend to the hand over the last 9 cm of the strand.
        d_end = np.linalg.norm(P - end, axis=1)
        f = np.clip(1 - d_end / 0.09, 0, 1) ** 1.5
        Wo = Wbody * (1 - f[:, None]) + Wh * f[:, None]
        open_mesh.extend(mesh)
        open_W.append(Wo)
        # Clasp (left) / ring (right) at the end.
        dvec = pts[-1] - pts[-4]
        dvec /= np.linalg.norm(dvec)
        if side == 'L':
            Pq, Fq, Nq = pend.torus(end, np.cross(dvec, up) / max(np.linalg.norm(np.cross(dvec, up)), 1e-9), 0.0032, 0.0011, nu=16, nv=6)
            rel = Pq - end
            Pq = end + rel + dvec * (rel @ dvec)[:, None] * 0.7
        else:
            Pq, Fq, Nq = pend.torus(end, up, 0.0026, 0.0008, nu=14, nv=5)
        open_mesh.add(Pq, Fq, N=Nq)
        open_W.append(np.tile(Wh[0], (len(Pq), 1)))
    if rope is None:
        Po, _, _, _, _ = open_mesh.arrays()
        Wo = np.vstack(open_W)
    else:
        # The pendant rides on its own bone (Rope.pendant_frame): hanging from the middle of the chain.
        Fp = rope.bind[rope.K]
        centre, Rm = Fp[:3, 3], Fp[:3, :3]

    # ---- pendant
    pm = mk.Mesh()
    P, F = mk.cylinder((0, pend.CY, -0.012), (0, pend.CY, 0.012), 0.2, 0.2, sides=32, segs=1)
    pm.add(P, F)
    pend.rose(pm)
    pm.add(*pend.torus((0, pend.CY, 0), (0, 0, 1), pend.R_RING, 0.02))
    pm.add(*pend.torus((0, pend.CY, 0), (0, 0, 1), 0.13, 0.009, nu=40, nv=6))
    pm.add(*pend.torus((0, pend.CY + pend.R_RING + 0.045, 0), (1, 0, 0), 0.035, 0.012, nu=20, nv=6))
    Pp, Fp, Np, _, _ = pm.arrays()
    toW = lambda Q: ((Q - np.array([0, pend.CY, 0])) * PENDANT_SCALE) @ Rm.T + centre
    gold = mk.Mesh()
    gold.add(toW(Pp), Fp, N=Np @ Rm.T)
    Ps, Fs, Ns = pend.sphere((0, pend.CY, 0), 0.085)
    pearl = mk.Mesh()
    pearl.add(toW(Ps), Fs, N=Ns @ Rm.T)
    Wp = np.tile(M.nearest_weights(centre[None], Pb, s.rest['W'], k=8, mask=body_mask)[0], (len(gold.arrays()[0]), 1))
    Wpe = np.tile(Wp[0], (len(pearl.arrays()[0]), 1))

    skin_uv2 = np.array(M.atlas.SKIN_WHITE if hasattr(M, 'atlas') else (0.8, 0.8))
    parts = [
        _part(closed, Wc, skin_uv2, 1.0, names),
        _part(open_mesh, Wo, skin_uv2, 0.5, names),
        _part(gold, Wp, skin_uv2, 0.0, names),
        _part(pearl, Wpe, np.array([0.999, 0.999]), 0.0, names),
    ]
    if rope is not None:
        # The open chain and the pendant ride on the rope's bones alone (their rest is where they are bound).
        parts[1].Wx = Wo_x
        for p in parts[2:]:
            p.W = np.zeros_like(p.W)
            p.Wx = np.zeros((len(p.P), rope.K + 1), np.float32)
            p.Wx[:, rope.K] = 1
    # Back to rest space for skinning.
    from assets import inverse_skin
    for p in parts:
        if getattr(p, 'Wx', None) is None:
            p.P = inverse_skin(p.P, p.W, mats, s.rest_mats)
    info = dict(bail=bail, centre=centre, length=L)
    return parts, info
