"""Headless Blender preview renders (Cycles CPU) for character checks."""
import bpy
import numpy as np
import math


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 16
    sc.cycles.use_denoising = False
    sc.render.film_transparent = False
    world = bpy.data.worlds.new('w')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.9, 0.9, 0.88, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.6
    sc.world = world
    return sc


def add_mesh(name, verts, faces, color=(0.8, 0.8, 0.8), smooth=True, uv=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(map(float, v)) for v in verts], [], [list(map(int, f)) for f in faces])
    me.update()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    mat = bpy.data.materials.new(name + 'm')
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = 0.6
    me.materials.append(mat)
    return ob


def textured(ob, image_path, uv, uv_name='atlas', alpha=False):
    """Attach a face-corner UV layer and an emission image material."""
    me = ob.data
    layer = me.uv_layers.new(name=uv_name)
    for li, loop in enumerate(me.loops):
        layer.data[li].uv = (float(uv[loop.vertex_index][0]), float(uv[loop.vertex_index][1]))
    mat = me.materials[0]
    nt = mat.node_tree
    img = bpy.data.images.load(image_path)
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    uvn = nt.nodes.new('ShaderNodeUVMap')
    uvn.uv_map = uv_name
    nt.links.new(uvn.outputs['UV'], tex.inputs['Vector'])
    bsdf = nt.nodes['Principled BSDF']
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    if alpha:
        nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])


def light_and_camera(center, height, views, out_prefix, res=(800, 1000), ortho=True):
    sc = bpy.context.scene
    sun = bpy.data.lights.new('sun', 'SUN')
    sun.energy = 3.0
    so = bpy.data.objects.new('sun', sun)
    so.rotation_euler = (math.radians(50), math.radians(10), math.radians(30))
    sc.collection.objects.link(so)
    cam = bpy.data.cameras.new('cam')
    if ortho:
        cam.type = 'ORTHO'
        cam.ortho_scale = height * 1.1
    co = bpy.data.objects.new('cam', cam)
    sc.collection.objects.link(co)
    sc.camera = co
    sc.render.resolution_x, sc.render.resolution_y = res
    outs = []
    for name, (az, el) in views.items():
        d = height * 3
        x = center[0] + d * math.sin(math.radians(az)) * math.cos(math.radians(el))
        y = center[1] - d * math.cos(math.radians(az)) * math.cos(math.radians(el))
        z = center[2] + d * math.sin(math.radians(el))
        co.location = (x, y, z)
        direction = np.array(center) - np.array([x, y, z])
        rot_quat = __import__('mathutils').Vector(direction.tolist()).to_track_quat('-Z', 'Y')
        co.rotation_euler = rot_quat.to_euler()
        sc.render.filepath = f'{out_prefix}-{name}.png'
        bpy.ops.render.render(write_still=True)
        outs.append(sc.render.filepath)
    return outs
