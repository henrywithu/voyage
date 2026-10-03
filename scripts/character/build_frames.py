"""Floating-frame close-ups (Wander hood frames, Pillar profile, etc.)."""
import os
import sys
import numpy as np
import meshio
import landmarks as L
import master
import pose as posing
import poselib
import export
import skeleton as sk
import chaewon as C
import geom

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../reference/saint/')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../public/assets/decoded/story/')
REST_EYES = np.array([0.0, 1.485, 0.111])
REST_EYE_DIST = 0.054


def saint(name):
    h, a, ix = meshio.read(SRC + name + '.bin.mesh')
    return h, a, ix.reshape(-1, 3)


def head_rotation(fwd, up):
    up = up / np.linalg.norm(up)
    fwd = fwd - up * fwd.dot(up)
    fwd /= np.linalg.norm(fwd)
    right = np.cross(up, fwd)
    return np.stack([right, up, fwd], 1)  # columns: local x,y,z -> world


def place_head(ps, A, target_eyes, fwd, up, neck_share=0.35):
    """Rotate neck/head so the face looks along fwd/up, then translate the
    whole figure so her eyes sit on target_eyes."""
    Rt = head_rotation(fwd, up)
    hi = sk.INDEX['head']
    # neck takes part of the turn for a natural line
    Rw, _ = ps.world()
    cur_up = Rw[hi] @ np.array([0, 1.0, 0])
    ps.aim('neck', (Rt @ np.array([0, 1.0, 0])) * neck_share + cur_up * (1 - neck_share))
    Rp = ps.parent_rot(hi)
    ps.local[hi] = Rp.T @ Rt
    Rw, Hw = ps.world()
    eyes = Hw[hi] + Rw[hi] @ ((REST_EYES - ps.heads[hi]) * ps.scale)
    ps.root_pos = ps.root_pos + (np.asarray(target_eyes) - eyes)


def frame_attrs(X, colorid_eye=2):
    cid = np.zeros(len(X['P']))
    cid[X['part'] == C.PART_EYE] = colorid_eye
    return cid


def combine(X, keepF, bg_P, bg_N, bg_F, bg_attrs, colorid):
    """Chaewon (subset of faces) + saint backdrop geometry."""
    used = np.unique(keepF)
    remap = -np.ones(len(X['P']), int)
    remap[used] = np.arange(len(used))
    P = np.concatenate([X['P'][used], bg_P])
    N = np.concatenate([X['N'][used], bg_N])
    F = np.concatenate([remap[keepF], bg_F + len(used)])
    attrs = {
        'uv': np.concatenate([X['uvT'][used], bg_attrs['uv']]),
        'uv2': np.concatenate([X['uvA'][used], bg_attrs['uv2']]),
    }
    if colorid is not None:
        attrs['colorid'] = np.concatenate([colorid[used], bg_attrs['colorid'][:, 0]])[:, None]
    return P, N, F, attrs


def backdrop(a, F, mask):
    idx = np.where(mask)[0]
    remap = -np.ones(len(a['position']), int)
    remap[idx] = np.arange(len(idx))
    bf = remap[F[mask[F].all(1)]]
    out = {k: a[k][idx] for k in a}
    return out['position'], out['normal'], bf, out


def hood_frame(M, H, which):
    name = 'wander/saint-hood' if which == 1 else 'wander/saint-hood-2'
    h, a, F = saint(name)
    face = L.face_frame(a['position'], a['uv2'], a['uv2'][:, 1] > 0.5)
    pts = face['points']
    s = np.linalg.norm(pts['eye_l'] - pts['eye_r']) / REST_EYE_DIST
    ps = posing.Pose(M)
    A = poselib.Author(ps, s, 0, (0, 0, 0))
    yaw = np.degrees(np.arctan2(face['fwd'][0], face['fwd'][2]))
    A = poselib.Author(ps, s, yaw * 0.6, (0, 0, 0))
    A.spine(lean=8)
    if which == 1:
        A.arm('L', (0.24, 0.88, 0.06), elbow_pole=(0.3, 0, -1), hand_dir=(0.1, -1, 0.1), palm=(-1, 0, 0))
        A.arm('R', (-0.24, 0.88, 0.06), elbow_pole=(-0.3, 0, -1), hand_dir=(-0.1, -1, 0.1), palm=(1, 0, 0))
        place_head(ps, A, face['eyes'], face['fwd'], face['up'])
    else:
        place_head(ps, A, face['eyes'], face['fwd'], face['up'])
        # both hands sweep her hair back from the temples
        Rw, Hw = ps.world()
        hi = sk.INDEX['head']
        Rh = Rw[hi]
        hc = Hw[hi] + Rh @ ((np.array([0, 1.50, 0.045]) - ps.heads[hi]) * s)
        for side, sg in (('L', 1), ('R', -1)):
            wrist = hc + Rh @ (np.array([sg * 0.115, -0.035, -0.02 if side == 'R' else 0.03]) * s)
            pole = wrist + Rh @ (np.array([sg * 0.6, -0.5, -0.3]))
            ps.two_bone(f'upperarm.{side}', f'forearm.{side}', wrist, pole)
            tip = hc + Rh @ (np.array([sg * 0.07, 0.07, -0.05]) * s)
            ps.aim(f'hand.{side}', tip - wrist, roll_axis=np.array([0, -1.0, 0]), roll_target=Rh @ np.array([-sg, 0, 0]))
            A.fingers(side, 0.18, 0.1)
        place_head(ps, A, face['eyes'], face['fwd'], face['up'])
    X = master.posed(M, H, ps)
    master.light_face(X, (0.5, 1.0, 1.0), 0.8)
    # keep the upper body only
    y_cut = face['eyes'][1] - 0.75 * s
    keepF = X['F'][(X['P'][X['F']][:, :, 1] > y_cut).any(1)]
    bg = np.abs(a['colorid'][:, 0] - 1) < 0.5
    bP, bN, bF, battrs = backdrop(a, F, bg)
    P, N, F2, attrs = combine(X, keepF, bP, bN, bF, battrs, frame_attrs(X))
    export.write(OUT + name + '.bin.mesh', P, N, F2, attrs)
    print(name, 'scale', round(s, 3), len(P), 'verts')


if __name__ == '__main__' and (len(sys.argv) == 1 or 'hood1' in sys.argv or 'hood2' in sys.argv):
    M, H = master.load('build/chaewon_master.npz')
    which = sys.argv[1:] or ['hood1', 'hood2']
    if 'hood1' in which:
        hood_frame(M, H, 1)
    if 'hood2' in which:
        hood_frame(M, H, 2)


def comps(P, F):
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    n = len(P)
    rows = np.concatenate([F[:, 0], F[:, 1], F[:, 2]])
    cols = np.concatenate([F[:, 1], F[:, 2], F[:, 0]])
    return connected_components(coo_matrix((np.ones(len(rows)), (rows, cols)), shape=(n, n)), directed=False)[1]


def relaxed_arms(A, out=0.24, y=0.88):
    A.arm('L', (out, y, 0.04), elbow_pole=(0.3, 0, -1), hand_dir=(0.12, -1, 0.1), palm=(-1, 0, 0))
    A.arm('R', (-out, y, 0.04), elbow_pole=(-0.3, 0, -1), hand_dir=(-0.12, -1, 0.1), palm=(1, 0, 0))
    A.fingers('L', 0.3, 0.2)
    A.fingers('R', 0.3, 0.2)


def profile_bust(M, H):
    h, a, F = saint('wander/saint-pose-3')
    face = L.face_frame(a['position'], a['uv2'], a['uv2'][:, 1] > 0.55)
    s = np.linalg.norm(face['points']['eye_l'] - face['points']['eye_r']) / REST_EYE_DIST
    ps = posing.Pose(M)
    A = poselib.Author(ps, s, 0, (0, 0, 0))
    A.spine(lean=-3)
    relaxed_arms(A)
    fwd = np.array([0.0, 0.16, 1.0])
    up = np.array([0.0, 1.0, -0.12])
    place_head(ps, A, face['eyes'], fwd, up)
    X = master.posed(M, H, ps, wind=(0.0, 0.08, -0.42), tuck='L')
    master.light_face(X, (0, 0.5, 2.0), 0.75)
    y_cut = face['eyes'][1] - 0.62 * s
    keepF = X['F'][(X['P'][X['F']][:, :, 1] > y_cut).any(1)]
    used = np.unique(keepF)
    remap = -np.ones(len(X['P']), int)
    remap[used] = np.arange(len(used))
    attrs = {'uv': X['uvT'][used], 'uv2': X['uvA'][used], 'windmask': np.zeros((len(used), 1))}
    export.write(OUT + 'wander/saint-pose-3.bin.mesh', X['P'][used], X['N'][used], remap[keepF], attrs)
    # the separate hair-card mesh is replaced by her own hair: leave a degenerate stub
    e = face['eyes']
    export.write(OUT + 'wander/saint-pose-3-hair.bin.mesh', np.array([e, e, e]), np.tile([0, 0, 1.0], (3, 1)),
                 np.array([[0, 1, 2]]), {'uv': np.zeros((3, 2))})
    print('profile bust scale', round(s, 3), len(used), 'verts')


def pillar_profile(M, H):
    name = 'pillarcrumble/floating-frame-profile'
    h, a, F = saint(name)
    P = a['position']
    lab = comps(P, F)
    sizes = np.bincount(lab)
    ext = np.array([np.ptp(P[lab == c], 0).max() for c in range(lab.max() + 1)])
    keep_c = [c for c in range(lab.max() + 1) if sizes[c] >= 100 and ext[c] > 1.2]
    bg = np.isin(lab, keep_c)
    face = L.face_frame(P, a['uv2'], a['uv2'][:, 1] > 0.5)
    s = np.linalg.norm(face['points']['eye_l'] - face['points']['eye_r']) / REST_EYE_DIST
    ps = posing.Pose(M)
    yaw = np.degrees(np.arctan2(face['fwd'][0], face['fwd'][2]))
    A = poselib.Author(ps, s, yaw * 0.7, (0, 0, 0))
    A.spine(lean=-4)
    relaxed_arms(A)
    place_head(ps, A, face['eyes'], face['fwd'] + np.array([0, 0.15, 0]), face['up'])
    wind = -face['fwd'] * 0.45 + np.array([0, 0.1, 0])
    X = master.posed(M, H, ps, wind=wind, tuck='L')
    master.light_face(X, (-0.9, 0.1, 1.0), 0.8)
    y_cut = face['eyes'][1] - 0.95 * s
    keepF = X['F'][(X['P'][X['F']][:, :, 1] > y_cut).any(1)]
    bP, bN, bF, battrs = backdrop(a, F, bg)
    battrs['colorid'] = np.zeros((len(bP), 1))
    Pc, Nc, Fc, attrs = combine(X, keepF, bP, bN, bF, battrs, np.zeros(len(X['P'])))
    export.write(OUT + name + '.bin.mesh', Pc, Nc, Fc, attrs)
    print(name, 'scale', round(s, 3), 'kept backdrop comps', keep_c, len(Pc), 'verts')


if __name__ == '__main__' and len(sys.argv) > 1:
    M, H = master.load('build/chaewon_master.npz')
    if 'profile' in sys.argv:
        profile_bust(M, H)
    if 'pillar' in sys.argv:
        pillar_profile(M, H)


import textures as TX
EYE_L_REST = np.array([0.027, 1.485, 0.111])
EYE_R_REST = np.array([-0.027, 1.485, 0.111])
EYE_RADIUS = 0.0125
WHITE_ATLAS = (0.75, 0.40)


def crop_uv(Prest):
    e = TX.EYE_CROP
    u = e['u0'] + (Prest[:, 0] - e['x0']) / (e['x1'] - e['x0']) * (e['u1'] - e['u0'])
    v = e['v0'] + (Prest[:, 1] - e['y0']) / (e['y1'] - e['y0']) * (e['v1'] - e['v0'])
    inside = (Prest[:, 0] > e['x0']) & (Prest[:, 0] < e['x1']) & (Prest[:, 1] > e['y0']) & (Prest[:, 1] < e['y1'])
    uv = np.stack([u, v], 1)
    uv[~inside] = WHITE_ATLAS
    return uv


def iris_caps(angle=42, rings=8, segs=32, gaze=(0.0, -0.06, 1.0)):
    """Spherical iris caps on both eyeballs (rest space) + atlas uv."""
    ib = TX.IRIS_BOX
    g = np.asarray(gaze, float)
    g /= np.linalg.norm(g)
    P, UV, F = [], [], []
    for c in (EYE_L_REST, EYE_R_REST):
        base = len(P)
        x = np.cross([0, 1.0, 0], g)
        x /= np.linalg.norm(x)
        y = np.cross(g, x)
        r = EYE_RADIUS + 0.0004
        P.append(c + g * r)
        UV.append(((ib['u0'] + ib['u1']) / 2, (ib['v0'] + ib['v1']) / 2))
        for i in range(1, rings + 1):
            th = np.radians(angle) * i / rings
            for j in range(segs):
                ph = 2 * np.pi * j / segs
                d = g * np.cos(th) + (x * np.cos(ph) + y * np.sin(ph)) * np.sin(th)
                P.append(c + d * r)
                q = np.sin(th) / np.sin(np.radians(angle)) * 0.5
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
    return np.array(P), np.array(UV), np.array(F)


def eyes_frame(M, H, name='cathedral/saint-eyes', light=(0.25, 0.25, 0.2)):
    h, a, F = saint(name)
    P0 = a['position']
    lab = comps(P0, F)
    cid = a['colorid'][:, 0]
    iris_c = [P0[lab == c].mean(0) for c in np.unique(lab[cid > 0.5])]
    iris_c.sort(key=lambda p: p[0])
    eye_r, eye_l = iris_c[0], iris_c[-1]
    right = eye_l - eye_r
    right /= np.linalg.norm(right)
    fwd = np.cross(right, [0, 1.0, 0])
    fwd /= np.linalg.norm(fwd)
    up = np.cross(fwd, right)
    s = np.linalg.norm(eye_l - eye_r) / np.linalg.norm(EYE_L_REST - EYE_R_REST)
    ps = posing.Pose(M)
    A = poselib.Author(ps, s, 0, (0, 0, 0))
    place_head(ps, A, 0.5 * (eye_l + eye_r) - fwd * EYE_RADIUS * s - up * 0.004 * s, fwd, up)
    X = master.posed(M, H, ps)
    master.light_face(X, light, 0.8)
    n_master = len(M['P'])
    rest = np.zeros_like(X['P'])
    rest[:n_master] = M['P']
    face = lab == np.argmax(np.bincount(lab[cid < 0.5]))  # largest non-iris comp = face
    lo, hi = P0[face].min(0), P0[face].max(0)
    pad = 0.25 * (hi - lo)
    inside = np.all((X['P'] > lo - pad) & (X['P'] < hi + pad), axis=1)
    part = X['part']
    skin_like = (part == C.PART_SKIN) | (part == C.PART_EYE)
    hairish = (part == C.PART_HAIR) | (part == C.PART_HAIRCAP)
    keep_v = inside & (skin_like | hairish)
    keepF = X['F'][keep_v[X['F']].all(1)]
    uv_atlas = np.tile(WHITE_ATLAS, (len(X['P']), 1)).astype(float)
    uv_atlas[skin_like] = crop_uv(rest[skin_like])
    uv_trim = np.tile([0.5, 0.025], (len(X['P']), 1)).astype(float)
    uv_trim[hairish] = X['uvT'][hairish]
    Xf = dict(X)
    Xf['uvT'], Xf['uvA'] = uv_atlas, uv_trim  # this shader: atlas via uv, trim via uv2
    plane = lab == np.argmin([P0[lab == c][:, 2].mean() if (lab == c).any() else 9 for c in range(lab.max() + 1)])
    bP, bN, bF, battrs = backdrop(a, F, plane)
    Pc, Nc, Fc, attrs = combine(Xf, keepF, bP, bN, bF, battrs, np.zeros(len(X['P'])))
    # iris caps on the eyeballs, rigid with the head
    import eyes as EY
    Rw, Hw = ps.world()
    hi_ = sk.INDEX['head']
    cp, cn, cuv, cf, _ = EY.iris_caps(EY.eye_info())
    cpw = ((cp - ps.heads[hi_]) * s) @ Rw[hi_].T + Hw[hi_]
    cnw = cn @ Rw[hi_].T
    o = len(Pc)
    Pc = np.concatenate([Pc, cpw]); Nc = np.concatenate([Nc, cnw]); Fc = np.concatenate([Fc, cf + o])
    attrs['uv'] = np.concatenate([attrs['uv'], cuv])
    attrs['uv2'] = np.concatenate([attrs['uv2'], np.tile([0.5, 0.025], (len(cp), 1))])
    attrs['colorid'] = np.concatenate([attrs['colorid'], np.ones((len(cp), 1))])
    export.write(OUT + name + '.bin.mesh', Pc, Nc, Fc, attrs)
    print(name, 'scale', round(s, 2), len(Pc), 'verts')


if __name__ == '__main__' and 'eyes' in sys.argv:
    M, H = master.load('build/chaewon_master.npz')
    eyes_frame(M, H)


def open_eyes_delta(M):
    """Per-master-vertex rest displacement (metres) for wide, surprised eyes."""
    import mh
    from scipy.spatial import cKDTree
    v0, _, faces, _, groups = mh.build_chaewon()
    v1 = v0.copy()
    for side in ('l', 'r'):
        for t, w in (('height1', 1.6), ('height2', 1.2), ('height3', 1.4)):
            mh.apply(v1, f'eyes/{side}-eye-{t}-incr.target', w)
    mh.apply(v1, 'eyebrows/eyebrows-trans-up.target', 0.9)
    body = np.unique([i for f, g in zip(faces, groups) if g == 'body' for i in f])
    floor = v0[body][:, 1].min() * 0.1
    rest = v0[body] * 0.1
    rest[:, 1] -= floor
    delta = (v1[body] - v0[body]) * 0.1
    tree = cKDTree(rest)
    d, i = tree.query(M['P'])
    out = delta[i]
    out[d > 1e-5] = 0
    out[M['part'] != C.PART_SKIN] = 0
    return out


def eyes_widen(M, H, name='antigravity/eyes-widen'):
    import retarget as RT
    import eyes as EY
    rig = RT.Rig(SRC + name + '.bin.mesh')
    J = rig.J
    eye_l, eye_r = J[0], J[1]
    right = eye_l - eye_r
    right /= np.linalg.norm(right)
    fwd = np.cross(right, [0, 1.0, 0])
    fwd /= np.linalg.norm(fwd)
    up = np.cross(fwd, right)
    info = EY.eye_info()
    rest_l, rest_r = info['L']['center'], info['R']['center']
    s = np.linalg.norm(eye_l - eye_r) / np.linalg.norm(rest_l - rest_r)
    ps = posing.Pose(M)
    A = poselib.Author(ps, s, 0, (0, 0, 0))
    hi_ = sk.INDEX['head']
    place_head(ps, A, 0.5 * (eye_l + eye_r), fwd, up)
    # place_head aligns REST_EYES; correct to the fitted eyeball centres
    Rw, Hw = ps.world()
    mid = 0.5 * (rest_l + rest_r)
    cur = Hw[hi_] + Rw[hi_] @ ((mid - ps.heads[hi_]) * s)
    ps.root_pos = ps.root_pos + (0.5 * (eye_l + eye_r) - cur)
    X = master.posed(M, H, ps)
    master.light_face(X, (0.25, 0.25, 0.2), 0.8)
    Rw, Hw = ps.world()
    n_master = len(M['P'])
    rest = np.zeros_like(X['P'])
    rest[:n_master] = M['P']
    part = X['part']
    # crop to the saint's face region
    face_v = rig.verts_of(2, 0.5)
    lo, hi = rig.P[face_v].min(0), rig.P[face_v].max(0)
    pad = 0.15 * (hi - lo)
    inside = np.all((X['P'] > lo - pad) & (X['P'] < hi + pad), axis=1) & (X['P'][:, 2] > 0.05)
    skin_like = (part == C.PART_SKIN) | (part == C.PART_EYE)
    hairish = (part == C.PART_HAIR) | (part == C.PART_HAIRCAP)
    keepF = X['F'][(inside & (skin_like | hairish))[X['F']].all(1)]
    used = np.unique(keepF)
    remap = -np.ones(len(X['P']), int)
    remap[used] = np.arange(len(used))
    P, N, F = X['P'][used], X['N'][used], remap[keepF]
    uv_atlas = np.tile(WHITE_ATLAS, (len(X['P']), 1)).astype(float)
    uv_atlas[skin_like] = crop_uv(rest[skin_like])
    uv_trim = np.tile([0.5, 0.025], (len(X['P']), 1)).astype(float)
    uv_trim[hairish] = X['uvT'][hairish]
    color = np.zeros((len(X['P']), 3))
    color[part == C.PART_EYE, 1] = 1
    delta = np.zeros((len(X['P']), 3))
    delta[:n_master] = open_eyes_delta(M)
    openeyes = (delta * s) @ Rw[hi_].T / 11.0
    # rig weights
    n_rig = len(rig.bones)
    W = np.zeros((len(X['P']), n_rig))
    Wm = X['W']
    W[:, 2] = Wm[:, hi_]
    W[:, 3] = Wm[:, sk.INDEX['neck']]
    W[:, 4] = 1 - W[:, 2] - W[:, 3]
    eye = part == C.PART_EYE
    eye_side_l = eye & (rest[:, 0] > 0)
    W[eye] = 0
    W[eye_side_l, 0] = 1
    W[eye & ~eye_side_l, 1] = 1
    attrs = dict(uv=uv_trim[used], uv2=uv_atlas[used], color=color[used], openeyes=openeyes[used])
    Wsel = W[used]
    # iris caps
    cp, cn, cuv, cf, side = EY.iris_caps(info)
    cpw = ((cp - ps.heads[hi_]) * s) @ Rw[hi_].T + Hw[hi_]
    cnw = cn @ Rw[hi_].T
    o = len(P)
    P = np.concatenate([P, cpw]); N = np.concatenate([N, cnw]); F = np.concatenate([F, cf + o])
    attrs['uv'] = np.concatenate([attrs['uv'], np.tile([0.5, 0.025], (len(cp), 1))])
    attrs['uv2'] = np.concatenate([attrs['uv2'], cuv])
    attrs['color'] = np.concatenate([attrs['color'], np.tile([1.0, 1.0, 0.0], (len(cp), 1))])
    attrs['openeyes'] = np.concatenate([attrs['openeyes'], np.zeros((len(cp), 3))])
    Wc = np.zeros((len(cp), n_rig))
    Wc[side == 'L', 0] = 1
    Wc[side == 'R', 1] = 1
    Wsel = np.concatenate([Wsel, Wc])
    attrs['eyemasks'] = attrs['color'].copy()
    # keep the saint's backdrop plane (largest flat piece behind the face)
    a = rig.a
    lab = comps(rig.P, rig.index.reshape(-1, 3))
    plane = lab == lab[np.argmin(rig.P[:, 2])]
    bP, bN, bF, battrs = backdrop(a, rig.index.reshape(-1, 3), plane)
    o = len(P)
    P = np.concatenate([P, bP]); N = np.concatenate([N, bN]); F = np.concatenate([F, bF + o])
    for k in ('uv', 'uv2', 'color', 'openeyes', 'eyemasks'):
        attrs[k] = np.concatenate([attrs[k], battrs[k]])
    bw = np.zeros((len(bP), n_rig))
    bsi = battrs['skinIndex'].astype(int)
    for c in range(4):
        np.add.at(bw, (np.arange(len(bP)), bsi[:, c]), battrs['skinWeight'][:, c])
    Wsel = np.concatenate([Wsel, bw])
    si, sw = export.top4(RT.normalise(Wsel))
    attrs['skinIndex'], attrs['skinWeight'] = si, sw
    export.write(OUT + name + '.bin.mesh', P, N, F, attrs, bones=rig.bones)
    print(name, 'scale', round(s, 2), len(P), 'verts')


if __name__ == '__main__' and 'widen' in sys.argv:
    M, H = master.load('build/chaewon_master.npz')
    eyes_widen(M, H)
