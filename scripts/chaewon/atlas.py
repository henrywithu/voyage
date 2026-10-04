"""Chaewon's line-art atlas (4096 px) and the uv mapping into it.

Channels: red is the line art; green and blue are make-up masks over the same projection (green: lips,
blue: cheeks; 255 = none, 0 = full), white elsewhere. Shaders that know nothing of make-up read red only.

Layout (GL v, bottom -> top). Shaders treat v > 0.55 as skin, below as cloth.
  face projection   u 0.000-0.445, v 0.555-1.000  front orthographic window of the head
  blank skin        (0.80, 0.80)
  blank cloth       (0.50, 0.25)
  eye close-up      u 0.505-0.995, v 0.020-0.314  high-res drawing of the eyes and brows
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(HERE, '../character'))

SIZE = 4096
FACE_UV = dict(u0=0.0, v0=0.555, span=0.445)
SKIN_WHITE = (0.80, 0.80)
CLOTH_WHITE = (0.50, 0.25)
EYE_UV = dict(u0=0.505, u1=0.995, v0=0.02, v1=0.314)


def face_uv(P, win):
    """Blender-space points -> atlas uv through the front projection window."""
    x = (P[:, 0] - (win['cx'] - win['size'] / 2)) / win['size']
    z = (P[:, 2] - (win['cz'] - win['size'] / 2)) / win['size']
    x, z = np.clip(x, 0.001, 0.999), np.clip(z, 0.001, 0.999)
    return np.c_[FACE_UV['u0'] + x * FACE_UV['span'], FACE_UV['v0'] + z * FACE_UV['span']]


def eye_window(lm, win, R):
    """World rectangle of the close-up eye crop (both eyes and brows), matching the crop aspect."""
    e0, e1 = lm['eyes']
    cy = (e0['cy'] + e1['cy']) / 2 - 0.15 * (e1['x1'] - e0['x0']) * 0.25
    cxp = (e0['cx'] + e1['cx']) / 2
    half_w = (e1['x1'] - e0['x0']) * 0.62
    aspect = (EYE_UV['u1'] - EYE_UV['u0']) / (EYE_UV['v1'] - EYE_UV['v0'])
    half_h = half_w / aspect
    px = (cxp - half_w, cy - half_h, cxp + half_w, cy + half_h)
    to_w = lambda x, y: (win['cx'] + (x / R - 0.5) * win['size'], win['cz'] + (0.5 - y / R) * win['size'])
    (x0, z1), (x1, z0) = to_w(px[0], px[1]), to_w(px[2], px[3])
    return dict(px=px, x0=x0, x1=x1, z0=z0, z1=z1)


def eye_uv(P, ew):
    x = (P[:, 0] - ew['x0']) / (ew['x1'] - ew['x0'])
    z = (P[:, 2] - ew['z0']) / (ew['z1'] - ew['z0'])
    return np.c_[EYE_UV['u0'] + np.clip(x, 0, 1) * (EYE_UV['u1'] - EYE_UV['u0']),
                 EYE_UV['v0'] + np.clip(z, 0, 1) * (EYE_UV['v1'] - EYE_UV['v0'])]


def build(face_svg, closeup_svg, lm, win, out_png, chromium=None, makeup=None):
    """makeup: {'lips': svg, 'cheeks': svg} masks over the face projection (green and blue channels)."""
    from svgrender import svg2png
    if chromium:
        os.environ['CHROMIUM_PATH'] = chromium
    R = lm['R']
    tmp = out_png + '.face.png'
    fpx = int(round(FACE_UV['span'] * SIZE))
    ew = eye_window(lm, win, R)
    x0, y0, x1, y1 = ew['px']
    cw = int(round((EYE_UV['u1'] - EYE_UV['u0']) * SIZE))
    ch = int(round((EYE_UV['v1'] - EYE_UV['v0']) * SIZE))

    def face_layer(svg):
        svg2png(svg.replace('width="%d" height="%d"' % (R, R), 'width="%d" height="%d"' % (fpx, fpx), 1), tmp, fpx, fpx)
        return Image.open(tmp).convert('L')

    def eye_layer(svg):
        svg = svg.replace('viewBox="0 0 %d %d"' % (R, R), 'viewBox="%.1f %.1f %.1f %.1f"' % (x0, y0, x1 - x0, y1 - y0), 1)
        svg = svg.replace('width="%d" height="%d"' % (R, R), 'width="%d" height="%d"' % (cw, ch), 1)
        svg2png(svg, tmp, cw, ch)
        return Image.open(tmp).convert('L')

    face_at = (int(FACE_UV['u0'] * SIZE), int((1 - FACE_UV['v0'] - FACE_UV['span']) * SIZE))
    eye_at = (int(EYE_UV['u0'] * SIZE), int((1 - EYE_UV['v1']) * SIZE))
    channels = []
    for art_face, art_eye in ((face_svg, closeup_svg),) + tuple(((makeup or {}).get(k), (makeup or {}).get(k))
                                                                  for k in ('lips', 'cheeks')):
        layer = Image.new('L', (SIZE, SIZE), 255)
        if art_face is not None:
            layer.paste(face_layer(art_face), face_at)
            layer.paste(eye_layer(art_eye), eye_at)
        channels.append(layer)
    os.remove(tmp)
    Image.merge('RGB', channels).save(out_png, optimize=True)
    return ew
