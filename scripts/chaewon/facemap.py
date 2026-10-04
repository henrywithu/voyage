"""Front-projected feature maps of Chaewon's face (bpy), for aligning the drawn face art.

Renders an orthographic front view of the head where colour encodes features:
red = lips (MakeHuman oris* weights), green = eyelids (orbicularis*), blue =
brows (oculi*), black = the eyeballs showing through the eye openings, white
skin elsewhere. The same projection becomes the face's atlas coordinates.
"""
import sys

import bpy
import numpy as np

import bview

FACE = dict(cx=0.0, cz=None, size=0.26)  # ortho window (metres), centred on the face


def face_window(rest):
    names = list(rest['names'])
    H = rest['heads']
    head = H[names.index('head')]
    top = rest['P'][:, 2].max()
    cz = (head[2] + top) / 2 - 0.035
    return dict(cx=0.0, cz=float(cz), size=0.26)


def render(rest, out, res=2048):
    names = list(rest['names'])
    P, T, W = rest['P'], rest['T'], rest['W']
    groups = {'lips': ('oris',), 'lids': ('orbicularis',), 'brows': ('oculi',)}
    col = np.ones((len(P), 3))
    for k, (key, prefixes) in enumerate(groups.items()):
        idx = [i for i, n in enumerate(names) if n.startswith(prefixes)]
        w = W[:, idx].sum(1)
        c = np.array([[1, 0.15, 0.15], [0.15, 1, 0.15], [0.15, 0.15, 1]][k])
        col = col * (1 - w[:, None]) + c[None] * w[:, None]
    bview.reset()
    me = bpy.data.meshes.new('head')
    me.from_pydata(P.tolist(), [], T.tolist())
    me.update()
    attr = me.color_attributes.new('feat', 'FLOAT_COLOR', 'POINT')
    attr.data.foreach_set('color', np.c_[col, np.ones(len(P))].astype(np.float32).ravel())
    ob = bpy.data.objects.new('head', me)
    bpy.context.scene.collection.objects.link(ob)
    mat = bpy.data.materials.new('feat')
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    a = nt.nodes.new('ShaderNodeAttribute')
    a.attribute_name = 'feat'
    e = nt.nodes.new('ShaderNodeEmission')
    o = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(a.outputs['Color'], e.inputs['Color'])
    nt.links.new(e.outputs['Emission'], o.inputs['Surface'])
    me.materials.append(mat)
    em = bpy.data.meshes.new('eyes')
    em.from_pydata(rest['EP'].tolist(), [], rest['ET'].tolist())
    eo = bpy.data.objects.new('eyes', em)
    bpy.context.scene.collection.objects.link(eo)
    m2 = bpy.data.materials.new('black')
    m2.use_nodes = True
    nt2 = m2.node_tree
    nt2.nodes.clear()
    e2 = nt2.nodes.new('ShaderNodeEmission')
    e2.inputs['Color'].default_value = (0, 0, 0, 1)
    o2 = nt2.nodes.new('ShaderNodeOutputMaterial')
    nt2.links.new(e2.outputs['Emission'], o2.inputs['Surface'])
    em.materials.append(m2)
    win = face_window(rest)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 4
    sc.cycles.use_denoising = False
    sc.render.resolution_x = sc.render.resolution_y = res
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.5, 0.5, 0.5, 1)
    sc.world = w
    cam = bpy.data.cameras.new('c')
    cam.type = 'ORTHO'
    cam.ortho_scale = win['size']
    co = bpy.data.objects.new('c', cam)
    co.location = (win['cx'], -2.0, win['cz'])
    co.rotation_euler = (np.pi / 2, 0, 0)
    sc.collection.objects.link(co)
    sc.camera = co
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
    return win


if __name__ == '__main__':
    rest = dict(np.load(sys.argv[1]))
    print(render(rest, sys.argv[2]))
