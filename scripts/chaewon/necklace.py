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


def build(s, mats, pinch):
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

    # ---- open chain: two strands from the bail to the fingers
    open_mesh = mk.Mesh()
    open_W = []
    cut = 0.42                         # radians either side of the nape where the chain is parted
    for side, sgn in (('L', 1), ('R', -1)):
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
    Po, _, _, _, _ = open_mesh.arrays()
    Wo = np.vstack(open_W)

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
    # Back to rest space for skinning.
    from assets import inverse_skin
    for p in parts:
        p.P = inverse_skin(p.P, p.W, mats, s.rest_mats)
    info = dict(bail=bail, centre=centre, length=L)
    return parts, info
