"""Build the Trapnest Voyage elixir flask: meshes and textures for every scene.

Outputs
  PBR showcase (ProductsScene)        public/assets/decoded/fpo/voyage-flask*.bin.mesh
  line-art selection flask            public/assets/decoded/story/drinkselection/voyage-flask-low.bin.mesh
  line-art pouring flask (in hand)    public/assets/decoded/story/drinkpour/chaewon-pour-flask.bin.mesh
  textures                            public/assets/images/{trapnest-voyage-label.png, story/...}

Usage: CHROMIUM_PATH=... python3 scripts/item/build_flask.py
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '../..')
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, 'scripts/character'))
import flask_art as art  # noqa: E402
import flask_geometry as fg  # noqa: E402
import meshio  # noqa: E402
from svgrender import svg2png  # noqa: E402

PUB = os.path.join(ROOT, 'public/assets')
DEC = os.path.join(PUB, 'decoded')
IMG = os.path.join(PUB, 'images')

TEX = {
    'manga': ('story/drinkselection/trapnest-voyage-flask.png', art.manga_atlas, 1024),
    'label': ('trapnest-voyage-label.png', art.label_atlas, 1024),
    'stopper': ('story/products/voyage-stopper.png', art.stopper, 512),
    'medallion': ('story/products/voyage-medallion.png', art.medallion, 512),
}


def write(path, P, N, UV, T, extra=None):
    arrays = {'position': P, 'normal': N, 'uv': UV}
    arrays.update(extra or {})
    os.makedirs(os.path.dirname(path), exist_ok=True)
    meshio.write(path, arrays, T.astype(np.uint32))
    print('%-60s verts %6d  tris %6d  y %.3f..%.3f' % (os.path.relpath(path, ROOT), len(P), len(T), P[:, 1].min(),
                                                        P[:, 1].max()))


def polar_uv(face, center, mirror=False):
    u, v, r = center
    lx, ly = face.local[:, 0], face.local[:, 1]
    face.uv = np.c_[u + (-lx if mirror else lx) * r, v + ly * r]
    return face


def split_glass(seg, n):
    """Outer glass split into base / body / neck atlas cells, sharing the full profile's normals."""
    p = fg.glass_profile(n)
    nn = fg.profile_normals(p)
    i1 = int(np.argmax(p[:, 0] >= 0.122))  # where the base meets the foot
    i2 = int(np.argmax(p[:, 1] >= 0.80))   # where the shoulder meets the neck
    parts = []
    for key, k in (('base', slice(0, i1 + 1)), ('body', slice(i1, i2 + 1)), ('neck', slice(i2, None))):
        parts.append(fg.revolve(p[k], seg, normals=nn[k]).map_uv(*art.CELLS[key]))
    return parts


def lineart_flask(seg, n):
    """The flask for the line-art shaders, uv-mapped into the manga atlas."""
    C = art.CELLS
    parts = split_glass(seg, n)
    parts.append(fg.label_band(seg).map_uv(*C['label']))
    collar = fg.runs(fg.COLLAR_RUNS, 14, seg)
    parts += [collar[0].map_uv(*C['bevel']), collar[1].map_uv(*C['collar']), collar[2].map_uv(*C['bevel'])]
    parts += [p.map_uv(*C['stem']) for p in fg.runs(fg.STEM_RUNS, 10, seg)]
    parts.append(fg.medallion_rim(seg, 16).map_uv(*C['rim']))
    parts.append(fg.knob(max(8, seg // 2), 7).map_uv(*C['knob']))
    front, back = fg.faces(seg, 6)
    parts += [polar_uv(front, art.MEDALLIONS['front']), polar_uv(back, art.MEDALLIONS['back'], mirror=True)]
    return fg.merge(parts)


def pbr_flask():
    S = art.STOPPER_CELLS
    out = {}
    glass = fg.revolve(fg.glass_profile(120), 96).map_uv(0.0, 0.25, 0.5, 1.0)
    out['voyage-flask'] = fg.merge([glass])
    out['voyage-flask-liquid'] = fg.merge([p.map_uv(0.0, 0.25, 0.508, 1.0) for p in fg.liquid(96, 64)])
    out['voyage-flask-label'] = fg.merge([fg.label_band(128).map_uv(0.01, 0.99, *art.LABEL_V)])
    collar = fg.runs(fg.COLLAR_RUNS, 28, 96)
    parts = [collar[0].map_uv(*S['bevel']), collar[1].map_uv(*S['collar']), collar[2].map_uv(*S['bevel'])]
    parts += [p.map_uv(*S['stem']) for p in fg.runs(fg.STEM_RUNS, 18, 96)]
    parts.append(fg.medallion_rim(128, 28).map_uv(*S['rim']))
    parts.append(fg.knob(32, 14).map_uv(*S['knob']))
    out['voyage-flask-stopper'] = fg.merge(parts)
    front, back = fg.faces(96, 16)
    out['voyage-flask-medallion'] = fg.merge([polar_uv(front, art.PBR_MEDALLIONS['front']),
                                              polar_uv(back, art.PBR_MEDALLIONS['back'], mirror=True)])
    return out


def pour_transform(P, N, s=0.2104, z0=-0.1227):
    """Bottle space (y up) -> the hand attachment space of the pour (axis along z)."""
    R = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)
    return (P @ R.T) * s + np.array([0, 0, z0]), N @ R.T


def textures():
    for key, (rel, fn, size) in TEX.items():
        out = os.path.join(IMG, rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        svg2png(fn(size), out, size, size)
        im = Image.open(out).convert('RGB')
        im.save(out, optimize=True)
        print('%-60s %s' % (os.path.relpath(out, ROOT), im.size))


if __name__ == '__main__':
    if '--meshes-only' not in sys.argv:
        textures()
    for name, (P, N, UV, T) in pbr_flask().items():
        write(os.path.join(DEC, 'fpo/%s.bin.mesh' % name), P, N, UV, T)
    P, N, UV, T = lineart_flask(28, 56)
    write(os.path.join(DEC, 'story/drinkselection/voyage-flask-low.bin.mesh'), P, N, UV, T,
          {'ao': np.zeros((len(P), 1))})
    P, N, UV, T = lineart_flask(48, 96)
    P, N = pour_transform(P, N)
    write(os.path.join(DEC, 'story/drinkpour/chaewon-pour-flask.bin.mesh'), P, N, UV, T)
