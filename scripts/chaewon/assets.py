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
        M.tuck_under(body, dress)
        self.base_parts = [body, eyes, dress, straps]

    # -------------------------------------------------------------- pose evaluation
    def pose_mats(self):
        rig.update()
        return np.array([np.array(self.arm.pose.bones[n].matrix) for n in self.names])

    def posed_body(self, mats):
        return M.skin(self.rest['P'], self.rest['W'], mats, self.rest_mats)

    def sdf_for(self, mats, key=None, arms=False, dense=False):
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
        if dense:
            # (the dress's vertices are about a centimetre apart: sample its triangles too, or just under the
            # fabric the nearest points are the skin behind it and a chain could pass through it)
            a, b, c = Pd[d.F[:, 0]], Pd[d.F[:, 1]], Pd[d.F[:, 2]]
            fn = np.cross(b - a, c - a)
            fn /= np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12)
            fn *= np.sign((fn * (Nd[d.F[:, 0]] + Nd[d.F[:, 1]] + Nd[d.F[:, 2]])).sum(1, keepdims=True) + 1e-12)
            samples = [(a + b + c) / 3, (a + b) / 2, (b + c) / 2, (c + a) / 2]
            Pd = np.vstack([Pd] + samples)
            Nd = np.vstack([Nd] + [fn] * len(samples))
        sdf = hair_mod.SDF(np.vstack([P[k], Pd]), np.vstack([N[k], Nd]), lo, hi, step=0.004 if dense else 0.006)
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
    """At the bow (loop): her right hand high on the forestay, the arm long, leaning out a little into the
    wind; her weight on the right leg (the knee soft for the swell), the left foot forward on its ball; her
    left arm floating out behind her, elbow soft, the hand trailing in the wind and rising and falling with it
    like a dancer's; chin lifted, eyes on the horizon. The swell moves all of her: the weight rocks between
    her feet, she breathes, the free arm drifts, and her head follows the horizon a moment after her body."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    w = 2 * math.pi * t
    sw = math.sin(w)                      # the swell (one per loop)
    sw2 = math.sin(w - 0.9)               # the body answering it
    sw3 = math.sin(w - 1.8)               # the head and free arm, last
    br = math.sin(2 * w)                  # breath (twice per loop)
    poses.hips(arm, shift=(-0.026 + 0.012 * sw, 0, 0.004 * br), roll=4.5 + 2.4 * sw, yaw=-5 + 2.5 * sw2)
    poses.stand_on(ctx, 'R', bend=7 + 4 * sw)
    poses.plant_leg(ctx, 'R')
    a = ctx.ankle['L']
    poses.plant_leg(ctx, 'L', ankle=(a.x + 0.02, a.y - 0.13, a.z), knee_dir=(0.25, -1, 0), foot_yaw=10,
                    foot_pitch=-10 - 4 * sw, on_ball=True)
    poses.spine(arm, roll=-5 - 2.2 * sw2, yaw=9 + 3.0 * sw2, pitch=-3 + 1.6 * br)
    poses.clavicle(arm, 'R', lift=12 + 2 * sw)
    grip = s.ctx.shoulder['R'] + Vector((-0.19, -0.29, 0.36))
    poses.arm_to(ctx, 'R', grip, elbow_dir=(-1, 0.45, -0.4),
                 wrist=(Vector((-0.15, -0.45, 1.0)), Vector((0.85, -0.2, 0.0))),
                 hand=dict(curl=0.8, close=0.9, thumb=0.8))
    pb = arm.pose.bones
    rig.update()
    # The free arm: out and back, lower than her shoulder, the elbow soft and the wrist trailing; it floats
    # up and back on the swell and settles again, the hand following the forearm a beat later.
    poses.clavicle(arm, 'L', lift=3 + 3 * sw3, forward=-3)
    sh = pb['upperarm01.L'].head
    wrist = sh + Vector((0.30 + 0.025 * sw3, 0.20 + 0.03 * sw3, -0.30 + 0.06 * sw3))
    trail = Vector((0.55, 0.55 + 0.15 * math.sin(w - 2.6), -0.45 + 0.25 * math.sin(w - 2.6))).normalized()
    poses.arm_to(ctx, 'L', wrist, elbow_dir=(0.2, 0.55, -1),
                 wrist=(trail, Vector((0.1, -0.6, 0.8))))
    rig.hand_shape(arm, 'L', **DANCER)
    poses.head(arm, pitch=-10 + 2.5 * sw3, yaw=14 + 5.0 * math.sin(w + 1.7), roll=-4 + 2.0 * sw3)


def skinned_with_hair(s, mats_bind, H, mesh_path, anim_path, pose_fn, frames, amp=1.0, wind_dir=(0, 1, 0.1),
                      cycles=(1, 2), extra_parts=(), more_anims=(), inclusive=False, rigs=()):
    """Skinned export with hair chains: bind pose = mats_bind, animation from pose_fn(t).

    extra_parts: rest-space Parts weighted to the body bones (e.g. jewellery); a part may also carry Wx,
    weights over the bones of `rigs` (in their order).
    more_anims: further clips [(path, pose_fn, frames, dict(amp=, cycles=, inclusive=, clasp=))] on the same rig.
    inclusive: t runs 0..1 inclusive (a scrubbed clip) instead of a loop.
    rigs: extra bone rows (e.g. necklace.Rope): .names, .bind (world matrices, also their rest, so a part
    bound to them is where it lies), and .frame(t, clip options, pose matrices) -> {name: world matrix};
    each bone is a child of neck01."""
    hb = s.names.index('head')
    nk = s.names.index('neck01')
    hr = hairrig.HairRig(H, mats_bind[hb], s.rest_mats[hb])
    names_x, parents_x, rest_x = hr.extend(s.names, s.parents, s.rest_mats)
    keep = M.KEEP + hr.names
    extra_names, extra_bind = [], []
    for rg in rigs:
        extra_names += list(rg.names)
        extra_bind += list(rg.bind)
    if extra_names:
        names_x = list(names_x) + extra_names
        parents_x = np.r_[parents_x, np.full(len(extra_names), nk)]
        rest_x = np.concatenate([rest_x, np.array(extra_bind)])
        keep = keep + extra_names
    nx = len(extra_names)
    posedP = s.posed_body(mats_bind)
    hparts = M.hair_parts(s.rest, H, posedP, s.names)
    hparts[0].W = hr.hair_weights(hparts[0].W, names_x, near=getattr(hparts[0], 'near', None))
    hparts[1].W = np.c_[hparts[1].W, np.zeros((len(hparts[1].P), len(hr.names) + nx), np.float32)]
    bind_x = np.concatenate([mats_bind, np.array(hr.bind_world)] + ([np.array(extra_bind)] if nx else []))
    pad = len(hr.names) + nx
    for p in hparts:
        p.P = inverse_skin(p.P, p.W, bind_x, rest_x)
    base = []
    for p in s.base_parts:
        q = M.Part(p.P, p.F, p.uv, p.uv2, np.c_[p.W, np.zeros((len(p.P), pad), np.float32)], 'skin',
                   p.color, p.wind, p.soft)
        q.kind, q.src = p.kind, p.src
        base.append(q)
    extra = []
    for p in extra_parts:
        Wx = getattr(p, 'Wx', None)
        W = np.c_[p.W, np.zeros((len(p.P), len(hr.names)), np.float32),
                  Wx if Wx is not None else np.zeros((len(p.P), nx), np.float32)]
        q = M.Part(p.P, p.F, p.uv, p.uv2, W, 'strap', p.color, p.wind, p.soft)
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
            for rg in rigs:
                d.update(rg.frame(t, kw, mats))
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


# A pinch with the other three fingers folded into the palm, so the two hands meet fingertip to fingertip
# behind her neck and never overlap.
# Thumb and index finger pinch the chain; the other fingers fall in soft, graceful curves (curled tight, the
# hand would read as a fist).
PINCH = dict(mcp=(6, 26, 34, 42), pip=(10, 34, 40, 46), dip=(8, 18, 20, 22), spread=(-4, 2, 8, 14),
             thumb=(-14, 46, 34, 20, 26))


def nape_point(s):
    pb = s.arm.pose.bones
    rig.update()
    return pb['neck02'].head + Vector((0, 0.062, -0.006))


def clasp_pose(s, clasp, gap0=0.026, reach=0.0, bow=9.0):
    """Both hands behind her neck, fingertips pinching the chain ends (clasp 0 -> 1 closes the gap). reach
    0 -> 1 takes the hands out to the back-sides of her neck, elbows lower, holding the ends apart (where the
    fastening begins)."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    poses.contrapposto(ctx, 'R', 0.55)
    poses.spine(arm, pitch=-3, yaw=2, roll=-1)
    for side in ('L', 'R'):
        # Arms raised, the shoulders lift a little and roll forward (the shoulder blades protract), carrying
        # the elbows forward of her shoulders.
        poses.clavicle(arm, side, lift=9 - 5 * reach, forward=9 - 4 * reach)
    # Head bowed into the task (more as the hands meet), which also bares the nape.
    poses.head(arm, pitch=bow, yaw=-3, roll=-4 * (1 - reach))
    nape = nape_point(s)
    for side, sgn in (('L', 1), ('R', -1)):
        gap = gap0 * (1 - clasp) + 0.007
        target = nape + Vector((sgn * (gap + 0.06 * reach), 0.006 - 0.07 * reach, -0.012 - 0.05 * reach))
        # Fingers point in toward the nape and a little up; the palms face forward, toward her neck.
        fingers = Vector((-sgn * 0.95, 0.1 - 0.05 * reach, 0.28 + 0.2 * reach)).normalized()
        wrist_pos = target - fingers * 0.092
        # Elbows out and forward, a little above her shoulders, as when fastening a necklace (never raised
        # over her head); lower and wider while she holds the ends out.
        elbow = Vector((sgn * (0.8 + 0.1 * reach), -0.6 - 0.2 * reach, 0.2 - 0.8 * reach))
        for _ in range(3):
            # Solve so the pinch (thumb and index tips), not the wrist, lands on the target.
            poses.arm_to(ctx, side, wrist_pos, elbow_dir=(0, 0, 0), elbow_at=elbow, wrist=(fingers, Vector((0, -1, 0.1))))
            rig.hand_shape(arm, side, **PINCH)
            wrist_pos = wrist_pos + (target - Vector(pinch_point(s, side)))


def hold_pose(s, lat, fwd, up, bow, elbow, fingers, palm, clav=(3.0, 4.0)):
    """Both hands in front of or beside her neck, pinching the chain's two ends: each pinch at neck01 +
    (out lat, forward fwd, up up). elbow, fingers and palm are directions for her left side (x outward
    for the elbow, inward for the fingers and palm; y forward; z up), mirrored for her right."""
    ctx, arm = s.ctx, s.arm
    rig.reset_pose(arm)
    poses.contrapposto(ctx, 'R', 0.55)
    poses.spine(arm, pitch=-3, yaw=2, roll=-1)
    for side in ('L', 'R'):
        poses.clavicle(arm, side, lift=clav[0], forward=clav[1])
    poses.head(arm, pitch=bow, yaw=-3, roll=-3)
    neck = arm.pose.bones['neck01'].head.copy()
    for side, sgn in (('L', 1), ('R', -1)):
        target = neck + Vector((sgn * lat, -fwd, up))
        f = Vector((-sgn * fingers[0], -fingers[1], fingers[2])).normalized()
        pv = Vector((-sgn * palm[0], -palm[1], palm[2])).normalized()
        wrist_pos = target - f * 0.092
        for _ in range(3):
            poses.arm_to(ctx, side, wrist_pos, elbow_dir=(0, 0, 0), elbow_at=Vector((sgn * elbow[0], -elbow[1], elbow[2])),
                         wrist=(f, pv))
            rig.hand_shape(arm, side, **PINCH)
            wrist_pos = wrist_pos + (target - Vector(pinch_point(s, side)))


def capture_arm(s, side):
    pb = s.arm.pose.bones
    rig.update()
    return dict(sh=pb[f'upperarm01.{side}'].head.copy(), el=pb[f'lowerarm01.{side}'].head.copy(),
                wr=pb[f'wrist.{side}'].head.copy(), dir=rig.bone_dir(s.arm, f'wrist.{side}'),
                palm=rig.palm_normal(s.arm, side))


ARM_BONES = tuple(f'{b}.{x}' for x in 'LR' for b in (
    ['clavicle', 'shoulder01', 'upperarm01', 'upperarm02', 'lowerarm01', 'lowerarm02', 'wrist'] +
    [f'metacarpal{i}' for i in range(1, 5)] + rig.FINGER_BONES))


def _fasten_keys(s):
    """The fastening as five keyed moments, each captured as the torso's pose plus, per arm, the wrist
    position, elbow direction, wrist direction, palm direction and finger rotations:
      0.00  the necklace drawn up to her neck by its ends: hands beside her throat, the pendant on her chest
      0.24  the ends carried round the sides of her neck
      0.48  behind her neck, held apart, elbows out and forward
      0.72  the clasp closes
      0.79  let go: the hands open and part
      0.86  they slide round the sides of her neck
      0.91  forward over her collarbones, elbows falling to her sides
      0.97  the left arm lowering in front of her
      1.00  the first frame of the charm loop (right fingertips on the pendant, left arm at her side)"""
    if getattr(s, '_fasten_keys', None):
        return s._fasten_keys
    keys = []

    def grab(t):
        pb = s.arm.pose.bones
        rig.update()
        torso = {pb_.name: (pb_.location.copy(), pb_.rotation_quaternion.copy()) for pb_ in pb if pb_.name not in ARM_BONES}
        arms = {}
        for x in 'LR':
            a = capture_arm(s, x)
            a['fingers'] = {n: pb[f'{n}.{x}'].rotation_quaternion.copy() for n in rig.FINGER_BONES}
            a['clav'] = pb[f'clavicle.{x}'].rotation_quaternion.copy()
            a['eh'] = np.array((a['el'] - a['sh']).normalized())
            a['pinch'] = np.array(pinch_point(s, x))
            arms[x] = a
        keys.append((t, torso, arms))

    # The hold: she puts the necklace on. Holding its two ends beside her throat, the pendant resting on her
    # chest, she carries them round the sides of her neck and behind it, elbows rising out and forward, and
    # draws them together at her nape, head bowed, until the clasp closes.
    hold_pose(s, lat=0.10, fwd=0.085, up=0.0, bow=7.0, elbow=(0.7, 0.6, -0.45), fingers=(0.5, -0.75, 0.25),
              palm=(0.9, -0.1, 0.2)); grab(0.0)
    clasp_pose(s, 0.0, gap0=0.035, reach=1.0, bow=3.0); grab(0.24)
    clasp_pose(s, 0.0, gap0=0.05, bow=5.0); grab(0.48)
    clasp_pose(s, 1.0, bow=9.0); grab(0.72)
    # Let go: the hands open and part behind her neck, then slide round its sides.
    clasp_pose(s, 0.0, gap0=0.035, bow=4.0)
    for side in 'LR':
        rig.hand_pose(s.arm, side, curl=0.18, close=0.5, thumb=0.35)
    grab(0.79)
    clasp_pose(s, 0.0, reach=1.0, bow=0.0)
    for side in 'LR':
        rig.hand_pose(s.arm, side, curl=0.18, close=0.5, thumb=0.35)
    grab(0.86)
    # The hands come forward over her collarbones, elbows falling out to her sides in front of her.
    rig.reset_pose(s.arm)
    poses.contrapposto(s.ctx, 'R', 0.55)
    poses.spine(s.arm, pitch=-2, yaw=2, roll=-1)
    neck = s.arm.pose.bones['neck01'].head.copy()
    for side, sgn in (('L', 1), ('R', -1)):
        poses.clavicle(s.arm, side, lift=3)
        poses.arm_to(s.ctx, side, neck + Vector((sgn * 0.13, -0.11, -0.08)), elbow_dir=(0, 0, 0),
                     elbow_at=Vector((sgn * 0.55, -0.35, -0.75)),
                     wrist=(Vector((-sgn * 0.55, -0.3, 0.75)), Vector((-sgn * 0.3, 1, 0))),
                     hand=dict(curl=0.22, close=0.55, thumb=0.35))
    poses.head(s.arm, pitch=-1)
    grab(0.91)
    # The left arm lowers in front of her, elbow down and soft, while the right hand settles on the pendant.
    charm_pose(s, 0.0)
    poses.relaxed_arm(s.ctx, 'L', out=0.2, fwd=0.3, bend=50, hand=dict(curl=0.22, close=0.6, thumb=0.35))
    grab(0.97)
    charm_pose(s, 0.0); grab(1.0)
    s._fasten_keys = keys
    return keys


def _seg(keys, p):
    ts = [k[0] for k in keys]
    i = max(0, min(len(ts) - 2, int(np.searchsorted(ts, p, side='right')) - 1))
    u = (p - ts[i]) / (ts[i + 1] - ts[i])
    return i, smoothstep(0.0, 1.0, u)


def _catmull(P, i, u):
    """Catmull-Rom through key values P at segment i (u 0..1): a smooth path through every key."""
    p0, p1, p2, p3 = P[max(i - 1, 0)], P[i], P[i + 1], P[min(i + 2, len(P) - 1)]
    u2, u3 = u * u, u * u * u
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3)


def fasten_pose(s, p):
    """The hold scrubs this clip (0 -> 0.72, the clasp closing at 0.72), then it plays on to 1: every arm is
    solved by IK on smooth paths through the keyed moments, so the hands travel the way hands do (out and
    back around her neck, then forward and down in front of her), never swinging through her body."""
    keys = _fasten_keys(s)
    i, u = _seg(keys, p)
    (t0, A, armsA), (t1, B, armsB) = keys[i], keys[i + 1]
    arm = s.arm
    rig.reset_pose(arm)
    for pb in arm.pose.bones:
        if pb.name in A:
            pb.location = A[pb.name][0].lerp(B[pb.name][0], u)
            pb.rotation_quaternion = A[pb.name][1].slerp(B[pb.name][1], u)
    rig.update()
    uu = (p - keys[i][0]) / (keys[i + 1][0] - keys[i][0])
    uu = min(max(uu, 0.0), 1.0)
    for side in 'LR':
        arms = [k[2][side] for k in keys]
        a, b = armsA[side], armsB[side]
        arm.pose.bones[f'clavicle.{side}'].rotation_quaternion = a['clav'].slerp(b['clav'], u)
        rig.update()
        wr = _catmull([np.array(k['wr']) for k in arms], i, smoothstep(0.0, 1.0, uu))
        # The elbow's own direction from the shoulder, eased between the keys: it travels the way an elbow does.
        el = a['eh'] * (1 - u) + b['eh'] * u
        sgn = 1 if side == 'L' else -1

        def turn(va, vb, via):
            # Blend two directions; opposite ones turn through `via` (never through zero, where they flip).
            if va.dot(vb) > 0.2:
                return va.lerp(vb, u).normalized()
            return (va.lerp(via, 2 * u) if u < 0.5 else via.lerp(vb, 2 * u - 1)).normalized()
        d = turn(a['dir'], b['dir'], Vector((0, 0, 1)))
        palm = turn(a['palm'], b['palm'], Vector((-sgn, 0, 0)))   # palms turn in toward each other
        hold = t1 <= 0.72 + 1e-6
        pinch = _catmull([k['pinch'] for k in arms], i, smoothstep(0.0, 1.0, uu)) if hold else None
        for _ in range(3 if hold else 1):
            poses.arm_to(s.ctx, side, Vector(tuple(wr)), elbow_dir=(0, 0, 0), elbow_at=Vector(tuple(el)),
                         wrist=(d, palm), keep_dir=True)
            for n in rig.FINGER_BONES:
                arm.pose.bones[f'{n}.{side}'].rotation_quaternion = a['fingers'][n].slerp(b['fingers'][n], u)
            rig.update()
            if hold:
                # While she holds the chain, the pinch (not the wrist) follows its path: the ends stay in her fingers.
                wr = wr + (pinch - np.array(pinch_point(s, side)))


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
    # (where the pendant hangs on the closed chain in this pose, measured on the built clip)
    pend = pb['neck01'].head + Vector((-0.011, -0.110, -0.096))
    tip_target = pend + Vector((-0.017, -0.012, -0.004))  # the fingertip at the pendant's edge, just in front
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
    # Bound with her hands behind her neck, partway through putting the necklace on.
    fasten_pose(s, 0.5)
    mats0 = s.pose_mats()
    pinch = {side: pinch_point(s, side) for side in 'LR'}
    # All her hair brought forward over both shoulders, parted down the back of her head: the nape is bare
    # for the clasp.
    H = s.hair(mats0, key='fasten', arms=True, sweep='front')
    # The parted chain is a rope in her hands through the clip (lying on her body and dress, not her arms).
    rope = necklace.Rope(s, fasten_pose, pinch_point, 0.72, s.sdf_for(mats0, key='fasten_rope', dense=True), 61,
                         t_bind=0.5)
    parts, info = necklace.build(s, mats0, pinch, rope=rope)
    fasten_pose(s, 0.5)   # (the rope's simulation posed her through the clip)
    print('necklace', {k: np.round(v, 3).tolist() if hasattr(v, '__len__') else round(v, 3) for k, v in info.items()})
    m, hr = skinned_with_hair(
        s, mats0, H, os.path.join(DEC, 'grotto/chaewon-fasten.bin.mesh'),
        os.path.join(DEC, 'grotto/chaewon-fasten-anim.bin.mesh'), fasten_pose, 61, amp=0.35, inclusive=True,
        extra_parts=parts, rigs=[rope],
        more_anims=[(os.path.join(DEC, 'grotto/chaewon-charm-anim.bin.mesh'), charm_pose, 100,
                     dict(amp=0.8, cycles=(1, 2), clasp=True))])
    print('fasten', len(m['P']), 'verts')


DANCER = dict(mcp=(6, 14, 20, 24), pip=(8, 20, 28, 32), dip=(4, 10, 13, 14), spread=(-9, 0, 8, 17),
              thumb=(-30, 34, 14, 8, 10))


FLOAT_HAND = dict(mcp=(4, 9, 13, 17), pip=(6, 13, 18, 22), dip=(3, 6, 8, 10), spread=(-10, 0, 9, 18),
                  thumb=(-32, 30, 12, 6, 8))


def float_pose(s, t):
    """Lifted by the tide (loop): weightless as a dancer under water. Her legs hang long with the toes
    pointed, the left knee softly bent so that foot drifts back (the thigh stays under the skirt); her arms rise out from her sides to about
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
    poses.plant_leg(ctx, 'L', ankle=tuple(aL + lift + Vector((-0.012, 0.10 + 0.015 * sw, 0.06 + 0.015 * sw2))),
                    knee_dir=(0.05, -1, -0.15), foot_pitch=-62, foot_yaw=4)
    poses.spine(arm, pitch=-3 + 1.2 * sw, roll=-2 * sw2, yaw=-3 * sw)
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
    # Chin lifted just enough to look up into the light (more shows the underside of her jaw).
    poses.head(arm, pitch=-2 + 1.5 * sw3, yaw=6 * sw, roll=5 * sw2)


def asset_float(s):
    """The tide lifts her: a floating loop with her hair rising, the pendant at her throat."""
    import necklace
    float_pose(s, 0.0)
    mats0 = s.pose_mats()
    pb = s.arm.pose.bones
    nape = np.array(pb['neck02'].head) + np.array([0, 0.06, 0])
    pinch = {'L': nape + np.array([0.02, 0.01, 0]), 'R': nape + np.array([-0.02, 0.01, 0])}
    # Her hair rises and streams back behind her shoulders in one soft mass (never round her throat).
    H = s.hair(mats0, wind=wind_field((0.1, 0.7, 0.75), 0.0013, gust=0.15), key='float', arms=True, sweep='back')
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
