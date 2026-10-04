"""Chaewon's sloop: a small white gaff-rigged sailboat (three.js space, procedural).

    python3 boat.py            # writes public/assets/decoded/story/sea/boat.bin.mesh

The boat is modelled in Chaewon's own space for the bow pose (export scale):
she stands on the foredeck at the origin facing +Z, the deck under her feet is
at y = 0, and her right hand holds the forestay at GRIP. The forestay runs from
the stem head through GRIP to the hounds on the mast, so the line in her hand
is the real stay. The bow points +Z, her left is +X.
"""
import json
import math
import os

import numpy as np

import meshkit as mk

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '../..')
OUT = os.path.join(ROOT, 'public/assets/decoded/story/sea/boat.bin.mesh')
GRIP_JSON = os.path.join(HERE, '../chaewon/build/bow_grip.json')



def pose_info():
    try:
        return json.load(open(GRIP_JSON))
    except OSError:
        return {'grip': [-0.2986, 1.934, 0.2929], 'sole': 0.0012, 'feet': [[0.214, 0.085, 0.145], [-0.191, 0.071, 0.019]]}


POSE = pose_info()
CL = float(POSE['grip'][0])   # centreline x: the stay in her right hand runs down the middle of the boat
Z_BOW, Z_STERN = 1.6, -5.8
Z_MAST = -1.45
WATERLINE = -0.85


def grip():
    return np.array(POSE['grip'], float)


# ---------------------------------------------------------------- hull lines

def t_of(z):
    return (np.asarray(z, float) - Z_STERN) / (Z_BOW - Z_STERN)


def half_beam(t):
    t = np.asarray(t, float)
    fwd = 1.15 * np.clip(1 - np.clip((t - 0.45) / 0.55, 0, 1) ** 2.1, 0, 1) ** 0.62
    aft = 0.86 + 0.29 * np.sin(np.pi / 2 * np.clip(t / 0.45, 0, 1))
    return np.where(t >= 0.45, fwd, aft)


def _sheer(t):
    t = np.asarray(t, float)
    return -0.23 + 1.19 * (t - 0.45) ** 2 - 0.05 * np.clip((0.2 - t) / 0.2, 0, 1)


CAMBER = 0.05


def _deck_y(x, z, lift=0.0):
    t = t_of(z)
    b = np.maximum(half_beam(t), 1e-3)
    return _sheer(t) + lift + CAMBER * (1 - np.clip((np.asarray(x) - CL) / b, -1, 1) ** 2)


# The whole boat sits so that the deck meets her soles.
LIFT = float(POSE['sole']) - float(np.mean([_deck_y(f[0], f[2]) for f in POSE['feet']]))
WATERLINE += LIFT


def sheer(t):
    """Deck-edge height: a sweet spring from a low waist up to the bow."""
    return _sheer(t) + LIFT


def keel(t):
    t = np.asarray(t, float)
    fwd = 0.62 * np.clip((t - 0.58) / 0.42, 0, 1) ** 1.7
    aft = 0.38 * np.clip((0.28 - t) / 0.28, 0, 1) ** 1.4
    return -1.32 + fwd + aft + LIFT


def deck_y(x, z):
    return _deck_y(x, z, LIFT)


def section(t, n=26):
    """Starboard sheer -> keel -> port sheer for station t (x, y; z is added by the caller)."""
    b = max(float(half_beam(t)), 0.004)
    ys, yk = float(sheer(t)), float(keel(t))
    ex = 2.0 + 0.9 * np.clip((0.85 - t) / 0.5, 0, 1)          # fuller sections amidships
    ey = 2.0 + 0.5 * np.clip((0.8 - t) / 0.5, 0, 1)
    th = np.linspace(0, np.pi, n)
    c, s = np.cos(th), np.sin(th)
    x = b * np.sign(c) * np.abs(c) ** (2 / ex)
    # Flared topsides: the upper third of the side leans out a little.
    y = ys - (ys - yk) * s ** (2 / ey)
    return np.c_[CL + x, y]


def hull(m, stations=60, n=26):
    ts = np.linspace(0, 1, stations) ** 0.9
    ts = 1 - (1 - ts)  # (kept explicit: stations cluster slightly toward the bow)
    rings = []
    for t in ts:
        xy = section(t, n)
        z = Z_STERN + t * (Z_BOW - Z_STERN)
        ys = float(sheer(t))
        # Raked stem and transom: lower points move aft at the bow, forward at the stern.
        rake = -0.42 * np.clip((t - 0.78) / 0.22, 0, 1) ** 1.5 * (ys - xy[:, 1]) / 1.4
        rake += 0.30 * np.clip((0.06 - t) / 0.06, 0, 1) * (ys - xy[:, 1]) / 1.1
        rings.append(np.c_[xy[:, 0], xy[:, 1], z + rake])
    P, F = mk.loft(rings, flip=False, cap0=True)
    # Orientation: make normals point outward (check one mid-ship side face).
    fn = mk.face_normals(P, F)
    mid = len(F) // 2
    c = P[F[mid]].mean(0)
    if np.dot(fn[mid], c - np.array([CL, c[1], c[2]])) < 0 and abs(c[0] - CL) > 0.2:
        F = F[:, ::-1]
    m.add(P, F, tag=1)
    return ts


def deck(m, ts, k=17):
    rings = []
    for t in ts:
        b = float(half_beam(t))
        z = Z_STERN + t * (Z_BOW - Z_STERN)
        x = CL + np.linspace(1, -1, k) * max(b, 0.004)
        rings.append(np.c_[x, deck_y(x, np.full(k, z)), np.full(k, z)])
    P, F = mk.loft(rings)
    fn = mk.face_normals(P, F)
    if fn[:, 1].mean() < 0:
        F = F[:, ::-1]
    m.add(P, F, tag=2)


def sweep_profile(path, profile, up=np.array([0, 1.0, 0]), closed=True):
    """Sweep a 2D profile (u across, v up) along a 3D path."""
    path = np.asarray(path, float)
    t = np.gradient(path, axis=0)
    t /= np.linalg.norm(t, axis=1, keepdims=True)
    rings = []
    for p, d in zip(path, t):
        side = np.cross(up, d)
        side /= np.linalg.norm(side)
        v = np.cross(d, side)
        rings.append(p + profile[:, :1] * side + profile[:, 1:2] * v)
    return mk.loft(rings, close_u=closed, cap0=True, cap1=True)


def toe_rails(m):
    prof = np.array([[-0.022, -0.02], [0.022, -0.02], [0.018, 0.05], [-0.018, 0.05]])
    for sgn in (1, -1):
        ts = np.linspace(0.003, 0.985, 70)
        z = Z_STERN + ts * (Z_BOW - Z_STERN)
        b = half_beam(ts) - 0.015
        path = np.c_[CL + sgn * b, sheer(ts), z]
        P, F = sweep_profile(path, prof)
        m.add(P, F, smooth=True, tag=3)


def rounded_rect(cx, cz, hx, hz, e=4.0, n=64):
    a = np.linspace(0, 2 * np.pi, n, endpoint=False)
    c, s = np.cos(a), np.sin(a)
    return np.c_[cx + hx * np.sign(c) * np.abs(c) ** (2 / e), cz + hz * np.sign(s) * np.abs(s) ** (2 / e)]


def cabin(m, z0=-3.55, z1=-0.75, top=0.48 + LIFT):
    cz, hz = (z0 + z1) / 2, (z1 - z0) / 2
    hx = 0.64 * float(half_beam(t_of(cz)))
    base = rounded_rect(CL, cz, hx, hz, e=5.0)
    # Taper the trunk forward so it follows the hull.
    taper = 1 - 0.28 * np.clip((base[:, 1] - cz) / hz, 0, 1) ** 1.6
    base[:, 0] = CL + (base[:, 0] - CL) * taper
    rings = []
    for y_off, inset in ((-0.06, 0.0), (None, 0.0), (top - 0.04, 0.035), (top, 0.075)):
        xz = CL + (base[:, 0] - CL) * (1 - inset / hx), cz + (base[:, 1] - cz) * (1 - inset / hz)
        if y_off is None:
            y = deck_y(xz[0], xz[1]) + 0.02
        elif y_off < 0:
            y = deck_y(xz[0], xz[1]) + y_off
        else:
            y = np.full(len(base), y_off)
        rings.append(np.c_[xz[0], y, xz[1]])
    # Cambered roof: shrinking rings rising to the ridge.
    for f in (0.8, 0.55, 0.3, 0.08):
        xz = CL + (base[:, 0] - CL) * f * (1 - 0.075 / hx), cz + (base[:, 1] - cz) * (0.15 + 0.85 * f) * (1 - 0.075 / hz)
        rings.append(np.c_[xz[0], np.full(len(base), top + 0.07 * (1 - f ** 2)), xz[1]])
    P, F = mk.loft(rings, close_u=True, cap1=True)
    fn = mk.face_normals(P, F)
    if fn[len(F) // 2:][:, 1].mean() < 0:
        F = F[:, ::-1]
    m.add(P, F, tag=4)
    # Portholes: three oval rims a side.
    for sgn in (1, -1):
        for zz in (cz + hz * 0.45, cz, cz - hz * 0.45):
            # Find the trunk side at this z and mid height.
            i = np.argmin(np.abs(base[:, 1] - zz) + 10 * (np.sign(base[:, 0] - CL) != sgn))
            x = base[i, 0]
            y = (deck_y(x, zz) + top) / 2 + 0.01
            a = np.linspace(0, 2 * np.pi, 20, endpoint=False)
            ring = np.c_[np.full(20, x + sgn * 0.012), y + 0.075 * np.sin(a), zz + 0.13 * np.cos(a)]
            P, F = mk.tube(np.vstack([ring, ring[:1]]), 0.018, sides=6, cap=False)
            m.add(P, F, tag=5)
    # A sliding hatch on the roof.
    for (hz0, hz1, w, h, yb) in ((z0 + 0.25, z0 + 1.05, 0.34, 0.07, top + 0.04),):
        zc = (hz0 + hz1) / 2
        y0 = float(deck_y(CL, zc)) - 0.02 if yb is None else yb
        P, F = mk.box((CL, y0 + h / 2, zc), (2 * w, h, hz1 - hz0))
        m.add(P, F, smooth=False, tag=6)
    return cz, hz, hx


def cockpit(m, z0=-5.5, z1=-3.75):
    """Low coamings around the cockpit and a bench either side."""
    for sgn in (1, -1):
        zs = np.linspace(z0, z1, 18)
        b = half_beam(t_of(zs)) * 0.66
        path = np.c_[CL + sgn * b, deck_y(CL + sgn * b, zs) + 0.0, zs]
        prof = np.array([[-0.02, -0.04], [0.02, -0.04], [0.016, 0.2], [-0.016, 0.2]])
        P, F = sweep_profile(path, prof)
        m.add(P, F, tag=7)
    xs = np.linspace(-1, 1, 12)
    b = float(half_beam(t_of(z0))) * 0.66
    path = np.c_[CL + xs * b, deck_y(CL + xs * b, np.full(12, z0)), np.full(12, z0)]
    prof = np.array([[-0.02, -0.04], [0.02, -0.04], [0.016, 0.2], [-0.016, 0.2]])
    P, F = sweep_profile(path, prof)
    m.add(P, F, tag=7)


def rudder_and_tiller(m):
    zt = Z_STERN + 0.30 * 0.0
    y_top = float(sheer(0.0)) + 0.05
    blade = np.array([[0, y_top], [0, -0.5], [-0.05, -1.05], [-0.25, -1.45], [-0.5, -1.4], [-0.55, -0.9], [-0.42, -0.3], [-0.2, y_top - 0.15]])
    # Extrude the outline into a thin foil (x thickness).
    n = len(blade)
    P = np.vstack([np.c_[np.full(n, CL + 0.035), blade[:, 1], Z_STERN + 0.14 + blade[:, 0]],
                   np.c_[np.full(n, CL - 0.035), blade[:, 1], Z_STERN + 0.14 + blade[:, 0]]])
    F = []
    for i in range(1, n - 1):
        F += [(0, i, i + 1), (n, n + i + 1, n + i)]
    for i in range(n):
        j = (i + 1) % n
        F += [(i, n + i, n + j), (i, n + j, j)]
    F = np.array(F)
    fn = mk.face_normals(P, F)
    if fn[0][0] < 0:
        F = F[:, ::-1]
    m.add(P, F, smooth=False, tag=8)
    path = np.array([[CL, y_top + 0.02, Z_STERN + 0.12], [CL, y_top + 0.12, Z_STERN + 0.6], [CL, y_top + 0.22, Z_STERN + 1.25],
                     [CL, y_top + 0.26, Z_STERN + 1.45]])
    P, F = mk.tube(path, np.array([0.045, 0.04, 0.032, 0.03]), sides=8)
    m.add(P, F, tag=8)


# ---------------------------------------------------------------- spars, sail, rigging

def spar(m, p0, p1, r0, r1, sides=12, tag=9):
    P, F = mk.cylinder(p0, p1, r0, r1, sides=sides, segs=6)
    m.add(P, F, tag=tag)


def rig(m, cabin_top, furled=False):
    g = grip()
    stem_head = np.array([CL, float(sheer(1.0)) + 0.08, Z_BOW - 0.05])
    d = (g - stem_head) / np.linalg.norm(g - stem_head)
    # Hounds: where the stay meets the mast's forward face.
    mast_r = 0.075
    s = (Z_MAST + mast_r - stem_head[2]) / d[2]
    hounds = stem_head + d * s
    mast_top = np.array([CL, hounds[1] + 0.85, Z_MAST])
    spar(m, (CL, cabin_top - 0.05, Z_MAST), mast_top, mast_r, 0.048, sides=14)
    # Truck (cap) and a pennant for the wind.
    spar(m, mast_top, mast_top + (0, 0.06, 0), 0.055, 0.04, sides=12)
    # Gaff rig, swung out a little to port (her left, +X) and drawing (or lowered and furled).
    swing = math.radians(4 if furled else 17)
    R = np.array([[math.cos(swing), 0, -math.sin(swing)], [0, 1, 0], [math.sin(swing), 0, math.cos(swing)]])
    pivot = np.array([CL, 0, Z_MAST])
    rot = lambda p: (np.asarray(p, float) - pivot) @ R.T + pivot
    tack = np.array([CL, 1.15, Z_MAST - mast_r])
    throat = np.array([CL, hounds[1] - 0.35, Z_MAST - mast_r])
    if furled:
        throat = np.array([CL, tack[1] + 0.32, Z_MAST - mast_r])
    peak = rot(throat + (np.array([0, 0.28, -2.95]) if furled else np.array([0, 2.0, -2.95])))
    clew = rot(np.array([CL, 1.38, Z_STERN - 0.35]))
    boom_end = clew + (rot(np.array([CL, 0, -0.25])) - rot(np.array([CL, 0, 0])))
    spar(m, rot(tack + (0, -0.05, 0)), boom_end, 0.058, 0.045, sides=12, tag=10)
    gaff_end = peak + (peak - throat) / np.linalg.norm(peak - throat) * 0.25
    spar(m, throat, gaff_end, 0.05, 0.036, sides=12, tag=10)
    # Gaff jaws around the mast.
    a = np.linspace(0, 2 * np.pi, 16)
    P, F = mk.tube(np.c_[CL + 0.11 * np.sin(a), np.full(16, throat[1]), Z_MAST + 0.11 * np.cos(a)], 0.02, sides=6, cap=False)
    m.add(P, F, tag=10)
    if furled:
        furled_sail(m, rot(tack + (0, 0.1, -0.05)), clew + (0, 0.08, 0), throat, peak)
        hoops = np.linspace(tack[1] + 0.12, throat[1] - 0.02, 7)
    else:
        sail(m, tack, throat, peak, clew, swing)
        hoops = np.linspace(tack[1] + 0.45, throat[1] - 0.3, 7)
    # Mast hoops along the luff.
    for y in hoops:
        P, F = mk.tube(np.c_[CL + 0.1 * np.sin(a), np.full(16, y), Z_MAST + 0.1 * np.cos(a)], 0.016, sides=6, cap=False)
        m.add(P, F, tag=11)
    wire = 0.013
    # Forestay: stem head -> hounds, passing through her hand.
    m.add(*mk.cylinder(stem_head, hounds, wire, wire, sides=8, segs=12), tag=12)
    stem_plate = mk.box(stem_head + (0, -0.03, -0.02), (0.05, 0.12, 0.16))
    m.add(*stem_plate, smooth=False, tag=12)
    # Shrouds to the chainplates either side of the mast.
    zc = Z_MAST - 0.15
    for sgn in (1, -1):
        b = float(half_beam(t_of(zc))) - 0.03
        foot = np.array([CL + sgn * b, float(sheer(t_of(zc))) + 0.03, zc])
        m.add(*mk.cylinder(foot, hounds + (sgn * 0.06, -0.05, -0.08), wire, wire, sides=8, segs=10), tag=12)
        spreader = np.array([CL, (hounds[1] + cabin_top) / 2 + 0.25, Z_MAST - 0.02])
        m.add(*mk.cylinder(spreader, spreader + (sgn * 0.42, 0.02, 0), 0.02, 0.015, sides=8, segs=2), tag=12)
    # Topping lift (masthead -> boom end) and the peak halyard.
    m.add(*mk.cylinder(mast_top, boom_end + (0, 0.04, 0), 0.007, 0.007, sides=6, segs=12), tag=13)
    m.add(*mk.cylinder(mast_top + (0, -0.15, -0.07), (peak + gaff_end) / 2, 0.007, 0.007, sides=6, segs=8), tag=13)
    # Mainsheet from the boom end down to the transom.
    m.add(*mk.cylinder(boom_end + (0, -0.05, 0.2), (CL, float(sheer(0.02)) + 0.05, Z_STERN + 0.2), 0.008, 0.008, sides=6, segs=6), tag=13)
    return dict(stem_head=stem_head, hounds=hounds, mast_top=mast_top, peak=peak, clew=clew)


def furled_sail(m, a, b, throat, peak, n=40):
    """The mainsail flaked down on the boom: a lumpy bundle with sail ties."""
    u = np.linspace(0, 1, n)
    path = a[None] * (1 - u[:, None]) + b[None] * u[:, None]
    path[:, 1] += 0.06 + 0.05 * np.sin(u * np.pi)
    r = 0.13 * (1 - 0.45 * u) * (1 + 0.18 * np.sin(u * 37) * np.sin(u * 11))
    m.add(*mk.tube(path, r, sides=10), tag=14)
    for k in range(1, 6):
        c = path[int(k / 6 * (n - 1))]
        rr = r[int(k / 6 * (n - 1))] + 0.012
        d = (b - a) / np.linalg.norm(b - a)
        side = np.cross(d, [0, 1.0, 0])
        side /= np.linalg.norm(side)
        up = np.cross(side, d)
        t = np.linspace(0, 2 * np.pi, 14)
        ring = c + rr * (np.cos(t)[:, None] * side + np.sin(t)[:, None] * up)
        m.add(*mk.tube(ring, 0.012, sides=5, cap=False), tag=15)


def sail(m, tack, throat, peak, clew, swing, nu=28, nv=34):
    """Cream gaff mainsail: a bilinear patch with draft, a hollow leech and a little twist."""
    u = np.linspace(0, 1, nu)       # luff -> leech
    v = np.linspace(0, 1, nv)       # foot -> head
    U, V = np.meshgrid(u, v)
    luff = tack[None, None] * (1 - V[..., None]) + throat[None, None] * V[..., None]
    leech = clew[None, None] * (1 - V[..., None]) + peak[None, None] * V[..., None]
    P = luff * (1 - U[..., None]) + leech * U[..., None]
    # Roach-free hollow leech, belly toward port (+x rotated by the swing), deepest at 40% chord.
    side = np.array([math.cos(swing), 0, math.sin(swing)])
    draft = 0.42 * np.sin(np.pi * U ** 0.8) * (0.55 + 0.45 * np.sin(np.pi * np.clip(V * 0.9 + 0.05, 0, 1)))
    P = P + draft[..., None] * side
    # Twist: the upper sail falls off to leeward.
    P = P + (0.35 * V ** 1.5 * U)[..., None] * side
    G = np.arange(nu * nv).reshape(nv, nu)
    F = mk.grid(G)
    Pf = P.reshape(-1, 3)
    # Two skins with a small gap so the sail is a closed solid (the shader has no back-face lighting).
    N = mk.normals(Pf, F)
    off = 0.008
    m.add(Pf + N * off, F, tag=14)
    m.add(Pf - N * off, F[:, ::-1], tag=14)
    # Bolt ropes around the edges and seams across the cloth.
    for path in (P[:, 0], P[:, -1], P[0, :], P[-1, :]):
        m.add(*mk.tube(path, 0.016, sides=6), tag=15)
    for k in range(4, nv - 2, 5):
        m.add(*mk.tube(P[k, :] + 0.0, 0.006, sides=5), tag=15)


def lifelines(m):
    zs = np.array([-0.45, -1.5, -2.6, -3.7, -4.7, -5.5])
    h = 0.55
    for sgn in (1, -1):
        tops = []
        for z in zs:
            t = t_of(z)
            x = CL + sgn * (float(half_beam(t)) - 0.06)
            y0 = float(sheer(t))
            m.add(*mk.cylinder((x, y0, z), (x, y0 + h, z), 0.016, 0.013, sides=8, segs=2), tag=16)
            tops.append((x, y0 + h - 0.02, z))
        tops = np.array(tops)
        # Slight sag between stanchions.
        path = []
        for a, b in zip(tops[:-1], tops[1:]):
            for s in np.linspace(0, 1, 8, endpoint=False):
                p = a * (1 - s) + b * s
                p[1] -= 0.035 * math.sin(math.pi * s)
                path.append(p)
        path.append(tops[-1])
        m.add(*mk.tube(np.array(path), 0.007, sides=6), tag=16)


def build(furled=False):
    m = mk.Mesh()
    ts = hull(m)
    deck(m, ts)
    toe_rails(m)
    cz, hz, hx = cabin(m)
    cockpit(m)
    rudder_and_tiller(m)
    lifelines(m)
    info = rig(m, 0.48 + 0.07 + LIFT, furled)
    return m, info


if __name__ == '__main__':
    for furled, path in ((False, OUT), (True, OUT.replace('boat.bin', 'boat-furled.bin'))):
        m, info = build(furled)
        P, F, N = mk.write(path, m, ao=True, ao_rays=24, ao_dist=0.8)
        print({k: np.round(v, 3).tolist() for k, v in info.items()})
        print('bounds', P.min(0).round(2), P.max(0).round(2))
