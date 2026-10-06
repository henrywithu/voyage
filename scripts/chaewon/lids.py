"""Fit her eyelids to the painted eyes (bpy; run from rest.py).

MakeHuman's eye openings are egg-shaped: round and wide at the inner corner. The face painting (face.py,
eye_shape) draws an almond centred on each opening, pointed at the inner corner, and inks its lash lines
along it; where the opening reaches past the almond, the eyeball's white shows outside the ink (most of
all in the eye close-ups). Here the lids are drawn in to the almond: in the front projection the face is
painted in (facemap.py), every lid vertex near an opening moves along the ray from the eye's centre so the
opening's edge lands on the almond, easing off away from the rim. Lids only ever close (never open past
the mesh), and nothing is left inside the eyeball.
"""
import os
import tempfile

import numpy as np

import face
import facemap


def _radius_fn(poly, c):
    """r(theta) of a closed polygon star-shaped about c (the furthest crossing of each ray)."""
    P = np.asarray(poly, float)
    # Densify so every ray finds a sample within a fraction of a degree.
    seg = np.diff(np.vstack([P, P[:1]]), axis=0)
    n = np.maximum(1, (np.linalg.norm(seg, axis=1) / 0.5).astype(int))
    D = np.vstack([P[i] + seg[i] * np.linspace(0, 1, n[i], endpoint=False)[:, None] for i in range(len(P))])
    a = np.arctan2(D[:, 1] - c[1], D[:, 0] - c[0])
    r = np.linalg.norm(D - c, axis=1)
    bins = np.linspace(-np.pi, np.pi, 721)
    k = np.clip(np.digitize(a, bins) - 1, 0, 719)
    rb = np.zeros(720)
    np.maximum.at(rb, k, r)
    # Fill empty bins from their neighbours (circularly).
    idx = np.flatnonzero(rb > 0)
    centres = (bins[:-1] + bins[1:]) / 2
    rb = np.interp(centres, np.r_[centres[idx] - 2 * np.pi, centres[idx], centres[idx] + 2 * np.pi],
                   np.r_[rb[idx], rb[idx], rb[idx]])

    def fn(theta):
        return np.interp(theta, centres, rb, period=2 * np.pi)
    return fn


def _sphere(P):
    """Least-squares sphere through points P: (centre, radius)."""
    A = np.c_[2 * P, np.ones(len(P))]
    b = (P ** 2).sum(1)
    x = np.linalg.lstsq(A, b, rcond=None)[0]
    c = x[:3]
    return c, float(np.sqrt(x[3] + c @ c))


def fit(rest, reach=0.35, clearance=0.0006):
    """Rest-pose body vertices with the eye openings drawn in to the painted almonds."""
    P = np.asarray(rest['P'], float).copy()
    fd, path = tempfile.mkstemp(suffix='.png')
    os.close(fd)
    try:
        win = facemap.render(rest, path)
        lm = face.landmarks(face.load_map(path))
    finally:
        os.remove(path)
    R = lm['R']
    to_px = lambda Q: np.c_[(0.5 + (Q[:, 0] - win['cx']) / win['size']) * R,
                            (0.5 - (Q[:, 2] - win['cz']) / win['size']) * R]
    from_px = lambda q: np.c_[(q[:, 0] / R - 0.5) * win['size'] + win['cx'], win['cz'] - (q[:, 1] / R - 0.5) * win['size']]
    EP = np.asarray(rest['EP'], float)
    mid = (lm['eyes'][0]['cx'] + lm['eyes'][1]['cx']) / 2
    Q = to_px(P)
    front = P[:, 1] < np.median(EP[:, 1])     # the face side of the head (Blender -y is her front)
    moved_total = 0
    for e in lm['eyes']:
        outer = -1 if e['cx'] < mid else 1
        g = face.eye_shape(e, outer)
        c = np.asarray(g['c'], float)
        almond = np.vstack([g['up'], g['lo'][::-1]])
        hole = np.vstack([np.c_[e['cols'], e['top']], np.c_[e['cols'], e['bot']][::-1]]).astype(float)
        ra, rh = _radius_fn(almond, c), _radius_fn(hole, c)
        W0 = float(e['x1'] - e['x0'])
        d = Q - c
        r = np.linalg.norm(d, axis=1)
        th = np.arctan2(d[:, 1], d[:, 0])
        near = front & (r < 1.2 * W0)
        k = np.flatnonzero(near)
        a, h = ra(th[k]), rh(th[k])
        scale = np.minimum(a / np.maximum(h, 1e-6), 1.0)         # < 1 where the opening reaches past the almond
        # Full at and inside the rim, easing to nothing reach * W0 out from it.
        u = np.clip((r[k] - h) / (reach * W0), 0, 1)
        w = 1 - u * u * (3 - 2 * u)
        f = 1 + (scale - 1) * w
        sel = f < 0.9999
        k, f = k[sel], f[sel]
        q = c + d[k] * f[:, None]
        xz = from_px(q)
        P[k, 0], P[k, 2] = xz[:, 0], xz[:, 1]
        # Keep the drawn-in lid in front of the eyeball.
        ball = EP[(EP[:, 0] > 0) == (P[k, 0].mean() > 0)]
        C, Rs = _sphere(ball)
        v = P[k] - C
        dist = np.linalg.norm(v, axis=1)
        inside = dist < Rs + clearance
        P[k[inside]] = C + v[inside] / dist[inside, None] * (Rs + clearance)
        moved_total += len(k)
    print('lids: drew in %d vertices' % moved_total)
    return P
