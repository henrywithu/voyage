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
    ew = atlas.build(face.face_svg(lm), face.face_svg(lm, closeup=True), lm, win, OUT, chromium=CHROMIUM)
    json.dump(dict(win=win, eye_window=ew, eyes=[dict(cx=float(e['cx']), cy=float(e['cy']), x0=int(e['x0']), x1=int(e['x1']))
                                                 for e in lm['eyes']], R=lm['R']),
              open(os.path.join(BUILD, 'face.json'), 'w'), indent=1)
    print('atlas', OUT)
