"""Evaluate saint rig animations (same rules as src/engine/SkeletalMesh.ts)."""
import numpy as np
import meshio


def frame_matrices(bones, anim_arrays, frame):
    n = len(bones)
    local = []
    i = int(np.floor(frame))
    count = 0
    while f'orientation_{count}' in anim_arrays:
        count += 1
    i0 = i % count
    i1 = (i0 + 1) % count
    t = frame - i
    for b_i, b in enumerate(bones):
        pos = np.array(b['pos'], float)
        rot = np.array(b['rot'], float)
        scl = np.array(b['scl'], float)
        if not (b['name'].startswith('sleeve_wiggle') or b['name'].startswith('hand_bone_parent')):
            o0 = anim_arrays.get(f'offset_{i0}')
            o1 = anim_arrays.get(f'offset_{i1}')
            if o0 is not None:
                pos = o0[b_i] * (1 - t) + o1[b_i] * t
            s0 = anim_arrays.get(f'scale_{i0}')
            s1 = anim_arrays.get(f'scale_{i1}')
            if s0 is not None:
                scl = s0[b_i] * (1 - t) + s1[b_i] * t
            q0 = anim_arrays[f'orientation_{i0}'][b_i]
            q1 = anim_arrays[f'orientation_{i1}'][b_i]
            q0 = q0 / np.linalg.norm(q0)
            q1 = q1 / np.linalg.norm(q1)
            if np.dot(q0, q1) < 0:
                q1 = -q1
            q = q0 * (1 - t) + q1 * t
            rot = q / np.linalg.norm(q)
        local.append(meshio.compose(pos, rot, scl))
    return meshio.world_matrices(bones, local)


def skin(P, si, sw, bones, anim_arrays, frame):
    bind = meshio.world_matrices(bones)
    cur = frame_matrices(bones, anim_arrays, frame)
    mats = np.array([c @ np.linalg.inv(b) for c, b in zip(cur, bind)])
    out = np.zeros_like(P)
    Ph = np.concatenate([P, np.ones((len(P), 1))], 1)
    for k in range(4):
        m = mats[si[:, k].astype(int)]
        out += sw[:, k:k + 1] * np.einsum('nij,nj->ni', m, Ph)[:, :3]
    return out
