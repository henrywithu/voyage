"""Write Chaewon's meshes and animations in the runtime `.mesh` container."""
import os

import numpy as np

import master as M
import meshio


def normals(P, F):
    return M.vertex_normals(P, F)


def write_static(path, P_bl, F, uv, uv2, extra=None, scale=M.SCALE, N_bl=None):
    """Posed (baked) mesh for the static character shaders: position, normal, uv, uv2 + extras."""
    P = M.to_three(P_bl, scale)
    N = normals(P, F) if N_bl is None else np.asarray(N_bl) @ M.B2T.T
    arrays = {'position': P, 'normal': N, 'uv': uv, 'uv2': uv2}
    for k, v in (extra or {}).items():
        arrays[k] = v
    os.makedirs(os.path.dirname(path), exist_ok=True)
    meshio.write(path, arrays, F.astype(np.uint32))
    return P


def bones_header(rest_world_bl, names, parents, keep=M.KEEP, scale=M.SCALE, rename=None, roll=None):
    """Header bones (kept subset) and their three-space rest world matrices."""
    idx = {n: i for i, n in enumerate(names)}
    kept = [idx[n] for n in keep]
    kparent = []
    for i in kept:
        p = parents[i]
        while p >= 0 and names[p] not in keep:
            p = parents[p]
        kparent.append(keep.index(names[p]) if p >= 0 else -1)
    roll = roll or {}
    world = [M.mat_to_three(rest_world_bl[i], scale, roll.get(names[i], 0.0)) for i in kept]
    locs = M.local_transforms(world, kparent)
    rename = rename or {}
    bones = [{'name': rename.get(keep[k], keep[k]), 'parent': int(kparent[k]), 'pos': [round(float(x), 6) for x in locs[k][0]],
              'rot': [round(float(x), 7) for x in locs[k][1]], 'scl': [1, 1, 1]} for k in range(len(keep))]
    return bones, kparent, world


def write_skinned(path, P_bl, F, uv, uv2, Wfull, names, parents, rest_world_bl, color=None, extra=None,
                  keep=M.KEEP, scale=M.SCALE, N_bl=None, rename=None, roll=None):
    Wk, kept = M.fold_weights(Wfull, names, parents, keep)
    si, sw = M.top4(Wk)
    bones, kparent, world = bones_header(rest_world_bl, names, parents, keep, scale, rename, roll)
    P = M.to_three(P_bl, scale)
    N = normals(P, F) if N_bl is None else np.asarray(N_bl) @ M.B2T.T
    arrays = {'position': P, 'normal': N, 'uv': uv, 'uv2': uv2, 'skinIndex': si, 'skinWeight': sw}
    if color is not None:
        arrays['color'] = color
    for k, v in (extra or {}).items():
        arrays[k] = v
    os.makedirs(os.path.dirname(path), exist_ok=True)
    meshio.write(path, arrays, F.astype(np.uint32), bones=bones)
    return bones, kparent


def write_animation(path, frames_world_bl, names, parents, keep=M.KEEP, scale=M.SCALE, roll=None):
    """frames_world_bl: list of {bone name: 4x4 Blender world matrix} per frame (20 fps)."""
    _, kparent, _ = bones_header(frames_world_bl[0]['__rest__'], names, parents, keep, scale) \
        if '__rest__' in frames_world_bl[0] else (None, None, None)
    if kparent is None:
        idx = {n: i for i, n in enumerate(names)}
        kparent = []
        for n in keep:
            p = parents[idx[n]]
            while p >= 0 and names[p] not in keep:
                p = parents[p]
            kparent.append(keep.index(names[p]) if p >= 0 else -1)
    arrays = {}
    for f, mats in enumerate(frames_world_bl):
        world = [M.mat_to_three(mats[n], scale, (roll or {}).get(n, 0.0)) for n in keep]
        locs = M.local_transforms(world, kparent)
        arrays[f'offset_{f}'] = np.array([l[0] for l in locs], np.float32)
        arrays[f'orientation_{f}'] = np.array([l[1] for l in locs], np.float32)
        arrays[f'scale_{f}'] = np.ones((len(keep), 3), np.float32)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    meshio.write(path, arrays, None, extra={'frameCount': len(frames_world_bl), 'duration': len(frames_world_bl) - 1})
