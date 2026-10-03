import sys, meshio, numpy as np
def dump(name):
    h,a,ix=meshio.read('/home/user/voyage/public/assets/decoded/story/'+name+'.bin.mesh')
    bones=h['bones']; W=meshio.world_matrices(bones)
    pos=a['position']; w=a['skinWeight']; si=a['skinIndex'].astype(int)
    skin=a['uv2'][:,1]>0.55 if 'uv2' in a else np.zeros(len(pos),bool)
    print('==',name,len(bones),'bones; bbox',pos.min(0).round(2),pos.max(0).round(2))
    for i,b in enumerate(bones):
        p=W[i][:3,3]
        m=(si[:,0]==i)&(w[:,0]>0.5)
        c=pos[m].mean(0).round(2) if m.any() else None
        sk=(m&skin).sum()
        print(f"{i:2d} {b['name'][:14]:14s} par {b['parent']:2d} pos {np.round(p,3)} scl {np.round(b['scl'][0],2)} n {m.sum():5d} skin {sk:4d} cen {c}")
for n in sys.argv[1:]: dump(n)
