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
  front  long hair from the front of the head falling in front of the shoulders
  bangs  airy see-through bangs ending at the brows with an inward curl
  side   short pieces from the temples sweeping to the cheekbones
  frame  face-framing locks hugging the cheeks and falling on to the collarbones
  fly    a few fine flyaways for a soft silhouette

Locks are flattened tubes; each one's shade of brown rides in its trim band (H['tone'], master.hair_parts).
"""
import numpy as np
from scipy.ndimage import map_coordinates
from scipy.spatial import cKDTree

GROUP_IDS = {'back': 0, 'front': 1, 'bangs': 2, 'fly': 3, 'frame': 4, 'side': 5}
RING = 6  # vertices around each lock (a flattened tube)


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


def bang_zone(phi, el):
    """The see-through bang section: a rounded triangle behind the front hairline, parted at the centre."""
    a = np.abs(np.degrees(phi))
    depth = 30.0 * np.clip(1 - (a / 40.0) ** 2, 0, 1)
    return (a > 2.5) & (el > hairline_elev(phi) + 2.0) & (el < hairline_elev(phi) + 2.0 + depth)


def sample_roots(hf, n, rng, region='all', jitter=1.0):
    """Roots on the scalp ellipsoid inside the hairline (spherical coordinates around the head centre)."""
    out = []
    tries = 0
    while len(out) < n and tries < n * 400:
        tries += 1
        phi = rng.uniform(-np.pi, np.pi)
        el = np.degrees(np.arcsin(rng.uniform(-1, 1)))
        lim = hairline_elev(phi)
        if el < lim + 1.0:
            continue
        a = abs(np.degrees(phi))
        if region == 'bangs':
            if not bang_zone(phi, el):
                continue
        elif bang_zone(phi, el):
            continue
        if region == 'frame' and not (30 < a < 52 and lim + 1 < el < lim + 10):
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
    """Root positions (azimuth, elevation) and group ids for Chaewon's hairstyle.

    Long, sleek hair with a soft centre part and volume at the crown. A see-through fringe of clumped
    locks (a little gap at the centre) curling in over the brows; side pieces from the temples sweeping
    to the cheekbones; face-framing pieces curving along the cheeks toward the chin; and the side hair
    split so that a good part of it falls in front of the shoulders."""
    rng = np.random.default_rng(seed)
    hf = head_frame(rest)
    hair = sample_roots(hf, 300, rng, 'all')
    # The fringe: clumps of two or three locks across the forehead, a narrow gap at the parting.
    bangs = []
    for c in (-31.0, -25.0, -19.0, -13.5, -8.5, -4.2, 4.2, 8.5, 13.5, 19.0, 25.0, 31.0):
        for _ in range(3 if abs(c) < 25 else 2):
            az = c + rng.normal(0, 1.1)
            phi = np.radians(az)
            depth = 26.0 * np.clip(1 - (abs(az) / 40.0) ** 2, 0, 1)
            bangs.append((phi, hairline_elev(phi) + 3.0 + depth * rng.uniform(0.2, 0.7)))
    bangs = np.array(bangs)
    # Side pieces at the temples, and the face-framing layer behind them.
    side = np.array([(sg * np.radians(az + rng.normal(0, 1.0)), hairline_elev(np.radians(az)) + 3 + 4 * rng.random())
                     for sg in (-1, 1) for az in (36.0, 40.5, 44.5)])
    frame = np.array([(sg * np.radians(az + rng.normal(0, 1.5)), hairline_elev(np.radians(az)) + 2 + 6 * rng.random())
                      for sg in (-1, 1) for az in (45.0, 48.0, 51.0, 54.0, 57.0, 60.0, 63.0, 66.0)])
    groups = []
    for phi, el in hair:
        a = abs(np.degrees(phi))
        # Hair from the front half of the head (ahead of the ears) falls partly in front of the shoulders.
        front = a < 105 and rng.random() < 0.7 * np.clip((105 - a) / 50, 0, 1) + 0.1
        groups.append('front' if front else 'back')
    groups += ['bangs'] * len(bangs) + ['side'] * len(side) + ['frame'] * len(frame)
    return hf, np.concatenate([hair, bangs, side, frame]), np.array(groups)


def scalp_path(hf, phi0, el0, phi1, el1, n, lift):
    """Points along the scalp ellipsoid from (phi0, el0) to (phi1, el1), lifted off the skin."""
    s = np.linspace(0, 1, n)
    phi = phi0 + (phi1 - phi0) * s
    el = el0 + (el1 - el0) * s
    return ellipsoid_point(hf, phi, el, lift)


def release_point(phi0, el0, group, rng):
    """Where a lock leaves the scalp: forward over the hairline (fringe), sideways/back from the parting, then down."""
    s = np.sign(phi0) if abs(phi0) > 1e-3 else 1.0
    a = abs(np.degrees(phi0))
    if group == 'bangs':
        # Fanned slightly outward from the centre parting.
        return s * np.radians(a * 1.12), hairline_elev(phi0) - 1.0
    if group == 'side':
        # Over the temple, toward the cheekbone.
        return s * np.radians(min(a + 8, 56)), hairline_elev(np.radians(a)) - 6.0
    if group == 'frame':
        return s * np.radians(min(a + 6, 66) + rng.normal(0, 2)), 2.0 + rng.normal(0, 3)
    if group == 'front':
        # Over the temple, in front of the ear.
        return s * np.radians(min(max(a + 30, 62 + 0.3 * a), 96) + rng.normal(0, 4)), -4.0 + rng.normal(0, 5)
    if a < 95:
        # Over the top and the sides: sweep away from the part to above and behind the ear.
        phi_r = s * np.radians(min(180, max(a + 40, 92 + 0.45 * a) + rng.normal(0, 4)))
        return phi_r, -4.0 + rng.normal(0, 6)
    # Back of the head: down toward the nape, drawn a little toward the middle of the back.
    return s * np.radians(a + (180 - a) * 0.35 + rng.normal(0, 3)), -22.0 + rng.normal(0, 5)


def grow(rest, sdf, head_xf=None, wind=None, seed=11, iters=140, sweep=None):
    """Style the hair for a pose: head_xf maps rest head space to posed (4x4).

    sweep: a point (posed space) to gather the long hair toward, e.g. over one shoulder."""
    rng = np.random.default_rng(seed)
    hf, R, groups = design(rest, seed)
    N = 34
    S = len(R)
    X0 = np.zeros((S, N, 3))
    pinned = np.zeros((S, N), bool)
    widths = np.zeros(S)
    lengths = np.zeros(S)
    tone = np.zeros(S)
    for i in range(S):
        phi0, el0 = R[i]
        g = groups[i]
        phi1, el1 = release_point(phi0, el0, g, rng)
        # Layered volume: locks rooted higher on the crown lie over those rooted lower.
        # Volume at the crown (more lift where the path runs high on the head), and layering: locks
        # rooted higher lie a little over those rooted lower.
        hl = hairline_elev(phi0)
        layer = np.clip((el0 - hl) / max(78 - hl, 1), 0, 1)
        # Each lock's own shade of brown: the outer layers (rooted higher) catch more light than those under them.
        tone[i] = np.clip(0.15 + 0.5 * layer + 0.45 * rng.random() + (0.2 if g in ('bangs', 'side', 'frame') else 0), 0, 1)
        lift = 0.0035 + 0.002 * layer
        if g == 'bangs':
            total = None  # set from the scalp path below: over the brows
            lift = 0.006 + 0.0015 * rng.random()
            widths[i] = 0.013 + 0.004 * rng.random()
        elif g == 'side':
            total = None  # to the cheekbones
            lift = 0.006
            widths[i] = 0.014 + 0.004 * rng.random()
        elif g == 'front':
            total = 0.50 + rng.normal(0, 0.03)
            widths[i] = 0.017 + 0.009 * rng.random()
        elif g == 'frame':
            # Face-framing pieces: from the temples, along the cheeks and on past the jaw to the collarbone.
            total = 0.30 + 0.06 * rng.random()
            lift = 0.006
            widths[i] = 0.012 + 0.005 * rng.random()
        elif g == 'back':
            back = 0.5 - 0.5 * np.cos(phi0)
            total = 0.50 + 0.06 * back + rng.normal(0, 0.025)
            widths[i] = 0.026 + 0.012 * rng.random()
        else:
            total = 0.35 + 0.2 * rng.random()
            widths[i] = 0.002 + 0.002 * rng.random()
        el_path = np.linspace(el0, el1, 40)
        lift = lift + 0.007 * np.clip(el_path / 75.0, 0, 1) ** 1.3
        # Grown out of the scalp: the first few millimetres rise from the skin to the lock's height.
        arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(ellipsoid_point(hf, np.linspace(phi0, phi1, 40), el_path), axis=0), axis=1))]
        lift = 0.004 + (lift - 0.004) * np.clip(arc / 0.006, 0, 1) ** 0.7
        path = scalp_path(hf, phi0, el0, phi1, el1, 40, lift)
        plen = np.linalg.norm(np.diff(path, axis=0), axis=1).sum()
        if total is None and g == 'side':
            total = plen + 0.075 + 0.02 * rng.random()
        elif total is None:
            # The fringe falls from the hairline over the brows, longer toward the sides.
            total = plen + 0.050 + 0.018 * (abs(phi0) / np.radians(34)) ** 2 + 0.008 * rng.random()
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
        if g in ('bangs', 'side'):
            d = (d + np.array([0, -0.6, -0.2])) / 1.3
        p = pts[-1]
        while len(pts) < N:
            d = d * 0.6 + np.array([0, 0, -1.0]) * 0.4
            d /= np.linalg.norm(d)
            p = p + d * seg
            pts.append(p)
        X0[i] = np.array(pts)
    # Elevation on the head of every point as styled (the scalp part is pinned, so this holds after
    # the solve): the hair's sheen is laid where the strands cross the crown.
    rel = X0 - hf['center']
    ry = np.where(rel[..., 1] < 0, hf['ry_front'], hf['ry_back'])
    elev = np.degrees(np.arctan2(rel[..., 2] / hf['rz'], np.sqrt((rel[..., 0] / hf['rx']) ** 2 + (rel[..., 1] / ry) ** 2)))
    if head_xf is not None:
        M = np.asarray(head_xf)
        X0 = X0 @ M[:3, :3].T + M[:3, 3]
    seg = lengths / (N - 1)
    # Hair in front of the shoulders slides forward over them, the rest back; locks by the face fall
    # forward of it.
    slide = np.where(np.isin(groups, ('front', 'bangs', 'side', 'frame')), -1.0, 1.0)
    X0 = drape_start(X0, pinned, seg, sdf, slide)
    is_bang = groups == 'bangs'
    is_front = groups == 'front'
    gravity = np.array([0, 0, -1.0]) * 0.0010

    is_frame = groups == 'frame'
    is_side = groups == 'side'
    side_sign = np.sign(R[:, 0] + 1e-9)
    w3 = np.linspace(0, 1, N) ** 3
    w2 = np.linspace(0, 1, N) ** 2
    bump = np.sin(np.pi * np.clip(np.linspace(0, 1, N) / 0.6, 0, 1)) ** 2
    hcx = hf['center'] if head_xf is None else (np.asarray(head_xf)[:3, :3] @ hf['center'] + np.asarray(head_xf)[:3, 3])

    long_hair = ~is_bang & ~is_frame & ~is_side

    def forces(X, t):
        F = np.zeros_like(X)
        if sweep is not None:
            # Gathered over one shoulder: the long hair is drawn toward the sweep point, most at the tips.
            d = np.asarray(sweep)[None, None] - X[long_hair]
            d /= np.maximum(np.linalg.norm(d, axis=2, keepdims=True), 1e-9)
            F[long_hair] += d * 0.0009 * w2[None, :, None]
            return F
        # Around the shoulders, the front hair is guided in front of them and the rest behind;
        # below that it simply hangs and drapes over the chest or down the back.
        # Only hair resting on the shoulders is guided; hair hanging free is left to gravity.
        band = (X[..., 2] < hcx[2] - 0.12) & (X[..., 2] > hcx[2] - 0.32)
        near = np.zeros(band.shape, bool)
        near[band] = sdf(X[band]) < 0.025
        near = near[..., None]
        F[is_front] += (np.array([0, -1.0, 0]) * 0.0006)[None, None] * near[is_front]
        # Front hair settles over the collarbones and the front of the shoulders, not gathered at the neck.
        F[is_front, :, 0] += (side_sign[is_front, None] * 0.0001) * near[is_front, :, 0]
        back = ~is_front & ~is_bang & ~is_frame & ~is_side
        F[back] += (np.array([0, 1.0, 0]) * 0.0008)[None, None] * near[back]
        # Without hair-hair contact the strands would gather in the groove of the neck: spread them
        # across the back and the chest by where they grow on the head.
        low = (X[..., 2] < hcx[2] - 0.26)[..., None]
        spread = np.sin(R[:, 0])[:, None, None] * np.array([1.0, 0, 0])[None, None]
        F[back] += (0.00012 * spread * low)[back]
        F[is_front] += (0.00012 * spread * low)[is_front]
        # Bangs: tips curl in toward the forehead and fan a little out from the parting.
        F[is_bang] += (np.array([0, 0.9, -0.15]) * 0.0008)[None, None] * w3[None, :, None]
        F[is_bang, :, 0] += (side_sign[is_bang, None] * 0.00015) * w2[None, :]
        # Side pieces: out over the temples, then down along the cheekbones, tips turning in.
        F[is_side, :, 0] += (side_sign[is_side, None] * 0.0002) * (w2 - 1.6 * w3)[None, :]
        F[is_side, :, 1] += -0.0002 * w2[None, :]
        # Face-framing layer: drawn in against the cheeks around their middle, then hanging straight.
        F[is_frame, :, 0] += (-side_sign[is_frame, None] * 0.00035) * bump[None, :]
        F[is_frame, :, 1] += -0.0003 * bump[None, :]
        return F

    # Wind carries the hair a long way from where it starts (lifted, streaming back): give it time to
    # settle, or the strands stop part-way, folded where the tips have turned and the rest has not.
    X = solve_pinned(X0, seg, pinned, sdf, gravity, forces, iters=iters if wind is None else max(iters, 480),
                     wind=wind, soften=4.0)
    # Outward direction of the nearest body surface at every point: ribbons lie flat on it.
    Nrm = sdf.gradient(X.reshape(-1, 3)).reshape(X.shape)
    return dict(X=X, groups=groups, widths=widths, lengths=lengths, hf=hf, pinned=pinned, roots=R, N=Nrm, el=elev,
                tone=tone)


RING_EL = 40.0  # elevation of the sheen ('angel ring') on the head, degrees
SHEEN_U = (0.15, 0.32)  # where the trim texture draws the sheen strokes along a strand (u)


def strand_u(H):
    """Texture u along each strand (S, N): the trim's sheen lands where the strand crosses the crown ring,
    about 3 cm long; strands that never cross it skip the sheen."""
    S, N = H['X'].shape[:2]
    t = np.linspace(0, 1, N)
    U = np.tile(0.3 + 0.7 * t, (S, 1))
    if 'el' not in H:
        return np.tile(t, (S, 1))
    for i in range(S):
        el = H['el'][i]
        s = t * H['lengths'][i]
        below = np.flatnonzero((el[:-1] >= RING_EL) & (el[1:] < RING_EL))
        if not len(below):
            continue
        k = below[0]
        f = (el[k] - RING_EL) / max(el[k] - el[k + 1], 1e-9)
        sr = s[k] + f * (s[k + 1] - s[k])
        a, b = sr - 0.0106, sr + 0.0194
        if a < 0.004 or b > s[-1] - 0.05:
            continue
        U[i] = np.interp(s, [0, a, b, s[-1]], [0, SHEEN_U[0], SHEEN_U[1], 1.0])
    return U


def drape_start(X, pinned, seg, sdf, slide, margin=0.008):
    """The free part of every strand laid out from its last pinned point, falling but sliding over the
    body where it meets it (toward +y or -y by `slide`), so the solver never starts from a strand driven
    through a shoulder (pushed out to the nearest surface, it would pile up there in a coil)."""
    X = X.copy()
    S, N, _ = X.shape
    down = np.array([0, 0, -1.0])
    d = X[:, 1] - X[:, 0]
    d /= np.maximum(np.linalg.norm(d, axis=1, keepdims=True), 1e-9)
    bias = np.c_[np.zeros(S), slide, np.zeros(S)]
    for k in range(1, N):
        free = ~pinned[:, k]
        if not free.any():
            d = X[:, k] - X[:, k - 1]
            d /= np.maximum(np.linalg.norm(d, axis=1, keepdims=True), 1e-9)
            continue
        nd = d * 0.6 + down * 0.4
        nd /= np.linalg.norm(nd, axis=1, keepdims=True)
        p = X[:, k - 1] + nd * seg[:, None]
        hit = free & (sdf(p) < margin)
        if hit.any():
            g = sdf.gradient(p[hit])
            # Slide: drop the part of the step that goes into the body, lean the way the strand should go.
            t = nd[hit] - g * np.minimum(0, (nd[hit] * g).sum(1))[:, None]
            t += 0.5 * (bias[hit] - g * (bias[hit] * g).sum(1)[:, None])
            t += 0.6 * (down - g * (g @ down)[:, None])
            t /= np.maximum(np.linalg.norm(t, axis=1, keepdims=True), 1e-9)
            q = X[hit, k - 1] + t * seg[hit, None]
            dq = sdf(q)
            q += sdf.gradient(q) * np.clip(margin - dq, 0, None)[:, None]
            p[hit] = q
        X[free, k] = p[free]
        d = X[:, k] - X[:, k - 1]
        d /= np.maximum(np.linalg.norm(d, axis=1, keepdims=True), 1e-9)
    return X


def solve_pinned(X0, seg, pinned, sdf, gravity, forces, iters=140, bend=0.3, margin=0.006, damping=0.88,
                 wind=None, vmax=0.002, soften=None):
    """Stable PBD with per-point pins (the scalp-hugging part keeps its styled shape).

    Velocities come only from forces (capped); collision and constraint corrections move
    points but do not feed back into velocity, so contacts cannot explode.
    """
    X = X0.copy()
    V = np.zeros_like(X)
    S, N, _ = X.shape
    seg = np.asarray(seg, float).reshape(S, 1)
    free = ~pinned
    # Combed stiffness near the scalp, soft further down so long hair hangs instead of standing out.
    last_pin = N - 1 - np.argmax(pinned[:, ::-1], axis=1)
    k = np.arange(1, N - 1)[None, :] - last_pin[:, None]
    bend_k = (bend * np.clip(np.exp(-np.maximum(k, 0) / soften), 0.3, 1.0))[..., None] if soften else bend
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
        X[:, 1:-1] += (bend_k * (mid - X[:, 1:-1])) * free[:, 1:-1, None]
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
    """Locks as flattened tubes (RING vertices around each strand point, strand-major): verts, faces,
    uv (u along, v across), group and t. A tube never turns edge-on into a line the way a flat card
    does, and the outline pass draws its silhouette cleanly."""
    X, widths = H['X'], H['widths']
    S, N, _ = X.shape
    hc = H['hf']['center']
    t = np.linspace(0, 1, N)
    # Manga locks: full at the root and drawn to a point. The fringe tapers all along its length, so
    # neighbouring locks touch at the hairline and part toward their tips; long hair holds its width.
    taper_long = np.clip(np.minimum(0.8 + t / 0.12 * 0.2, (1 - t) / 0.4), 0.02, 1.0) ** 0.9
    taper_bang = np.clip(1 - t, 0.02, 1) ** 0.8
    th = np.linspace(0, 2 * np.pi, RING, endpoint=False)
    cs, sn = np.cos(th), np.sin(th)
    V = np.zeros((S, N, RING, 3))
    for i in range(S):
        P = X[i]
        tg = np.gradient(P, axis=0)
        tg /= np.maximum(np.linalg.norm(tg, axis=1, keepdims=True), 1e-9)
        body = H['N'][i] if 'N' in H else P - hc
        # The lock's flat side is carried along the strand (parallel transport), drawn gently toward the
        # body's outward direction: it lies flat where it rests on her and never twists into a crumple
        # where it flies free (far from the body that direction is noise).
        out = np.zeros_like(P)
        o = body[0]
        for k in range(N):
            o = o - tg[k] * (o @ tg[k])
            b = body[k] - tg[k] * (body[k] @ tg[k])
            o = o / max(np.linalg.norm(o), 1e-9) * 0.75 + b / max(np.linalg.norm(b), 1e-9) * 0.25
            o /= max(np.linalg.norm(o), 1e-9)
            out[k] = o
        side = np.cross(tg, out)
        side /= np.maximum(np.linalg.norm(side, axis=1, keepdims=True), 1e-9)
        up = np.cross(side, tg)
        g = H['groups'][i]
        w = widths[i] * (taper_bang if g in ('bangs', 'side') else taper_long)
        flat = 0.28 if g in ('bangs', 'side') else 0.42
        V[i] = P[:, None] + side[:, None] * (0.5 * w)[:, None, None] * cs[None, :, None] \
            + up[:, None] * (0.5 * flat * w)[:, None, None] * sn[None, :, None]
    base = (np.arange(S)[:, None, None] * N + np.arange(N)[None, :, None]) * RING + np.arange(RING)[None, None, :]
    a0 = base[:, :-1, :]
    a1 = base[:, :-1, :][..., np.r_[1:RING, 0]]
    b0 = base[:, 1:, :]
    b1 = base[:, 1:, :][..., np.r_[1:RING, 0]]
    F = np.concatenate([np.stack([a0, b0, b1], -1).reshape(-1, 3), np.stack([a0, b1, a1], -1).reshape(-1, 3)])
    V = V.reshape(-1, 3)
    # Wind outward (against the strand axis).
    axis = np.repeat(X.reshape(-1, 3), RING, axis=0)
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    if np.sum(np.einsum('ij,ij->i', fn, V[F].mean(1) - axis[F].mean(1))) < 0:
        F = F[:, ::-1]
    UV = np.stack(np.broadcast_arrays(np.tile(t[None, :, None], (S, 1, RING)),
                                      np.tile(0.5 - 0.5 * cs[None, None, :], (S, N, 1))), -1).reshape(-1, 2)
    G = np.repeat(np.array([GROUP_IDS[g] for g in H['groups']]), N * RING)
    T = np.tile(np.repeat(t, RING), S)
    return V, F, UV, G, T
