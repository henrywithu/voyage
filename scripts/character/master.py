"""Assemble Chaewon's master model with all render attributes and weights.

The stored master holds the body, eyes, dress, straps and hair cap. Hair
strands are generated per pose (`posed`) from head-rigid guides that fall
with gravity over the posed body and dress.
"""
import pickle
import numpy as np
from scipy.spatial import cKDTree
import chaewon as C
import geom
import skeleton as sk
import textures as TX

HEAD_PROJ = dict(x0=-0.11, y0=1.36, size=0.22, u0=0.0, v0=0.56, span=0.44)
SKIN_WHITE = (0.80, 0.80)    # atlas: blank skin area
CLOTH_WHITE = (0.50, 0.25)   # atlas: blank cloth area
TRIM_WHITE_V = 0.025
TRIM_BLACK_V = 0.075
KEYS = ('P', 'N', 'F', 'uvT', 'uvA', 'part', 'W', 'eye')


def head_uv(P):
    x = np.clip((P[:, 0] - HEAD_PROJ['x0']) / HEAD_PROJ['size'], 0.002, 0.998)
    y = np.clip((P[:, 1] - HEAD_PROJ['y0']) / HEAD_PROJ['size'], 0.01, 0.998)
    return np.stack([HEAD_PROJ['u0'] + x * HEAD_PROJ['span'], HEAD_PROJ['v0'] + y * HEAD_PROJ['span']], 1)


def split_seam(F, tri_cat, values, n):
    """Duplicate vertices so each triangle samples the uv of its own category."""
    newF = F.copy()
    remap = list(range(n))
    uv = np.zeros((n, 2))
    first = np.full(n, -1)
    dup, extra = {}, []
    for t, (tri, c) in enumerate(zip(F, tri_cat)):
        for k, v in enumerate(tri):
            if first[v] < 0:
                first[v] = c
                uv[v] = values[c][v]
            elif first[v] != c:
                if (v, c) not in dup:
                    dup[(v, c)] = len(remap)
                    remap.append(v)
                    extra.append(values[c][v])
                newF[t, k] = dup[(v, c)]
    if extra:
        uv = np.concatenate([uv, np.array(extra)])
    return np.array(remap), newF, uv


def merge(parts):
    out = {k: [] for k in KEYS}
    off = 0
    for p in parts:
        for k in KEYS:
            out[k].append(p[k] + off if k == 'F' else p[k])
        off += len(p['P'])
    return {k: np.concatenate(v) for k, v in out.items()}


def part(P, N, F, uvT, uvA, kind, W, eye=None):
    return dict(P=P, N=N, F=F, uvT=uvT, uvA=uvA, part=np.full(len(P), kind) if np.isscalar(kind) else kind,
                W=W, eye=np.zeros(len(P)) if eye is None else eye)


def build(seed=5):
    B = C.load_body()
    V, W = B['V'], B['W']
    dv, df, duv, dp, info = C.build_dress(B)
    bsdf = geom.SurfaceSDF(V, B['body'])
    sv, sf, suv, sp = C.build_straps(B, bsdf)
    suv[:, 1] = TRIM_WHITE_V
    CV = np.concatenate([V, dv])
    CF = np.concatenate([B['body'], df + len(V)])
    guides, hcenter = C.hair_guides(B, CV, CF, seed=seed)
    capP, capF, capN = C.build_cap(B, 0.0055)
    # body faces hidden under the dress
    tops = C.neckline(np.arctan2(V[:, 0], V[:, 2]))
    armw = W[:, C.ARM_BONES].sum(1)
    covered = (V[:, 1] > C.HEM_Y + 0.035) & (V[:, 1] < tops - 0.014) & (armw < 0.3)
    bodyF = B['body'][~covered[B['body']].all(1)]
    eyeF = B['eyes']
    used = np.unique(np.concatenate([bodyF.ravel(), eyeF.ravel()]))
    remap = -np.ones(len(V), int)
    remap[used] = np.arange(len(used))
    bodyN = geom.vertex_normals(V, B['body'])
    eyeN = geom.vertex_normals(V, eyeF)
    is_eye = np.zeros(len(V), bool)
    is_eye[np.unique(eyeF)] = True
    bP = V[used]
    bN = np.where(is_eye[used, None], eyeN[used], bodyN[used])
    bF = remap[np.concatenate([bodyF, eyeF])]
    kind = np.where(is_eye[used], C.PART_EYE, C.PART_SKIN)
    Wb = W[used].copy()
    Wb[is_eye[used]] = 0
    Wb[is_eye[used], sk.INDEX['head']] = 1
    front = head_uv(bP)
    back = front.copy()
    back[:, 0] = np.clip(front[:, 0], 0, 0.44) + 0.50
    tri_back = (bP[bF][:, :, 2].mean(1) < 0.032) | (bP[bF][:, :, 1].mean(1) < 1.30)
    idx, bF2, uvA = split_seam(bF, tri_back.astype(int), {0: front, 1: back}, len(bP))
    parts = [part(bP[idx], bN[idx], bF2, np.tile([0.5, TRIM_WHITE_V], (len(idx), 1)), uvA,
                  kind[idx], Wb[idx], eye=is_eye[used][idx].astype(float))]
    bidx = np.unique(B['body'])
    tree = cKDTree(V[bidx])

    def nearest_weights(P, k=8):
        d, i = tree.query(P, k=k)
        w = 1 / np.maximum(d, 1e-4)
        w /= w.sum(1, keepdims=True)
        return (W[bidx[i]] * w[..., None]).sum(1)
    Wd = nearest_weights(dv)
    hip_y = C.joint(B, 'hips')[1]
    blend = np.clip((hip_y + 0.05 - dv[:, 1]) / 0.25, 0, 1)[:, None]
    hips = np.zeros_like(Wd)
    hips[:, sk.INDEX['hips']] = 1
    Wd = Wd * (1 - 0.55 * blend) + hips * 0.55 * blend
    Wd[:, C.ARM_BONES] = 0
    Wd /= Wd.sum(1, keepdims=True)
    parts.append(part(dv, geom.vertex_normals(dv, df), df, duv, np.tile(CLOTH_WHITE, (len(dv), 1)), C.PART_DRESS, Wd))
    Ws = nearest_weights(sv)
    Ws[:, C.ARM_BONES] = 0
    Ws /= Ws.sum(1, keepdims=True)
    parts.append(part(sv, geom.vertex_normals(sv, sf), sf, suv, np.tile(CLOTH_WHITE, (len(sv), 1)), C.PART_STRAP, Ws))
    Wc = np.zeros((len(capP), len(sk.NAMES)))
    Wc[:, sk.INDEX['head']] = 1
    capUV = np.stack([capP[:, 0] * 3, np.full(len(capP), TRIM_BLACK_V)], 1)
    parts.append(part(capP, capN, capF, capUV, np.tile(SKIN_WHITE, (len(capP), 1)), C.PART_HAIRCAP, Wc))
    M = merge(parts)
    M['heads'], M['tails'], M['parents'] = B['heads'], B['tails'], sk.PARENTS
    M['ao'] = np.zeros(len(M['P']))
    return M, dict(guides=guides, center=hcenter)


def hair_mesh(draped):
    hv, hn, huv, hf, hs = [], [], [], [], []
    o = 0
    for pts, g, n_scalp, cen in draped:
        v0 = 0.10 + 0.20 * g['band'] / TX.HAIR_BANDS
        scale = np.linalg.norm(pts[1] - pts[0]) / max(np.linalg.norm(g['scalp'][1] - g['scalp'][0]), 1e-9) if len(g['scalp']) > 1 else 1
        v, n, uv, f = C.hair_ribbon(pts, cen, g['w0'] * scale, g['w1'] * scale, (v0, v0 + 0.20 / TX.HAIR_BANDS),
                                    axis_y=cen[1] - 0.09 * scale)
        seg = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))])
        below = np.clip(seg - seg[n_scalp - 1], 0, None)
        hv.append(v); hn.append(n); huv.append(uv); hf.append(f + o); o += len(v)
        hs.append(np.repeat(below, 2))
    return tuple(map(np.concatenate, (hv, hn, huv, hf, hs)))


def posed(M, H, ps, hair_rigid=0.05, hair_blend=0.12):
    """Skin the master with pose `ps`, drape the hair, and return render data
    with master-skeleton weights (hair: head-rigid, easing onto the body)."""
    P, N = ps.skin(M['P'], M['N'])
    Rw, Hw = ps.world()
    hi = sk.INDEX['head']
    body = (M['part'] == C.PART_SKIN) | (M['part'] == C.PART_DRESS)
    keepF = body[M['F']].all(1)
    draped = C.drape_hair(H['guides'], H['center'], Rw[hi], M['heads'][hi], Hw[hi],
                          P, M['F'][keepF], P[M['part'] == C.PART_SKIN], scale=ps.scale)
    hv, hn, huv, hf, hs = hair_mesh(draped)
    # hair weights: master weights of the nearest posed body/dress vertices
    src = np.where(body & (M['W'][:, C.ARM_BONES].sum(1) < 0.2))[0]
    tree = cKDTree(P[src])
    d, i = tree.query(hv, k=8)
    w = 1 / np.maximum(d, 1e-4)
    w /= w.sum(1, keepdims=True)
    Wn = (M['W'][src[i]] * w[..., None]).sum(1)
    Wn[:, C.ARM_BONES] = 0
    Wn /= np.maximum(Wn.sum(1, keepdims=True), 1e-9)
    t = np.clip((hs / ps.scale - hair_rigid) / hair_blend, 0, 1)[:, None]
    Wh = np.zeros_like(Wn)
    Wh[:, hi] = 1
    Wh = Wh * (1 - t) + Wn * t
    out = dict(M)
    out['P'], out['N'] = P, N
    hair = part(hv, hn, hf, huv, np.tile(SKIN_WHITE, (len(hv), 1)), C.PART_HAIR, Wh)
    merged = merge([{k: out[k] for k in KEYS}, hair])
    merged['ao'] = np.concatenate([M['ao'], np.zeros(len(hv))])
    merged['hair_s'] = np.concatenate([np.zeros(len(P)), hs])
    return merged


def save(path, M, H):
    np.savez_compressed(path, **M)
    with open(path.replace('.npz', '_hair.pkl'), 'wb') as f:
        pickle.dump(H, f)


def load(path):
    M = dict(np.load(path))
    with open(path.replace('.npz', '_hair.pkl'), 'rb') as f:
        H = pickle.load(f)
    return M, H


if __name__ == '__main__':
    import sys
    M, H = build()
    save(sys.argv[1], M, H)
    print({k: v.shape for k, v in M.items()}, len(H['guides']), 'hair guides')
