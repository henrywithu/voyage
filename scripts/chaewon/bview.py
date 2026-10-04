"""Blender (bpy) helpers: build meshes from numpy arrays and render quick previews.

Meshes are given in MakeHuman space (Y up, facing +Z, decimetres) and converted
to Blender space (Z up, facing -Y, metres).
"""
import math

import bpy
import numpy as np
from mathutils import Vector


GROUND = [0.0]


def mh_to_blender(P):
    """MakeHuman (Y up, +Z front, dm) -> Blender (Z up, -Y front, m), feet on z = 0 (see set_ground)."""
    P = np.asarray(P, float)
    return np.c_[P[:, 0], -P[:, 2], P[:, 1] - GROUND[0]] * 0.1


def set_ground(P):
    GROUND[0] = float(np.asarray(P)[:, 1].min())


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def add_mesh(name, P, faces, smooth=True, subdiv=0, color=(0.8, 0.8, 0.8, 1), mh=True):
    V = mh_to_blender(P) if mh else np.asarray(P, float)
    me = bpy.data.meshes.new(name)
    me.from_pydata(V.tolist(), [], [list(map(int, f)) for f in faces])
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    if subdiv:
        m = ob.modifiers.new('sub', 'SUBSURF')
        m.levels = m.render_levels = subdiv
    mat = bpy.data.materials.new(name + '_mat')
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = color
        bsdf.inputs['Roughness'].default_value = 0.55
    me.materials.append(mat)
    return ob


def setup_render(res=(900, 1200), samples=24):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    try:
        sc.cycles.denoiser = 'OPENIMAGEDENOISE'
    except TypeError:
        pass
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    if not sc.world:
        world = bpy.data.worlds.new('w')
        world.use_nodes = True
        world.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.55, 0.58, 1)
        world.node_tree.nodes['Background'].inputs[1].default_value = 0.35
        sc.world = world
        key = bpy.data.lights.new('key', 'AREA')
        key.energy = 140
        key.size = 2.5
        ko = bpy.data.objects.new('key', key)
        ko.location = (2.2, -3.0, 2.6)
        ko.rotation_euler = (Vector((0, 0, 0.9)) - ko.location).to_track_quat('-Z', 'Y').to_euler()
        sc.collection.objects.link(ko)
        rim = bpy.data.lights.new('rim', 'AREA')
        rim.energy = 70
        rim.size = 2.0
        ro = bpy.data.objects.new('rim', rim)
        ro.location = (-2.5, 2.5, 2.2)
        ro.rotation_euler = (Vector((0, 0, 0.9)) - ro.location).to_track_quat('-Z', 'Y').to_euler()
        sc.collection.objects.link(ro)


def camera(target, distance, yaw_deg, pitch_deg=0.0, lens=85, name='cam', ortho=None):
    cam = bpy.data.cameras.new(name)
    cam.lens = lens
    if ortho:
        cam.type = 'ORTHO'
        cam.ortho_scale = ortho
    ob = bpy.data.objects.new(name, cam)
    bpy.context.scene.collection.objects.link(ob)
    yaw, pitch = math.radians(yaw_deg), math.radians(pitch_deg)
    t = Vector(target)
    d = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch)))
    ob.location = t + d * distance
    ob.rotation_euler = (t - ob.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = ob
    return ob


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def views(path_prefix, target, distance, lens=85, yaws=(0, 90, 35, 180), pitch=2, res=(700, 1000), ortho=None):
    out = []
    for y in yaws:
        camera(target, distance, y, pitch, lens, name=f'cam{y}', ortho=ortho)
        p = f'{path_prefix}_{y}.png'
        setup_render(res)
        render(p)
        out.append(p)
    return out


def sheet(paths, out, height=700):
    from PIL import Image
    ims = [Image.open(p).convert('RGB') for p in paths]
    ims = [im.resize((int(im.width * height / im.height), height)) for im in ims]
    W = sum(im.width for im in ims) + 6 * (len(ims) - 1)
    s = Image.new('RGB', (W, height), 'white')
    x = 0
    for im in ims:
        s.paste(im, (x, 0))
        x += im.width + 6
    s.save(out)
    return out
