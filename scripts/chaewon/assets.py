"""Build Chaewon's runtime assets (bpy session): poses, hair per pose, skinning, export.

    python3 assets.py <asset> [...]

Each asset function sets a pose (or a sequence of poses), grows the hair for
it, assembles the parts and writes the runtime files under public/assets.
"""
import math
import os
import pickle
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '../character'))
sys.path.insert(0, HERE)

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import atlas  # noqa: E402
import bview  # noqa: E402
import dress as dress_mod  # noqa: E402
import export  # noqa: E402
import facemap  # noqa: E402
import hair as hair_mod  # noqa: E402
import hairrig  # noqa: E402
import master as M  # noqa: E402
import poses  # noqa: E402
import rig  # noqa: E402

ROOT = os.path.join(HERE, '../..')
DEC = os.path.join(ROOT, 'public/assets/decoded/story')
BUILD = os.path.join(HERE, 'build')


class Session:
    def __init__(self):
        bview.reset()
        self.arm, self.body, self.eyes, self.info = rig.build(subdiv=1)
        self.rest = dict(np.load(os.path.join(BUILD, 'rest.npz')))
        self.names = [b.name for b in self.arm.data.bones]
        assert self.names == list(self.rest['names'])
        self.parents = self.rest['parents']
        self.rest_world = {n: self.rest['mats'][i] for i, n in enumerate(self.names)}
        self.rest_mats = self.rest['mats']
        self.win = facemap.face_window(self.rest)
        self.sim = dict(np.load(os.path.join(BUILD, 'dress_sim.npz')))
        self.ctx = poses.Ctx(self.arm)
        body, self.body_src = M.body_part(self.rest, self.win)
        eyes = M.eyes_part(self.rest, self.win)
        dress, straps = M.dress_parts(self.rest, self.sim)
        self.base_parts = [body, eyes, dress, straps]

    # -------------------------------------------------------------- pose evaluation
    def pose_mats(self):
        rig.update()
        return np.array([np.array(self.arm.pose.bones[n].matrix) for n in self.names])

    def posed_body(self, mats):
        return M.skin(self.rest['P'], self.rest['W'], mats, self.rest_mats)

    def sdf_for(self, mats, key=None):
        if key:
            path = os.path.join(BUILD, f'sdf_{key}.pkl')
            if os.path.exists(path):
                return pickle.load(open(path, 'rb'))
        P = self.posed_body(mats)
        N = M.vertex_normals(P, self.rest['T'])
        lab = dress_mod.labels(self.names, self.rest['W'])
        hb = self.names.index('head')
        hc = mats[hb][:3, 3]
        k = lab != 1  # arms do not deflect hair (they move freely in front of it)
        lo, hi = hc + np.array([-0.32, -0.32, -0.80]), hc + np.array([0.32, 0.32, 0.20])
        sdf = hair_mod.SDF(P[k], N[k], lo, hi, step=0.006)
        if key:
            pickle.dump(sdf, open(os.path.join(BUILD, f'sdf_{key}.pkl'), 'wb'))
        return sdf

    def head_xf(self, mats):
        hb = self.names.index('head')
        return mats[hb] @ np.linalg.inv(self.rest_mats[hb])

    def hair(self, mats, wind=None, key=None, seed=11):
        sdf = self.sdf_for(mats, key)
        return hair_mod.grow(self.rest, sdf, head_xf=self.head_xf(mats), wind=wind, seed=seed)

    def assemble(self, mats, H):
        """All parts posed by `mats` plus hair styled for this pose. Returns merged dict in pose space."""
        parts = []
        for p in self.base_parts:
            q = M.Part(M.skin(p.P, p.W, mats, self.rest_mats), p.F, p.uv, p.uv2, p.W, 'skin', p.color, p.wind, p.soft)
            q.kind, q.src = p.kind, p.src
            parts.append(q)
        posedP = self.posed_body(mats)
        hparts = M.hair_parts(self.rest, H, posedP, self.names)
        parts += hparts
        hx = self.head_xf(mats)
        fwd = hx[:3, :3] @ np.array([0, -1.0, 0])
        return M.merge(parts, topo=(posedP, self.rest['T']), forward=fwd)

    def assemble_rest_bound(self, mats, H):
        """Parts in the rest pose for skinning; hair grown in `mats` pose is inverse-skinned back to rest."""
        posedP = self.posed_body(mats)
        hparts = M.hair_parts(self.rest, H, posedP, self.names)
        for p in hparts:
            p.P = inverse_skin(p.P, p.W, mats, self.rest_mats)
        return M.merge(self.base_parts + hparts, topo=(self.rest['P'], self.rest['T']))


def inverse_skin(P, W, mats_pose, mats_rest):
    Mb = np.einsum('bij,bjk->bik', mats_pose, np.linalg.inv(mats_rest))
    Mv = np.einsum('vb,bij->vij', W, Mb)
    Ph = np.c_[P, np.ones(len(P))]
    return np.einsum('vij,vj->vi', np.linalg.inv(Mv), Ph)[:, :3]


def color_attr(m):
    c = m['color'].copy()
    return c.astype(np.float32)


# ------------------------------------------------------------------ assets

def wind_field(direction, strength=0.0012, gust=0.4, seed=3):
    rng = np.random.default_rng(seed)
    d = np.asarray(direction, float)
    d /= np.linalg.norm(d)
    phases = rng.uniform(0, 6.28, 4)

    def wind(X, it):
        t = np.linspace(0, 1, X.shape[1]) ** 1.2
        g = 1 + gust * np.sin(X[..., 2] * 9 + phases[0]) * np.sin(X[..., 0] * 13 + phases[1])
        F = d[None, None] * (strength * t)[None, :, None] * g[..., None]
        F[..., 2] += strength * 0.25 * t[None, :] * np.sin(X[..., 0] * 17 + phases[2])
        return F
    return wind


def bow_pose(s, t=0.0):
    """At the bow: right hand on the forestay, weight on the left leg, chin up into the wind."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    sw = math.sin(2 * math.pi * t)
    sw2 = math.sin(2 * math.pi * t - 0.9)
    br = math.sin(2 * math.pi * 2 * t)
    poses.hips(arm, shift=(0.022 + 0.006 * sw, 0, -0.006 + 0.003 * sw2), roll=4 + 1.2 * sw, yaw=4 + 1.0 * sw2)
    poses.plant_leg(ctx, 'L')
    a = ctx.ankle['R']
    poses.plant_leg(ctx, 'R', ankle=(a.x + 0.03, a.y - 0.06, a.z + 0.015), knee_dir=(0.3, -1, 0), foot_yaw=14, foot_pitch=-6)
    poses.spine(arm, roll=-6 - 1.0 * sw, yaw=-6 - 1.5 * sw2, pitch=-3 + 0.8 * br)
    poses.clavicle(arm, 'R', lift=4)
    grip = s.ctx.shoulder['R'] + Vector((0.08, -0.25, 0.22))
    poses.arm_to(ctx, 'R', grip, elbow_dir=(-1, -0.1, -0.7),
                 wrist=(Vector((0.05, -0.25, 1.0)), Vector((0.6, 0.4, 0.0))),
                 hand=dict(curl=0.82, close=0.95, thumb=0.85))
    poses.relaxed_arm(ctx, 'L', out=0.22 + 0.02 * sw, fwd=0.05, bend=20)
    poses.head(arm, pitch=-8 + 1.5 * sw2, yaw=6 + 2.0 * math.sin(2 * math.pi * t + 1.7), roll=4 + 1.0 * sw)


def skinned_with_hair(s, mats_bind, H, mesh_path, anim_path, pose_fn, frames, amp=1.0, wind_dir=(0, 1, 0.1),
                      cycles=(1, 2)):
    """Skinned export with hair chains: bind pose = mats_bind, animation from pose_fn(t)."""
    hb = s.names.index('head')
    hr = hairrig.HairRig(H, mats_bind[hb], s.rest_mats[hb])
    names_x, parents_x, rest_x = hr.extend(s.names, s.parents, s.rest_mats)
    keep = M.KEEP + hr.names
    posedP = s.posed_body(mats_bind)
    hparts = M.hair_parts(s.rest, H, posedP, s.names)
    hparts[0].W = hr.hair_weights(hparts[0].W, names_x, None)
    hparts[1].W = np.c_[hparts[1].W, np.zeros((len(hparts[1].P), len(hr.names)), np.float32)]
    bind_x = np.concatenate([mats_bind, np.array(hr.bind_world)])
    for p in hparts:
        p.P = inverse_skin(p.P, p.W, bind_x, rest_x)
    base = []
    for p in s.base_parts:
        q = M.Part(p.P, p.F, p.uv, p.uv2, np.c_[p.W, np.zeros((len(p.P), len(hr.names)), np.float32)], 'skin',
                   p.color, p.wind, p.soft)
        q.kind, q.src = p.kind, p.src
        base.append(q)
    m = M.merge(base + hparts, topo=(s.rest['P'], s.rest['T']))
    export.write_skinned(mesh_path, m['P'], m['F'], m['uv'], m['uv2'], m['W'], names_x, parents_x, rest_x,
                         color=color_attr(m), N_bl=m['N'], keep=keep)
    anim = []
    for f in range(frames):
        t = f / frames
        pose_fn(s, t)
        mats = s.pose_mats()
        d = {n: mats[i] for i, n in enumerate(s.names)}
        d.update(hr.frame(mats[hb], s.rest_mats[hb], t, amp=amp, wind_dir=wind_dir, cycles=cycles))
        anim.append(d)
    export.write_animation(anim_path, anim, names_x, parents_x, keep=keep)
    return m, hr


def grip_point(s, side='R'):
    """Centre of a closed hand (three space, export scale): where a rope passes through the fist."""
    pb = s.arm.pose.bones
    pts = [pb[f'finger{f}-1.{side}'].head for f in (2, 3, 4, 5)] + [pb[f'finger{f}-2.{side}'].head for f in (2, 3, 4, 5)]
    c = sum(pts, Vector((0, 0, 0))) / len(pts)
    n = rig.palm_normal(s.arm, side)
    c = c + n * 0.025
    return (M.B2T @ np.array(c)) * M.SCALE


def asset_bow(s):
    import json
    bow_pose(s, 0.0)
    mats0 = s.pose_mats()
    json.dump(dict(grip=grip_point(s).tolist(), feet=[(M.B2T @ np.array(s.arm.pose.bones[f'foot.{x}'].head) * M.SCALE).tolist()
                                                       for x in 'LR']),
              open(os.path.join(BUILD, 'bow_grip.json'), 'w'))
    H = s.hair(mats0, wind=wind_field((0, 1, 0.15), 0.0011), key='bow')
    m, hr = skinned_with_hair(s, mats0, H, os.path.join(DEC, 'sea/chaewon-bow.bin.mesh'),
                              os.path.join(DEC, 'sea/chaewon-bow-anim.bin.mesh'), bow_pose, 80, amp=1.0)
    print('bow', len(m['P']), 'verts', len(hr.names), 'hair bones')




# ------------------------------------------------------------------ hand reaching into the water

SAINT = os.path.join(ROOT, 'reference/saint')


def saint_track(mesh_rel, anim_rel, frames):
    """World joint matrices (three space) of a saint rig over frames."""
    import meshio
    sys.path.insert(0, os.path.join(HERE, '../character'))
    import anim as saint_anim
    h, a, _ = meshio.read(os.path.join(SAINT, mesh_rel))
    ah, aa, _ = meshio.read(anim_rel if os.path.isabs(anim_rel) else os.path.join(ROOT, 'public/assets/decoded/story', anim_rel))
    out = []
    for f in frames:
        out.append(np.array(saint_anim.frame_matrices(h['bones'], aa, f)))
    return h['bones'], out


def asset_hand(s, frames=64):
    """Right arm reaching into the glowing water: saint motion path, Chaewon's arm and a graceful hand."""
    bones_s, track = saint_track('hand/arm-skin.bin.mesh', os.path.join(BUILD, 'saint-arm-anim.bin.mesh'), range(frames))
    idx = {b['name']: i for i, b in enumerate(bones_s)}
    T2B = M.B2T.T
    pos = lambda Mw, n: Mw[idx[n]][:3, 3]
    # Scale: match shoulder -> wrist length.
    f0 = track[25]
    saint_len = np.linalg.norm(pos(f0, 'arm_lower') - pos(f0, 'arm_upper')) + np.linalg.norm(pos(f0, 'hand') - pos(f0, 'arm_lower'))
    pb = s.arm.pose.bones
    rig.reset_pose(s.arm)
    my_len = (pb['upperarm01.R'].head - pb['lowerarm01.R'].head).length + (pb['lowerarm01.R'].head - pb['wrist.R'].head).length
    scale = saint_len / my_len
    to_bl = lambda p: Vector(T2B @ p / scale)

    def pose_frame(f):
        Mw = track[f]
        rig.reset_pose(s.arm)
        sh_t = to_bl(pos(Mw, 'arm_upper'))
        sh = s.arm.pose.bones['upperarm01.R'].head
        poses.hips(s.arm, shift=tuple(sh_t - sh))
        el, wr = to_bl(pos(Mw, 'arm_lower')), to_bl(pos(Mw, 'hand'))
        knuck = to_bl(pos(Mw, 'middle1'))
        ip, pp = to_bl(pos(Mw, 'index1')), to_bl(pos(Mw, 'pinky1'))
        poses.arm_to(s.ctx, 'R', wr, elbow_dir=tuple((el - (sh_t + wr) / 2).normalized()))
        d = (knuck - wr).normalized()
        rig.aim(s.arm, 'wrist.R', d)
        across = (ip - pp).normalized()
        palm = across.cross(d).normalized()  # right hand: index x forward -> palm side
        poses.face_palm(s.arm, 'R', palm)
        # Reach: relaxed curl at hover (f <= 25) opening gracefully to an elegant extended hand (f >= 55).
        u = np.clip((f - 25) / 30, 0, 1)
        u = u * u * (3 - 2 * u)
        curl = 0.58 * (1 - u) + 0.14 * u
        rig.hand_pose(s.arm, 'R', curl=curl, close=0.45 + 0.25 * u, thumb=0.45 - 0.2 * u,
                      cascade=(0.7, 0.95, 1.15, 1.45))
        # Fingertip noise is added in the scene; keep the index a touch straighter for a leading line.
        return s.pose_mats()

    # Bind pose: frame 25 (hover).
    mats_bind = pose_frame(25)
    names_x = list(s.names) + ['hand_bone_parent']
    parents_x = list(s.parents) + [s.names.index('lowerarm02.R')]
    parents_x[s.names.index('wrist.R')] = len(names_x) - 1
    wi = s.names.index('wrist.R')

    def ext(mats):
        return np.concatenate([mats, mats[wi][None]])
    rest_x = ext(s.rest_mats)
    rename = {'lowerarm01.R': 'arm_lower', 'upperarm01.R': 'arm_upper', 'wrist.R': 'hand',
              'hand_bone_parent': 'hand_bone_parent', 'shoulder01.R': 'shoulder', 'root': 'spine'}
    for mh, sn in ((2, 'index'), (3, 'middle'), (4, 'ring'), (5, 'pinky'), (1, 'thumb')):
        for k in (1, 2, 3):
            rename[f'finger{mh}-{k}.R'] = f'{sn}{k}'
    keep = ['lowerarm01.R', 'upperarm01.R', 'wrist.R', 'hand_bone_parent'] + \
           [f'finger{m}-{k}.R' for m in (2, 3, 5, 4) for k in (1, 2, 3)] + ['shoulder01.R', 'root'] + \
           [f'finger1-{k}.R' for k in (1, 2, 3)]
    # Arm skin only (shoulder to fingertips), posed at the bind frame.
    body = s.base_parts[0]
    names = s.names
    arm_bones = [i for i, n in enumerate(names) if n.endswith('.R') and n.startswith(
        ('upperarm', 'lowerarm', 'wrist', 'finger', 'metacarpal', 'shoulder01'))]
    armw = body.W[:, arm_bones].sum(1)
    keepv = armw > 0.35
    tri = body.F[keepv[body.F].all(1)]
    used = np.unique(tri)
    remap = -np.ones(len(body.P), int)
    remap[used] = np.arange(len(used))
    F = remap[tri]
    Wx = np.c_[body.W[used], np.zeros(len(used))]
    Nfull = M.vertex_normals(s.posed_body(mats_bind), s.rest['T'])
    Pb = M.skin(body.P[used], body.W[used], mats_bind, s.rest_mats)
    Nb = Nfull[body.src[used]]
    uv = np.tile(M.TRIM_WHITE, (len(used), 1))
    uv2 = np.tile([-0.6, 0.0], (len(used), 1))
    bind_x = ext(mats_bind)
    path = os.path.join(DEC, 'hand/arm-skin.bin.mesh')
    export.write_skinned(path, Pb, F, uv, uv2, Wx, names_x, np.array(parents_x), bind_x, keep=keep, scale=scale,
                         N_bl=Nb, rename=rename, extra={'windmask': np.zeros((len(Pb), 3), np.float32)})
    anim = []
    for f in range(frames):
        mats = ext(pose_frame(f))
        anim.append({n: mats[i] for i, n in enumerate(names_x)})
    export.write_animation(os.path.join(DEC, 'hand/arm.bin.mesh'), anim, names_x, np.array(parents_x),
                           keep=keep, scale=scale)
    # The header names must match the renamed bones: rewrite the bind mesh skinning against bind (not rest).
    print('hand', len(Pb), 'verts scale', round(scale, 3))



# ------------------------------------------------------------------ static poses

def write_static_asset(s, rel, mats, H, clip=None, windmask=True):
    m = s.assemble(mats, H)
    P, F = m['P'], m['F']
    if clip is not None:
        keepf = (P[F][:, :, 2] > clip).any(1)
        F = F[keepf]
        used = np.unique(F)
        remap = -np.ones(len(P), int)
        remap[used] = np.arange(len(used))
        F = remap[F]
        m = {k: (v[used] if isinstance(v, np.ndarray) and len(v) == len(P) else v) for k, v in m.items()}
        P = m['P']
    extra = {'windmask': m['wind'][:, None].astype(np.float32)} if windmask else {}
    export.write_static(os.path.join(DEC, rel), P, F, m['uv'], m['uv2'], extra=extra, N_bl=m['N'])
    print(rel, len(P), 'verts')
    return m


def near_pose(s):
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    poses.contrapposto(ctx, 'R', 0.8)
    for side, sgn in (('L', 1), ('R', -1)):
        poses.relaxed_arm(ctx, side, out=0.30, fwd=0.12, bend=24, hand=dict(curl=0.22, close=0.55, thumb=0.25))
    poses.clavicle(arm, 'L', lift=3)
    poses.clavicle(arm, 'R', lift=3)
    poses.head(arm, pitch=-16, yaw=-4, roll=-5)


def onsea_pose(s):
    """Standing on the sea, body toward the horizon, looking back over her left shoulder,
    right fingertips touching the pendant at her collarbone."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    poses.contrapposto(ctx, 'L', 1.1)
    poses.spine(arm, yaw=34, pitch=-2)
    poses.relaxed_arm(ctx, 'L', out=0.2, fwd=-0.08, bend=18)
    neck = s.arm.pose.bones['neck01'].head
    poses.arm_to(ctx, 'R', neck + Vector((0.03, -0.11, -0.10)), elbow_dir=(-1, 0.2, -0.8),
                 wrist=(Vector((0.4, -0.2, 0.75)), Vector((0.2, 1, 0))), hand=dict(curl=0.3, close=0.8, thumb=0.3))
    poses.head(arm, pitch=-2, yaw=48, roll=8, neck_share=0.55)


def target_pose(s):
    """Stepping into the light: mid-stride, arms a little away from the body."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    poses.hips(arm, shift=(0.0, -0.06, -0.015), yaw=-6)
    a, b = ctx.ankle['L'], ctx.ankle['R']
    poses.plant_leg(ctx, 'L', ankle=(a.x - 0.02, a.y - 0.24, a.z + 0.01), foot_pitch=4)
    poses.plant_leg(ctx, 'R', ankle=(b.x + 0.02, b.y + 0.14, b.z + 0.07), knee_dir=(0, -1, 0), foot_pitch=-28)
    poses.spine(arm, yaw=5, pitch=-1)
    poses.relaxed_arm(ctx, 'L', out=0.34, fwd=0.18, bend=20, hand=dict(curl=0.2, close=0.5, thumb=0.25))
    poses.relaxed_arm(ctx, 'R', out=0.34, fwd=-0.12, bend=20, hand=dict(curl=0.2, close=0.5, thumb=0.25))
    poses.head(arm, pitch=-6, yaw=-3)


def grotto_pose(s):
    """In the grotto, facing the altar: weight on the left leg, right hand lifting to her hair."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    poses.contrapposto(ctx, 'L', 0.9)
    poses.relaxed_arm(ctx, 'L', out=0.2, fwd=0.0, bend=16)
    head = s.arm.pose.bones['head'].head
    poses.arm_to(ctx, 'R', head + Vector((-0.11, 0.02, -0.06)), elbow_dir=(-1, 0.4, -0.5),
                 wrist=(Vector((0.1, 0.1, 1)), Vector((1, 0, 0))), hand=dict(curl=0.3, close=0.7, thumb=0.3))
    poses.head(arm, pitch=-3, yaw=-10, roll=-6)


def selection_pose(s):
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    poses.contrapposto(ctx, 'R', 1.0)
    poses.relaxed_arm(ctx, 'R', out=0.16, bend=18)
    hip = s.arm.pose.bones['upperleg01.L'].head
    poses.arm_to(ctx, 'L', hip + Vector((0.075, 0.0, 0.10)), elbow_dir=(1, 0.3, 0),
                 wrist=(Vector((-0.6, -0.1, -0.8)), Vector((-1, 0, 0))), hand=dict(curl=0.25, close=0.85, thumb=0.2))
    poses.head(arm, pitch=4, yaw=-8, roll=-8)


def asset_statics(s, which=('approach', 'near', 'onsea', 'target', 'grotto', 'selection')):
    up_wind = wind_field((0, 1.0, 0.3), 0.0008)
    specs = {
        'approach': (lambda: bow_pose(s, 0.0), wind_field((0, 1, 0.15), 0.0011), 'sea/chaewon-approach.bin.mesh', None),
        'near': (lambda: near_pose(s), up_wind, 'sea/chaewon-near.bin.mesh', None),
        'onsea': (lambda: onsea_pose(s), wind_field((1, 0.6, 0.1), 0.0008), 'sea/chaewon-onsea.bin.mesh', None),
        'target': (lambda: target_pose(s), wind_field((0, 1, 0.1), 0.0009), 'sea/chaewon-target.bin.mesh', None),
        'grotto': (lambda: grotto_pose(s), None, 'grotto/chaewon-grotto.bin.mesh', 0.66),
        'selection': (lambda: selection_pose(s), None, 'grotto/chaewon-selection.bin.mesh', None),
    }
    for name in which:
        fn, wind, rel, clip = specs[name]
        fn()
        mats = s.pose_mats()
        H = s.hair(mats, wind=wind, key='static_' + name)
        write_static_asset(s, rel, mats, H, clip=clip)


if __name__ == '__main__':
    sess = Session()
    for name in sys.argv[1:]:
        globals()['asset_' + name](sess)
