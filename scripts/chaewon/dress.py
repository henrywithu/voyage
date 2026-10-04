"""Chaewon's white floral-lace mini sundress, built around the rest-pose body (Blender space).

The bodice wraps the convex hull of each torso cross-section (so it bridges
the cleavage like real fabric) a few millimetres off the skin, up to a V-neck
with spaghetti straps. The skirt starts at the natural waist, follows the hips
and flares into an A-line mini with soft folds that deepen toward a scalloped
hem about eleven centimetres below the crotch.

Outputs vertices, triangles, trim uvs (lace, hem scallops, neckline scallops),
a per-vertex part id, and the ring structure the skirt rig uses.
"""
import numpy as np
from scipy.spatial import ConvexHull, cKDTree

ARM = ('shoulder01', 'upperarm', 'lowerarm', 'wrist', 'finger', 'metacarpal')
LEG = ('upperleg', 'lowerleg', 'foot', 'toe')
HEAD = ('neck', 'head', 'jaw', 'eye', 'special', 'oculi', 'orbicularis', 'oris', 'levator', 'risorius',
        'temporalis', 'tongue')
PART_BODICE, PART_SKIRT, PART_STRAP = 1, 2, 3

# Trim (uv) bands, see textures.py: lace field, hem scallops, neckline scallops.
LACE_V = (0.46, 0.94)
HEM_V = (0.36, 0.46)
NECK_V = (0.94, 0.995)
STRAP_V = 0.075  # plain cloth row
LACE_TILE = 0.8  # metres of fabric per trim tile in u (the lace field spans about the dress height in v)


def vertex_normals(P, T):
    fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
    N = np.zeros_like(P)
    for k in range(3):
        np.add.at(N, T[:, k], fn)
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)


def labels(names, W):
    dom = np.array(names)[W.argmax(1)]
    lab = np.zeros(len(W), int)  # 0 torso
    for i, n in enumerate(dom):
        if n.startswith(ARM):
            lab[i] = 1
        elif n.startswith(LEG):
            lab[i] = 2
        elif n.startswith(HEAD):
            lab[i] = 3
    return lab


def section(P, keep, z, band=0.012):
    sel = keep & (np.abs(P[:, 2] - z) < band)
    pts = P[sel][:, :2]
    hull = ConvexHull(pts)
    return pts[hull.vertices]


def ray_hull(poly, c, theta):
    """Distance from c along direction theta (0 = front -Y, + toward +X) to the hull polygon."""
    d = np.array([np.sin(theta), -np.cos(theta)])
    best = 0.0
    n = len(poly)
    for i in range(n):
        a, b = poly[i] - c, poly[(i + 1) % n] - c
        e = b - a
        den = d[0] * (-e[1]) - d[1] * (-e[0])
        if abs(den) < 1e-12:
            continue
        t = (a[0] * (-e[1]) - a[1] * (-e[0])) / den
        s = (d[0] * a[1] - d[1] * a[0]) / den
        if t > 0 and -1e-9 <= s <= 1 + 1e-9:
            best = max(best, t)
    return best


def landmarks(rest):
    P, names, W = rest['P'], list(rest['names']), rest['W']
    lab = labels(names, W)
    torso = lab == 0
    H = rest['heads']

    def bone(n):
        return H[names.index(n)]
    widths = []
    zs = np.arange(0.95, 1.20, 0.005)
    for z in zs:
        sec = section(P, torso, z, 0.006)
        widths.append(np.ptp(sec[:, 0]))
    waist = float(zs[int(np.argmin(widths))])
    nipple = rest['tails'][names.index('breast.L')]
    hipj = bone('upperleg01.L')
    return dict(waist=waist, bust=float(nipple[2]), bust_y=float(nipple[1]), hip_joint=float(hipj[2]),
                crotch=float(hipj[2] - 0.075), underarm=float(bone('shoulder01.L')[2] - 0.085),
                neck=float(bone('neck01')[2]), labels=lab)


def neckline(theta, L):
    """Top edge height of the bodice around the body (theta 0 = centre front)."""
    a = np.abs(theta)
    strap_t = np.radians(36)
    v_low = L['bust'] + 0.015            # bottom of the V
    strap_z = L['underarm'] + 0.075      # where the straps leave the bodice in front
    side_z = L['underarm'] - 0.005
    back_z = L['underarm'] - 0.035
    z = np.where(a <= strap_t, v_low + (strap_z - v_low) * (a / strap_t) ** 1.15, 0)
    s = np.clip((a - strap_t) / (np.radians(95) - strap_t), 0, 1)
    z = np.where((a > strap_t) & (a <= np.radians(95)), strap_z + (side_z - strap_z) * (0.5 - 0.5 * np.cos(np.pi * s)), z)
    b = np.clip((a - np.radians(95)) / (np.radians(150) - np.radians(95)), 0, 1)
    z = np.where(a > np.radians(95), side_z + (back_z - side_z) * (0.5 - 0.5 * np.cos(np.pi * b)), z)
    return z


def build(rest, n_theta=144, seed=4, hem_drop=0.11, flare=0.33, ease=0.004, folds=1.0):
    P = rest['P']
    L = landmarks(rest)
    lab = L['labels']
    torso = lab == 0
    lower = (lab == 0) | (lab == 2)
    rng = np.random.default_rng(seed)
    thetas = np.linspace(-np.pi, np.pi, n_theta + 1)  # seam at centre back
    tops = neckline(thetas, L)
    hem = L['crotch'] - hem_drop
    # Cross-section radii on a fine height grid, smoothed.
    zs = np.arange(hem - 0.02, tops.max() + 0.02, 0.006)
    R = np.zeros((len(zs), len(thetas)))
    C = np.zeros((len(zs), 2))
    for i, z in enumerate(zs):
        keep = torso if z > L['waist'] + 0.03 else lower
        poly = section(P, keep, z, 0.01)
        c = poly.mean(0)
        C[i] = c
        R[i] = [ray_hull(poly, c, t) for t in thetas]
    from scipy.ndimage import gaussian_filter, gaussian_filter1d
    R = gaussian_filter(R, sigma=(2.5, 3.0), mode=('nearest', 'wrap'))
    # Fabric does not follow the nipples: blend the bust band toward its smooth envelope.
    bust_band = np.exp(-((zs - L['bust']) / 0.04) ** 2)[:, None]
    R = R + bust_band * (gaussian_filter(R, sigma=(4, 6), mode=('nearest', 'wrap')) - R).clip(0, None) + 0.003 * bust_band
    C = gaussian_filter1d(C, 2.0, axis=0, mode='nearest')

    def ring(z, extra=0.0):
        r = np.array([np.interp(z, zs, R[:, j]) for j in range(len(thetas))]) + extra
        c = np.array([np.interp(z, zs, C[:, 0]), np.interp(z, zs, C[:, 1])])
        return r, c

    verts, uv, part, rows = [], [], [], []
    # Bodice rows: from the waist to the neckline (row heights per column).
    n_b = 30
    for i, s in enumerate(np.linspace(0, 1, n_b)):
        row = []
        for j, t in enumerate(thetas):
            z = L['waist'] + (tops[j] - L['waist']) * s
            r, c = ring(z, ease)
            r = r[j]
            p = (c[0] + r * np.sin(t), c[1] - r * np.cos(t), z)
            row.append(len(verts))
            verts.append(p)
            band = tops[j] - z
            u = (t + np.pi) / (2 * np.pi) * 6.0
            v = NECK_V[0] + (1 - band / 0.018) * (NECK_V[1] - NECK_V[0]) if band < 0.018 else \
                LACE_V[0] + (z - hem) / (tops.max() - hem) * (LACE_V[1] - LACE_V[0])
            uv.append((u, v))
            part.append(PART_BODICE)
        rows.append(row)
    bodice = np.array(rows)

    # Skirt rows: waist -> hip (fitted) -> hem (A-line flare + folds).
    hip_z = L['crotch'] + 0.07
    r_hip, c_hip = ring(hip_z, ease + 0.004)
    n_s = 30
    phase = rng.uniform(0, 2 * np.pi, 6)
    zs_s = L['waist'] - (L['waist'] - hem) * np.linspace(0, 1, n_s) ** 0.9
    rows = []
    for i, z in enumerate(zs_s):
        below = np.clip((hip_z - z) / (hip_z - hem), 0, 1)
        r_body, c = ring(z, ease + 0.004 * min(1.0, i / 3))
        if z < hip_z:
            c = c_hip
        row = []
        for j, t in enumerate(thetas):
            r = r_body[j]
            if z < hip_z:
                r = max(r, r_hip[j] + flare * (hip_z - z))
            # Soft folds (godets) that deepen toward the hem, a little irregular.
            fold = (np.sin(14 * t + 0.6 * np.sin(3 * t + phase[0])) +
                    0.3 * np.sin(31 * t + phase[1]) + 0.2 * np.sin(5 * t + phase[2]))
            r += (0.002 + 0.016 * below ** 1.3) * fold * folds
            # Uneven hem: front slightly shorter, a gentle wave.
            dz = (0.004 * np.sin(2 * t + phase[3]) + 0.003 * np.sin(5 * t + phase[4]) + 0.006 * np.cos(t)) * below ** 2
            p = (c[0] + r * np.sin(t), c[1] - r * np.cos(t), z + dz)
            row.append(len(verts))
            verts.append(p)
            u = (t + np.pi) / (2 * np.pi) * 6.0
            hb = z - hem
            v = HEM_V[0] + hb / 0.04 * (HEM_V[1] - HEM_V[0]) if hb < 0.04 else \
                LACE_V[0] + (z - hem) / (tops.max() - hem) * (LACE_V[1] - LACE_V[0])
            uv.append((u, v))
            part.append(PART_SKIRT)
        rows.append(row)
    skirt = np.array(rows)

    faces = []

    def grid(G, outward=True):
        for i in range(G.shape[0] - 1):
            for j in range(G.shape[1] - 1):
                a, b, c, d = G[i, j], G[i, j + 1], G[i + 1, j + 1], G[i + 1, j]
                faces.extend([(a, b, c), (a, c, d)])
    grid(bodice)
    grid(skirt[::-1])
    V = np.array(verts)
    F = np.array(faces)
    # Orient faces outward (away from the vertical body axis).
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    out = V[F].mean(1) - np.array([0.0, -0.02, 0.0])
    out[:, 2] = 0
    flip = (fn * out).sum(1) < 0
    F[flip] = F[flip][:, ::-1]
    # Seam columns (theta = +pi duplicates theta = -pi) are welded for simulation.
    weld = np.arange(len(V))
    weld[bodice[:, -1]] = bodice[:, 0]
    weld[skirt[:, -1]] = skirt[:, 0]
    info = dict(L=L, thetas=thetas, tops=tops, hem=hem, bodice=bodice, skirt=skirt, hip_z=hip_z, weld=weld)
    # Lace runs around the body by arc length so its flowers keep their shape (the tile seam is at the
    # centre back, under her hair).
    UV = np.array(uv)
    for G in (bodice, skirt):
        for row in G:
            arc = np.r_[0, np.cumsum(np.linalg.norm(np.diff(V[row], axis=0), axis=1))]
            UV[row, 0] = arc / LACE_TILE
    return V, F, UV, np.array(part), info


def straps(rest, info, width=0.0055, offset=0.003):
    """Spaghetti straps from the front neckline over the shoulders to the back, hugging the skin."""
    P = rest['P']
    tree = cKDTree(P)
    VN = vertex_normals(P, rest['T'])
    names = list(rest['names'])
    V, F, UV = [], [], []
    for sign in (1, -1):
        sh = rest['heads'][names.index(f'shoulder01.{"L" if sign > 0 else "R"}')]
        cl = rest['heads'][names.index(f'clavicle.{"L" if sign > 0 else "R"}')]
        crest = 0.6 * sh + 0.4 * cl + np.array([0, 0.0, 0.06])
        pts = []
        for s in np.linspace(0, 1, 40):
            if s < 0.5:
                q = s / 0.5
                p = info['front_pts'][0 if sign > 0 else 1] * (1 - q) + crest * q
            else:
                q = (s - 0.5) / 0.5
                p = crest * (1 - q) + info['back_pts'][0 if sign > 0 else 1] * q
            pts.append(p)
        pts = np.array(pts, float)
        # Settle onto the skin along the surface normals (outside), keeping the ends fixed.
        for _ in range(40):
            d, i = tree.query(pts, k=4)
            near = P[i].mean(1)
            nrm = VN[i].mean(1)
            nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
            target = near + nrm * offset
            pts[1:-1] = 0.5 * pts[1:-1] + 0.5 * target[1:-1]
            pts[1:-1] = 0.25 * pts[:-2] + 0.5 * pts[1:-1] + 0.25 * pts[2:]
        tang = np.gradient(pts, axis=0)
        tang /= np.linalg.norm(tang, axis=1, keepdims=True)
        d, i = tree.query(pts, k=4)
        nrm = VN[i].mean(1)
        nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
        side = np.cross(tang, nrm)
        side /= np.maximum(np.linalg.norm(side, axis=1, keepdims=True), 1e-9)
        base = len(V)
        for k, p in enumerate(pts):
            for w in (-0.5, 0.5):
                V.append(p + side[k] * w * width)
                UV.append((k / (len(pts) - 1) * 4, STRAP_V))
        for k in range(len(pts) - 1):
            a, b, c, e = base + 2 * k, base + 2 * k + 1, base + 2 * k + 3, base + 2 * k + 2
            F += [(a, b, c), (a, c, e)]
    return np.array(V), np.array(F), np.array(UV)


def strap_anchors(V, info):
    """Front and back strap anchor points on the bodice top edge."""
    thetas = info['thetas']
    top = info['bodice'][-1]
    out_f, out_b = [], []
    for sign in (1, -1):
        jf = int(np.argmin(np.abs(thetas - sign * np.radians(36))))
        jb = int(np.argmin(np.abs(thetas - sign * np.radians(150))))
        out_f.append(V[top[jf]] + np.array([0, 0, -0.004]))
        out_b.append(V[top[jb]] + np.array([0, 0, -0.004]))
    info['front_pts'] = out_f
    info['back_pts'] = out_b
    return info
