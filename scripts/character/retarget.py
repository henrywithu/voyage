"""Fit Chaewon to a saint rig's bind pose and remap her skin weights.

A rig config describes, in terms of the saint rig's bone indices:
  * `pose(ps, J, R, saint)` -> poses the master skeleton into the bind pose
  * `bones`: dict master-bone -> rig bone index, or ('blend', a, b) to split
    a master bone's influence between rig bones a and b along the segment.
  * optional `cloth`: transfer weights for the skirt from the saint's robe.
"""
import numpy as np
from scipy.spatial import cKDTree
import meshio
import pose as posing
import skeleton as sk
import chaewon as C
import export


class Rig:
    def __init__(self, path):
        self.path = path
        self.header, self.a, self.index = meshio.read(path)
        self.bones = self.header.get('bones') or []
        self.Wm = meshio.world_matrices(self.bones) if self.bones else []
        self.J = np.array([m[:3, 3] for m in self.Wm]) if self.bones else np.zeros((0, 3))
        self.R = [m[:3, :3] / np.linalg.norm(m[:3, :3], axis=0) for m in self.Wm]
        self.P = self.a['position']
        self.skin = self.a['uv2'][:, 1] > 0.55 if 'uv2' in self.a else np.zeros(len(self.P), bool)

    def verts_of(self, bone, thresh=0.5, skin=None):
        si = self.a['skinIndex'].astype(int)
        w = self.a['skinWeight']
        m = ((si == bone) & (w > thresh)).any(1)
        if skin is not None:
            m &= self.skin == skin
        return np.where(m)[0]


def segment_t(P, a, b):
    d = b - a
    return np.clip(((P - a) @ d) / max(d @ d, 1e-12), 0, 1)


def map_weights(M, P, mapping, J, n_rig):
    """Convert master weights (N,54) into rig weights (N,n_rig)."""
    Wm = M['W']
    out = np.zeros((len(P), n_rig))
    for name, target in mapping.items():
        i = sk.INDEX[name]
        w = Wm[:, i]
        m = w > 1e-5
        if not m.any():
            continue
        if isinstance(target, tuple) and target[0] == 'blend':
            _, a, b = target[:3]
            ease = target[3] if len(target) > 3 else (0.0, 1.0)
            t = segment_t(P[m], J[a], J[b])
            t = np.clip((t - ease[0]) / max(ease[1] - ease[0], 1e-6), 0, 1)
            t = t * t * (3 - 2 * t)
            out[m, a] += w[m] * (1 - t)
            out[m, b] += w[m] * t
        else:
            out[m, target] += w[m]
    return out


def transfer(Ppos, src_P, src_si, src_w, n_rig, k=6, mask=None):
    """Nearest-neighbour skin weight transfer from the saint mesh."""
    idx = np.where(mask)[0] if mask is not None else np.arange(len(src_P))
    tree = cKDTree(src_P[idx])
    d, i = tree.query(Ppos, k=k)
    wts = 1 / np.maximum(d, 1e-4)
    wts /= wts.sum(1, keepdims=True)
    out = np.zeros((len(Ppos), n_rig))
    for j in range(k):
        src = idx[i[:, j]]
        for c in range(4):
            np.add.at(out, (np.arange(len(Ppos)), src_si[src, c]), src_w[src, c] * wts[:, j])
    return out


def normalise(W):
    s = W.sum(1, keepdims=True)
    return W / np.maximum(s, 1e-9)


def color_attr(M):
    """SkinShader colour: g = eye mask (no hatching), b = occlusion."""
    c = np.zeros((len(M['P']), 3), np.float32)
    c[:, 1] = M['eye']
    c[:, 2] = M['ao']
    return c


def wind_attr(M, P, top, low):
    w = np.zeros(len(P))
    part = M['part']
    hair = part == C.PART_HAIR
    w[hair] = np.clip((top - P[hair, 1]) / (top - low), 0, 1) ** 2
    return w
