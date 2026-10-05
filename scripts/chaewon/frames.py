"""Close-up frames on the v2 rig: the Wander insets, the profile bust and the pillar profile.

    python3 frames.py hood1 hood2 profile pillar

Each Spirit close-up is a mesh in the frame's own space: a figure plus (for some)
backdrop geometry. We read the Spirit frame's face landmarks (eye centre, eye
distance, face direction), pose Chaewon with a matching head turn, then place her
with a similarity transform so her eyes land on the same spot at the same scale.
Backdrop pieces of the Spirit frame are kept as they were.
"""
import importlib.util
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '../character'))
sys.path.insert(0, HERE)

import bpy  # noqa: E402,F401
from mathutils import Vector  # noqa: E402

import assets  # noqa: E402
import master as M  # noqa: E402
import meshio  # noqa: E402
import poses  # noqa: E402
import rig  # noqa: E402

ROOT = os.path.join(HERE, '../..')
SAINT = os.path.join(ROOT, 'reference/saint')
DEC = os.path.join(ROOT, 'public/assets/decoded/story')


def _landmarks():
    spec = importlib.util.spec_from_file_location('saint_landmarks', os.path.join(HERE, '../character/landmarks.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


L = _landmarks()


def saint(rel):
    h, a, ix = meshio.read(os.path.join(SAINT, rel + '.bin.mesh'))
    F = ix.reshape(-1, 3)
    face = L.face_frame(a['position'], a['uv2'], a['uv2'][:, 1] > 0.5)
    d = np.linalg.norm(face['points']['eye_l'] - face['points']['eye_r'])
    return a, F, face, d


def her_face(s, m, mats):
    """Eye centre, eye distance and (right, up, fwd) of her posed face in three space (metres)."""
    P3 = M.to_three(m['P'], 1.0)
    eye = m['kind'] == M.PART['eye']
    E = P3[eye]
    hb = s.names.index('head')
    H = mats[hb]
    up = M.B2T @ H[:3, 1]
    head_c = M.B2T @ H[:3, 3]
    # Split the two eyeballs along the head's lateral axis.
    lat = M.B2T @ H[:3, 0]
    side = (E - head_c) @ lat
    a, b = E[side > 0].mean(0), E[side <= 0].mean(0)
    # Her left eye is at +x in three space when she faces +z.
    fwd0 = M.B2T @ (H[:3, :3] @ np.array([0, 0, -1.0]))
    right = a - b
    if np.dot(np.cross(right, up), fwd0) < 0:
        a, b = b, a
        right = -right
    dist = np.linalg.norm(right)
    right /= dist
    up = up - right * up.dot(right)
    up /= np.linalg.norm(up)
    fwd = np.cross(right, up)
    return P3, (a + b) / 2, dist, np.stack([right, up, fwd], 1)


def yaw_pitch(fwd):
    return math.degrees(math.atan2(fwd[0], fwd[2])), math.degrees(math.asin(np.clip(-fwd[1], -1, 1)))


def place(s, pose_fn, target, hair_kw, head_share=0.45):
    """Pose with a head turn toward the target face direction and return (m, P3 placed, N3, k)."""
    t_eyes, t_dist, t_frame = target
    yaw, pitch = yaw_pitch(t_frame[:, 2])
    pose_fn(s, yaw * head_share, pitch)
    mats = s.pose_mats()
    hair_kw = dict(hair_kw)
    if 'wind_rel' in hair_kw:
        # Wind relative to her head: (toward her right, up, strength); it always blows from in front of her face.
        lat, upw, strength = hair_kw.pop('wind_rel')
        H3 = mats[s.names.index('head')][:3, :3]
        d = H3 @ np.array([lat, 0, 1.0]) + np.array([0, 0, upw])
        hair_kw['wind'] = assets.wind_field(tuple(d), strength)
    H = s.hair(mats, **hair_kw)
    m = s.assemble(mats, H)
    P3, eyes, dist, frame = her_face(s, m, mats)
    R = t_frame @ frame.T
    k = t_dist / dist
    P = (P3 - eyes) @ R.T * k + t_eyes
    N = (np.asarray(m['N']) @ M.B2T.T) @ R.T
    place.last = dict(mats=mats, R=R, k=k, eyes=eyes, t_eyes=t_eyes, dist=dist)
    return m, P, N, k


def light_face(m, P, N, light, eyes, k, amount=0.85, reach=0.11):
    """Bend face (and nearby skin) normals toward the frame's light: a clean, paper-white face."""
    l = np.asarray(light, float)
    l /= np.linalg.norm(l)
    uv2 = m['uv2']
    face = (uv2[:, 0] < 0.445) & (uv2[:, 1] > 0.555)
    skin = (uv2[:, 1] > 0.55) & (m['kind'] == M.PART['skin'])
    d = np.linalg.norm(P - eyes, axis=1) / k
    w = np.where(face, amount, 0.0)
    w = np.maximum(w, np.where(skin, amount * np.clip(1 - (d - 0.07) / reach, 0, 1), 0.0))
    N = N * (1 - w[:, None]) + l[None] * w[:, None]
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)


def cut(m, P, keep_tri):
    F = m['F'][keep_tri]
    used = np.unique(F)
    remap = -np.ones(len(P), int)
    remap[used] = np.arange(len(used))
    return used, remap[F]


def write_frame(path, m, P, N, used, F, backdrop=None, colorid_eye=2.0, extra=None):
    cid = np.where(m['kind'][used] == M.PART['eye'], colorid_eye, 0.0)
    arrays = {'position': P[used], 'normal': N[used], 'uv': m['uv'][used], 'uv2': m['uv2'][used],
              'colorid': cid[:, None]}
    for k, v in (extra or {}).items():
        arrays[k] = v[used]
    F_all = F
    if backdrop is not None:
        bP, bN, bF, battrs = backdrop
        battrs = dict(battrs, position=bP, normal=bN)
        n = len(arrays['position'])
        for k in arrays:
            b = battrs[k] if k in battrs else np.zeros((len(bP),) + np.shape(arrays[k])[1:])
            arrays[k] = np.concatenate([arrays[k], np.asarray(b).reshape(len(bP), -1)]).astype(np.float32)
        F_all = np.concatenate([F, bF + n])
    arrays = {k: np.asarray(v, np.float32) for k, v in arrays.items()}
    os.makedirs(os.path.dirname(path), exist_ok=True)
    meshio.write(path, arrays, F_all.astype(np.uint32))
    print(os.path.relpath(path, DEC), len(arrays['position']), 'verts')


def saint_backdrop(a, F, mask, keys):
    idx = np.flatnonzero(mask)
    remap = -np.ones(len(a['position']), int)
    remap[idx] = np.arange(len(idx))
    bF = remap[F[mask[F].all(1)]]
    attrs = {}
    for k in keys:
        if k in a:
            attrs[k] = a[k][idx]
        elif k == 'colorid':
            attrs[k] = np.zeros((len(idx), 1))
        else:
            attrs[k] = np.zeros((len(idx), 2))
    return a['position'][idx], a['normal'][idx], bF, attrs


# ---------------------------------------------------------------- poses

def gaze_pose(s, yaw, pitch, hands='down'):
    """Upper-body portrait: soft contrapposto, head turned (yaw +toward her left, pitch +down)."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    poses.contrapposto(ctx, 'R', 0.6)
    poses.spine(arm, pitch=-3, yaw=yaw * 0.25)
    if hands == 'down':
        for side in 'LR':
            poses.relaxed_arm(ctx, side, out=0.22, fwd=0.06, bend=20, hand=dict(curl=0.25, close=0.6, thumb=0.35))
    poses.head(arm, pitch=pitch, yaw=yaw, roll=-5)


def sweep_pose(s, yaw, pitch, sides='R'):
    """Sweeping her hair back from the temple (far hand), elbow high, chin lifted; the other arm relaxed."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    poses.contrapposto(ctx, 'L', 0.5)
    poses.spine(arm, pitch=-6, yaw=yaw * 0.25)
    for side in sides:
        poses.clavicle(arm, side, lift=12)
    for side in 'LR':
        if side not in sides:
            poses.relaxed_arm(ctx, side, out=0.2, fwd=0.08, bend=22, hand=dict(curl=0.25, close=0.6, thumb=0.35))
    poses.head(arm, pitch=pitch - 6, yaw=yaw, roll=4)
    pb = arm.pose.bones
    rig.update()
    head = pb['head']
    Hm = head.matrix
    for side, sgn in (('L', 1), ('R', -1)):
        if side not in sides:
            continue
        # Head bone frame (measured): +X her right, +Y up the head, +Z behind her. Fingertips push back
        # through the hair above the ear; the wrist rests by the temple, the forearm falls to the raised elbow.
        R3 = Hm.to_3x3()
        tip = Hm @ Vector((-sgn * 0.082, 0.115, 0.07))
        fingers = (R3 @ Vector((sgn * 0.2, 0.35, 0.9))).normalized()
        wrist = tip - fingers * 0.15
        poses.arm_to(ctx, side, wrist, elbow_dir=(sgn * 1.0, 0.1, 0.35),
                     wrist=(fingers, R3 @ Vector((sgn, 0, 0))))
        rig.hand_shape(arm, side, mcp=(10, 14, 18, 22), pip=(14, 20, 26, 30), dip=(6, 9, 12, 13),
                       spread=(-8, 0, 8, 16), thumb=(-36, 30, 10, 8, 10))


# ---------------------------------------------------------------- frames

def frame_hood(s, which):
    rel = 'wander/saint-hood' if which == 1 else 'wander/saint-hood-2'
    a, F, face, d = saint(rel)
    fwd, up = face['fwd'], face['up']
    if which == 2:
        # Turn her face further toward the reader than the Spirit frame did (a three-quarter view).
        fwd = fwd + np.array([0, 0, 0.9])
        fwd /= np.linalg.norm(fwd)
        up = up - fwd * up.dot(fwd)
        up /= np.linalg.norm(up)
    target = (face['eyes'], d, np.stack([np.cross(up, fwd), up, fwd], 1))
    if which == 1:
        fn = lambda s_, y, p: gaze_pose(s_, y, p - 4)
        hair = dict(wind_rel=(-0.3, 0.3, 0.0013), key=f'frame_hood{which}')
    else:
        fn = sweep_pose
        hair = dict(wind_rel=(0.2, 0.35, 0.0011), key=f'frame_hood{which}', arms=True)
    m, P, N, k = place(s, fn, target, hair)
    N = light_face(m, P, N, (0.5, 1, 1), face['eyes'], k)
    y_cut = face['eyes'][1] - 0.62 * k
    keep = (P[m['F']][:, :, 1] > y_cut).any(1)
    used, Fc = cut(m, P, keep)
    bg = np.abs(a['colorid'][:, 0] - 1) < 0.5
    write_frame(os.path.join(DEC, rel + '.bin.mesh'), m, P, N, used, Fc,
                backdrop=saint_backdrop(a, F, bg, ('uv', 'uv2', 'colorid')))


def frame_profile(s):
    """ProfileScene bust: facing +z in its group (the scene turns it to profile), wind from behind."""
    a, F, face, d = saint('wander/saint-pose-3')
    fwd = np.array([0.0, 0.16, 1.0])
    fwd /= np.linalg.norm(fwd)
    up = np.array([0.0, 1.0, -0.16])
    up -= fwd * up.dot(fwd)
    up /= np.linalg.norm(up)
    right = np.cross(up, fwd)
    target = (face['eyes'], d, np.stack([right, up, fwd], 1))
    m, P, N, k = place(s, lambda s_, y, p: gaze_pose(s_, 0, p), target,
                       dict(wind_rel=(0.0, 0.25, 0.0012), key='frame_profile'))
    N = light_face(m, P, N, (0, 0.5, 2.0), face['eyes'], k, amount=0.75)
    y_cut = face['eyes'][1] - 0.4 * k
    keep = (P[m['F']][:, :, 1] > y_cut).any(1)
    used, Fc = cut(m, P, keep)
    path = os.path.join(DEC, 'wander/saint-pose-3.bin.mesh')
    arrays = {'position': P[used], 'normal': N[used], 'uv': m['uv'][used], 'uv2': m['uv2'][used],
              'windmask': m['wind'][used][:, None]}
    meshio.write(path, {k_: np.asarray(v, np.float32) for k_, v in arrays.items()}, Fc.astype(np.uint32))
    print('profile', len(used), 'verts')


def frame_pillar(s):
    rel = 'pillarcrumble/floating-frame-profile'
    a, F, face, d = saint(rel)
    target = (face['eyes'], d, np.stack([face['right'], face['up'], face['fwd']], 1))
    m, P, N, k = place(s, lambda s_, y, p: gaze_pose(s_, y, p), target,
                       dict(wind_rel=(-0.4, 0.3, 0.0013), key='frame_pillar'))
    N = light_face(m, P, N, (-0.6, 0.5, 1.0), face['eyes'], k)
    y_cut = face['eyes'][1] - 0.85 * k
    keep = (P[m['F']][:, :, 1] > y_cut).any(1)
    used, Fc = cut(m, P, keep)
    # Backdrop: the large islands of the Spirit frame (sky panels), as in the source.
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    n = len(a['position'])
    rows = np.concatenate([F[:, 0], F[:, 1], F[:, 2]])
    cols = np.concatenate([F[:, 1], F[:, 2], F[:, 0]])
    _, lab = connected_components(coo_matrix((np.ones(len(rows)), (rows, cols)), shape=(n, n)), directed=False)
    Pa = a['position']
    keep_c = [c for c in range(lab.max() + 1) if (lab == c).sum() >= 100 and np.ptp(Pa[lab == c], 0).max() > 1.2]
    bg = np.isin(lab, keep_c)
    write_frame(os.path.join(DEC, rel + '.bin.mesh'), m, P, N, used, Fc, colorid_eye=0.0,
                backdrop=saint_backdrop(a, F, bg, ('uv', 'uv2', 'colorid')))


# ---------------------------------------------------------------- eye close-ups

import json  # noqa: E402

import atlas  # noqa: E402

BUILD = os.path.join(HERE, 'build')


def to_frame(P_bl, xf):
    """Posed Blender-space points -> frame space with the last placement."""
    return (M.to_three(P_bl, 1.0) - xf['eyes']) @ xf['R'].T * xf['k'] + xf['t_eyes']


def eye_balls(s):
    EP = s.rest['EP']
    out = {}
    for side, sel in (('L', EP[:, 0] > 0), ('R', EP[:, 0] <= 0)):
        Q = EP[sel]
        c = (Q.min(0) + Q.max(0)) / 2
        out[side] = (c, float(np.linalg.norm(Q - c, axis=1).max()))
    return out


def iris_caps(s, rings=10, segs=40):
    """Spherical caps over the drawn irises on the eyeballs (rest, Blender space): P, F, uv (eye close-up), W, side."""
    fj = json.load(open(os.path.join(BUILD, 'face.json')))
    win, R, ew = fj['win'], fj['R'], fj['eye_window']
    balls = eye_balls(s)
    eyesP, eyesW = s.base_parts[1].P, s.base_parts[1].W
    Ps, Fs, sides = [], [], []
    n = 0
    for e in fj['eyes']:
        icx, icy, ir = e['iris']
        x = win['cx'] + (icx / R - 0.5) * win['size']
        z = win['cz'] + (0.5 - icy / R) * win['size']
        rw = ir / R * win['size']
        side = 'L' if x > 0 else 'R'
        c, r = balls[side]
        dy = math.sqrt(max(r * r - (x - c[0]) ** 2 - (z - c[2]) ** 2, 0.0))
        d = np.array([x, c[1] - dy, z]) - c
        d /= np.linalg.norm(d)
        a = np.cross(d, [0, 0, 1.0])
        a /= np.linalg.norm(a)
        b = np.cross(d, a)
        alpha = math.asin(min(rw / r, 0.95)) * 1.06
        P = [c + d * r * 1.004]
        for i in range(1, rings + 1):
            th = alpha * i / rings
            for j in range(segs):
                ph = 2 * math.pi * j / segs
                v = d * math.cos(th) + (a * math.cos(ph) + b * math.sin(ph)) * math.sin(th)
                P.append(c + v * r * 1.004)
        P = np.array(P)
        F = [(0, 1 + j, 1 + (j + 1) % segs) for j in range(segs)]
        for i in range(rings - 1):
            a0, a1 = 1 + i * segs, 1 + (i + 1) * segs
            for j in range(segs):
                j1 = (j + 1) % segs
                F += [(a0 + j, a1 + j, a1 + j1), (a0 + j, a1 + j1, a0 + j1)]
        F = np.array(F)
        # Outward (-Y is her front): faces must point along d.
        fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
        if np.mean(fn @ d) < 0:
            F = F[:, ::-1]
        Ps.append(P)
        Fs.append(F + n)
        sides += [side] * len(P)
        n += len(P)
    P = np.vstack(Ps)
    W = M.nearest_weights(P, eyesP, eyesW, k=4)
    return P, np.vstack(Fs), atlas.eye_uv(P, ew), W, np.array(sides), ew, win


def closeup_uv(m, ew, win):
    """Atlas uv for a close-up: face-projected vertices inside the eye window move to the high-res crop."""
    uv2 = np.array(m['uv2'], float)
    fu = atlas.FACE_UV
    face = (uv2[:, 0] < fu['u0'] + fu['span']) & (uv2[:, 1] > fu['v0'])
    x = (uv2[:, 0] - fu['u0']) / fu['span'] * win['size'] + win['cx'] - win['size'] / 2
    z = (uv2[:, 1] - fu['v0']) / fu['span'] * win['size'] + win['cz'] - win['size'] / 2
    inside = face & (x > ew['x0']) & (x < ew['x1']) & (z > ew['z0']) & (z < ew['z1'])
    uv2[inside] = atlas.eye_uv(np.c_[x[inside], np.zeros(inside.sum()), z[inside]], ew)
    return uv2


def components(P, F):
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    n = len(P)
    rows = np.concatenate([F[:, 0], F[:, 1], F[:, 2]])
    cols = np.concatenate([F[:, 1], F[:, 2], F[:, 0]])
    return connected_components(coo_matrix((np.ones(len(rows)), (rows, cols)), shape=(n, n)), directed=False)[1]


def place_caps(s, caps_P, caps_W, caps_side, xf):
    """Iris caps posed with the head and placed like the figure; normals point out of the eyeball."""
    balls = eye_balls(s)
    centres = np.where((caps_side == 'L')[:, None], balls['L'][0], balls['R'][0])
    P = to_frame(M.skin(caps_P, caps_W, xf['mats'], s.rest_mats), xf)
    C = to_frame(M.skin(centres, caps_W, xf['mats'], s.rest_mats), xf)
    N = P - C
    return P, N / np.linalg.norm(N, axis=1, keepdims=True)


def straight_pose(s, yaw, pitch):
    gaze_pose(s, 0, 0)


def frame_eyes_cathedral(s):
    """Waking in the grotto: her eyes and brows, irises tinted (colorid 1). Atlas via uv, trim via uv2."""
    rel = 'cathedral/saint-eyes'
    h, a, ix = meshio.read(os.path.join(SAINT, rel + '.bin.mesh'))
    F0 = ix.reshape(-1, 3)
    P0 = a['position']
    lab = components(P0, F0)
    cid = a['colorid'][:, 0]
    iris_c = sorted([P0[lab == c].mean(0) for c in np.unique(lab[cid > 0.5])], key=lambda p: p[0])
    eye_r, eye_l = iris_c[0], iris_c[-1]
    # Keep half of the Spirit frame's Dutch tilt, and leave room for her brows.
    right = (eye_l - eye_r) / np.linalg.norm(eye_l - eye_r)
    right = right + np.array([1.0, 0, 0])
    right /= np.linalg.norm(right)
    fwd = np.cross(right, [0, 1.0, 0])
    fwd /= np.linalg.norm(fwd)
    up = np.cross(fwd, right)
    mid = (eye_l + eye_r) / 2 + np.array([0, -0.14, 0])
    span = 0.85 * np.linalg.norm(eye_l - eye_r)
    caps_P, caps_F, caps_uv, caps_W, caps_side, ew, win = iris_caps(s)
    balls = eye_balls(s)
    r_ball = np.mean([v[1] for v in balls.values()])
    k0 = span / np.linalg.norm(balls['L'][0] - balls['R'][0])
    target = (mid - fwd * r_ball * k0, span, np.stack([right, up, fwd], 1))
    m, P, N, k = place(s, straight_pose, target, dict(key='frame_eyes'))
    xf = place.last
    N = light_face(m, P, N, (0.25, 0.25, 0.2), xf['t_eyes'], k)
    face_c = lab == np.argmax(np.bincount(lab[cid < 0.5]))
    lo, hi = P0[face_c].min(0), P0[face_c].max(0)
    pad = 0.25 * (hi - lo)
    inside = np.all((P > lo - pad) & (P < hi + pad), axis=1)
    keep_v = inside & np.isin(m['kind'], [M.PART['skin'], M.PART['eye'], M.PART['hair'], M.PART['cap']])
    used, Fc = cut(m, P, keep_v[m['F']].all(1))
    uv_atlas = closeup_uv(m, ew, win)
    hairish = np.isin(m['kind'], [M.PART['hair'], M.PART['cap']])
    uv_trim = np.where(hairish[:, None], m['uv'], np.array(M.TRIM_WHITE)[None])
    # Iris caps, posed rigidly with the head and placed like the rest.
    capP, capN = place_caps(s, caps_P, caps_W, caps_side, xf)
    plane = lab == np.argmin([P0[lab == c][:, 2].mean() if (lab == c).any() else 9 for c in range(lab.max() + 1)])
    bP, bN, bF, battrs = saint_backdrop(a, F0, plane, ('uv', 'uv2', 'colorid'))
    # The backdrop is plain paper: its source uvs would sample her face drawing (the lips) in this atlas.
    battrs['uv'] = np.tile(atlas.SKIN_WHITE, (len(bP), 1))
    battrs['uv2'] = np.tile(M.TRIM_WHITE, (len(bP), 1))
    nb = len(used)
    pos = np.concatenate([P[used], capP, bP])
    nor = np.concatenate([N[used], capN, bN])
    uv = np.concatenate([uv_atlas[used], caps_uv, battrs['uv']])
    uv2 = np.concatenate([uv_trim[used], np.tile(M.TRIM_WHITE, (len(capP), 1)), battrs['uv2']])
    col = np.concatenate([np.zeros(nb), np.ones(len(capP)), np.zeros(len(bP))])[:, None]
    F = np.concatenate([Fc, caps_F + nb, bF + nb + len(capP)])
    meshio.write(os.path.join(DEC, rel + '.bin.mesh'),
                 {'position': pos.astype(np.float32), 'normal': nor.astype(np.float32), 'uv': uv.astype(np.float32),
                  'uv2': uv2.astype(np.float32), 'colorid': col.astype(np.float32)}, F.astype(np.uint32))
    print(rel, len(pos), 'verts scale', round(k, 3))


def wide_eyes_delta(s):
    """Rest-space displacement of her body for wide-open eyes and lifted brows (same topology)."""
    import mhbody
    shape = []
    # Wonder, not fright: the lids open a little and the brows lift, the iris still tucked under the upper lid.
    for rel, val, neg, pos in mhbody.SHAPE:
        if 'eye-height1' in rel:
            val = val + 0.25
        elif 'eye-height2' in rel:
            val = val + 0.35
        elif 'eye-height3' in rel:
            val = val + 0.2
        shape.append((rel, val, neg, pos))
    shape.append(('eyebrows/eyebrows-trans', 0.5, 'down', 'up'))
    arm2, body2, eyes2, _ = rig.build(subdiv=1, shape={'shape': shape}, name='wide')
    me = body2.data
    P2 = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', P2)
    P2 = P2.reshape(-1, 3)
    for ob in (arm2, body2, eyes2):
        bpy.data.objects.remove(ob, do_unlink=True)
    assert P2.shape == s.rest['P'].shape, (P2.shape, s.rest['P'].shape)
    d = P2 - s.rest['P']
    # Only the eye region moves (guards against any global drift).
    hc = s.rest['heads'][s.names.index('head')]
    d[s.rest['P'][:, 2] < hc[2]] = 0
    print('wide eyes: max delta %.4f m' % np.abs(d).max())
    return d


def frame_eyes_widen(s):
    """The tide lifts her: a skinned close-up on Spirit's five-bone eye rig, irises tinted (color.r),
    the eyeballs flagged (color.g), and a morph that opens her eyes wide (openeyes)."""
    rel = 'antigravity/eyes-widen'
    h, a, ix = meshio.read(os.path.join(SAINT, rel + '.bin.mesh'))
    bones = h['bones']
    J = np.array([m_[:3, 3] for m_ in meshio.world_matrices(bones)])
    eye_l, eye_r = J[0], J[1]
    right = (eye_l - eye_r) / np.linalg.norm(eye_l - eye_r)
    fwd = np.cross(right, [0, 1.0, 0])
    fwd /= np.linalg.norm(fwd)
    up = np.cross(fwd, right)
    target = ((eye_l + eye_r) / 2, np.linalg.norm(eye_l - eye_r), np.stack([right, up, fwd], 1))
    delta = wide_eyes_delta(s)
    caps_P, caps_F, caps_uv, caps_W, caps_side, ew, win = iris_caps(s)
    m, P, N, k = place(s, straight_pose, target, dict(key='frame_eyes'))
    xf = place.last
    N = light_face(m, P, N, (0.25, 0.25, 0.2), xf['t_eyes'], k)
    si = a['skinIndex'].astype(int)
    face_v = ((si == 2) & (a['skinWeight'] > 0.5)).any(1)
    lo, hi = a['position'][face_v].min(0), a['position'][face_v].max(0)
    pad = 0.15 * (hi - lo)
    inside = np.all((P > lo - pad) & (P < hi + pad), axis=1) & (P[:, 2] > 0.05)
    kinds = [M.PART['skin'], M.PART['eye'], M.PART['hair'], M.PART['cap']]
    keep_v = inside & np.isin(m['kind'], kinds)
    used, Fc = cut(m, P, keep_v[m['F']].all(1))
    uv_atlas = closeup_uv(m, ew, win)
    hairish = np.isin(m['kind'], [M.PART['hair'], M.PART['cap']])
    uv_trim = np.where(hairish[:, None], m['uv'], np.array(M.TRIM_WHITE)[None])
    # Morph: body vertices come first in the merged mesh (in rest-topology order via the part's src).
    body = s.base_parts[0]
    nb_body = len(body.P)
    d_rest = np.zeros((len(m['P']), 3))
    d_rest[:nb_body] = delta[body.src]
    hb = s.names.index('head')
    Rh = xf['mats'][hb][:3, :3] @ np.linalg.inv(s.rest_mats[hb][:3, :3])
    openeyes = ((d_rest @ Rh.T) @ M.B2T.T) @ xf['R'].T * xf['k'] / 11.0
    # Weights on the five-bone rig: 0 eye L, 1 eye R, 2 head, 3 neck, 4 root.
    names = s.names
    head_set = [i for i, n in enumerate(names) if n == 'head' or _descends(s, i, hb)]
    neck_set = [names.index(n) for n in ('neck01', 'neck02', 'neck03')]
    Wf = np.asarray(m['W'])
    W5 = np.zeros((len(P), 5))
    W5[:, 2] = Wf[:, head_set].sum(1)
    W5[:, 3] = Wf[:, neck_set].sum(1)
    W5[:, 4] = np.clip(1 - W5[:, 2] - W5[:, 3], 0, 1)
    eye = m['kind'] == M.PART['eye']
    left = ((P - xf['t_eyes']) @ right) > 0
    W5[eye] = 0
    W5[eye & left, 0] = 1
    W5[eye & ~left, 1] = 1
    color = np.zeros((len(P), 3))
    color[eye, 1] = 1
    capP, capN = place_caps(s, caps_P, caps_W, caps_side, xf)
    capW = np.zeros((len(capP), 5))
    capW[caps_side == 'L', 0] = 1
    capW[caps_side == 'R', 1] = 1
    capC = np.tile([1.0, 0, 0], (len(capP), 1))
    nb = len(used)
    W = np.concatenate([W5[used], capW])
    si4, sw4 = M.top4(W)
    arrays = {
        'position': np.concatenate([P[used], capP]), 'normal': np.concatenate([N[used], capN]),
        'uv': np.concatenate([uv_trim[used], np.tile(M.TRIM_WHITE, (len(capP), 1))]),
        'uv2': np.concatenate([uv_atlas[used], caps_uv]),
        'color': np.concatenate([color[used], capC]),
        'openeyes': np.concatenate([openeyes[used], np.zeros((len(capP), 3))]),
        'eyemasks': np.zeros((nb + len(capP), 3)),
        'skinIndex': si4, 'skinWeight': sw4,
    }
    arrays = {k_: np.asarray(v, np.float32) for k_, v in arrays.items()}
    F = np.concatenate([Fc, caps_F + nb])
    meshio.write(os.path.join(DEC, rel + '.bin.mesh'), arrays, F.astype(np.uint32), bones=bones)
    print(rel, len(arrays['position']), 'verts scale', round(k, 3))


def _descends(s, i, root):
    p = s.parents[i]
    while p >= 0:
        if p == root:
            return True
        p = s.parents[p]
    return False


if __name__ == '__main__':
    sess = assets.Session()
    which = sys.argv[1:] or ['hood1', 'hood2', 'profile', 'pillar']
    if 'hood1' in which:
        frame_hood(sess, 1)
    if 'hood2' in which:
        frame_hood(sess, 2)
    if 'profile' in which:
        frame_profile(sess)
    if 'pillar' in which:
        frame_pillar(sess)
    if 'eyes' in which:
        frame_eyes_cathedral(sess)
    if 'widen' in which:
        frame_eyes_widen(sess)
