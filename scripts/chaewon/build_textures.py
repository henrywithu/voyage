"""Rebuild Chaewon's atlas: feature map -> landmarks -> drawn face -> 4096 atlas (with the eye close-up).

Run with Blender's Python (bpy) available:  python3 build_textures.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '../character'))
sys.path.insert(0, HERE)
import numpy as np  # noqa: E402

import atlas  # noqa: E402
import face  # noqa: E402
import facemap  # noqa: E402

BUILD = os.path.join(HERE, 'build')
OUT = os.path.join(HERE, '../../public/assets/images/story/chaewon/atlas.png')
CHROMIUM = os.environ.get('CHROMIUM_PATH', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome')

if __name__ == '__main__':
    rest = dict(np.load(os.path.join(BUILD, 'rest.npz')))
    fm = os.path.join(BUILD, 'facemap.png')
    win = facemap.render(rest, fm)
    lm = face.landmarks(face.load_map(fm))
    lm['nose_y'] = face.nose_tip_px(rest, win, lm['R'])
    # Contour shading and the fringe's shadow on the forehead, painted from the feature map's silhouette.
    import base64
    import io
    import hair as hair_mod
    from PIL import Image
    fmap = face.load_map(fm)
    R = lm['R']
    eye_y = (lm['eyes'][0]['cy'] + lm['eyes'][1]['cy']) / 2
    chin_y = lm['mouth']['seam_y'] + 0.6 * (lm['mouth']['seam_y'] - eye_y)
    hf = hair_mod.head_frame(rest)
    hz = hair_mod.ellipsoid_point(hf, 0.0, float(hair_mod.hairline_elev(0.0)))[2]
    hair_y = (0.5 - (hz - win['cz']) / win['size']) * R
    rgba = face.contour_layer(fmap, R, eye_y, chin_y, hair_y, jaw=face.jaw_line(rest, win, R, lm['mouth']['seam_y']))
    buf = io.BytesIO()
    Image.fromarray((rgba * 255).astype(np.uint8), 'RGBA').save(buf, 'PNG')
    layer = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    ew = atlas.build(face.face_svg(lm, layer_png=layer), face.face_svg(lm, closeup=True, layer_png=layer), lm, win, OUT,
                     chromium=CHROMIUM, eyeball_svg=face.eyeball_svg(lm))
    mid = (lm['eyes'][0]['cx'] + lm['eyes'][1]['cx']) / 2
    iris = [face.iris_geometry(e, -1 if e['cx'] < mid else 1) for e in lm['eyes']]
    json.dump(dict(win=win, eye_window=ew, eyes=[dict(cx=float(e['cx']), cy=float(e['cy']), x0=int(e['x0']), x1=int(e['x1']),
                                                      iris=[float(v) for v in ir])
                                                 for e, ir in zip(lm['eyes'], iris)], R=lm['R']),
              open(os.path.join(BUILD, 'face.json'), 'w'), indent=1)
    print('atlas', OUT)
