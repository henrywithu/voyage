"""Skinned saint rigs re-fitted to Chaewon (hand, pour, drink, feet, float)."""
import os
import sys
import numpy as np
import master
import pose as posing
import retarget as RT
import skeleton as sk
import chaewon as C
import export
import geom

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '../../reference/saint/')
OUT = os.path.join(HERE, '../../public/assets/decoded/story/')
FINGERS = {2: 'index', 3: 'middle', 4: 'ring', 5: 'pinky', 1: 'thumb'}


def tip(J, a, b, k=0.9):
    return J[b] + (J[b] - J[a]) * k


def finger_heads(rig_idx, side, J):
    """rig_idx: dict finger number -> (seg1, seg2, seg3) rig bone indices."""
    heads, ends = {}, {}
    for f, (a, b, c) in rig_idx.items():
        heads[f'finger{f}-1.{side}'] = J[a]
        heads[f'finger{f}-2.{side}'] = J[b]
        heads[f'finger{f}-3.{side}'] = J[c]
        ends[f'finger{f}-3.{side}'] = tip(J, b, c)
    return heads, ends


def arm_mapping(side, rig_idx, upper, lower, hand, shoulder):
    m = {f'clavicle.{side}': shoulder, f'upperarm.{side}': upper, f'forearm.{side}': lower, f'hand.{side}': hand}
    for f, bones in rig_idx.items():
        for seg, b in zip((1, 2, 3), bones):
            m[f'finger{f}-{seg}.{side}'] = b
    return m


def crop_mesh(X, keep_v):
    keepF = X['F'][keep_v[X['F']].all(1)]
    used = np.unique(keepF)
    remap = -np.ones(len(X['P']), int)
    remap[used] = np.arange(len(used))
    return used, remap[keepF]


def arm_rig(M, H, name, side, rig_fingers, upper, lower, hand, shoulder, scale, shader='hand', palm_hint=None):
    rig = RT.Rig(SRC + name + '.bin.mesh')
    J = rig.J
    ps = posing.Pose(M)
    ps.scale = scale
    sg = 1 if side == 'L' else -1
    # orient the body so the arm reaches forward, then translate the clavicle onto the rig shoulder
    heads = {f'upperarm.{side}': J[upper], f'forearm.{side}': J[lower], f'hand.{side}': J[hand]}
    fh, fe = finger_heads(rig_fingers, side, J)
    heads.update(fh)
    ps.aim(f'clavicle.{side}', J[upper] - ps.joint(f'clavicle.{side}'))
    off = J[upper] - ps.joint(f'upperarm.{side}')
    ps.root_pos = ps.root_pos + off
    posing.fit_joints(ps, J, heads, ends=fe)
    X = master.posed(M, H, ps)
    arm_bones = [sk.INDEX[n] for n in sk.NAMES if n.endswith('.' + side) and
                 (n.startswith(('upperarm', 'forearm', 'hand', 'finger')))]
    armw = X['W'][:, arm_bones].sum(1)
    keep_v = (armw > 0.35) & ((X['part'] == C.PART_SKIN))
    used, F = crop_mesh(X, keep_v)
    n_rig = len(rig.bones)
    mapping = arm_mapping(side, rig_fingers, upper, lower, hand, shoulder)
    sub = {k: (v[used] if isinstance(v, np.ndarray) and len(v) == len(X['P']) else v) for k, v in X.items()}
    W = RT.map_weights(sub, sub['P'], mapping, J, n_rig)
    rest_w = 1 - W.sum(1)
    W[:, shoulder] += np.clip(rest_w, 0, None)
    W = RT.normalise(W)
    si, sw = export.top4(W)
    P, N = sub['P'], sub['N']
    if shader == 'hand':
        uv2 = np.tile([-0.6, 0.0], (len(P), 1))
        attrs = dict(skinIndex=si, skinWeight=sw, uv=sub['uvT'], uv2=uv2, windmask=np.zeros((len(P), 1)))
    else:
        attrs = dict(skinIndex=si, skinWeight=sw, uv=sub['uvT'], uv2=sub['uvA'],
                     color=RT.color_attr(sub))
    export.write(OUT + name + '.bin.mesh', P, N, F, attrs, bones=rig.bones)
    print(name, 'verts', len(P), 'scale', scale)
    return rig, X, ps


def hand_scene(M, H):
    fingers = {2: (4, 5, 6), 3: (7, 8, 9), 4: (13, 14, 15), 5: (10, 11, 12), 1: (22, 23, 24)}
    return arm_rig(M, H, 'hand/arm-skin', 'R', fingers, upper=1, lower=0, hand=2, shoulder=16, scale=1.3)


def pour_arm(M, H):
    rig = RT.Rig(SRC + 'drinkpour/saint-pour-arm.bin.mesh')
    J = rig.J
    # identify finger chains by their parent links from the hand bone (5)
    kids = [i for i, b in enumerate(rig.bones) if b['parent'] == 5]
    chains = []
    for k in kids:
        c = [k]
        while True:
            nxt = [i for i, b in enumerate(rig.bones) if b['parent'] == c[-1]]
            if not nxt:
                break
            c.append(nxt[0])
        if len(c) == 3:
            chains.append(c)
    # thumb: chain starting closest to the wrist; others ordered by lateral position
    wrist = J[5]
    chains.sort(key=lambda c: np.linalg.norm(J[c[0]] - wrist))
    thumb = chains[0]
    rest = chains[1:]
    # order index..pinky by distance from the thumb base
    rest.sort(key=lambda c: np.linalg.norm(J[c[0]] - J[thumb[0]]))
    fingers = {1: tuple(thumb), 2: tuple(rest[0]), 3: tuple(rest[1]), 4: tuple(rest[2]), 5: tuple(rest[3])}
    print('pour finger chains', fingers)
    return arm_rig(M, H, 'drinkpour/saint-pour-arm', 'L', fingers, upper=3, lower=2, hand=5, shoulder=18,
                   scale=1.3, shader='skin')


if __name__ == '__main__':
    M, H = master.load(os.path.join(HERE, 'build/chaewon_master.npz'))
    which = sys.argv[1:]
    if 'hand' in which:
        hand_scene(M, H)
    if 'pour' in which:
        pour_arm(M, H)


def lerp(a, b, t):
    return a + (b - a) * t


def chain_from(rig, start, length=3):
    c = [start]
    while len(c) < length:
        nxt = [i for i, b in enumerate(rig.bones) if b['parent'] == c[-1]]
        if not nxt:
            break
        c.append(nxt[0])
    return c


def hand_frame(rig, hand_bone, wrist):
    """Main axis (wrist -> fingertips) and palm normal from the saint's hand skin."""
    v = rig.verts_of(hand_bone, 0.5, skin=True)
    if len(v) < 8:
        par = rig.bones[hand_bone]['parent']
        axis = wrist - rig.J[par]
        axis /= np.linalg.norm(axis)
        n = np.cross(axis, [0, 1.0, 0])
        return axis, n / np.linalg.norm(n), wrist + axis * 0.15
    P = rig.P[v]
    d = np.linalg.norm(P - wrist, axis=1)
    far = P[np.argsort(d)[-max(5, len(P) // 10):]].mean(0)
    axis = far - wrist
    axis /= np.linalg.norm(axis)
    X = P - P.mean(0)
    _, _, vt = np.linalg.svd(X, full_matrices=False)
    normal = vt[2] - axis * vt[2].dot(axis)
    return axis, normal / np.linalg.norm(normal), far


def humanoid_mapping(spec, side_bones):
    """spec: master bone -> rig bone for the trunk; side_bones per side."""
    m = dict(spec)
    for side, d in side_bones.items():
        for k, v in d.items():
            m[f'{k}.{side}'] = v
    return m


def copy_saint_part(rig, mask):
    """Saint vertices (e.g. the glass) with all attributes, re-indexed."""
    idx = np.where(mask)[0]
    remap = -np.ones(len(rig.P), int)
    remap[idx] = np.arange(len(idx))
    F = rig.index.reshape(-1, 3)
    F = remap[F[mask[F].all(1)]]
    return {k: v[idx] for k, v in rig.a.items()}, F


def drink_fit(M, H, rig):
    J = rig.J
    s = 1.18
    ps = posing.Pose(M)
    ps.scale = s
    heads = {
        'hips': J[16], 'spine1': lerp(J[16], J[22], 0.5), 'spine2': J[22], 'spine3': lerp(J[22], J[23], 0.5),
        'chest': J[23], 'upperchest': J[24], 'neck': J[15], 'head': J[14],
        'clavicle.L': J[17], 'upperarm.L': J[0], 'forearm.L': J[9], 'hand.L': J[12],
        'clavicle.R': J[18], 'upperarm.R': J[1], 'forearm.R': J[10], 'hand.R': J[13],
    }
    up = J[14] - J[15]
    face_c = rig.P[rig.verts_of(14, 0.5, skin=True)].mean(0)
    fwd = face_c - J[14]
    fwd -= up * fwd.dot(up) / up.dot(up)
    ends = {'head': J[14] + up / np.linalg.norm(up) * 0.13 * s}
    # yaw the root so the pelvis faces the saint's facing
    yaw = np.arctan2(fwd[0], fwd[2])
    ps.root_rot = geom.axis_angle([0, 1, 0], yaw)
    # hands: aim along the saint's hands
    hand_end = {}
    for side, hb, wb in (('L', 12, 12), ('R', 13, 13)):
        ax, nrm, far = hand_frame(rig, hb, J[hb])
        hand_end[side] = (ax, nrm, far)
    ends['hand.L'] = hand_end['L'][2]
    ends['hand.R'] = hand_end['R'][2]
    twist = {'head': (np.array([0, 0, 1.0]), fwd)}
    posing.fit_joints(ps, J, heads, ends=ends, twist=twist)
    # finger grips
    import poselib
    A = poselib.Author.__new__(poselib.Author)
    A.ps, A.s, A.R, A.place = ps, s, ps.root_rot, np.zeros(3)
    A.fingers('L', 0.35, 0.25)
    A.fingers('R', 0.15, 0.25, per=[0.55, 0.75, 1.15, 1.25])
    return ps, s


def drink_rig(M, H, name='drinkpour/saint-drink', plane=False):
    rig = RT.Rig(SRC + name + '.bin.mesh')
    J = rig.J
    ps, s = drink_fit(M, H, rig)
    X = master.posed(M, H, ps)
    master.light_face(X, (0.13, 0.3, 0.74), 0.7)
    trunk = {'hips': 16, 'spine1': 16, 'spine2': 22, 'spine3': 22, 'chest': 23, 'upperchest': 24,
             'neck': 15, 'head': 14}
    sides = {'L': dict(clavicle=17, upperarm=0, forearm=9, hand=12, thigh=16, shin=16, foot=16, toes=16),
             'R': dict(clavicle=18, upperarm=1, forearm=10, hand=13, thigh=16, shin=16, foot=16, toes=16)}
    mapping = humanoid_mapping(trunk, sides)
    for side, hb in (('L', 12), ('R', 13)):
        for f in range(1, 6):
            for seg in range(1, 4):
                mapping[f'finger{f}-{seg}.{side}'] = hb
    # crop: the shot is waist-up and this rig has no leg bones; stop just
    # below the skirt hem
    hem = X['P'][X['part'] == C.PART_DRESS][:, 1].min()
    keep_v = X['P'][:, 1] > hem - 0.12
    used, F = crop_mesh(X, keep_v)
    sub = {k: (v[used] if isinstance(v, np.ndarray) and len(v) == len(X['P']) else v) for k, v in X.items()}
    n_rig = len(rig.bones)
    W = RT.normalise(RT.map_weights(sub, sub['P'], mapping, J, n_rig))
    si, sw = export.top4(W)
    attrs = dict(skinIndex=si, skinWeight=sw, uv=sub['uvT'], uv2=sub['uvA'], color=RT.color_attr(sub))
    P, N = sub['P'], sub['N']
    # keep the saint's glass (bone 11 geometry) and, for the frame, its backdrop plane
    si0 = rig.a['skinIndex'].astype(int)
    keep = (si0[:, 0] == 11) & (rig.a['skinWeight'][:, 0] > 0.5)
    if plane:
        far = np.linalg.norm(rig.P - rig.P.mean(0), axis=1) > 1.2
        keep |= far & (rig.a['uv2'][:, 1] < 0.55)
    part, pF = copy_saint_part(rig, keep)
    o = len(P)
    P = np.concatenate([P, part['position']]); N = np.concatenate([N, part['normal']]); F = np.concatenate([F, pF + o])
    for k in ('uv', 'uv2'):
        attrs[k] = np.concatenate([attrs[k], part[k]])
    attrs['color'] = np.concatenate([attrs['color'], part['color'] if 'color' in part else np.zeros((len(pF) * 0 + len(part['position']), 3))])
    attrs['skinIndex'] = np.concatenate([attrs['skinIndex'], part['skinIndex']])
    attrs['skinWeight'] = np.concatenate([attrs['skinWeight'], part['skinWeight']])
    if plane:
        del attrs['color']
    export.write(OUT + name + '.bin.mesh', P, N, F, attrs, bones=rig.bones)
    print(name, 'verts', len(P), 'scale', s)
    return rig, X, ps


if __name__ == '__main__' and 'drink' in sys.argv:
    M, H = master.load(os.path.join(HERE, 'build/chaewon_master.npz'))
    drink_rig(M, H)
    drink_rig(M, H, 'drinkpour/floating-frame-drink', plane=True)


def feet_inset(M, H, name='approach/floating-frame-walk'):
    import rigs
    rig = RT.Rig(SRC + name + '.bin.mesh')
    J = rig.J
    s = 1.15
    ps = posing.Pose(M)
    ps.scale = s
    legs = {'L': (J[44], J[45], J[46]), 'R': (J[47], J[48], J[49])}
    knee_y = 0.5 * (J[45][1] + J[48][1])
    thigh = np.linalg.norm(ps.tails[sk.INDEX['thigh.L']] - ps.heads[sk.INDEX['thigh.L']]) * s
    ps.root_pos = np.array([J[20][0], knee_y + thigh * 0.97 + 0.012, J[20][2]])
    for side in ('L', 'R'):
        ankle, knee, toe = legs[side]
        ps.two_bone(f'thigh.{side}', f'shin.{side}', ankle, knee + np.array([0, 0, 0.3]))
        ps.aim(f'foot.{side}', toe - ps.joint(f'foot.{side}'))
        ps.aim(f'toes.{side}', toe - ps.joint(f'foot.{side}'))
    X = master.posed(M, H, ps)
    keep_v = (X['P'][:, 1] < 0.70) & (X['part'] == C.PART_SKIN)
    used, F = crop_mesh(X, keep_v)
    sub = {k: (v[used] if isinstance(v, np.ndarray) and len(v) == len(X['P']) else v) for k, v in X.items()}
    mapping = {'hips': 20, 'spine1': 20}
    for side, kn, an, to in (('L', 45, 44, 46), ('R', 48, 47, 49)):
        mapping[f'thigh.{side}'] = ('blend', 20, kn, (0.15, 0.95))
        mapping[f'shin.{side}'] = kn
        mapping[f'foot.{side}'] = an
        mapping[f'toes.{side}'] = to
    n_rig = len(rig.bones)
    W = RT.map_weights(sub, sub['P'], mapping, J, n_rig)
    W[:, 20] += np.clip(1 - W.sum(1), 0, None)
    si, sw = export.top4(RT.normalise(W))
    attrs = dict(skinIndex=si, skinWeight=sw, uv=sub['uvT'], uv2=sub['uvA'])
    P, N = sub['P'], sub['N']
    si0 = rig.a['skinIndex'].astype(int)
    keep = (si0[:, 0] == 50) & (rig.a['skinWeight'][:, 0] > 0.5)
    part, pF = copy_saint_part(rig, keep)
    o = len(P)
    P = np.concatenate([P, part['position']]); N = np.concatenate([N, part['normal']]); F = np.concatenate([F, pF + o])
    for k in ('uv', 'uv2', 'skinIndex', 'skinWeight'):
        attrs[k] = np.concatenate([attrs[k], part[k]])
    export.write(OUT + name + '.bin.mesh', P, N, F, attrs, bones=rig.bones)
    print(name, 'verts', len(P))


if __name__ == '__main__' and 'feet' in sys.argv:
    M, H = master.load(os.path.join(HERE, 'build/chaewon_master.npz'))
    feet_inset(M, H)


def finger_chains(rig, hand_bone):
    chains = []
    for k in [i for i, b in enumerate(rig.bones) if b['parent'] == hand_bone]:
        c = [k]
        while True:
            nxt = [i for i, b in enumerate(rig.bones) if b['parent'] == c[-1]]
            if not nxt:
                break
            c.append(nxt[0])
        chains.append(c)
    J = rig.J
    thumb = min(chains, key=len) if any(len(c) == 3 for c in chains) else min(chains, key=lambda c: np.linalg.norm(J[c[0]] - J[hand_bone]))
    rest = [c for c in chains if c is not thumb]
    rest.sort(key=lambda c: np.linalg.norm(J[c[0]] - J[thumb[0]]))
    out = {1: tuple(thumb[-3:])}
    for f, c in zip((2, 3, 4, 5), rest):
        out[f] = tuple(c[-3:])
    return out


def antigravity(M, H, name='antigravity/saint-antigravity'):
    rig = RT.Rig(SRC + name + '.bin.mesh')
    J = rig.J
    s = 1.18
    ps = posing.Pose(M)
    ps.scale = s
    up = J[22] - J[41]
    face_c = rig.P[rig.verts_of(22, 0.5, skin=True)].mean(0)
    fwd = face_c - J[22]
    fwd -= up * fwd.dot(up) / up.dot(up)
    fwd /= np.linalg.norm(fwd)
    pel_fwd = np.cross(J[64] - J[65], [0, 1.0, 0])
    yaw = np.arctan2(pel_fwd[0], pel_fwd[2])
    ps.root_rot = geom.axis_angle([0, 1, 0], yaw)
    heads = {
        'hips': J[58], 'spine1': lerp(J[58], J[61], 0.5), 'spine2': J[61], 'spine3': lerp(J[61], J[62], 0.5),
        'chest': J[62], 'upperchest': J[63], 'neck': J[41], 'head': J[22],
        'clavicle.L': J[59], 'upperarm.L': J[0], 'forearm.L': J[18], 'hand.L': J[20],
        'clavicle.R': J[60], 'upperarm.R': J[1], 'forearm.R': J[19], 'hand.R': J[21],
        'thigh.L': J[64], 'shin.L': J[31], 'foot.L': J[14], 'toes.L': J[72],
        'thigh.R': J[65], 'shin.R': J[32], 'foot.R': J[15], 'toes.R': J[73],
    }
    ends = {'head': J[22] + up / np.linalg.norm(up) * 0.13 * s,
            'toes.L': J[72] + (J[72] - J[14]) * 0.5, 'toes.R': J[73] + (J[73] - J[15]) * 0.5}
    fl = finger_chains(rig, 20)
    fr = finger_chains(rig, 21)
    for side, fc in (('L', fl), ('R', fr)):
        h_, e_ = finger_heads(fc, side, J)
        heads.update(h_)
        ends.update(e_)
    posing.fit_joints(ps, J, heads, ends=ends, twist={'head': (np.array([0, 0, 1.0]), fwd)})
    X = master.posed(M, H, ps, wind=(0.0, 2.6, -0.4))
    master.light_face(X, (0.25, 0.25, 0.2), 0.6)
    trunk = {'hips': 58, 'spine1': 58, 'spine2': 61, 'spine3': 61, 'chest': 62, 'upperchest': 63,
             'neck': 41, 'head': 22}
    sides = {'L': dict(clavicle=59, upperarm=0, forearm=18, hand=20, thigh=64, shin=31, foot=14, toes=72),
             'R': dict(clavicle=60, upperarm=1, forearm=19, hand=21, thigh=65, shin=32, foot=15, toes=73)}
    mapping = humanoid_mapping(trunk, sides)
    for side, fc in (('L', fl), ('R', fr)):
        for f, bones in fc.items():
            for seg, b in zip((1, 2, 3), bones):
                mapping[f'finger{f}-{seg}.{side}'] = b
    n_rig = len(rig.bones)
    W = RT.map_weights(X, X['P'], mapping, J, n_rig)
    skirt = X['part'] == C.PART_DRESS
    cloth = ~rig.skin
    Wt = RT.transfer(X['P'][skirt], rig.P, rig.a['skinIndex'].astype(int), rig.a['skinWeight'], n_rig, mask=cloth)
    hips_y = ps.joint('hips')[1]
    # only the lower skirt follows the robe; keep it off the head/arms
    for b in (22, 41, 0, 1, 18, 19, 20, 21):
        Wt[:, b] = 0
    t = np.clip((hips_y - X['P'][skirt, 1]) / 0.25, 0, 1)[:, None] * 0.6
    W[skirt] = RT.normalise(W[skirt]) * (1 - t) + RT.normalise(Wt + 1e-9) * t
    W = RT.normalise(W)
    si, sw = export.top4(W)
    attrs = dict(skinIndex=si, skinWeight=sw, uv=X['uvT'], uv2=X['uvA'])
    export.write(OUT + name + '.bin.mesh', X['P'], X['N'], X['F'], attrs, bones=rig.bones)
    print(name, 'verts', len(X['P']), 'fingers', fl, fr)


if __name__ == '__main__' and 'float' in sys.argv:
    M, H = master.load(os.path.join(HERE, 'build/chaewon_master.npz'))
    antigravity(M, H)
