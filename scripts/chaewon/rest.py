"""Extract Chaewon's rigged rest pose (Blender space) to an npz for the numpy builders.

Run: python3 rest.py out.npz
Contents: P (V,3) body verts, F (T,3) triangles, UV (V,2) MakeHuman uvs,
W (V,B) weights, bones (names, parents, heads, tails, matrices), eyes.
"""
import sys

import bpy
import numpy as np

import bview
import rig


def mesh_arrays(ob):
    me = ob.data
    P = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', P)
    P = P.reshape(-1, 3)
    me.calc_loop_triangles()
    T = np.empty(len(me.loop_triangles) * 3, np.int32)
    me.loop_triangles.foreach_get('vertices', T)
    T = T.reshape(-1, 3)
    # Per-vertex uv (first loop wins; MakeHuman uv seams are rare on the body).
    UV = np.zeros((len(P), 2), np.float32)
    if me.uv_layers:
        lv = np.empty(len(me.loops), np.int32)
        me.loops.foreach_get('vertex_index', lv)
        luv = np.empty(len(me.loops) * 2, np.float32)
        me.uv_layers[0].data.foreach_get('uv', luv)
        UV[lv] = luv.reshape(-1, 2)
    return P, T, UV


def weights(ob, names):
    W = np.zeros((len(ob.data.vertices), len(names)), np.float32)
    gi = {g.index: names.index(g.name) for g in ob.vertex_groups if g.name in names}
    for v in ob.data.vertices:
        for g in v.groups:
            if g.group in gi:
                W[v.index, gi[g.group]] = g.weight
    s = W.sum(1, keepdims=True)
    return np.where(s > 0, W / np.maximum(s, 1e-9), 0)


def _band(x, a, b, soft):
    return np.clip((x - a) / soft, 0, 1) * np.clip((b - x) / soft, 0, 1)


def flatten_ears(P, W, names, heads, side=0.062, keep=0.35):
    """Lay her ears flat against her head: whatever stands out past the side of her skull at ear height is
    drawn in to `keep` of its height. Her hair always covers them, and an ear that stands out pokes through
    the hair lying over it (its ink then drawn on her hair)."""
    h = heads[names.index('head')]
    hw = W[:, names.index('head')]
    w = (_band(P[:, 2], h[2] - 0.0225, h[2] + 0.0725, 0.01) * _band(P[:, 1], h[1] - 0.034, h[1] + 0.041, 0.008)
         * np.clip((hw - 0.4) / 0.2, 0, 1))
    ax = np.abs(P[:, 0])
    out = np.maximum(ax - side, 0)
    P = P.copy()
    P[:, 0] = np.sign(P[:, 0]) * (ax - out * (1 - keep) * w)
    return P


def main(out, subdiv=1):
    bview.reset()
    arm, body, eyes, info = rig.build(subdiv=subdiv)
    names = [b.name for b in arm.data.bones]
    P, T, UV = mesh_arrays(body)
    W = weights(body, names)
    EP, ET, EUV = mesh_arrays(eyes)
    heads = np.array([list(b.head_local) for b in arm.data.bones])
    tails = np.array([list(b.tail_local) for b in arm.data.bones])
    mats = np.array([np.array(b.matrix_local) for b in arm.data.bones])
    parents = np.array([names.index(b.parent.name) if b.parent else -1 for b in arm.data.bones])
    P = flatten_ears(P, W, names, heads)
    # The eye openings drawn in to the painted almonds (lids.py; renders the face map, so last).
    import lids
    P = lids.fit(dict(P=P, T=T, W=W, EP=EP, ET=ET, names=np.array(names), heads=heads))
    np.savez_compressed(out, P=P, T=T, UV=UV, W=W, EP=EP, ET=ET, EUV=EUV, names=np.array(names),
                        parents=parents, heads=heads, tails=tails, mats=mats, height=info['height'])
    print('rest', P.shape, T.shape, len(names))


if __name__ == '__main__':
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 1)
