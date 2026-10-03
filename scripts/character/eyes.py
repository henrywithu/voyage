"""Eyeball/iris geometry for the eye close-up frames."""
import os
import numpy as np
import chaewon as C
import textures as TX
import face_art

HERE = os.path.dirname(os.path.abspath(__file__))


def eye_info():
    B = C.load_body()
    V = B['V']
    ev = np.unique(B['eyes'])
    E = V[ev]
    out = {}
    ref = os.path.join(HERE, 'build/face_ref.png')
    eyes, _, _ = face_art.masks(ref)
    left_img, right_img = face_art.split_eyes(eyes)
    for side, sel, mask in (('L', E[:, 0] > 0, right_img), ('R', E[:, 0] < 0, left_img)):
        P = E[sel]
        c = P.mean(0)
        r = np.linalg.norm(P - c, axis=1).mean()
        ys, xs = np.where(mask)
        ox = -0.11 + xs.mean() / 1024 * 0.22
        oy = 1.58 - ys.mean() / 1024 * 0.22
        h = (ys.max() - ys.min()) / 1024 * 0.22
        dx, dy = ox - c[0], oy - c[1]
        dz = np.sqrt(max(r * r - dx * dx - dy * dy, 1e-8))
        gaze = np.array([dx, dy, dz]) / r
        out[side] = dict(center=c, radius=r, gaze=gaze / np.linalg.norm(gaze), open_h=h)
    return out


def iris_caps(info, scale_iris=0.66, rings=8, segs=32):
    """Spherical iris caps (rest space), atlas uv into the iris graphic."""
    ib = TX.IRIS_BOX
    P, UV, F, N, side_of = [], [], [], [], []
    for side in ('L', 'R'):
        e = info[side]
        c, g = e['center'], e['gaze']
        r = e['radius'] + 0.0004
        angle = np.arcsin(min(0.9, e['open_h'] * scale_iris / e['radius']))
        x = np.cross([0, 1.0, 0], g)
        x /= np.linalg.norm(x)
        y = np.cross(g, x)
        base = len(P)
        P.append(c + g * r); N.append(g); side_of.append(side)
        UV.append(((ib['u0'] + ib['u1']) / 2, (ib['v0'] + ib['v1']) / 2))
        for i in range(1, rings + 1):
            th = angle * i / rings
            for j in range(segs):
                ph = 2 * np.pi * j / segs
                d = g * np.cos(th) + (x * np.cos(ph) + y * np.sin(ph)) * np.sin(th)
                P.append(c + d * r); N.append(d); side_of.append(side)
                q = np.sin(th) / np.sin(angle) * 0.5
                UV.append((ib['u0'] + (0.5 + q * np.cos(ph)) * (ib['u1'] - ib['u0']),
                           ib['v0'] + (0.5 + q * np.sin(ph)) * (ib['v1'] - ib['v0'])))
        for j in range(segs):
            F.append((base, base + 1 + j, base + 1 + (j + 1) % segs))
        for i in range(rings - 1):
            a0 = base + 1 + i * segs
            a1 = a0 + segs
            for j in range(segs):
                j1 = (j + 1) % segs
                F.extend([(a0 + j, a1 + j, a1 + j1), (a0 + j, a1 + j1, a0 + j1)])
    return np.array(P), np.array(N), np.array(UV), np.array(F), np.array(side_of)
