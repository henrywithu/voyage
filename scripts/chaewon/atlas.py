"""Chaewon's line-art atlas (4096 px) and the uv mapping into it.

Colour: ink is near-black (red below about 0.16, which makeup.glsl inkLevel maps under the 0.55 every
shader thresholds its line art at), everything lighter is paint (her skin, make-up, dark brown irises),
multiplied over her shading (src/shaders/original/makeup.glsl). Every shader that draws her reads the
atlas through inkLevel.

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


SKIN_RGB = (255, 241, 235)  # face.SKIN: body skin samples SKIN_WHITE, which must match the painted face


def build(face_svg, closeup_svg, lm, win, out_png, chromium=None):
    """Render the painted face and the eye close-up into the atlas (RGB: ink is black, paint is colour)."""
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
    atlas = Image.new('RGB', (SIZE, SIZE), 'white')
    # Skin zone (v > 0.555) outside the face window: her skin tone.
    atlas.paste(Image.new('RGB', (SIZE - fpx, int((1 - FACE_UV['v0']) * SIZE)), SKIN_RGB), (fpx, 0))
    svg2png(face_svg.replace('width="%d" height="%d"' % (R, R), 'width="%d" height="%d"' % (fpx, fpx), 1), tmp, fpx, fpx)
    atlas.paste(Image.open(tmp).convert('RGB'), (int(FACE_UV['u0'] * SIZE), int((1 - FACE_UV['v0'] - FACE_UV['span']) * SIZE)))
    svg = closeup_svg.replace('viewBox="0 0 %d %d"' % (R, R), 'viewBox="%.1f %.1f %.1f %.1f"' % (x0, y0, x1 - x0, y1 - y0), 1)
    svg = svg.replace('width="%d" height="%d"' % (R, R), 'width="%d" height="%d"' % (cw, ch), 1)
    svg2png(svg, tmp, cw, ch)
    atlas.paste(Image.open(tmp).convert('RGB'), (int(EYE_UV['u0'] * SIZE), int((1 - EYE_UV['v1']) * SIZE)))
    os.remove(tmp)
    atlas.save(out_png, optimize=True)
    return ew
