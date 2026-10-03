"""Flat-colour front orthographic render of the head (atlas projection):
eyeballs red, upper lip blue, lower lip red, for face_art feature masks."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import chaewon as C, mh, preview, numpy as np, bpy, math
B=C.load_body(); V=B['V']
# lip vertex sets from MakeHuman targets
up_i,up_d=mh.target('mouth/mouth-upperlip-volume-incr.target')
lo_i,lo_d=mh.target('mouth/mouth-lowerlip-volume-incr.target')
col=np.ones((len(V),3))
mu=np.zeros(len(V)); mu[up_i]=np.linalg.norm(up_d,axis=1); mu/=mu.max()
ml=np.zeros(len(V)); ml[lo_i]=np.linalg.norm(lo_d,axis=1); ml/=ml.max()
col[:,0]=1-mu*1.0; col[:,2]=1-ml*1.0; col[:,1]=1-np.maximum(mu,ml)
def tb(P): return np.stack([P[:,0],-P[:,2],P[:,1]],1)
preview.reset()
sc=bpy.context.scene
sc.render.engine='BLENDER_EEVEE' if False else 'CYCLES'
sc.cycles.samples=4
def flat(name, P, F, colors=None, rgb=(1,1,1)):
    me=bpy.data.meshes.new(name); me.from_pydata([tuple(map(float,v)) for v in tb(P)],[],[list(map(int,f)) for f in F]); me.update()
    ob=bpy.data.objects.new(name,me); sc.collection.objects.link(ob)
    mat=bpy.data.materials.new(name); mat.use_nodes=True; nt=mat.node_tree
    for n in list(nt.nodes):
        if n.type!='OUTPUT_MATERIAL': nt.nodes.remove(n)
    em=nt.nodes.new('ShaderNodeEmission'); nt.links.new(em.outputs[0], nt.nodes['Material Output'].inputs[0])
    if colors is not None:
        ca=me.color_attributes.new('c','FLOAT_COLOR','POINT')
        for i,c in enumerate(colors): ca.data[i].color=(*c,1)
        vc=nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name='c'; nt.links.new(vc.outputs[0], em.inputs[0])
    else:
        em.inputs[0].default_value=(*rgb,1)
    me.materials.append(mat)
    return ob
flat('body', V, B['body'], colors=col)
flat('eyes', V, B['eyes'], rgb=(1,0,0))
world=sc.world; world.node_tree.nodes['Background'].inputs[0].default_value=(0,0,0,1)
cam=bpy.data.cameras.new('cam'); cam.type='ORTHO'; cam.ortho_scale=0.22
co=bpy.data.objects.new('cam',cam); sc.collection.objects.link(co); sc.camera=co
co.location=(0,-2,1.47); co.rotation_euler=(math.radians(90),0,0)
sc.render.resolution_x=sc.render.resolution_y=1024
sc.view_settings.view_transform='Standard'
sc.render.filepath=sys.argv[-1]
bpy.ops.render.render(write_still=True)
# also a shaded reference
