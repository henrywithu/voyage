"""Per-rig retarget configurations for Chaewon."""
import numpy as np
import retarget as RT
import skeleton as sk
import chaewon as C
import geom
import master

import os
DEC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../reference/saint/')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../public/assets/decoded/story/')
SIDES = (('L', 1), ('R', -1))


def head_frame(rig, head_bone, neck_point):
    face = rig.verts_of(head_bone, 0.5, skin=True)
    fc = rig.P[face].mean(0)
    up = rig.J[head_bone] - neck_point
    up /= np.linalg.norm(up)
    fwd = fc - rig.J[head_bone]
    fwd -= up * fwd.dot(up)
    fwd /= np.linalg.norm(fwd)
    return up, fwd


def pose_body(ps, *, root, spine_to, chest_to, neck_to, head_up, head_fwd,
              legs=None, arms=None, hands=None):
    """Generic full-body posing toward rig landmarks (world positions)."""
    ps.root_pos = np.asarray(root, float)
    for b in ('hips', 'spine1', 'spine2', 'spine3'):
        ps.aim(b, spine_to - ps.joint(b)) if b != 'hips' else None
    ps.aim('chest', chest_to - ps.joint('chest'))
    ps.aim('upperchest', neck_to - ps.joint('upperchest'))
    ps.aim('neck', (neck_to - ps.joint('upperchest')) * 0.4 + head_up * 0.1)
    ps.aim('head', head_up, roll_axis=np.array([0, 0, 1.0]), roll_target=head_fwd)
    for s, sg in SIDES:
        if legs and s in legs:
            ankle, knee, toe = legs[s]
            ps.two_bone(f'thigh.{s}', f'shin.{s}', ankle, knee + np.array([0, 0, 0.3]))
            ps.aim(f'foot.{s}', toe - ps.joint(f'foot.{s}'))
            ps.aim(f'toes.{s}', toe - ps.joint(f'foot.{s}'))
        if arms and s in arms:
            wrist, elbow = arms[s]
            ps.two_bone(f'upperarm.{s}', f'forearm.{s}', wrist, elbow + np.array([sg * 0.05, 0, -0.08]))
        if hands and s in hands:
            d, palm = hands[s]
            ps.aim(f'hand.{s}', d, roll_axis=np.array([0, -1.0, 0]), roll_target=palm)


def relax_fingers(ps, side, curl=0.25):
    """Gently curl fingers about the hand's lateral axis."""
    Rw, _ = ps.world()
    hand = sk.INDEX[f'hand.{side}']
    lat = Rw[hand] @ np.array([1.0, 0, 0])
    for f in range(1, 6):
        for seg in range(1, 4):
            name = f'finger{f}-{seg}.{side}'
            ps.rotate(name, lat, (curl if f > 1 else curl * 0.5) * (1 if side == 'L' else -1) * (0.6 + 0.3 * seg))


# ----------------------------------------------------------------- walk
def walk_config():
    rig = RT.Rig(DEC + 'wander/saint-walk-2.bin.mesh')
    J = rig.J
    scale = 1.15
    legs = {'L': (J[32], J[35], J[36]), 'R': (J[38], J[41], J[42])}
    knee_y = 0.5 * (J[35][1] + J[41][1])
    up, fwd = head_frame(rig, 31, J[37])
    hand_c = {s: rig.P[rig.verts_of(b, 0.5, skin=True)].mean(0) for s, b in (('L', 34), ('R', 40))}

    def do_pose(ps, M):
        ps.scale = scale
        thigh = np.linalg.norm(ps.tails[sk.INDEX['thigh.L']] - ps.heads[sk.INDEX['thigh.L']]) * scale
        root = np.array([J[21][0], knee_y + thigh * 0.97 + 0.012, 0.5 * (J[21][2] + J[43][2]) + 0.02])
        lat = np.cross(up, fwd)
        neck_to = J[43] + tilt(J[37] - J[43], lat, -14)
        pose_body(ps, root=root, spine_to=J[43], chest_to=neck_to, neck_to=neck_to,
                  head_up=tilt(up, lat, -24), head_fwd=tilt(fwd, lat, -24), legs=legs)
        for s, sg, el, wr in (('L', 1, 33, 34), ('R', -1, 39, 40)):
            ps.two_bone(f'upperarm.{s}', f'forearm.{s}', J[wr], J[el] + np.array([0, 0, -0.1]))
            d = hand_c[s] - J[wr]
            ps.aim(f'hand.{s}', d, roll_axis=np.array([0, 0, 1.0]), roll_target=np.array([0, 0, 1.0]))
            relax_fingers(ps, s, 0.22)
    mapping = {
        'hips': 21, 'spine1': 21, 'spine2': ('blend', 21, 43), 'spine3': ('blend', 21, 43),
        'chest': 43, 'upperchest': 43, 'neck': 37, 'head': 31,
    }
    for s, sh, el, wr, kn, an, to in (('L', 43, 33, 34, 35, 32, 36), ('R', 43, 39, 40, 41, 38, 42)):
        mapping[f'clavicle.{s}'] = 43
        mapping[f'upperarm.{s}'] = ('blend', 43, el, (0.45, 1.0))
        mapping[f'forearm.{s}'] = el
        mapping[f'hand.{s}'] = wr
        for f in range(1, 6):
            for seg in range(1, 4):
                mapping[f'finger{f}-{seg}.{s}'] = wr
        mapping[f'thigh.{s}'] = ('blend', 21, kn, (0.15, 0.95))
        mapping[f'shin.{s}'] = kn
        mapping[f'foot.{s}'] = an
        mapping[f'toes.{s}'] = to
    return dict(rig=rig, pose=do_pose, mapping=mapping, robe_bones=[i for i in range(27) if i != 21],
                pelvis=21, anim=DEC + 'wander/saint-walk-2-anim.bin.mesh')


def tilt(v, axis, deg):
    return geom.axis_angle(axis, np.radians(deg)) @ v


def retarget(cfg, M, H):
    rig = cfg['rig']
    ps = RT.posing.Pose(M)
    cfg['pose'](ps, M)
    X = master.posed(M, H, ps)
    P, N = X['P'], X['N']
    n_rig = len(rig.bones)
    W = RT.map_weights(X, P, cfg['mapping'], rig.J, n_rig)
    part = X['part']
    if cfg.get('robe_bones'):
        skirt = part == C.PART_DRESS
        cloth = ~rig.skin
        Wt = RT.transfer(P[skirt], rig.P, rig.a['skinIndex'].astype(int), rig.a['skinWeight'], n_rig, mask=cloth)
        hips_y = ps.joint('hips')[1]
        t = np.clip((hips_y + 0.02 - P[skirt, 1]) / 0.22, 0, 1)[:, None]
        W[skirt] = RT.normalise(W[skirt]) * (1 - t) + RT.normalise(Wt) * t
    W = RT.normalise(W)
    return X, W, ps


def export_skinned(cfg, X, W, path, extra_attrs=None):
    rig = cfg['rig']
    si, sw = RT.export.top4(W)
    attrs = {'skinIndex': si, 'skinWeight': sw, 'color': RT.color_attr(X), 'uv': X['uvT'], 'uv2': X['uvA']}
    attrs.update(extra_attrs or {})
    RT.export.write(path, X['P'], X['N'], X['F'], attrs, bones=rig.bones)
