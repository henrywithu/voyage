"""Fit Chaewon to static (unrigged) saint poses."""
import numpy as np
import meshio
import landmarks as L
import pose as posing
import skeleton as sk
import master
import geom

import os
DEC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../reference/saint/')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../public/assets/decoded/story/')
REST_EYE_Y = 1.485


def load(name):
    h, a, ix = meshio.read(DEC + name + '.bin.mesh')
    return h, a, ix.reshape(-1, 3)


def classify(info, floor, H):
    hands, feet = [], []
    for l in info['limbs']:
        y = l['centre'][1] - floor
        if y < 0.16 * H:
            feet.append(l)
        elif 0.30 * H < y < 0.80 * H:
            hands.append(l)
    return hands, feet


def hand_ends(l, shoulder):
    c = l['centre']
    tip, base = l['tip'], l['base']
    ends = [tip, base]
    ends.sort(key=lambda e: np.linalg.norm(e - shoulder))
    return ends[0], ends[1]  # wrist (near shoulder), fingertips


def fit_standing(name, overrides=None):
    o = dict(overrides or {})
    h, a, F = load(name)
    P, uv2 = a['position'], a['uv2']
    info = L.analyse(P, F, uv2)
    face = info['face']
    floor = P[uv2[:, 1] > 0.55][:, 1].min()
    H = face['eyes'][1] - floor
    s = o.get('scale', H / REST_EYE_Y)
    hands, feet = classify(info, floor, H)
    fwd = face['fwd'].copy()
    fwd[1] = 0
    fwd /= np.linalg.norm(fwd)
    right = np.cross(np.array([0, 1.0, 0]), fwd)  # character's left side
    right = -right
    # body yaw: rotate rest (+z forward) to fwd
    yaw = np.arctan2(fwd[0], fwd[2]) + np.radians(o.get('body_yaw', 0))
    return dict(P=P, a=a, F=F, info=info, face=face, floor=floor, H=H, s=s, hands=hands, feet=feet,
                fwd=fwd, yaw=yaw, o=o)


def pose_standing(ps, fit, M):
    o = fit['o']
    s = fit['s']
    ps.scale = s
    yaw = fit['yaw']
    R = geom.axis_angle([0, 1, 0], yaw)
    ps.root_rot = R
    face = fit['face']
    floor = fit['floor']
    fwd = R @ np.array([0, 0, 1.0])
    left = R @ np.array([1.0, 0, 0])
    # feet: side by projection on the character's left axis
    centre = np.array([face['eyes'][0], 0, face['eyes'][2]])
    feet = {'L': [], 'R': []}
    for f in fit['feet']:
        side = 'L' if (f['centre'] - centre).dot(left) > 0 else 'R'
        feet[side].append(f)
    rest_root = M['heads'][sk.INDEX['hips']]
    root = centre - fwd * o.get('root_back', 0.03) * s
    root[1] = floor + rest_root[1] * s * o.get('crouch', 1.0)
    root += np.asarray(o.get('root_offset', (0, 0, 0)))
    ps.root_pos = root
    up = face['up']
    neck_to = face['eyes'] - up * 0.075 * s - face['fwd'] * 0.075 * s
    chest_to = 0.5 * (neck_to + root) + np.asarray(o.get('chest_offset', (0, 0, 0))) * s
    for b in ('spine1', 'spine2', 'spine3'):
        ps.aim(b, chest_to - ps.joint(b))
    ps.aim('chest', neck_to - ps.joint('chest'))
    ps.aim('upperchest', neck_to - ps.joint('upperchest'))
    ps.aim('neck', (neck_to - ps.joint('neck')) * 0.0 + up * 0.6 + (face['eyes'] - ps.joint('neck')) * 0.4)
    head_up = geom.axis_angle(np.cross(up, face['fwd']), np.radians(o.get('head_pitch', 0))) @ up
    head_fwd = geom.axis_angle(np.cross(up, face['fwd']), np.radians(o.get('head_pitch', 0))) @ face['fwd']
    ps.aim('head', head_up, roll_axis=np.array([0, 0, 1.0]), roll_target=head_fwd)
    for side, sg in (('L', 1), ('R', -1)):
        fs = feet[side]
        if fs:
            ank = min(fs, key=lambda f: f['centre'][1] if f['size'] < 0.17 else 9)
            lows = sorted(fs, key=lambda f: f['centre'][1])
            toe_l = lows[0]
            ankle = np.array(toe_l['base']) + np.array([0, 0.05 * s, 0]) - fwd * 0.03 * s
            ankle[1] = floor + 0.062 * s
            toe = toe_l['tip'].copy()
            toe[1] = floor + 0.02 * s
            knee_pole = ankle + fwd * 0.5 + np.array([0, 0.4, 0])
            ps.two_bone(f'thigh.{side}', f'shin.{side}', ankle, knee_pole)
            ps.aim(f'foot.{side}', toe - ps.joint(f'foot.{side}'))
            ps.aim(f'toes.{side}', toe - ps.joint(f'foot.{side}'))
    # arms
    for side, sg in (('L', 1), ('R', -1)):
        sh = ps.joint(f'upperarm.{side}')
        cands = [h for h in fit['hands'] if (h['centre'] - centre).dot(left) * sg > 0]
        if cands and not o.get(f'arm_{side}'):
            hnd = max(cands, key=lambda h: h['n'])
            wrist, tip = hand_ends(hnd, sh)
            wrist = wrist + np.asarray(o.get(f'wrist_{side}', (0, 0, 0)))
            ps.two_bone(f'upperarm.{side}', f'forearm.{side}', wrist, sh - fwd * 0.3 + left * sg * 0.2 + np.array([0, -0.3, 0]))
            ps.aim(f'hand.{side}', tip - wrist, roll_axis=np.array([sg * 1.0, 0, 0]), roll_target=-left * sg)
        elif o.get(f'arm_{side}'):
            o[f'arm_{side}'](ps, side, sg, fit)
    for side in ('L', 'R'):
        relax(ps, side, o.get('curl', 0.3))


def relax(ps, side, curl):
    Rw, _ = ps.world()
    hand = sk.INDEX[f'hand.{side}']
    for f in range(1, 6):
        for seg in range(1, 4):
            name = f'finger{f}-{seg}.{side}'
            i = sk.INDEX[name]
            Rw, _ = ps.world()
            Rp = ps.parent_rot(i)
            # bend about the finger's own lateral axis (rest x)
            ax = Rp @ ps.local[i] @ np.array([1.0, 0, 0])
            ps.rotate(name, ax, -curl * (0.5 if f == 1 else 1.0) * (0.7 + 0.25 * seg) * (1 if side == 'L' else 1))


def posed_static(name, overrides, M, H):
    fit = fit_standing(name, overrides)
    ps = posing.Pose(M)
    pose_standing(ps, fit, M)
    X = master.posed(M, H, ps)
    return X, fit, ps
