"""Assemble Chaewon (body, eyes, dress, straps, hair) and export her to the runtime `.mesh` format.

All assembly happens in Blender space (Z up, facing -Y, metres) in the rest
pose. Export converts to the runtime's three.js space (Y up, facing +Z) and
scales her to the stature the scene layouts expect.

Per-vertex attributes written for the shaders:
  uv        trim texture (lace, hem, neckline, hair strands, plain white / black rows)
  uv2       line-art atlas (face projection; v > 0.55 = skin, otherwise cloth)
  color     r unused, g eye mask, b ambient occlusion (inverted in the shader)
  windmask  how much a vertex sways in the wind shaders (hair tips, skirt hem)
"""
import math

import numpy as np
from scipy.spatial import cKDTree

import atlas
import dress as dress_mod

SCALE = 1.15  # 1.69 m -> about 1.94 runtime units, the saint's stature
TRIM_WHITE = (0.5, 0.025)
TRIM_BLACK = (0.5, 0.075)
HAIR_V = (0.10, 0.30)
HAIR_BANDS = 8
PART = dict(skin=0, eye=1, dress=2, strap=3, hair=4, cap=5)

# Reduced skeleton for skinned exports: everything else folds into its nearest kept ancestor.
KEEP = ['root', 'spine05', 'spine04', 'spine03', 'spine02', 'spine01', 'neck01', 'neck02', 'neck03', 'head']
for s in ('L', 'R'):
    KEEP += [f'clavicle.{s}', f'shoulder01.{s}', f'upperarm01.{s}', f'upperarm02.{s}', f'lowerarm01.{s}',
             f'lowerarm02.{s}', f'wrist.{s}'] + [f'metacarpal{i}.{s}' for i in range(1, 5)]
    KEEP += [f'finger{f}-{k}.{s}' for f in range(1, 6) for k in range(1, 4)]
    KEEP += [f'pelvis.{s}', f'upperleg01.{s}', f'upperleg02.{s}', f'lowerleg01.{s}', f'lowerleg02.{s}', f'foot.{s}']


def vertex_normals(P, F):
    return dress_mod.vertex_normals(P, F)


def fold_weights(W, names, parents, keep=KEEP):
    """Move weights of dropped bones onto their nearest kept ancestor; returns (Wk, kept indices)."""
    idx = {n: i for i, n in enumerate(names)}
    kept = [idx[n] for n in keep]
    owner = {}
    for i, n in enumerate(names):
        j = i
        while names[j] not in keep:
            j = parents[j]
        owner[i] = kept.index(j)
    Wk = np.zeros((W.shape[0], len(kept)), np.float32)
    for i in range(len(names)):
        Wk[:, owner[i]] += W[:, i]
    return Wk, kept


def nearest_weights(Q, P, W, k=8, mask=None):
    """Inverse-distance blend of the weights of the k nearest body vertices."""
    src = np.arange(len(P)) if mask is None else np.flatnonzero(mask)
    tree = cKDTree(P[src])
    d, i = tree.query(Q, k=k)
    w = 1 / np.maximum(d, 1e-4) ** 2
    w /= w.sum(1, keepdims=True)
    return (W[src][i] * w[..., None]).sum(1)


def smooth_on_mesh(X, F, iters=10, lam=0.5):
    E = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    E = np.vstack([E, E[:, ::-1]])
    deg = np.bincount(E[:, 0], minlength=len(X)).astype(float)[:, None]
    for _ in range(iters):
        acc = np.zeros_like(X)
        np.add.at(acc, E[:, 0], X[E[:, 1]])
        X = X * (1 - lam) + lam * acc / np.maximum(deg, 1)
    return X


class Part:
    def __init__(self, P, F, uv, uv2, W, kind, color=None, wind=None, soft=None):
        n = len(P)
        self.soft = np.zeros(n) if soft is None else soft
        self.src = None  # for split meshes: index into the original topology
        self.P, self.F, self.uv, self.uv2, self.W = np.asarray(P, float), np.asarray(F, int), uv, uv2, W
        self.kind = np.full(n, PART[kind])
        self.color = np.c_[np.zeros(n), np.zeros(n), np.zeros(n)] if color is None else color
        self.wind = np.zeros(n) if wind is None else wind


def body_part(rest, win):
    P, T = rest['P'], rest['T']
    names = list(rest['names'])
    W = rest['W']
    face_bones = [i for i, n in enumerate(names) if n in ('head', 'jaw') or n.startswith(
        ('oris', 'oculi', 'orbicularis', 'levator', 'risorius', 'special', 'temporalis', 'eye'))]
    headw = W[:, face_bones].sum(1)
    fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
    fn /= np.linalg.norm(fn, axis=1, keepdims=True)
    front = (fn[:, 1] < -0.2) & (headw[T].min(1) > 0.5)
    # Split vertices on the boundary between projected-face and plain-skin triangles.
    key = {}
    newP, newW, uv2, src = [], [], [], []
    Fn = np.zeros_like(T)
    fuv = atlas.face_uv(P, win)
    for t in range(len(T)):
        cat = int(front[t])
        for k in range(3):
            v = T[t, k]
            kk = (v, cat)
            if kk not in key:
                key[kk] = len(src)
                src.append(v)
                uv2.append(fuv[v] if cat else atlas.SKIN_WHITE)
            Fn[t, k] = key[kk]
    src = np.array(src)
    uv = np.tile(TRIM_WHITE, (len(src), 1))
    # Face softness: front-facing head skin keeps its light (normals bent toward the face direction).
    N = vertex_normals(P, T)
    front_v = np.clip((-N[:, 1] + 0.35) / 0.5, 0, 1)  # all but the back of the head
    neck = W[:, [names.index(n) for n in ('neck01', 'neck02', 'neck03')]].sum(1)
    soft = (np.clip((headw + 0.6 * neck - 0.3) / 0.6, 0, 1) * front_v)[src] * 0.9
    part = Part(P[src], Fn, uv, np.array(uv2), W[src], 'skin', soft=soft)
    part.src = src
    return part, src


def eyes_part(rest, win):
    EP, ET = rest['EP'], rest['ET']
    names = list(rest['names'])
    W = np.zeros((len(EP), len(names)), np.float32)
    W[:, names.index('head')] = 1
    col = np.c_[np.zeros(len(EP)), np.ones(len(EP)), np.zeros(len(EP))]
    return Part(EP, ET, np.tile(TRIM_WHITE, (len(EP), 1)), atlas.face_uv(EP, win), W, 'eye', color=col,
                soft=np.full(len(EP), 0.85))


def dress_parts(rest, sim):
    """Dress and straps with weights from the body (skirt follows the hips more than the thighs)."""
    P, W = rest['P'], rest['W']
    names = list(rest['names'])
    lab = dress_mod.labels(names, W)
    V, F, uv, part = sim['V'], sim['F'], sim['UV'], sim['part']
    # Torso + legs only (never the arms).
    Wd = nearest_weights(V, P, W, k=10, mask=lab != 1)
    skirt = part == dress_mod.PART_SKIRT
    root = names.index('root')
    hip_z = np.percentile(V[skirt, 2], 85)
    hem_z = V[skirt, 2].min()
    below = np.clip((hip_z - V[:, 2]) / max(hip_z - hem_z, 1e-6), 0, 1) * skirt
    # Keep 45 percent of the leg pull at the hem; the rest goes to the pelvis.
    Wroot = np.zeros_like(Wd)
    Wroot[:, root] = 1
    a = (below * 0.55)[:, None]
    Wd = Wd * (1 - a) + Wroot * a
    Wd = smooth_on_mesh(Wd, F, iters=8)
    Wd /= Wd.sum(1, keepdims=True)
    wind = below ** 1.5
    dress = Part(V, F, uv, np.tile(atlas.CLOTH_WHITE, (len(V), 1)), Wd.astype(np.float32), 'dress', wind=wind)
    sv, sf, suv = sim['sv'], sim['sf'], sim['suv']
    suv = np.tile(TRIM_WHITE, (len(sv), 1))
    Ws = nearest_weights(sv, P, W, k=8, mask=lab != 1)
    straps = Part(sv, sf, suv, np.tile(atlas.CLOTH_WHITE, (len(sv), 1)), Ws.astype(np.float32), 'strap')
    return dress, straps


def hair_parts(rest, H, P_body_for_cap, names, head_xf=None, cap=True):
    """Hair ribbons (+ scalp cap) for a styled hair result H. Weights: head at the scalp, easing onto the
    upper chest toward the tips so long hair follows the body in animation."""
    import hair as hair_mod
    hv, hf_, huv, hg, ht = hair_mod.ribbons(H)
    S = H['X'].shape[0]
    N = H['X'].shape[1]
    band = np.repeat(np.arange(S) % HAIR_BANDS, N * 2)
    across = huv[:, 1]
    u = np.repeat(hair_mod.strand_u(H).reshape(-1), 2)
    uv = np.c_[u * 0.999, HAIR_V[0] + (band + 0.02 + 0.96 * across) * (HAIR_V[1] - HAIR_V[0]) / HAIR_BANDS]
    W = np.zeros((len(hv), len(names)), np.float32)
    hb, nb, cb = names.index('head'), names.index('neck02'), names.index('spine01')
    pinned = np.repeat(H['pinned'], 2, axis=1).reshape(-1)
    t = ht
    # Fraction of each strand that hangs free.
    free = np.clip((t - 0.25) / 0.75, 0, 1) * (~pinned)
    long = np.repeat(H['lengths'] > 0.3, N * 2)
    W[:, hb] = 1 - free * np.where(long, 0.75, 0.2)
    W[:, nb] = free * np.where(long, 0.25, 0.2)
    W[:, cb] = free * np.where(long, 0.5, 0.0)
    wind = (t ** 1.3) * (~pinned)
    parts = [Part(hv, hf_, uv, np.tile(atlas.SKIN_WHITE, (len(hv), 1)), W, 'hair', wind=wind)]
    if cap:
        cp, ct = hair_mod.scalp_cap(dict(rest, P=P_body_for_cap), H['hf'])
        Wc = np.zeros((len(cp), len(names)), np.float32)
        Wc[:, hb] = 1
        parts.append(Part(cp, ct, np.tile(TRIM_BLACK, (len(cp), 1)), np.tile(atlas.SKIN_WHITE, (len(cp), 1)), Wc, 'cap'))
    return parts


def part_normals(p, topo=None):
    """Normals of a part; split meshes use their original topology (topo = (P_full, T_full))."""
    if p.src is not None and topo is not None:
        return vertex_normals(topo[0], topo[1])[p.src]
    return vertex_normals(p.P, p.F)


def merge(parts, topo=None, forward=(0, -1, 0)):
    P, F, uv, uv2, W, kind, col, wind, N = [], [], [], [], [], [], [], [], []
    off = 0
    fwd = np.asarray(forward, float)
    for p in parts:
        n = part_normals(p, topo)
        n = n * (1 - p.soft[:, None]) + fwd[None] * p.soft[:, None]
        N.append(n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9))
        P.append(p.P)
        F.append(p.F + off)
        uv.append(p.uv)
        uv2.append(p.uv2)
        W.append(p.W)
        kind.append(p.kind)
        col.append(p.color)
        wind.append(p.wind)
        off += len(p.P)
    return dict(P=np.vstack(P), F=np.vstack(F), uv=np.vstack(uv), uv2=np.vstack(uv2), W=np.vstack(W),
                kind=np.concatenate(kind), color=np.vstack(col), wind=np.concatenate(wind), N=np.vstack(N))


# ------------------------------------------------------------------ skinning and conversion

def skin(P, W, mats_pose, mats_rest):
    """Linear blend skinning (Blender space): mats are (B, 4, 4) world matrices per bone."""
    M = np.einsum('bij,bjk->bik', mats_pose, np.linalg.inv(mats_rest))
    out = np.zeros_like(P)
    Ph = np.c_[P, np.ones(len(P))]
    nz = np.flatnonzero(W.max(0) > 0)
    for b in nz:
        w = W[:, b]
        sel = w > 0
        out[sel] += (Ph[sel] @ M[b].T)[:, :3] * w[sel, None]
    return out


B2T = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], float)  # Blender (x, y, z) -> three (x, z, -y)


def to_three(P, scale=SCALE):
    return (np.asarray(P) @ B2T.T) * scale


def mat_to_three(M, scale=SCALE, roll=0.0):
    """Blender 4x4 bone world matrix -> three.js space. The bone keeps its own axes (Y along the bone, as in
    Spirit's rigs), expressed in three's world: scene code that turns bones about local axes (the hand
    scene's twist, curl and wrist spring) then behaves as it did on Spirit's arm. `roll` (radians) turns
    the bone's frame about its own Y, to match the roll of the Spirit bone a scene was written for."""
    c, s_ = math.cos(roll), math.sin(roll)
    R = B2T @ M[:3, :3] @ np.array([[c, 0, s_], [0, 1, 0], [-s_, 0, c]])
    t = B2T @ M[:3, 3] * scale
    out = np.eye(4)
    out[:3, :3] = R
    out[:3, 3] = t
    return out


def quat(R):
    """Rotation matrix -> quaternion (x, y, z, w)."""
    m = R
    t = np.trace(m)
    if t > 0:
        s = 0.5 / np.sqrt(t + 1)
        w, x, y, z = 0.25 / s, (m[2, 1] - m[1, 2]) * s, (m[0, 2] - m[2, 0]) * s, (m[1, 0] - m[0, 1]) * s
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = 2 * np.sqrt(1 + m[0, 0] - m[1, 1] - m[2, 2])
        w, x, y, z = (m[2, 1] - m[1, 2]) / s, 0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s
    elif m[1, 1] > m[2, 2]:
        s = 2 * np.sqrt(1 + m[1, 1] - m[0, 0] - m[2, 2])
        w, x, y, z = (m[0, 2] - m[2, 0]) / s, (m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s
    else:
        s = 2 * np.sqrt(1 + m[2, 2] - m[0, 0] - m[1, 1])
        w, x, y, z = (m[1, 0] - m[0, 1]) / s, (m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s
    q = np.array([x, y, z, w])
    return q / np.linalg.norm(q)


def local_transforms(world, parents):
    """Per-bone local (pos, quat) from world 4x4 matrices (three space)."""
    out = []
    for i, M in enumerate(world):
        L = M if parents[i] < 0 else np.linalg.inv(world[parents[i]]) @ M
        U, _, Vt = np.linalg.svd(L[:3, :3])
        R = U @ Vt
        out.append((L[:3, 3].copy(), quat(R)))
    return out


def top4(W):
    idx = np.argsort(-W, axis=1)[:, :4]
    w = np.take_along_axis(W, idx, 1)
    w /= np.maximum(w.sum(1, keepdims=True), 1e-9)
    return idx.astype(np.float32), w.astype(np.float32)
