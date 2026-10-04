"""Blender cloth simulation for draping fabric over a body (headless bpy)."""
import bpy
import numpy as np


def _object(name, V, F):
    me = bpy.data.meshes.new(name)
    me.from_pydata(np.asarray(V, float).tolist(), [], np.asarray(F, int).tolist())
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def drape_welded(V, F, pin, weld, body_P, body_T, **kw):
    """Drape a mesh whose duplicated seam vertices map onto their twins via `weld`."""
    keep = np.unique(weld)
    remap = -np.ones(len(V), int)
    remap[keep] = np.arange(len(keep))
    Fw = remap[weld[F]]
    Fw = Fw[(Fw[:, 0] != Fw[:, 1]) & (Fw[:, 1] != Fw[:, 2]) & (Fw[:, 0] != Fw[:, 2])]
    res = drape(V[keep], Fw, np.asarray(pin)[keep], body_P, body_T, **kw)
    if isinstance(res, tuple):
        res = res[0]
    return res[remap[weld]]


def drape(V, F, pin, body_P, body_T, frames=60, mass=0.12, tension=12.0, bending=0.6,
          shrink=0.0, thickness=0.003, gravity=(0, 0, -9.81), wind=None, quality=10, return_all=False):
    """Simulate a cloth mesh pinned where `pin` is 1 and return the final vertex positions."""
    sc = bpy.context.scene
    sc.gravity = gravity
    body = _object('collider', body_P, body_T)
    col = body.modifiers.new('col', 'COLLISION')
    body.collision.thickness_outer = thickness
    body.collision.thickness_inner = 0.01
    body.collision.cloth_friction = 6.0
    cloth = _object('cloth', V, F)
    vg = cloth.vertex_groups.new(name='pin')
    for i in np.flatnonzero(np.asarray(pin) > 0):
        vg.add([int(i)], float(pin[i]), 'REPLACE')
    mod = cloth.modifiers.new('cloth', 'CLOTH')
    s = mod.settings
    s.quality = quality
    s.mass = mass
    s.tension_stiffness = s.compression_stiffness = tension
    s.shear_stiffness = tension * 0.5
    s.bending_stiffness = bending
    s.air_damping = 1.5
    s.vertex_group_mass = 'pin'
    s.pin_stiffness = 1.0
    s.shrink_min = shrink
    cs = mod.collision_settings
    cs.distance_min = thickness
    cs.collision_quality = 4
    cs.use_self_collision = False
    mod.point_cache.frame_start = 1
    mod.point_cache.frame_end = frames
    if wind is not None:
        bpy.ops.object.effector_add(type='WIND', location=(0, 0, 0))
        w = bpy.context.object
        w.rotation_euler = wind['rotation']
        w.field.strength = wind['strength']
        w.field.noise = wind.get('noise', 0.5)
        w.field.flow = wind.get('flow', 0.0)
    sc.frame_start, sc.frame_end = 1, frames
    out = []
    for f in range(1, frames + 1):
        sc.frame_set(f)
        if return_all:
            out.append(read(cloth))
    final = read(cloth)
    bpy.data.objects.remove(cloth)
    bpy.data.objects.remove(body)
    return (final, out) if return_all else final


def read(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    P = np.empty(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', P)
    ev.to_mesh_clear()
    return P.reshape(-1, 3).astype(float)
