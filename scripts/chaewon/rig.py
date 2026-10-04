"""Chaewon's rigged body in Blender (bpy): MakeHuman's full default skeleton and CC0 weights.

`build(...)` creates the subdivided body, eyeballs and armature. Posing helpers
set bone rotations in world terms (aim a bone, bend a chain, curl fingers),
so poses read as intent rather than raw Euler angles. All spaces here are
Blender's (Z up, character facing -Y, metres).
"""
import math

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector

import bview
import mhbody

BLEND_UP = Vector((0, 0, 1))


def to_b(P):
    return bview.mh_to_blender(P)


def build(expression=None, subdiv=1, shape=None, name='chaewon'):
    """Create body + eyes + armature. Returns (armature, body, eyes, info)."""
    V, UV, F, FUV, G = mhbody.build(**({} if shape is None else shape))
    if expression:
        V = mhbody.expression(V, expression)
    body_faces = [f for f, g in zip(F, G) if g == 'body']
    used = np.unique(np.concatenate([np.array(f) for f in body_faces]))
    bview.set_ground(V[used])
    order, parents, heads, tails, xs = mhbody.skeleton(V)
    W = mhbody.weights(order, len(V))

    # Body mesh with MakeHuman UVs.
    Vb = to_b(V)
    me = bpy.data.meshes.new(name + '_body')
    me.from_pydata(Vb.tolist(), [], [list(map(int, f)) for f in body_faces])
    me.update()
    uvl = me.uv_layers.new(name='mh')
    loop = 0
    face_uv = [fu for fu, g in zip(FUV, G) if g == 'body']
    data = []
    for fu in face_uv:
        for k in fu:
            data.extend(UV[k] if k >= 0 else (0, 0))
    uvl.data.foreach_set('uv', np.array(data, np.float32))
    body = bpy.data.objects.new(name + '_body', me)
    bpy.context.scene.collection.objects.link(body)
    for p in me.polygons:
        p.use_smooth = True
    # Vertex groups (only verts that are used).
    for bi, bn in enumerate(order):
        col = W[:, bi]
        nz = np.flatnonzero(col > 1e-4)
        if not len(nz):
            continue
        vg = body.vertex_groups.new(name=bn)
        for vi in nz:
            vg.add([int(vi)], float(col[vi]), 'REPLACE')
    # Remove loose verts (helpers) while keeping indices consistent: delete unused.
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.mesh.select_loose()
    bpy.ops.mesh.delete(type='VERT')
    bpy.ops.object.mode_set(mode='OBJECT')
    if subdiv:
        m = body.modifiers.new('sub', 'SUBSURF')
        m.levels = m.render_levels = subdiv
        m.uv_smooth = 'PRESERVE_CORNERS'
        bpy.ops.object.modifier_apply(modifier='sub')

    # Eyeballs (high-poly proxy), parented rigidly to the eye bones.
    eyeP, eyeUV, eyeF, eyeFUV = mhbody.fit_proxy(mhbody.MH + '/eyes/high-poly/high-poly.mhclo', V)
    em = bpy.data.meshes.new(name + '_eyes')
    em.from_pydata(to_b(eyeP).tolist(), [], [list(map(int, f)) for f in eyeF])
    em.update()
    euv = em.uv_layers.new(name='mh')
    data = []
    for fu in eyeFUV:
        for k in fu:
            data.extend(eyeUV[k] if k >= 0 else (0, 0))
    euv.data.foreach_set('uv', np.array(data, np.float32))
    eyes = bpy.data.objects.new(name + '_eyes', em)
    bpy.context.scene.collection.objects.link(eyes)
    for p in em.polygons:
        p.use_smooth = True
    EP = to_b(eyeP)
    for side, sign in (('L', 1), ('R', -1)):
        vg = eyes.vertex_groups.new(name=f'eye.{side}')
        idx = [i for i, p in enumerate(EP) if p[0] * sign > 0]
        vg.add(idx, 1.0, 'REPLACE')

    # Armature.
    arm_data = bpy.data.armatures.new(name + '_rig')
    arm = bpy.data.objects.new(name + '_rig', arm_data)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    for o in bpy.context.selected_objects:
        o.select_set(False)
    arm.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    H, T, X = to_b(heads), to_b(tails), np.c_[xs[:, 0], -xs[:, 2], xs[:, 1]]
    ebs = []
    for i, bn in enumerate(order):
        eb = arm_data.edit_bones.new(bn)
        eb.head = Vector(H[i])
        tail = Vector(T[i])
        if (tail - eb.head).length < 1e-4:
            tail = eb.head + Vector((0, 0, 0.01))
        eb.tail = tail
        y = (eb.tail - eb.head).normalized()
        x = Vector(X[i])
        z = x.cross(y)
        if z.length > 1e-6:
            eb.align_roll(z.normalized())
        ebs.append(eb)
    for i, p in enumerate(parents):
        if p >= 0:
            ebs[i].parent = ebs[p]
    bpy.ops.object.mode_set(mode='OBJECT')
    for ob in (body, eyes):
        mod = ob.modifiers.new('rig', 'ARMATURE')
        mod.object = arm
        ob.parent = arm
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    info = dict(order=order, parents=parents, heads=H, tails=T, height=float(Vb[:, 2].max()))
    return arm, body, eyes, info


# ------------------------------------------------------------------ posing

def update():
    bpy.context.view_layer.update()


def world_matrix(arm, bone):
    return arm.matrix_world @ arm.pose.bones[bone].matrix


def set_world_rotation(arm, bone, R):
    """Give a pose bone the world orientation R (3x3), keeping its head where the parent puts it."""
    pb = arm.pose.bones[bone]
    update()
    M = pb.matrix.copy()
    loc = M.to_translation()
    new = Matrix.Translation(loc) @ R.to_4x4()
    pb.matrix = new
    update()


def rotate_world(arm, bone, axis, angle_deg):
    """Rotate a bone about a world axis through its head (children follow)."""
    pb = arm.pose.bones[bone]
    update()
    M = pb.matrix.copy()
    q = Quaternion(Vector(axis).normalized(), math.radians(angle_deg))
    R = q.to_matrix() @ M.to_3x3()
    pb.matrix = Matrix.Translation(M.to_translation()) @ R.to_4x4()
    update()


def rotate_local(arm, bone, axis, angle_deg):
    """Rotate about the bone's own axis ('X', 'Y', 'Z')."""
    pb = arm.pose.bones[bone]
    q = Quaternion({'X': (1, 0, 0), 'Y': (0, 1, 0), 'Z': (0, 0, 1)}[axis], math.radians(angle_deg))
    pb.rotation_quaternion = pb.rotation_quaternion @ q
    update()


def bone_dir(arm, bone):
    pb = arm.pose.bones[bone]
    update()
    return ((pb.tail - pb.head)).normalized()


def aim(arm, bone, direction, twist_ref=None, twist_axis='Z'):
    """Turn a bone so its Y axis points along `direction` (world), with minimal twist."""
    d = Vector(direction).normalized()
    cur = bone_dir(arm, bone)
    q = cur.rotation_difference(d)
    pb = arm.pose.bones[bone]
    M = pb.matrix.copy()
    R = q.to_matrix() @ M.to_3x3()
    pb.matrix = Matrix.Translation(M.to_translation()) @ R.to_4x4()
    update()
    if twist_ref is not None:
        # Spin about the bone axis so the chosen local axis faces twist_ref.
        M = pb.matrix.to_3x3()
        ax = M.col[{'X': 0, 'Z': 2}[twist_axis]]
        ref = Vector(twist_ref) - d * Vector(twist_ref).dot(d)
        if ref.length > 1e-6:
            ang = ax.angle(ref.normalized())
            sgn = 1 if ax.cross(ref).dot(d) > 0 else -1
            rotate_world(arm, bone, d, math.degrees(ang) * sgn)


def two_bone_ik(arm, upper, lower, target, pole, twist_bones=()):
    """Place the end of `lower` at `target` (world) bending toward `pole`."""
    update()
    a = arm.pose.bones[upper].head.copy()
    la = (arm.pose.bones[upper].tail - arm.pose.bones[upper].head).length
    # Twist bones (upperarm02 etc.) sit between: measure total segment lengths through children.
    chain_upper = [upper] + [b for b in twist_bones if b.startswith(upper[:-4])]
    la = sum((arm.pose.bones[b].tail - arm.pose.bones[b].head).length for b in chain_upper)
    chain_lower = [lower] + [b for b in twist_bones if b.startswith(lower[:-4])]
    lb = sum((arm.pose.bones[b].tail - arm.pose.bones[b].head).length for b in chain_lower)
    t = Vector(target)
    d = t - a
    dist = min(d.length, (la + lb) * 0.999)
    cos_a = (la * la + dist * dist - lb * lb) / (2 * la * dist)
    ang = math.acos(max(-1, min(1, cos_a)))
    dn = d.normalized()
    p = Vector(pole) - a
    bend = (p - dn * p.dot(dn)).normalized()
    upper_dir = (dn * math.cos(ang) + bend * math.sin(ang)).normalized()
    elbow = a + upper_dir * la
    for b in chain_upper:
        aim(arm, b, upper_dir)
    lower_dir = (t - elbow).normalized()
    for b in chain_lower:
        aim(arm, b, lower_dir)
    return elbow


def curl_finger(arm, side, finger, amounts, spread=0.0):
    """Bend a finger's three joints toward the palm (degrees; MakeHuman finger bones flex about -X)."""
    for seg, a in zip((1, 2, 3), amounts):
        rotate_local(arm, f'finger{finger}-{seg}.{side}', 'X', -a)
    if spread:
        rotate_local(arm, f'finger{finger}-1.{side}', 'Z', spread)


def palm_normal(arm, side):
    """World direction the fingers close toward (out of the palm)."""
    update()
    pb = arm.pose.bones[f'finger3-1.{side}']
    tip0 = pb.tail.copy()
    q0 = pb.rotation_quaternion.copy()
    rotate_local(arm, f'finger3-1.{side}', 'X', -10)
    d = (pb.tail - tip0)
    pb.rotation_quaternion = q0
    update()
    y = (pb.tail - pb.head).normalized()
    n = d - y * d.dot(y)
    return n.normalized()


def hand_pose(arm, side, curl=0.35, close=0.6, thumb=0.5, cascade=(0.85, 1.0, 1.15, 1.3), spread_extra=(0, 0, 0, 0)):
    """A natural hand: fingers gathered toward the middle finger, a progressive curl, the thumb turned in.

    curl 0 = flat, 0.35 = relaxed, 1 = fist. close 0 = as modelled (fanned), 1 = together.
    thumb 0 = open, 1 = across the palm.
    """
    update()
    n = palm_normal(arm, side)
    mid = bone_dir(arm, f'finger3-1.{side}')
    for k, f in enumerate((2, 3, 4, 5)):
        if f != 3:
            d = bone_dir(arm, f'finger{f}-1.{side}')
            target = d.slerp(mid, close * 0.75) if d.angle(mid) > 1e-3 else d
            pb = arm.pose.bones[f'finger{f}-1.{side}']
            q = d.rotation_difference(target)
            M = pb.matrix.copy()
            pb.matrix = Matrix.Translation(M.to_translation()) @ (q.to_matrix() @ M.to_3x3()).to_4x4()
            update()
        c = curl * cascade[k]
        curl_finger(arm, side, f, (52 * c, 78 * c, 42 * c))
        if spread_extra[k]:
            rotate_local(arm, f'finger{f}-1.{side}', 'Z', spread_extra[k])
    # Thumb (measured): -X opposes/flexes toward the palm, -Z swings toward the index finger.
    rotate_local(arm, f'finger1-1.{side}', 'X', -(12 + 38 * thumb))
    rotate_local(arm, f'finger1-1.{side}', 'Z', -(8 + 14 * thumb))
    rotate_local(arm, f'finger1-2.{side}', 'X', -(8 + 30 * thumb))
    rotate_local(arm, f'finger1-3.{side}', 'X', -(10 + 32 * thumb))


def reset_pose(arm):
    for pb in arm.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)
    update()


def evaluated_vertices(ob):
    """World-space deformed vertex positions of a mesh object."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    P = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', P)
    P = P.reshape(-1, 3)
    M = np.array(ob.matrix_world)
    P = P @ M[:3, :3].T + M[:3, 3]
    ev.to_mesh_clear()
    return P
