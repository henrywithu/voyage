"""Chaewon's hair: long, straight, centre-parted, with see-through bangs (Blender space).

Hair is a set of manga-style locks: each lock is a guide strand grown from a
root inside the hairline, styled by a position-based solver (fixed root and
root direction, inextensible segments, bending stiffness, gravity, a combing
field that flows away from the parting and down, a soft inward curl at the
tips, collisions against a signed-distance field of the body), then skinned
as a tapered ribbon. The same solver re-drapes the hair for every pose, with
the head transform and optional wind.

Groups:
  back   long hair over the crown and down the back to mid-back
  front  face-framing pieces from the temples falling over the shoulders
  bangs  airy see-through bangs ending at the brows with an inward curl
  fly    a few fine flyaways for a soft silhouette
"""
import numpy as np
from scipy.ndimage import map_coordinates
from scipy.spatial import cKDTree

GROUP_IDS = {'back': 0, 'front': 1, 'bangs': 2, 'fly': 3, 'frame': 4}


# ------------------------------------------------------------------ signed distance field

class SDF:
    """Grid signed distance (metres) of a body surface, sampled from vertex normals."""

    def __init__(self, P, N, lo, hi, step=0.004):
        self.lo, self.step = np.asarray(lo, float), step
        shape = np.ceil((np.asarray(hi) - self.lo) / step).astype(int) + 1
        g = np.stack(np.meshgrid(*[self.lo[k] + np.arange(shape[k]) * step for k in range(3)], indexing='ij'), -1)
        pts = g.reshape(-1, 3)
        tree = cKDTree(P)
        d, i = tree.query(pts, k=6)
        near = P[i]
        nrm = N[i].mean(1)
        nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
        dist = np.linalg.norm(pts - near[:, 0], axis=1)
        sign = np.sign(((pts[:, None] - near) * N[i]).sum(2).mean(1))
        sign[sign == 0] = 1
        self.grid = (dist * sign).reshape(shape)
        self.shape = shape

    def __call__(self, X):
        idx = ((X - self.lo) / self.step).T
        d = map_coordinates(self.grid, idx, order=1, mode='nearest')
        return d

    def gradient(self, X, h=None):
        h = h or self.step
        g = np.zeros_like(X)
        for k in range(3):
            e = np.zeros(3)
            e[k] = h
            g[:, k] = (self(X + e) - self(X - e)) / (2 * h)
        n = np.linalg.norm(g, axis=1, keepdims=True)
        return g / np.maximum(n, 1e-9)


# ------------------------------------------------------------------ head frame and hairline

def head_frame(rest):
    """Head centre (ellipsoid fit of the cranium), axes and radii in Blender space."""
    names = list(rest['names'])
    P, W = rest['P'], rest['W']
    hb = names.index('head')
    head = rest['heads'][hb]
    top = P[:, 2].max()
    crown = P[(P[:, 2] > head[2] + 0.05) & (W[:, hb] > 0.5)]
    c = crown.mean(0)
    c[0] = 0.0
    # Axis-aligned radii from the cranium extents.
    rx = np.percentile(np.abs(crown[:, 0] - c[0]), 99)
    ry_f = np.percentile(-(crown[:, 1] - c[1]), 99)  # toward the face (-Y)
    ry_b = np.percentile(crown[:, 1] - c[1], 99)
    rz = top - c[2]
    return dict(center=c, rx=rx, ry_front=ry_f, ry_back=ry_b, rz=rz, top=top, head_joint=head)


def hairline_elev(phi):
    """Hairline elevation (degrees above the head-centre horizon) by azimuth (0 = front, +90 = left)."""
    a = np.abs(np.degrees(phi))
    # front 32, slight dip at the temples, low over the ears, lowest at the nape
    pts = [(0, 36), (18, 34), (32, 26), (48, 16), (62, 2), (78, -10), (95, -20), (120, -40), (150, -58), (180, -64)]
    xs, ys = zip(*pts)
    return np.interp(a, xs, ys)


def sample_roots(hf, n, rng, region='all', jitter=1.0):
    """Roots on the scalp ellipsoid inside the hairline (spherical coordinates around the head centre)."""
    out = []
    tries = 0
    while len(out) < n and tries < n * 200:
        tries += 1
        phi = rng.uniform(-np.pi, np.pi)
        el = np.degrees(np.arcsin(rng.uniform(-1, 1)))
        lim = hairline_elev(phi)
        if el < lim + 1.0:
            continue
        if region == 'bangs' and not (abs(np.degrees(phi)) < 28 and lim + 1 < el < lim + 12):
            continue
        if region == 'front' and not (30 < abs(np.degrees(phi)) < 62 and lim + 1 < el < lim + 14):
            continue
        out.append((phi, el))
    return np.array(out)


def ellipsoid_point(hf, phi, el, lift=0.0):
    """Point on the scalp ellipsoid (slightly lifted) for azimuth/elevation in radians/degrees."""
    e = np.radians(el)
    ry = np.where(np.cos(phi) > 0, hf['ry_front'], hf['ry_back'])
    x = np.sin(phi) * np.cos(e) * (hf['rx'] + lift)
    y = -np.cos(phi) * np.cos(e) * (ry + lift)
    z = np.sin(e) * (hf['rz'] + lift)
    return hf['center'] + np.stack([x, y, z], -1)


# ------------------------------------------------------------------ strand solver

def solve(X0, seg, root, root_dir, sdf, gravity, comb, iters=160, bend=0.35, margin=0.006,
          curl=None, collide_from=2, damping=0.92, wind=None, rng=None):
    """Position-based strand relaxation. X0 (S, N, 3) initial; returns styled strands."""
    X = X0.copy()
    V = np.zeros_like(X)
    S, N, _ = X.shape
    seg = np.asarray(seg, float).reshape(S, 1)
    for it in range(iters):
        prev = X.copy()
        F = np.broadcast_to(gravity, X.shape).copy()
        if comb is not None:
            F += comb(X, it / iters)
        if wind is not None:
            F += wind(X, it)
        if curl is not None:
            F += curl(X)
        V = V * damping + F
        X = X + V
        # Root and root direction.
        X[:, 0] = root
        X[:, 1] = root + root_dir * seg
        # Inextensibility (a few passes, root to tip).
        for _ in range(3):
            d = X[:, 1:] - X[:, :-1]
            L = np.linalg.norm(d, axis=2, keepdims=True)
            X[:, 1:] = X[:, :-1] + d / np.maximum(L, 1e-9) * seg[:, :, None]
        # Bending: pull interior points toward their neighbours' midpoint.
        mid = 0.5 * (X[:, :-2] + X[:, 2:])
        X[:, 1:-1] += bend * (mid - X[:, 1:-1]) * np.linspace(0.2, 1, N - 2)[None, :, None]
        # Collisions.
        flat = X[:, collide_from:].reshape(-1, 3)
        d = sdf(flat)
        inside = d < margin
        if inside.any():
            g = sdf.gradient(flat[inside])
            flat[inside] += g * (margin - d[inside])[:, None]
            X[:, collide_from:] = flat.reshape(S, N - collide_from, 3)
        X[:, 0] = root
        X[:, 1] = root + root_dir * seg
        V = (X - prev) * 0.5
    return X


# ------------------------------------------------------------------ hairstyle

def design(rest, seed=11):
    """Root positions (azimuth, elevation) and group ids for Chaewon's hairstyle."""
    rng = np.random.default_rng(seed)
    hf = head_frame(rest)
    roots, groups = [], []
    for g, n, region in (('back', 330, 'all'), ('front', 12, 'front'), ('frame', 22, 'front')):
        r = sample_roots(hf, n, rng, region)
        roots.append(r)
        groups += [g] * len(r)
    # See-through bangs: one airy row of thin locks with gaps between them, parted slightly at the centre.
    bang = []
    for k in range(12):
        a = -26 + k * 52 / 11
        if abs(a) < 2.0:
            continue
        a += rng.normal(0, 0.6)
        phi = np.radians(a)
        bang.append((phi, hairline_elev(phi) + 5.0 + rng.normal(0, 0.8)))
    roots.append(np.array(bang))
    groups += ['bangs'] * len(bang)
    return hf, np.concatenate(roots), np.array(groups)


def scalp_path(hf, phi0, el0, phi1, el1, n, lift):
    """Points along the scalp ellipsoid from (phi0, el0) to (phi1, el1), lifted off the skin."""
    s = np.linspace(0, 1, n)
    phi = phi0 + (phi1 - phi0) * s
    el = el0 + (el1 - el0) * s
    return ellipsoid_point(hf, phi, el, lift)


def release_point(phi0, el0, group, rng):
    """Where a lock leaves the scalp: sideways/back from the parting, then down."""
    s = np.sign(phi0) if abs(phi0) > 1e-3 else 1.0
    a = abs(np.degrees(phi0))
    if group == 'bangs':
        return phi0 * 0.85, hairline_elev(phi0) - 2.0
    if group == 'front':
        return s * np.radians(min(a + 8, 66) + rng.normal(0, 3)), 6.0 + rng.normal(0, 3)
    if group == 'frame':
        return s * np.radians(min(a + 4, 52) + rng.normal(0, 2)), 14.0 + rng.normal(0, 3)
    if a < 95:
        # Over the top and the sides: sweep away from the part to above the ear.
        phi_r = s * np.radians(min(180, max(a + 35, 78 + 0.45 * a) + rng.normal(0, 4)))
        return phi_r, -2.0 + rng.normal(0, 7)
    # Back of the head: straight down to the nape.
    return phi0 + np.radians(rng.normal(0, 3)), -22.0 + rng.normal(0, 5)


def grow(rest, sdf, head_xf=None, wind=None, seed=11, iters=140):
    """Style the hair for a pose: head_xf maps rest head space to posed (4x4)."""
    rng = np.random.default_rng(seed)
    hf, R, groups = design(rest, seed)
    N = 34
    S = len(R)
    X0 = np.zeros((S, N, 3))
    pinned = np.zeros((S, N), bool)
    widths = np.zeros(S)
    lengths = np.zeros(S)
    for i in range(S):
        phi0, el0 = R[i]
        g = groups[i]
        phi1, el1 = release_point(phi0, el0, g, rng)
        lift = 0.0045 if g != 'bangs' else 0.004
        if g == 'bangs':
            total = None  # set from the scalp path below: to just under the brows
            widths[i] = 0.0065 + 0.002 * rng.random()
        elif g == 'front':
            total = 0.36 + rng.normal(0, 0.025)
            widths[i] = 0.010 + 0.005 * rng.random()
        elif g == 'frame':
            # Face-framing layer: from the temples to the jaw, curving in toward the face.
            total = 0.15 + 0.06 * rng.random()
            widths[i] = 0.009 + 0.005 * rng.random()
        elif g == 'back':
            back = 0.5 - 0.5 * np.cos(phi0)
            total = 0.43 + 0.08 * back + rng.normal(0, 0.025)
            widths[i] = 0.016 + 0.010 * rng.random()
        else:
            total = 0.35 + 0.2 * rng.random()
            widths[i] = 0.002 + 0.002 * rng.random()
        path = scalp_path(hf, phi0, el0, phi1, el1, 40, lift)
        plen = np.linalg.norm(np.diff(path, axis=0), axis=1).sum()
        if total is None:
            # Bangs fall from the hairline to the brows (about 5.5 cm below it), longer at the sides.
            total = plen + 0.044 + 0.016 * (abs(phi0) / np.radians(28)) ** 2 + 0.014 * rng.random()
        plen = min(plen, total * 0.7)
        seg = total / (N - 1)
        lengths[i] = total
        # Resample: scalp part then a free fall continuing the release tangent toward gravity.
        cum = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
        pts = []
        k_s = int(round(plen / seg))
        for k in range(min(k_s + 1, N)):
            pts.append(np.array([np.interp(k * seg, cum, path[:, j]) for j in range(3)]))
            pinned[i, k] = True
        d = pts[-1] - pts[-2] if len(pts) > 1 else np.array([0, 0, -1.0])
        d /= np.linalg.norm(d)
        if g == 'bangs':
            d = (d + np.array([0, -0.6, -0.2])) / 1.3
        p = pts[-1]
        while len(pts) < N:
            d = d * 0.82 + np.array([0, 0, -1.0]) * 0.18
            d /= np.linalg.norm(d)
            p = p + d * seg
            pts.append(p)
        X0[i] = np.array(pts)
    if head_xf is not None:
        M = np.asarray(head_xf)
        X0 = X0 @ M[:3, :3].T + M[:3, 3]
    seg = lengths / (N - 1)
    is_bang = groups == 'bangs'
    is_front = groups == 'front'
    gravity = np.array([0, 0, -1.0]) * 0.0010

    is_frame = groups == 'frame'
    side_sign = np.sign(R[:, 0] + 1e-9)
    w3 = np.linspace(0, 1, N) ** 3
    w2 = np.linspace(0, 1, N) ** 2
    hcx = hf['center'] if head_xf is None else (np.asarray(head_xf)[:3, :3] @ hf['center'] + np.asarray(head_xf)[:3, 3])

    def forces(X, t):
        F = np.zeros_like(X)
        F[is_front] += np.array([0, -1.0, 0]) * 0.00016   # in front of the shoulders
        below = (X[..., 2] < hcx[2] - 0.16)[..., None]
        back = ~is_front & ~is_bang & ~is_frame
        F[back] += (np.array([0, 1.0, 0]) * 0.0005)[None, None] * below[back]
        # Bangs: tips curl inward and fan out from the parting.
        F[is_bang] += (np.array([0, 0.8, -0.2]) * 0.0007)[None, None] * w3[None, :, None]
        F[is_bang, :, 0] += (side_sign[is_bang, None] * 0.00035) * w2[None, :]
        # Face-framing layer: tips swing toward the face (inward in x) and slightly forward.
        F[is_frame, :, 0] += (-side_sign[is_frame, None] * 0.00022) * w2[None, :]
        F[is_frame, :, 1] += -0.0002 * w2[None, :]
        return F

    X = solve_pinned(X0, seg, pinned, sdf, gravity, forces, iters=iters, wind=wind)
    return dict(X=X, groups=groups, widths=widths, lengths=lengths, hf=hf, pinned=pinned, roots=R)


def solve_pinned(X0, seg, pinned, sdf, gravity, forces, iters=140, bend=0.3, margin=0.006, damping=0.88,
                 wind=None, vmax=0.002):
    """Stable PBD with per-point pins (the scalp-hugging part keeps its styled shape).

    Velocities come only from forces (capped); collision and constraint corrections move
    points but do not feed back into velocity, so contacts cannot explode.
    """
    X = X0.copy()
    V = np.zeros_like(X)
    S, N, _ = X.shape
    seg = np.asarray(seg, float).reshape(S, 1)
    free = ~pinned
    for it in range(iters):
        F = np.broadcast_to(gravity, X.shape).copy() + forces(X, it / iters)
        if wind is not None:
            F += wind(X, it)
        V = V * damping + F
        sp = np.linalg.norm(V, axis=2, keepdims=True)
        V = V * np.minimum(1.0, vmax / np.maximum(sp, 1e-12))
        before = X + V * free[..., None]
        X = before.copy()
        for _ in range(3):
            for k in range(1, N):
                d = X[:, k] - X[:, k - 1]
                L = np.linalg.norm(d, axis=1, keepdims=True)
                want = X[:, k - 1] + d / np.maximum(L, 1e-9) * seg
                X[:, k] = np.where(free[:, k:k + 1], want, X[:, k])
        mid = 0.5 * (X[:, :-2] + X[:, 2:])
        X[:, 1:-1] += (bend * (mid - X[:, 1:-1])) * free[:, 1:-1, None]
        flat = X.reshape(-1, 3)
        fm = free.reshape(-1)
        d = sdf(flat)
        hit = (d < margin) & fm
        if hit.any():
            g = sdf.gradient(flat[hit])
            push = np.clip(margin - d[hit], 0, 0.02)
            flat[hit] += g * push[:, None]
        X = flat.reshape(S, N, 3)
        # Keep velocity only along what the forces did (drop the constraint/collision jumps).
        V = V * 0.5 + (X - before) * 0.0
    return X


def scalp_cap(rest, hf, lift=0.0025):
    """Dark cap over the scalp inside the hairline (fills gaps between locks at the crown)."""
    P, T = rest['P'], rest['T']
    rel = P - hf['center']
    phi = np.arctan2(rel[:, 0], -rel[:, 1])
    rr = np.sqrt((rel[:, 0] / hf['rx']) ** 2 + (rel[:, 1] / np.where(rel[:, 1] < 0, hf['ry_front'], hf['ry_back'])) ** 2)
    el = np.degrees(np.arctan2(rel[:, 2] / hf['rz'], rr))
    inside = el > hairline_elev(phi) + 0.5
    near = np.linalg.norm(rel / np.array([hf['rx'], hf['ry_back'], hf['rz']]), axis=1) < 1.35
    keep = inside & near
    tri = T[np.all(keep[T], axis=1)]
    used = np.unique(tri)
    remap = -np.ones(len(P), int)
    remap[used] = np.arange(len(used))
    import dress
    N = dress.vertex_normals(P, T)
    return P[used] + N[used] * lift, remap[tri]


def ribbons(H, cam_up=None):
    """Tapered ribbons (cards) along each strand: verts, faces, uv (u along, v across), group, t."""
    X, widths = H['X'], H['widths']
    S, N, _ = X.shape
    hc = H['hf']['center']
    V, F, UV, G, T = [], [], [], [], []
    taper = np.concatenate([np.linspace(0.75, 1.0, N // 4), np.ones(N // 2), np.linspace(1.0, 0.06, N - N // 4 - N // 2)])
    for s in range(S):
        P = X[s]
        t = np.gradient(P, axis=0)
        t /= np.maximum(np.linalg.norm(t, axis=1, keepdims=True), 1e-9)
        out = P - hc
        out[:, 2] *= 0.3
        side = np.cross(t, out)
        side /= np.maximum(np.linalg.norm(side, axis=1, keepdims=True), 1e-9)
        w = widths[s] * taper
        base = len(V)
        for k in range(N):
            for e in (-0.5, 0.5):
                V.append(P[k] + side[k] * e * w[k])
                UV.append((k / (N - 1), e + 0.5))
                G.append(GROUP_IDS[H['groups'][s]])
                T.append(k / (N - 1))
        for k in range(N - 1):
            a, b, c, d = base + 2 * k, base + 2 * k + 1, base + 2 * k + 3, base + 2 * k + 2
            F += [(a, b, c), (a, c, d)]
    return np.array(V), np.array(F), np.array(UV), np.array(G), np.array(T)
