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

    def sdf_for(self, mats, key=None, arms=False):
        if key:
            path = os.path.join(BUILD, f'sdf_{key}.pkl')
            if os.path.exists(path):
                return pickle.load(open(path, 'rb'))
        P = self.posed_body(mats)
        N = M.vertex_normals(P, self.rest['T'])
        lab = dress_mod.labels(self.names, self.rest['W'])
        hb = self.names.index('head')
        hc = mats[hb][:3, 3]
        # Arms usually do not deflect hair (they move freely in front of it); raised arms do. The
        # shoulder caps always do, so hair cannot fall into the gap where the arm meets the torso.
        dom = np.array(self.names)[self.rest['W'].argmax(1)]
        cap = np.char.startswith(dom.astype(str), 'shoulder01')
        k = np.ones(len(lab), bool) if arms else (lab != 1) | cap
        lo, hi = hc + np.array([-0.32, -0.32, -0.80]), hc + np.array([0.32, 0.32, 0.20])
        # Hair lies over the dress, not between it and the skin: the dress surface joins the field.
        d = self.base_parts[2]
        Pd = M.skin(d.P, d.W, mats, self.rest_mats)
        Nd = M.vertex_normals(Pd, d.F)
        sdf = hair_mod.SDF(np.vstack([P[k], Pd]), np.vstack([N[k], Nd]), lo, hi, step=0.006)
        if key:
            pickle.dump(sdf, open(os.path.join(BUILD, f'sdf_{key}.pkl'), 'wb'))
        return sdf

    def head_xf(self, mats):
        hb = self.names.index('head')
        return mats[hb] @ np.linalg.inv(self.rest_mats[hb])

    def hair(self, mats, wind=None, key=None, seed=11, arms=False, sweep=None):
        sdf = self.sdf_for(mats, key, arms)
        # Behind her chest in this pose: the rest pose's +Y turned by the upper spine.
        sb = self.names.index('spine01')
        back = (mats[sb] @ np.linalg.inv(self.rest_mats[sb]))[:3, :3] @ np.array([0, 1.0, 0])
        return hair_mod.grow(self.rest, sdf, head_xf=self.head_xf(mats), wind=wind, seed=seed, sweep=sweep,
                             back_dir=back)

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
    """At the bow: her right hand high on the forestay, the arm long, leaning out a little into the wind; her
    weight on the right leg (the knee soft for the swell), the left foot forward on its ball, bracing; her
    left arm opened out behind her, fingers spread to the wind; chin lifted, eyes on the horizon."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    sw = math.sin(2 * math.pi * t)
    sw2 = math.sin(2 * math.pi * t - 0.9)
    br = math.sin(2 * math.pi * 2 * t)
    poses.hips(arm, shift=(-0.024 + 0.006 * sw, 0, 0), roll=4.5 + 1.2 * sw, yaw=-5 + 1.0 * sw2)
    poses.stand_on(ctx, 'R', bend=7 + 2 * sw)
    poses.plant_leg(ctx, 'R')
    a = ctx.ankle['L']
    poses.plant_leg(ctx, 'L', ankle=(a.x + 0.02, a.y - 0.13, a.z), knee_dir=(0.25, -1, 0), foot_yaw=10,
                    foot_pitch=-10, on_ball=True)
    poses.spine(arm, roll=-5 - 1.0 * sw, yaw=9 + 1.5 * sw2, pitch=-2 + 0.8 * br)
    poses.clavicle(arm, 'R', lift=12)
    grip = s.ctx.shoulder['R'] + Vector((-0.19, -0.29, 0.36))
    poses.arm_to(ctx, 'R', grip, elbow_dir=(-1, 0.45, -0.4),
                 wrist=(Vector((-0.15, -0.45, 1.0)), Vector((0.85, -0.2, 0.0))),
                 hand=dict(curl=0.8, close=0.9, thumb=0.8))
    pb = arm.pose.bones
    rig.update()
    sh = pb['upperarm01.L'].head
    poses.arm_to(ctx, 'L', sh + Vector((0.36 + 0.015 * sw, 0.13, -0.36)), elbow_dir=(0.35, 0.4, -1),
                 wrist=(Vector((0.65, 0.35, -0.65)), Vector((0.05, -1, 0.25))))
    rig.hand_shape(arm, 'L', **DANCER)
    poses.head(arm, pitch=-11 + 1.5 * sw2, yaw=14 + 2.0 * math.sin(2 * math.pi * t + 1.7), roll=-4 + 1.0 * sw)


def skinned_with_hair(s, mats_bind, H, mesh_path, anim_path, pose_fn, frames, amp=1.0, wind_dir=(0, 1, 0.1),
                      cycles=(1, 2), extra_parts=(), more_anims=(), inclusive=False):
    """Skinned export with hair chains: bind pose = mats_bind, animation from pose_fn(t).

    extra_parts: rest-space Parts weighted to the body bones (e.g. jewellery).
    more_anims: further clips [(path, pose_fn, frames, dict(amp=, cycles=, inclusive=))] on the same rig.
    inclusive: t runs 0..1 inclusive (a scrubbed clip) instead of a loop."""
    hb = s.names.index('head')
    hr = hairrig.HairRig(H, mats_bind[hb], s.rest_mats[hb])
    names_x, parents_x, rest_x = hr.extend(s.names, s.parents, s.rest_mats)
    keep = M.KEEP + hr.names
    posedP = s.posed_body(mats_bind)
    hparts = M.hair_parts(s.rest, H, posedP, s.names)
    hparts[0].W = hr.hair_weights(hparts[0].W, names_x, near=getattr(hparts[0], 'near', None))
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
    extra = []
    for p in extra_parts:
        q = M.Part(p.P, p.F, p.uv, p.uv2, np.c_[p.W, np.zeros((len(p.P), len(hr.names)), np.float32)], 'strap',
                   p.color, p.wind, p.soft)
        extra.append(q)
    m = M.merge(base + hparts + extra, topo=(s.rest['P'], s.rest['T']))
    export.write_skinned(mesh_path, m['P'], m['F'], m['uv'], m['uv2'], m['W'], names_x, parents_x, rest_x,
                         color=color_attr(m), N_bl=m['N'], keep=keep)
    clips = [(anim_path, pose_fn, frames, dict(amp=amp, cycles=cycles, inclusive=inclusive))] + list(more_anims)
    for path, fn, n, kw in clips:
        anim = []
        for f in range(n):
            t = f / (n - 1) if kw.get('inclusive') else f / n
            fn(s, t)
            mats = s.pose_mats()
            d = {nm: mats[i] for i, nm in enumerate(s.names)}
            d.update(hr.frame(mats[hb], s.rest_mats[hb], t, amp=kw.get('amp', 1.0), wind_dir=wind_dir,
                              cycles=kw.get('cycles', (1, 2))))
            anim.append(d)
        export.write_animation(path, anim, names_x, parents_x, keep=keep)
    return m, hr


def smoothstep(a, b, x):
    u = min(max((x - a) / (b - a), 0.0), 1.0)
    return u * u * (3 - 2 * u)


def pinch_point(s, side):
    pb = s.arm.pose.bones
    rig.update()
    return np.array((pb[f'finger2-3.{side}'].tail + pb[f'finger1-3.{side}'].tail) / 2)


PINCH = dict(mcp=(34, 30, 34, 38), pip=(46, 58, 62, 60), dip=(26, 34, 34, 30), spread=(-4, 0, 6, 13),
             thumb=(-14, 46, 34, 20, 26))
OPEN = dict(mcp=(10, 14, 18, 20), pip=(14, 22, 28, 30), dip=(6, 10, 12, 12), spread=(-8, 0, 7, 15),
            thumb=(-34, 30, 12, 8, 10))


def capture_pose(arm):
    return {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy()) for pb in arm.pose.bones}


def blend_pose(arm, A, B, u):
    """Bone-local blend between two captured poses (slerped rotations): a natural FK transition."""
    for pb in arm.pose.bones:
        la, qa = A[pb.name]
        lb, qb = B[pb.name]
        pb.location = la.lerp(lb, u)
        pb.rotation_quaternion = qa.slerp(qb, u)
    rig.update()


def clasp_pose(s, clasp):
    """Both hands at her nape, fingertips pinching the chain ends together (clasp 0 -> 1 closes them)."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    poses.contrapposto(ctx, 'R', 0.55)
    poses.spine(arm, pitch=-4, yaw=2, roll=-1)
    for side in ('L', 'R'):
        poses.clavicle(arm, side, lift=13)
    pb = arm.pose.bones
    rig.update()
    # The clasp sits at the nape; her fingertips meet there from either side, palms toward her neck,
    # elbows lifted forward so her arms frame her face.
    nape = pb['neck02'].head + Vector((0, 0.062, -0.006))
    for side, sgn in (('L', 1), ('R', -1)):
        gap = 0.026 * (1 - clasp) + 0.008
        target = nape + Vector((sgn * gap, 0.006, 0))
        fingers = Vector((-sgn * 0.92, 0.18, 0.34)).normalized()
        wrist_pos = target - fingers * 0.092
        for _ in range(3):
            # Solve so the pinch (thumb and index tips), not the wrist, lands on the target.
            poses.arm_to(ctx, side, wrist_pos, elbow_dir=(sgn * 0.75, -1.3, 0.3),
                         wrist=(fingers, Vector((0, -1, 0.1))))
            rig.hand_shape(arm, side, **PINCH)
            wrist_pos = wrist_pos + (target - Vector(pinch_point(s, side)))
    # Head bowed into the task.
    poses.head(arm, pitch=7 - 3 * clasp, yaw=-3, roll=-4)


def capture_arm(s, side):
    pb = s.arm.pose.bones
    rig.update()
    return dict(sh=pb[f'upperarm01.{side}'].head.copy(), el=pb[f'lowerarm01.{side}'].head.copy(),
                wr=pb[f'wrist.{side}'].head.copy(), dir=rig.bone_dir(s.arm, f'wrist.{side}'),
                palm=rig.palm_normal(s.arm, side))


def fasten_pose(s, p):
    """The hold scrubs this clip: hands close the clasp (p 0 -> 0.72), then let go, slide forward
    beside her neck and settle into the first frame of the charm loop (-> 1)."""
    if p <= 0.72:
        clasp_pose(s, smoothstep(0.0, 0.72, p))
        return
    u = smoothstep(0.72, 1.0, p)
    clasp_pose(s, 1.0)
    A, IA = capture_pose(s.arm), {x: capture_arm(s, x) for x in 'LR'}
    charm_pose(s, 0.0)
    B, IB = capture_pose(s.arm), {x: capture_arm(s, x) for x in 'LR'}
    blend_pose(s.arm, A, B, u)          # torso, head, clavicles and fingers
    neck = s.arm.pose.bones['neck01'].head
    for side, sgn in (('L', 1), ('R', -1)):
        a, b = IA[side], IB[side]
        c = neck + Vector((sgn * 0.15, -0.09, 0.03))      # beside the neck, in front of the shoulder
        wr = a['wr'] * (1 - u) ** 2 + c * 2 * u * (1 - u) + b['wr'] * u ** 2
        ea = (a['el'] - (a['sh'] + a['wr']) / 2).normalized()
        eb = (b['el'] - (b['sh'] + b['wr']) / 2).normalized()
        # The elbows drop down and out as the hands come forward (never swinging up and out to the side).
        em = Vector((sgn * 0.45, 0.15, -1.0)).normalized()
        el = (ea * (1 - u) ** 2 + em * 2 * u * (1 - u) + eb * u ** 2).normalized()
        d = a['dir'].lerp(b['dir'], u).normalized()
        palm = a['palm'].lerp(b['palm'], u).normalized()
        fingers = {n: s.arm.pose.bones[f'{n}.{side}'].rotation_quaternion.copy() for n in rig.FINGER_BONES}
        poses.arm_to(s.ctx, side, wr, elbow_dir=tuple(el), wrist=(d, palm))
        for n, q in fingers.items():
            s.arm.pose.bones[f'{n}.{side}'].rotation_quaternion = q
        rig.update()


def torso_clearance(s, side):
    """(signed distance, outward normal) of the finger joint of `side` that sits deepest in her torso, in
    the current pose. The dress lies about a centimetre over the skin, so a hand resting on her needs about
    two centimetres of clearance to stay over it."""
    from scipy.spatial import cKDTree
    import dress as dress_mod
    if not hasattr(s, '_torso'):
        names = list(s.rest['names'])
        dom = np.asarray(s.rest['W']).argmax(1)
        s._torso = np.array([names[k].startswith(('spine', 'breast', 'neck', 'clavicle', 'pectoral')) for k in dom])
    mats = s.pose_mats()
    P = s.posed_body(mats)
    N = dress_mod.vertex_normals(P, s.rest['T'])[s._torso]
    P = P[s._torso]
    pb = s.arm.pose.bones
    rig.update()
    pts = np.array([np.array(pb[f'finger{f}-{k}.{side}'].tail) for f in range(1, 6) for k in (1, 2, 3)
                    if f'finger{f}-{k}.{side}' in pb])
    d, j = cKDTree(P).query(pts)
    sd = d * np.sign(((pts - P[j]) * N[j]).sum(1))
    i = int(np.argmin(sd))
    return float(sd[i]), N[j[i]]


def charm_pose(s, t):
    """Afterwards: fingertips resting on the pendant, a slow sway (loop)."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    sw = math.sin(2 * math.pi * t)
    sw2 = math.sin(2 * math.pi * t - 1.1)
    br = math.sin(2 * math.pi * 2 * t)
    poses.contrapposto(ctx, 'L', 0.75 + 0.12 * sw)
    poses.spine(arm, pitch=-2 + 0.7 * br, yaw=-4 + 2 * sw2, roll=1.5 * sw)
    poses.clavicle(arm, 'R', lift=4)
    pb = arm.pose.bones
    rig.update()
    # Index fingertip resting on the right of the pendant; the hand lies along her chest, palm in.
    pend = pb['neck01'].head + Vector((-0.004, -0.13, -0.112))       # on the skin of her upper chest
    tip_target = pend + Vector((-0.017, -0.03, -0.006))   # over the bodice, not under it
    fingers = Vector((0.42, -0.08, 0.9)).normalized()
    for _ in range(3):
        wrist_pos = tip_target - fingers * 0.15 + Vector((0, -0.03, 0))
        for _ in range(4):
            poses.arm_to(ctx, 'R', wrist_pos, elbow_dir=(-0.6, 0.3, -1), wrist=(fingers, Vector((0.15, 1, 0.1))))
            rig.hand_shape(arm, 'R', mcp=(6, 12, 18, 24), pip=(8, 20, 28, 32), dip=(4, 10, 13, 14),
                           spread=(-6, 0, 8, 16), thumb=(-34, 34, 14, 8, 10))
            rig.update()
            wrist_pos = wrist_pos + (tip_target - pb['finger2-3.R'].tail)
        # The whole hand rests over the dress: lift it off her where any finger sinks in.
        d, n = torso_clearance(s, 'R')
        if d >= 0.019:
            break
        tip_target = tip_target + Vector(tuple(n * (0.021 - d)))
    poses.relaxed_arm(ctx, 'L', out=0.2 + 0.015 * sw, fwd=0.04, bend=18, hand=dict(curl=0.22, close=0.6, thumb=0.35))
    poses.head(arm, pitch=4 + 2 * sw2, yaw=10 + 3 * sw, roll=7 + 1.5 * sw2)


def asset_fasten(s):
    """The fastening close-up (scrubbed by the hold) and the charm loop, sharing one skinned mesh."""
    import necklace
    fasten_pose(s, 0.0)
    mats0 = s.pose_mats()
    pinch = {side: pinch_point(s, side) for side in 'LR'}
    # All her hair brought forward over both shoulders, parted down the back of her head: the nape is bare
    # for the clasp.
    H = s.hair(mats0, key='fasten', arms=True, sweep='front')
    parts, info = necklace.build(s, mats0, pinch)
    print('necklace', {k: np.round(v, 3).tolist() if hasattr(v, '__len__') else round(v, 3) for k, v in info.items()})
    m, hr = skinned_with_hair(
        s, mats0, H, os.path.join(DEC, 'grotto/chaewon-fasten.bin.mesh'),
        os.path.join(DEC, 'grotto/chaewon-fasten-anim.bin.mesh'), fasten_pose, 61, amp=0.35, inclusive=True,
        extra_parts=parts,
        more_anims=[(os.path.join(DEC, 'grotto/chaewon-charm-anim.bin.mesh'), charm_pose, 100,
                     dict(amp=0.8, cycles=(1, 2)))])
    print('fasten', len(m['P']), 'verts')


DANCER = dict(mcp=(6, 14, 20, 24), pip=(8, 20, 28, 32), dip=(4, 10, 13, 14), spread=(-9, 0, 8, 17),
              thumb=(-30, 34, 14, 8, 10))


FLOAT_HAND = dict(mcp=(4, 9, 13, 17), pip=(6, 13, 18, 22), dip=(3, 6, 8, 10), spread=(-10, 0, 9, 18),
                  thumb=(-32, 30, 12, 6, 8))


def float_pose(s, t):
    """Lifted by the tide (loop): weightless as a dancer under water. Her legs hang long with the toes
    pointed, the left knee softly bent so that foot drifts back; her arms rise out from her sides to about
    shoulder height, elbows soft, wrists trailing, hands open; chin lifted toward the light."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    sw = math.sin(2 * math.pi * t)
    sw2 = math.sin(2 * math.pi * t - 1.2)
    sw3 = math.sin(2 * math.pi * 2 * t + 0.4)
    lift = Vector((0, 0, 0.6 + 0.015 * sw))
    poses.hips(arm, shift=tuple(lift), roll=2.0 * sw2, pitch=-3 + 1.5 * sw, yaw=3 * sw2)
    aR, aL = ctx.ankle['R'], ctx.ankle['L']
    poses.plant_leg(ctx, 'R', ankle=tuple(aR + lift + Vector((0.008, 0.02 + 0.015 * sw2, 0.012))), knee_dir=(0, -1, 0),
                    foot_pitch=-58)
    poses.plant_leg(ctx, 'L', ankle=tuple(aL + lift + Vector((-0.015, 0.13 + 0.02 * sw, 0.11 + 0.02 * sw2))),
                    knee_dir=(0.05, -1, -0.15), foot_pitch=-62, foot_yaw=4)
    poses.spine(arm, pitch=-6 + 1.5 * sw, roll=-2 * sw2, yaw=-3 * sw)
    pb = arm.pose.bones
    rig.update()
    # A ballet line rather than a T: her left arm rises above her shoulder, the right floats lower and a little
    # forward, each drifting on its own phase.
    for side, sgn, ph, up, fwd in (('L', 1, 0.0, 0.08, -0.04), ('R', -1, 0.9, -0.16, -0.13)):
        drift = math.sin(2 * math.pi * t - ph)
        poses.clavicle(arm, side, lift=4 + 6 * (up > 0) + 2 * drift)
        sh = pb[f'upperarm01.{side}'].head
        wrist = sh + Vector((sgn * (0.38 + 0.015 * drift), fwd - 0.02 * drift, up + 0.05 * drift))
        out = Vector((sgn * 0.92, -0.12, -0.25 + 0.6 * up + 0.14 * drift)).normalized()
        poses.arm_to(ctx, side, wrist, elbow_dir=(sgn * 0.15, 0.35, -1), wrist=(out, Vector((0, 0.15, -1))))
        rig.hand_shape(arm, side, **FLOAT_HAND)
    poses.head(arm, pitch=-14 + 2 * sw3, yaw=6 * sw, roll=5 * sw2)


def asset_float(s):
    """The tide lifts her: a floating loop with her hair rising, the pendant at her throat."""
    import necklace
    float_pose(s, 0.0)
    mats0 = s.pose_mats()
    pb = s.arm.pose.bones
    nape = np.array(pb['neck02'].head) + np.array([0, 0.06, 0])
    pinch = {'L': nape + np.array([0.02, 0.01, 0]), 'R': nape + np.array([-0.02, 0.01, 0])}
    H = s.hair(mats0, wind=wind_field((0.15, 0.25, 1.0), 0.0017, gust=0.3), key='float', arms=True)
    parts, info = necklace.build(s, mats0, pinch)
    m, hr = skinned_with_hair(s, mats0, H, os.path.join(DEC, 'antigravity/chaewon-float.bin.mesh'),
                              os.path.join(DEC, 'antigravity/chaewon-float-anim.bin.mesh'), float_pose, 100,
                              amp=1.6, wind_dir=(0, 0.2, 1), extra_parts=parts)
    print('float', len(m['P']), 'verts')


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
    sole = float(M.to_three(s.posed_body(mats0), M.SCALE)[:, 1].min())
    json.dump(dict(grip=grip_point(s).tolist(), sole=sole,
                   feet=[(M.B2T @ np.array(s.arm.pose.bones[f'foot.{x}'].head) * M.SCALE).tolist() for x in 'LR']),
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
        # Hover (f <= 25): a soft dancer's hand, the fingers cascading from a long index to a curled pinky
        # so each one reads in silhouette. Reach (f >= 55): long fingers, a gentle cascade.
        u = np.clip((f - 25) / 30, 0, 1)
        u = u * u * (3 - 2 * u)
        hover = dict(mcp=(6, 14, 22, 27), pip=(10, 22, 32, 36), dip=(4, 10, 14, 14), spread=(-10, 0, 9, 19),
                     thumb=(-30, 36, 20, 10, 10))
        reach = dict(mcp=(4, 7, 9, 6), pip=(6, 10, 13, 10), dip=(3, 6, 7, 6), spread=(-9, 0, 7, 15),
                     thumb=(-32, 30, 10, 6, 8))
        mix = {k: tuple(a * (1 - u) + b * u for a, b in zip(hover[k], reach[k])) for k in hover}
        rig.hand_shape(s.arm, 'R', **mix)
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
    # Roll each exported bone to the Spirit bone it stands in for: the scene turns these bones about their
    # local axes (cursor-driven forearm swing and bend, wrist and finger noise), so their frames must match.
    roll = {}
    samples = [(f, ext(pose_frame(f))) for f in range(25, 56, 5)]
    for k in keep:
        sname = rename.get(k, k)
        if sname not in idx:
            continue
        i = names_x.index(k)
        angles = []
        for f, mats in samples:
            Ro = M.B2T @ mats[i][:3, :3]
            Ro /= np.linalg.norm(Ro, axis=0, keepdims=True)
            Rs = track[f][idx[sname]][:3, :3]
            Rs = Rs / np.linalg.norm(Rs, axis=0, keepdims=True)
            xl = Ro.T @ Rs[:, 0]
            angles.append(math.atan2(-xl[2], xl[0]))
        roll[k] = math.atan2(np.mean(np.sin(angles)), np.mean(np.cos(angles)))
    print('hand bone roll (deg):', {rename.get(k, k): round(math.degrees(v)) for k, v in roll.items()})
    mats_bind = pose_frame(25)
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
    # Not flagged as skin: the hand shader then shades it like her body (paper white, inked shadow).
    uv2 = np.zeros((len(used), 2))
    bind_x = ext(mats_bind)
    path = os.path.join(DEC, 'hand/arm-skin.bin.mesh')
    export.write_skinned(path, Pb, F, uv, uv2, Wx, names_x, np.array(parents_x), bind_x, keep=keep, scale=scale,
                         N_bl=Nb, rename=rename, extra={'windmask': np.zeros((len(Pb), 3), np.float32)}, roll=roll)
    anim = []
    for f in range(frames):
        mats = ext(pose_frame(f))
        anim.append({n: mats[i] for i, n in enumerate(names_x)})
    export.write_animation(os.path.join(DEC, 'hand/arm.bin.mesh'), anim, names_x, np.array(parents_x),
                           keep=keep, scale=scale, roll=roll)
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
    """Beneath the arch, before the sun (seen from behind): her weight on the left leg, the right hand lifted
    toward the light, fingers open; the left hand trailing a little behind her; chin raised to the sun."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    poses.contrapposto(ctx, 'L', 0.8)
    poses.clavicle(arm, 'R', lift=8)
    pb = arm.pose.bones
    rig.update()
    sh = pb['upperarm01.R'].head
    poses.arm_to(ctx, 'R', sh + Vector((-0.1, -0.4, 0.26)), elbow_dir=(-1, 0.2, -0.6),
                 wrist=(Vector((-0.1, -0.85, 0.5)), Vector((0, -1, 0.15))))
    rig.hand_shape(arm, 'R', **DANCER)
    poses.relaxed_arm(ctx, 'L', out=0.26, fwd=-0.12, bend=16, hand=dict(curl=0.22, close=0.55, thumb=0.3))
    poses.head(arm, pitch=-14, yaw=-6, roll=-4)


def onsea_pose(s):
    """Standing on the sea, body toward the horizon, looking back over her left shoulder,
    right fingertips touching the pendant at her collarbone."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    poses.contrapposto(ctx, 'L', 1.1)
    poses.spine(arm, yaw=42, pitch=0.5)
    poses.relaxed_arm(ctx, 'L', out=0.2, fwd=-0.08, bend=18, hand=dict(curl=0.2, close=0.55, thumb=0.3))
    neck = s.arm.pose.bones['neck01'].head
    poses.arm_to(ctx, 'R', neck + Vector((0.03, -0.11, -0.10)), elbow_dir=(-1, 0.2, -0.8),
                 wrist=(Vector((0.4, -0.2, 0.75)), Vector((0.2, 1, 0))), hand=dict(curl=0.3, close=0.8, thumb=0.3))
    poses.head(arm, pitch=-3, yaw=36, roll=7, neck_share=0.55)


def target_pose(s):
    """Stepping into the light: mid-stride, the back foot up on its toes, arms opening from her sides, palms
    turned toward the light."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    poses.hips(arm, shift=(0.0, -0.06, 0.0), yaw=-6)
    a, b = ctx.ankle['L'], ctx.ankle['R']
    poses.stand_on(ctx, 'L', bend=6, ankle=(a.x - 0.02, a.y - 0.24, a.z))
    poses.plant_leg(ctx, 'L', ankle=(a.x - 0.02, a.y - 0.24, a.z + 0.005), foot_pitch=3)
    poses.plant_leg(ctx, 'R', ankle=(b.x + 0.02, b.y + 0.12, b.z), knee_dir=(0, -1, 0), foot_pitch=-34, on_ball=True)
    poses.spine(arm, yaw=5, pitch=0.5)
    for side, fwd in (('L', 0.16), ('R', -0.1)):
        poses.relaxed_arm(ctx, side, out=0.48, fwd=fwd, bend=18, hand=dict(curl=0.16, close=0.4, thumb=0.3))
    poses.head(arm, pitch=-8, yaw=-3)


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
    """Beside the shell of pendants, an idol's ease: weight on her left hip, her right hand on her hip with
    the elbow out, the left hand open low toward the pendants, her head tilted toward them."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    poses.contrapposto(ctx, 'L', 1.1)
    poses.spine(arm, yaw=10, pitch=0.5, roll=2)
    pb = arm.pose.bones
    rig.update()
    sh = pb['upperarm01.L'].head
    poses.arm_to(ctx, 'L', sh + Vector((0.2, -0.17, -0.45)), elbow_dir=(1, 0.3, -0.45),
                 wrist=(Vector((0.4, -0.55, -0.45)), Vector((0.1, -0.3, 1))), hand=dict(curl=0.16, close=0.35, thumb=0.35))
    # Right hand on the hip: the heel of the hand on the crest of the hip, fingers forward and down over the
    # dress, the elbow out to the side and a little back.
    hip = pb['upperleg01.R'].head
    target = hip + Vector((-0.075, 0.01, 0.13))
    for _ in range(3):
        poses.arm_to(ctx, 'R', target, elbow_dir=(-1, 0.55, 0.15),
                     wrist=(Vector((0.25, -0.75, -0.6)), Vector((1, 0.15, 0.1))),
                     hand=dict(curl=0.2, close=0.75, thumb=0.3))
        d, n = torso_clearance(s, 'R')
        if d >= 0.019:
            break
        target = target + Vector(tuple(n * (0.021 - d)))
    poses.head(arm, pitch=5, yaw=16, roll=10)


def asset_statics(s, which=('approach', 'near', 'onsea', 'target', 'grotto', 'selection')):
    up_wind = wind_field((0, 1.0, 0.3), 0.0008)
    specs = {
        'approach': (lambda: bow_pose(s, 0.0), wind_field((0, 1, 0.15), 0.0011), 'sea/chaewon-approach.bin.mesh', None),
        'near': (lambda: near_pose(s), up_wind, 'sea/chaewon-near.bin.mesh', None),
        # Looking back over her shoulder at the reader: the sea wind streams all her hair behind her.
        'onsea': (lambda: onsea_pose(s), wind_field((-0.25, 1, 0.2), 0.0011), 'sea/chaewon-onsea.bin.mesh', None),
        'target': (lambda: target_pose(s), wind_field((0, 1, 0.1), 0.0009), 'sea/chaewon-target.bin.mesh', None),
        'grotto': (lambda: grotto_pose(s), None, 'grotto/chaewon-grotto.bin.mesh', 0.66),
        'selection': (lambda: selection_pose(s), None, 'grotto/chaewon-selection.bin.mesh', None),
    }
    for name in which:
        fn, wind, rel, clip = specs[name]
        fn()
        mats = s.pose_mats()
        H = s.hair(mats, wind=wind, key='static_' + name,
                   **(dict(sweep='back', arms=True) if name == 'onsea' else {}))
        write_static_asset(s, rel, mats, H, clip=clip)


if __name__ == '__main__':
    sess = Session()
    for name in sys.argv[1:]:
        globals()['asset_' + name](sess)
