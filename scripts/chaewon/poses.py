"""Chaewon's pose library (bpy), built on rig.py's world-space helpers.

A pose is described by intent: where the weight sits, how the hips and
shoulders counter-tilt, where each hand goes and what it does, where she
looks. Feet stay planted with leg IK unless a pose lifts them. Angles in
degrees; Blender axes (X her left, -Y forward, Z up).
"""
import math

import numpy as np
from mathutils import Matrix, Quaternion, Vector

import rig

SIDES = ('L', 'R')
SIGN = {'L': 1, 'R': -1}


class Ctx:
    """Rest-pose references captured once after the rig is built."""

    def __init__(self, arm):
        rig.reset_pose(arm)
        self.arm = arm
        pb = arm.pose.bones
        self.ankle = {s: pb[f'foot.{s}'].head.copy() for s in SIDES}
        self.ball = {s: pb[f'foot.{s}'].tail.copy() for s in SIDES}  # the ball of the foot, on the ground
        self.foot_dir = {s: (pb[f'foot.{s}'].tail - pb[f'foot.{s}'].head).normalized() for s in SIDES}
        self.hip = {s: pb[f'upperleg01.{s}'].head.copy() for s in SIDES}
        self.shoulder = {s: pb[f'upperarm01.{s}'].head.copy() for s in SIDES}
        self.head_pos = pb['head'].head.copy()
        self.root = pb['root'].head.copy()


def rotate(arm, bone, axis, deg):
    rig.rotate_world(arm, bone, axis, deg)


def spine(arm, pitch=0.0, yaw=0.0, roll=0.0, split=(0.15, 0.2, 0.25, 0.2, 0.2)):
    """Distribute a torso bend over the spine (pitch +forward, yaw +toward her left, roll +toward her right)."""
    for b, f in zip(('spine05', 'spine04', 'spine03', 'spine02', 'spine01'), split):
        if pitch:
            rotate(arm, b, (1, 0, 0), pitch * f)
        if yaw:
            rotate(arm, b, (0, 0, 1), yaw * f)
        if roll:
            rotate(arm, b, (0, 1, 0), roll * f)


def head(arm, pitch=0.0, yaw=0.0, roll=0.0, neck_share=0.45):
    """Turn the head (pitch +down, yaw +toward her left, roll +tilt toward her right shoulder)."""
    for b, f in (('neck01', neck_share * 0.4), ('neck02', neck_share * 0.3), ('neck03', neck_share * 0.3),
                 ('head', 1 - neck_share)):
        if yaw:
            rotate(arm, b, (0, 0, 1), yaw * f)
        if pitch:
            rotate(arm, b, (1, 0, 0), pitch * f)
        if roll:
            rotate(arm, b, (0, 1, 0), roll * f)


def hips(arm, shift=(0, 0, 0), roll=0.0, yaw=0.0, pitch=0.0):
    """Move/rotate the pelvis (root). roll + raises her right hip."""
    pb = arm.pose.bones['root']
    rig.update()
    M = pb.matrix.copy()
    q = Quaternion((0, 1, 0), math.radians(roll)) @ Quaternion((0, 0, 1), math.radians(yaw)) @ \
        Quaternion((1, 0, 0), math.radians(pitch))
    R = q.to_matrix() @ M.to_3x3()
    pb.matrix = Matrix.Translation(M.to_translation() + Vector(shift)) @ R.to_4x4()
    rig.update()


def plant_leg(ctx, side, ankle=None, knee_dir=(0, -1, 0.0), foot_yaw=0.0, foot_pitch=0.0, on_ball=False):
    """Leg IK: put the ankle at `ankle` (default: rest position) with the knee pointing along knee_dir.

    foot_pitch: degrees the foot turns from its standing angle, negative pointing the toes down (the heel
    lifts; a pointed foot), positive lifting them. on_ball: the ankle's height is then found so the ball of
    the foot rests on the ground (a free leg standing on its toes)."""
    arm = ctx.arm
    target = Vector(ankle) if ankle is not None else ctx.ankle[side]
    if on_ball:
        for _ in range(3):
            plant_leg(ctx, side, target, knee_dir, foot_yaw, foot_pitch)
            rig.update()
            target = target + Vector((0, 0, ctx.ball[side].z - arm.pose.bones[f'foot.{side}'].tail.z))

    hip = arm.pose.bones[f'upperleg01.{side}'].head
    pole = (hip + target) / 2 + Vector(knee_dir) * 0.5
    rig.two_bone_ik(arm, f'upperleg01.{side}', f'lowerleg01.{side}', target, pole,
                    twist_bones=(f'upperleg02.{side}', f'lowerleg02.{side}'))
    d = ctx.foot_dir[side].copy()
    if foot_yaw:
        d = Quaternion((0, 0, 1), math.radians(foot_yaw * SIGN[side])) @ d
    if foot_pitch:
        # (A turn about +X takes the forward-pointing foot (-Y) downward: negative pitch points the toes.)
        d = Quaternion((1, 0, 0), math.radians(-foot_pitch)) @ d
    rig.aim(arm, f'foot.{side}', d)


def arm_to(ctx, side, hand_pos, elbow_dir, wrist=None, hand=None, elbow_at=None, keep_dir=False):
    """Arm IK to a hand (wrist) position, the elbow bending toward elbow_dir (or toward the point elbow_at,
    given relative to the shoulder: robust for a tightly folded arm); then wrist and hand shape."""
    arm = ctx.arm
    sh = arm.pose.bones[f'upperarm01.{side}'].head
    pole = sh + Vector(elbow_dir) * 0.4 + (Vector(hand_pos) - sh) * 0.5
    if elbow_at is not None:
        pole = sh + Vector(elbow_at)
    rig.two_bone_ik(arm, f'upperarm01.{side}', f'lowerarm01.{side}', Vector(hand_pos), pole,
                    twist_bones=(f'upperarm02.{side}', f'lowerarm02.{side}'))
    if wrist is not None:
        wrist_dir, palm_toward = wrist
        rig.aim(arm, f'wrist.{side}', Vector(wrist_dir))
        if palm_toward is not None:
            face_palm(arm, side, Vector(palm_toward), keep_dir=keep_dir)
    if hand is not None:
        rig.hand_pose(arm, side, **hand)


def face_palm(arm, side, toward, keep_dir=False):
    """Spin the wrist about its own axis (and the forearm twist bone a little) so the palm faces `toward`.
    keep_dir: the forearm's twist swings a bent wrist; aim the wrist back along its direction afterwards."""
    n = rig.palm_normal(arm, side)
    y = rig.bone_dir(arm, f'wrist.{side}')
    y0 = y.copy()
    t = toward - y * toward.dot(y)
    if t.length < 1e-6:
        return
    t.normalize()
    nn = n - y * n.dot(y)
    nn.normalize()
    ang = math.degrees(nn.angle(t))
    sgn = 1 if nn.cross(t).dot(y) > 0 else -1
    # Split the twist between the forearm twist bone and the wrist (anatomically the radius rolls).
    rig.rotate_world(arm, f'lowerarm02.{side}', rig.bone_dir(arm, f'lowerarm02.{side}'), sgn * ang * 0.5)
    if keep_dir:
        rig.aim(arm, f'wrist.{side}', y0)
    y = rig.bone_dir(arm, f'wrist.{side}')
    n = rig.palm_normal(arm, side)
    nn = n - y * n.dot(y)
    nn.normalize()
    ang = math.degrees(nn.angle(t))
    sgn = 1 if nn.cross(t).dot(y) > 0 else -1
    rig.rotate_world(arm, f'wrist.{side}', y, sgn * ang)


def clavicle(arm, side, lift=0.0, forward=0.0):
    """Shrug (lift +) or roll the shoulder forward (+)."""
    if lift:
        rotate(arm, f'clavicle.{side}', (0, 1, 0), -lift * SIGN[side])
    if forward:
        rotate(arm, f'clavicle.{side}', (0, 0, 1), forward * SIGN[side])


def relaxed_arm(ctx, side, out=0.18, fwd=-0.05, bend=14, hand=None):
    """Arm hanging naturally by the side with a soft elbow bend."""
    arm = ctx.arm
    s = SIGN[side]
    up = Vector((s * out, fwd * -1, -1)).normalized()
    for b in ('upperarm01', 'upperarm02'):
        rig.aim(arm, f'{b}.{side}', up)
    fore = Quaternion((1, 0, 0), math.radians(bend)) @ up
    for b in ('lowerarm01', 'lowerarm02'):
        rig.aim(arm, f'{b}.{side}', fore)
    face_palm(arm, side, Vector((-s, 0.25, 0)))
    rig.hand_pose(arm, side, **(hand or dict(curl=0.32, close=0.7, thumb=0.35)))


def leg_lengths(arm, side):
    pb = arm.pose.bones
    la = sum((pb[f'{b}.{side}'].tail - pb[f'{b}.{side}'].head).length for b in ('upperleg01', 'upperleg02'))
    lb = sum((pb[f'{b}.{side}'].tail - pb[f'{b}.{side}'].head).length for b in ('lowerleg01', 'lowerleg02'))
    return la, lb


def stand_on(ctx, side, bend=3.0, ankle=None):
    """Raise (or lower) the pelvis until the leg she stands on is all but straight (its knee bent by `bend`
    degrees): a standing knee is locked, never crouched."""
    arm = ctx.arm
    rig.update()
    la, lb = leg_lengths(arm, side)
    want = math.sqrt(la * la + lb * lb + 2 * la * lb * math.cos(math.radians(bend)))
    hip = arm.pose.bones[f'upperleg01.{side}'].head
    a = Vector(ankle) if ankle is not None else ctx.ankle[side]
    dx, dy = hip.x - a.x, hip.y - a.y
    z = a.z + math.sqrt(max(want * want - dx * dx - dy * dy, 0.0))
    hips(arm, shift=(0, 0, z - hip.z))


def contrapposto(ctx, weight='R', amount=1.0, relaxed_knee=1.0):
    """Weight on one leg: the pelvis shifts over it and that hip rises, the standing knee straight; the free
    knee bends forward and in, its foot set a little forward on the ball, heel lifted."""
    arm = ctx.arm
    s = SIGN[weight]
    hips(arm, shift=(s * 0.028 * amount, 0, 0), roll=-s * 5.5 * amount, yaw=s * 4 * amount)
    stand_on(ctx, weight)
    free = 'L' if weight == 'R' else 'R'
    plant_leg(ctx, weight)
    a = ctx.ankle[free]
    plant_leg(ctx, free, ankle=(a.x - SIGN[free] * 0.03 * relaxed_knee, a.y - 0.06 * relaxed_knee, a.z),
              knee_dir=(-SIGN[free] * 0.35, -1, 0), foot_yaw=12, foot_pitch=-16 * relaxed_knee, on_ball=True)
    # Shoulders counter the hips; the chest stays over the hips (upright, not leaning back).
    spine(arm, roll=s * 7 * amount, yaw=-s * 5 * amount, pitch=1.0)


def base_stand(ctx):
    rig.reset_pose(ctx.arm)
    plant_leg(ctx, 'L')
    plant_leg(ctx, 'R')
