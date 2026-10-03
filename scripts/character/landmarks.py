"""Pose landmarks from saint meshes (skin islands + shared atlas layout)."""
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
import geom

FACE_UV = {'eye_r': (0.198, 0.815), 'eye_l': (0.298, 0.814), 'brow': (0.249, 0.858),
           'chin': (0.248, 0.658), 'mouth': (0.247, 0.722)}


def components(P, F, mask):
    f = F[mask[F].all(1)]
    n = len(P)
    rows = np.concatenate([f[:, 0], f[:, 1], f[:, 2]])
    cols = np.concatenate([f[:, 1], f[:, 2], f[:, 0]])
    g = coo_matrix((np.ones(len(rows)), (rows, cols)), shape=(n, n))
    k, lab = connected_components(g, directed=False)
    lab = np.where(mask, lab, -1)
    comps = []
    for c in np.unique(lab[lab >= 0]):
        idx = np.where(lab == c)[0]
        if len(idx) > 30:
            comps.append(idx)
    return comps, f


def face_frame(P, uv2, skin, radius=0.01):
    pts = {}
    sk = np.where(skin)[0]
    for name, uv in FACE_UV.items():
        d = np.linalg.norm(uv2[sk] - uv, axis=1)
        sel = sk[d < radius]
        if len(sel) == 0:
            sel = sk[np.argsort(d)[:3]]
        Q = P[sel]
        med = np.median(Q, 0)
        Q = Q[np.linalg.norm(Q - med, axis=1) < 0.03]
        pts[name] = Q.mean(0) if len(Q) else med
    right = pts['eye_l'] - pts['eye_r']
    right /= np.linalg.norm(right)
    up = pts['brow'] - pts['chin']
    up -= right * up.dot(right)
    up /= np.linalg.norm(up)
    fwd = np.cross(right, up)
    eyes = 0.5 * (pts['eye_l'] + pts['eye_r'])
    return dict(points=pts, right=right, up=up, fwd=fwd, eyes=eyes)


def limb(P, F, comp):
    """Wrist/ankle = centroid of the island's open boundary; tip = farthest."""
    f = F[np.isin(F, comp).all(1)]
    loops = geom.boundary_loops(f)
    loops = [l for l in loops if len(l) > 6]
    if loops:
        base = P[max(loops, key=len)].mean(0)
    else:
        base = P[comp].mean(0)
    d = np.linalg.norm(P[comp] - base, axis=1)
    tip = P[comp][np.argsort(d)[-max(3, len(comp) // 50):]].mean(0)
    c = P[comp].mean(0)
    X = P[comp] - c
    _, _, vt = np.linalg.svd(X, full_matrices=False)
    return dict(base=base, tip=tip, centre=c, normal=vt[2], size=d.max())


def analyse(P, F, uv2):
    skin = uv2[:, 1] > 0.55
    comps, _ = components(P, F, skin)
    comps.sort(key=lambda c: -len(c))
    face = face_frame(P, uv2, skin)
    info = dict(face=face, limbs=[])
    for c in comps:
        cen = P[c].mean(0)
        if np.linalg.norm(cen - face['eyes']) < 0.18:
            continue
        info['limbs'].append(dict(limb(P, F, c), n=len(c)))
    return info
