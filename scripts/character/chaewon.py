"""Build Chaewon's master model (rest A-pose, metres, y-up, +z forward).

Parts: MakeHuman body (CC0) shaped by `mh.CHAEWON_SHAPE`, eyes, a white
floral-lace spaghetti-strap sundress, and long dark straight hair with
see-through bangs. Outputs a dict of numpy arrays consumed by pose/export.
"""
import numpy as np
from scipy.spatial import cKDTree
import mh
import skeleton as sk
import geom

PART_SKIN, PART_EYE, PART_HAIRCAP, PART_HAIR, PART_DRESS, PART_STRAP = range(6)


def load_body():
    v, uvs, faces, fuvs, groups = mh.build_chaewon()
    heads, tails, W = sk.load(v)
    V = v * 0.1
    floor = V[[i for f, g in zip(faces, groups) if g == 'body' for i in f]][:, 1].min()
    V[:, 1] -= floor
    heads = heads * 0.1
    tails = tails * 0.1
    heads[:, 1] -= floor
    tails[:, 1] -= floor
    body = [f for f, g in zip(faces, groups) if g == 'body']
    eyes = [f for f, g in zip(faces, groups) if g in ('helper-l-eye', 'helper-r-eye')]
    return dict(V=V, W=W, heads=heads, tails=tails,
                body=geom.quads_to_tris(body), eyes=geom.quads_to_tris(eyes),
                body_quads=body)


def joint(B, name, tail=False):
    i = sk.INDEX[name]
    return (B['tails'] if tail else B['heads'])[i]


ARM_BONES = [i for n, i in sk.INDEX.items() if n.split('.')[0] in
             ('clavicle', 'upperarm', 'forearm', 'hand') or n.startswith('finger')]

# Neckline profile (degrees from centre front -> bodice top height in metres).
NECKLINE = [(0, 1.150), (14, 1.205), (30, 1.252), (40, 1.262), (52, 1.236), (70, 1.196),
            (90, 1.172), (112, 1.180), (132, 1.205), (146, 1.214), (162, 1.168), (180, 1.140)]
WAIST_Y = 0.985
HEM_Y = 0.655


def neckline(theta):
    deg = np.degrees(np.abs((theta + np.pi) % (2 * np.pi) - np.pi))
    a, b = zip(*NECKLINE)
    return np.interp(deg, a, b)


def torso_mask(B):
    arm = B['W'][:, ARM_BONES].sum(1)
    return arm < 0.35


def hull_radius(points2d, thetas):
    """Radius of the 2D convex hull (x,z around origin) along each angle."""
    from scipy.spatial import ConvexHull
    h = ConvexHull(points2d)
    poly = points2d[h.vertices]
    out = np.zeros(len(thetas))
    for k, t in enumerate(thetas):
        d = np.array([np.sin(t), np.cos(t)])
        best = 0.0
        for i in range(len(poly)):
            a, b = poly[i], poly[(i + 1) % len(poly)]
            e = b - a
            m = np.array([[d[0], -e[0]], [d[1], -e[1]]])
            if abs(np.linalg.det(m)) < 1e-12:
                continue
            s, u = np.linalg.solve(m, a)
            if s > 0 and -1e-9 <= u <= 1 + 1e-9:
                best = max(best, s)
        out[k] = best
    return out


def cross_sections(B, ys, thetas, slab=0.012):
    V = B['V']
    keep = np.unique(B['body'])
    keep = keep[torso_mask(B)[keep]]
    P = V[keep]
    R = np.zeros((len(ys), len(thetas)))
    centers = np.zeros(len(ys))
    for i, y in enumerate(ys):
        s = slab
        sel = P[np.abs(P[:, 1] - y) < s]
        while len(sel) < 12:
            s *= 1.5
            sel = P[np.abs(P[:, 1] - y) < s]
        cz = 0.5 * (sel[:, 2].min() + sel[:, 2].max())
        centers[i] = cz
        R[i] = hull_radius(np.stack([sel[:, 0], sel[:, 2] - cz], 1), thetas)
    return R, centers


def build_dress(B, n_theta=128):
    thetas = np.linspace(-np.pi, np.pi, n_theta + 1)  # seam at centre back
    tops = neckline(thetas)
    # Bodice: columns from waist to neckline.
    n_b = 26
    vb = np.linspace(0, 1, n_b)
    Yb = WAIST_Y - 0.02 + (tops[None, :] - (WAIST_Y - 0.02)) * vb[:, None]
    # Skirt: rows from just above the waist seam down to the hem.
    n_s = 24
    ys_s = np.linspace(WAIST_Y + 0.012, HEM_Y, n_s)
    allys = np.unique(np.round(np.concatenate([Yb.ravel(), ys_s]), 3))
    sample_y = np.linspace(HEM_Y - 0.02, 1.30, 120)
    R, Cz = cross_sections(B, sample_y, thetas)
    # Smooth radii around the circumference and vertically.
    from scipy.ndimage import gaussian_filter
    R = gaussian_filter(R, sigma=(1.2, 1.5), mode=('nearest', 'wrap'))

    def radius(y, t_idx):
        return np.array([np.interp(yy, sample_y, R[:, ti]) for yy, ti in zip(np.atleast_1d(y), np.atleast_1d(t_idx))])

    def center(y):
        return np.interp(y, sample_y, Cz)

    verts, uv, part = [], [], []
    # --- bodice grid
    bod = np.zeros((n_b, n_theta + 1), int)
    for i in range(n_b):
        for j in range(n_theta + 1):
            y = Yb[i, j]
            r = radius(y, j)[0] + 0.0045
            t = thetas[j]
            p = np.array([r * np.sin(t), y, center(y) + r * np.cos(t)])
            bod[i, j] = len(verts)
            verts.append(p)
            # trim uv: 5 lace tiles around, neckline band near the top edge
            band = (tops[j] - y)
            u = (t + np.pi) / (2 * np.pi) * 5.0
            if band < 0.016:
                v = 0.94 + (1 - band / 0.016) * 0.055
            else:
                v = 0.46 + np.clip((y - (HEM_Y + 0.06)) / (1.27 - (HEM_Y + 0.06)), 0, 1) * 0.48
            uv.append((u, v))
            part.append(PART_DRESS)
    # --- skirt grid
    hip_y = joint(B, 'hips')[1] - 0.04
    ski = np.zeros((n_s, n_theta + 1), int)
    rng = np.random.default_rng(7)
    phase = rng.uniform(0, 2 * np.pi, 4)
    for i, y in enumerate(ys_s):
        below = np.clip((hip_y - y) / (hip_y - HEM_Y), 0, 1)
        for j in range(n_theta + 1):
            t = thetas[j]
            rb = radius(y, j)[0]
            r_hip = radius(hip_y, j)[0]
            flare = r_hip + 0.010 + (hip_y - y) * 0.42 if y < hip_y else 0
            r = max(rb + 0.0058 + 0.004 * below, flare)
            # soft gathered folds that deepen toward the hem
            fold = np.sin(13 * t + 0.7 * np.sin(3 * t + phase[0])) + 0.35 * np.sin(29 * t + phase[1])
            r += (0.003 + 0.013 * below ** 1.2) * fold
            # gentle uneven hem / sway
            yy = y + (0.006 * np.sin(2 * t + phase[2]) + 0.004 * np.sin(5 * t + phase[3])) * below ** 2
            p = np.array([r * np.sin(t), yy, center(min(y, hip_y)) + r * np.cos(t)])
            ski[i, j] = len(verts)
            verts.append(p)
            u = (t + np.pi) / (2 * np.pi) * 5.0
            hb = y - HEM_Y
            if hb < 0.045:
                v = 0.36 + hb / 0.045 * 0.10
            else:
                v = 0.46 + np.clip((y - (HEM_Y + 0.06)) / (1.27 - (HEM_Y + 0.06)), 0, 1) * 0.48
            uv.append((u, v))
            part.append(PART_DRESS)
    faces = []

    def grid(G, flip=False):
        for i in range(G.shape[0] - 1):
            for j in range(G.shape[1] - 1):
                a, b, c, d = G[i, j], G[i, j + 1], G[i + 1, j + 1], G[i + 1, j]
                if flip:
                    faces.extend([(a, c, b), (a, d, c)])
                else:
                    faces.extend([(a, b, c), (a, c, d)])
    grid(bod)
    grid(ski[::-1])
    return np.array(verts), np.array(faces), np.array(uv), np.array(part), dict(thetas=thetas, tops=tops)


def build_straps(B, body_sdf, width=0.0065):
    """Spaghetti straps from the front neckline over the shoulder to the back."""
    V, F, UV, P = [], [], [], []
    for side in (1, -1):
        pts = []
        # front attach (theta 40deg), shoulder crest, back attach (theta 146deg)
        front = np.array([side * 0.088, 1.258, 0.095])
        crest = np.array([side * 0.098, 1.352, 0.004])
        back = np.array([side * 0.096, 1.214, -0.095])
        for s in np.linspace(0, 1, 28):
            if s < 0.5:
                q = s / 0.5
                p = front * (1 - q) + crest * q
            else:
                q = (s - 0.5) / 0.5
                p = crest * (1 - q) + back * q
            pts.append(p)
        pts = np.array(pts)
        guide = pts.copy()
        # project onto the body surface with a small offset
        for _ in range(12):
            sd, n, near = body_sdf(pts, k=12)
            pts = pts - n * (sd - 0.0035)[:, None]
            pts = geom.smooth_polyline(pts, 1)
        tang = np.gradient(guide, axis=0)
        tang /= np.linalg.norm(tang, axis=1, keepdims=True)
        sd, n, _ = body_sdf(pts, k=12)
        side_v = np.cross(tang, n)
        side_v /= np.maximum(np.linalg.norm(side_v, axis=1, keepdims=True), 1e-9)
        base = len(V)
        for k, p in enumerate(pts):
            for w in (-0.5, 0.5):
                V.append(p + side_v[k] * w * width)
                UV.append((k / (len(pts) - 1) * 3, 0.97 + 0.02 * (w + 0.5)))
                P.append(PART_STRAP)
        for k in range(len(pts) - 1):
            a, b, c, d = base + 2 * k, base + 2 * k + 1, base + 2 * k + 3, base + 2 * k + 2
            F.extend([(a, b, c), (a, c, d)])
    return np.array(V), np.array(F), np.array(UV), np.array(P)


HEAD_C = np.array([0.0, 1.488, 0.046])
HAIRLINE = [(0, 1.538), (30, 1.533), (55, 1.512), (75, 1.488), (95, 1.474), (115, 1.470),
            (140, 1.432), (180, 1.412)]


def hairline(P):
    d = P - HEAD_C
    phi = np.degrees(np.abs(np.arctan2(d[:, 0], d[:, 2])))
    a, b = zip(*HAIRLINE)
    return np.interp(phi, a, b)


def head_faces(B):
    V, F = B['V'], B['body']
    hw = B['W'][:, sk.INDEX['head']] + B['W'][:, sk.INDEX['neck']] * 0.5
    keep = (hw[F] > 0.4).all(1)
    return F[keep]


def build_cap(B, offset=0.0035):
    V, F = B['V'], head_faces(B)
    inside = V[:, 1] > hairline(V) + 0.002
    capf = F[inside[F].all(1)]
    used, inv = np.unique(capf, return_inverse=True)
    N = geom.vertex_normals(V, B['body'])
    P = V[used] + N[used] * offset
    faces = inv.reshape(-1, 3)
    return P, faces, N[used]


def sample_on(P, F, n, rng):
    a = np.linalg.norm(np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]]), axis=1)
    pick = rng.choice(len(F), n, p=a / a.sum())
    r1, r2 = rng.random(n), rng.random(n)
    s = np.sqrt(r1)
    w = np.stack([1 - s, s * (1 - r2), s * r2], 1)
    return (P[F[pick]] * w[:, :, None]).sum(1)


def grow(root, direction, length, sdf, rng, seg=0.018, gravity=(0.12, 0.6), offset=0.008,
         bias=np.zeros(3), offset_growth=0.010, curl=0.0):
    p = root.copy()
    d = direction / np.linalg.norm(direction)
    pts = [p.copy()]
    n = max(3, int(length / seg))
    for k in range(n):
        s = k / n
        g = gravity[0] + (gravity[1] - gravity[0]) * min(1, s * 2.5)
        d = d + np.array([0, -g, 0]) + bias * (0.3 + s)
        if curl:
            d = d + curl * s ** 2 * np.array([0, 0, 1])
        d /= np.linalg.norm(d)
        q = p + d * seg
        for _ in range(3):
            sd, nrm, _ = sdf(q[None])
            want = offset + offset_growth * s
            if sd[0] < want:
                q = q + nrm[0] * (want - sd[0])
        d = (q - p) / np.linalg.norm(q - p)
        p = q
        pts.append(p.copy())
    return geom.smooth_polyline(np.array(pts), 2)


def ribbon(pts, sdf, w0, w1, uv_band, part, flip=False):
    """Two-sided card along a polyline; normals follow the hair volume."""
    t = np.gradient(pts, axis=0)
    t /= np.linalg.norm(t, axis=1, keepdims=True)
    _, n, _ = sdf(pts)
    side = np.cross(t, n)
    side /= np.maximum(np.linalg.norm(side, axis=1, keepdims=True), 1e-9)
    m = len(pts)
    V, N, UV, F = [], [], [], []
    v0, v1 = uv_band
    for k in range(m):
        s = k / (m - 1)
        w = w0 + (w1 - w0) * s
        for e in (-0.5, 0.5):
            V.append(pts[k] + side[k] * e * w)
            N.append(n[k])
            UV.append((s, v0 + (v1 - v0) * (e + 0.5)))
    for k in range(m - 1):
        a, b, c, d = 2 * k, 2 * k + 1, 2 * k + 3, 2 * k + 2
        F.extend([(a, c, b), (a, d, c)] if flip else [(a, b, c), (a, c, d)])
    return np.array(V), np.array(N), np.array(UV), np.array(F)


def build_hair(B, collide_V, collide_F, seed=3):
    rng = np.random.default_rng(seed)
    sdf = geom.SurfaceSDF(collide_V, collide_F)
    capP, capF, capN = build_cap(B)
    strands = []  # (pts, w0, w1, layer, kind)
    part_x = 0.004  # slightly off-centre part, like the reference photo
    # --- long hair from the whole cap
    roots = sample_on(capP, capF, 230, rng)
    for r in roots:
        d0 = r - HEAD_C
        if d0[2] > 0.055 and abs(r[0] - part_x) < 0.05 and r[1] > 1.54:
            continue  # bang zone handled separately
        away = np.array([np.sign(r[0] - part_x + 1e-6), 0, 0]) * (1.0 if r[1] > 1.55 else 0.4)
        down = np.array([0, -1.0, -0.15])
        _, n, _ = sdf(r[None])
        dirv = away + down
        dirv -= n[0] * np.dot(dirv, n[0])
        phi = np.degrees(np.arctan2(abs(r[0]), r[2] - HEAD_C[2]))
        front = 25 < phi < 105 and r[2] > HEAD_C[2] - 0.01
        bias = np.array([0, 0, 0.045]) if front else np.array([0, 0, -0.03])
        length = rng.uniform(0.40, 0.50) if not front else rng.uniform(0.36, 0.44)
        for layer in (0, 1):
            pts = grow(r + n[0] * 0.002 * layer, dirv, length, sdf, rng,
                       offset=0.006 + 0.006 * layer, bias=bias, offset_growth=0.012 + 0.01 * layer)
            strands.append((pts, 0.026 if layer == 0 else 0.018, 0.010, layer, 'long'))
    # --- face-framing locks from the temples
    for side in (1, -1):
        for k in range(7):
            r = np.array([side * (0.055 + 0.004 * k), 1.530 - 0.006 * k, 0.098 - 0.007 * k])
            sd, n, near = sdf(r[None])
            r = near[0] + n[0] * 0.004
            dirv = np.array([side * 0.25, -1.0, 0.35])
            pts = grow(r, dirv, rng.uniform(0.34, 0.42), sdf, rng, offset=0.007, bias=np.array([0, 0, 0.05]),
                       offset_growth=0.016)
            strands.append((pts, 0.016, 0.008, 1, 'frame'))
    # --- see-through bangs
    for k in range(30):
        x = -0.054 + 0.108 * (k + rng.uniform(-0.3, 0.3)) / 29
        r = np.array([x, 1.572 - 25 * x * x, 0.072])
        sd, n, near = sdf(r[None])
        r = near[0] + n[0] * 0.004
        dirv = np.array([x * 1.2, 0.0, 1.0])
        L = 0.105 + rng.uniform(-0.006, 0.006) - abs(x) * 0.25
        pts = grow(r, dirv, L, sdf, rng, seg=0.008, gravity=(0.35, 1.1), offset=0.0035,
                   offset_growth=0.004, bias=np.array([x * 0.3, 0, 0.02]))
        strands.append((pts, 0.011, 0.005, 2, 'bang'))
    return capP, capF, capN, strands, sdf


def fit_ellipsoid(P):
    from scipy.optimize import least_squares

    def res(q):
        c, r = q[:3], np.abs(q[3:])
        return np.sqrt((((P - c) / r) ** 2).sum(1)) - 1
    q0 = np.concatenate([P.mean(0), (P.max(0) - P.min(0)) / 2])
    return least_squares(res, q0).x


class SmoothSDF(geom.SurfaceSDF):
    def __call__(self, P, k=24):
        return super().__call__(P, k=k)


def hang(start, down_len, sdf, axis_fn, z_bias, margin, rng, seg=0.022, stiff=0.99, collide_below=1.40):
    """Straight falling hair from `start`, draped outward to clear the body."""
    n = max(2, int(down_len / seg))
    pts = np.array([start + np.array([0, -seg * k, 0]) for k in range(n + 1)])
    t = np.arange(n + 1) * seg
    pts[:, 2] += z_bias * np.clip(t / 0.12, 0, 1) ** 1.5
    pts[:, 0] += np.sign(start[0]) * 0.010 * np.clip(t / 0.25, 0, 1)
    out = 0.0
    for k in range(n + 1):
        p = pts[k]
        a = axis_fn(min(p[1], 1.36))
        radial = np.array([p[0] - a[0], 0, p[2] - a[2]])
        radial /= max(np.linalg.norm(radial), 1e-6)
        need = 0.0
        if p[1] < collide_below:
            q = p + radial * out
            sd, nrm, _ = sdf(q[None])
            if sd[0] < margin:
                need = min(0.012, (margin - sd[0]) / max(np.dot(nrm[0], radial), 0.5))
        out = max(out * stiff, out + need)
        pts[k] = p + radial * out
    return geom.smooth_polyline(pts, 4)


def hair_guides(B, collide_V, collide_F, seed=5):
    """Rest-pose hair guides: head-rigid scalp polylines + hanging parameters."""
    rng = np.random.default_rng(seed)
    V = B['V']
    head = V[np.unique(head_faces(B))]
    cran = head[(head[:, 1] > 1.50) | (head[:, 2] < 0.02)]
    cran = cran[np.abs(cran[:, 0]) < 0.072]  # exclude ears from the skull fit
    q = fit_ellipsoid(cran)
    c, r = q[:3], np.abs(q[3:])
    sdf = SmoothSDF(collide_V, collide_F)
    part_x, part_half = 0.006, 0.040
    guides = []

    def scalp(alpha, phi, off):
        d = np.array([np.sin(alpha) * np.sin(phi), np.cos(alpha), np.sin(alpha) * np.cos(phi)])
        fade = max(0.0, 1 - alpha / np.radians(80))
        shift = np.array([part_x, 0, part_half * np.cos(phi) * fade])
        return c + d * (r + off) + shift

    def scalp_curve(phi, a0, a1, off, steps=15):
        al = np.linspace(a0, a1, steps)
        pts = np.array([scalp(a, phi, off) for a in al])
        sd, nrm, _ = sdf(pts)
        push = np.clip(off * 0.7 - sd, 0, None)
        push = np.convolve(np.pad(push, 3, mode='edge'), np.ones(7) / 7, mode='valid')
        return pts + nrm * push[:, None]

    for layer, (count, off, width) in enumerate(((128, 0.007, 0.034), (96, 0.013, 0.038))):
        for k in range(count):
            phi = -np.pi + 2 * np.pi * (k + rng.uniform(0.2, 0.8)) / count
            deg = np.degrees(abs(phi))
            if deg < 32:
                continue  # front centre: bangs
            depart = np.radians(np.interp(deg, [32, 60, 90, 130, 180], [88, 98, 106, 116, 122]))
            top = scalp_curve(phi, np.radians(3), depart, off)
            if deg < 88 or (deg < 98 and rng.random() < 0.5):
                zb = 0.055 if deg < 70 else 0.035
            else:
                zb = -0.025
            end_y = 1.13 + rng.uniform(-0.02, 0.03) if deg >= 60 else 1.17 + rng.uniform(-0.02, 0.02)
            guides.append(dict(scalp=top, drop=max(0.12, top[-1, 1] - end_y), zb=zb,
                               margin=0.010 + 0.006 * layer, w0=width * 0.55, w1=width * 0.95,
                               layer=layer, kind='long', band=int(rng.integers(0, 8))))
    nb = 26
    for k in range(nb):
        phi = np.radians(-30 + 60 * (k + rng.uniform(0.25, 0.75)) / nb)
        a_end = np.radians(np.interp(abs(np.degrees(phi)), [0, 20, 30], [64, 66, 72]))
        pts = scalp_curve(phi, np.radians(18), a_end, 0.006 + 0.002 * (k % 2), steps=12)
        pts[-3:, 2] -= np.array([0.001, 0.002, 0.003])
        guides.append(dict(scalp=pts, drop=0.0, zb=0, margin=0, w0=0.010, w1=0.009, layer=2,
                           kind='bang', band=int(rng.integers(0, 8))))
    for side in (1, -1):
        for k in range(5):
            phi = side * np.radians(36 + 5 * k)
            top = scalp_curve(phi, np.radians(14), np.radians(84 + 2 * k), 0.010)
            guides.append(dict(scalp=top, drop=top[-1][1] - (1.20 + 0.01 * k), zb=0.06, margin=0.012,
                               w0=0.012, w1=0.010, layer=2, kind='frame', band=int(rng.integers(0, 8))))
    return guides, c


def drape_hair(guides, center, head_R, head_rest, head_world, collide_V, collide_F, axis_points,
               scale=1.0, seed=5):
    """Place guides on a posed head and let the lengths fall with gravity.

    x' = head_R ((x - head_rest) * scale) + head_world for the head-rigid part.
    Returns list of (polyline, guide, n_scalp, head_centre) in posed space.
    """
    rng = np.random.default_rng(seed)
    sdf = SmoothSDF(collide_V, collide_F)
    body = axis_points

    def axis_fn(y):
        sel = body[np.abs(body[:, 1] - y) < 0.02 * scale]
        if len(sel) < 5:
            return np.array([0, y, 0.0])
        cx = np.median(sel[:, 0])
        sel = sel[np.abs(sel[:, 0] - cx) < 0.12 * scale]
        return np.array([cx, y, 0.5 * (sel[:, 2].min() + sel[:, 2].max())])
    out = []
    cen = head_R @ ((center - head_rest) * scale) + head_world
    neck_y = cen[1] - 0.10 * scale
    for g in guides:
        top = ((g['scalp'] - head_rest) * scale) @ head_R.T + head_world
        if g['drop'] > 0:
            low = hang(top[-1], g['drop'] * scale, sdf, axis_fn, g['zb'] * scale, g['margin'] * scale, rng,
                       seg=0.022 * scale, collide_below=neck_y)
            pts = np.concatenate([top, low[1:]])
        else:
            pts = top
        out.append((pts, g, len(top), cen))
    return out


def hair_ribbon(pts, center, w0, w1, uv_band, axis_y=1.40):
    t = np.gradient(pts, axis=0)
    t /= np.linalg.norm(t, axis=1, keepdims=True)
    n = pts - center
    low = pts[:, 1] < axis_y
    n[low, 1] *= 0.15
    n /= np.linalg.norm(n, axis=1, keepdims=True)
    side = np.cross(t, n)
    side /= np.maximum(np.linalg.norm(side, axis=1, keepdims=True), 1e-9)
    m = len(pts)
    V, N, UV, F = [], [], [], []
    v0, v1 = uv_band
    L = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))])
    L /= L[-1]
    for k in range(m):
        s = L[k]
        w = w0 + (w1 - w0) * s
        for e in (-0.5, 0.5):
            V.append(pts[k] + side[k] * e * w)
            N.append(n[k])
            UV.append((s, v0 + (v1 - v0) * (e + 0.5)))
    for k in range(m - 1):
        a, b, c, d = 2 * k, 2 * k + 1, 2 * k + 3, 2 * k + 2
        F.extend([(a, b, c), (a, c, d)])
    return np.array(V), np.array(N), np.array(UV), np.array(F)
