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
