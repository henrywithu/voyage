"""Build the editorial display lettering: glyph quads plus distance-field textures.

Each lettering block is set in Charles Rosie (with its CH/LL/NN ligatures),
split into one quad per glyph cluster, and written in the formats the scene
layouts load: a quad mesh with quadIndex/rowIndex/rowCount attributes
(BufferGeometry JSON or decoded .bin.mesh), a single-channel distance field
packed into RGB (the shaders take the median of three channels), a white
coverage map and a soft alpha field.

The world placement of every block follows the Spirit block it replaces, so
the scene layouts and animations need no changes.

Usage: python3 scripts/lettering/build_lettering.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..')
sys.path.insert(0, os.path.join(ROOT, 'scripts/character'))
import meshio  # noqa: E402

FONT = os.path.join(ROOT, 'public/assets/fonts/CharlesRosie.woff')
IMG = os.path.join(ROOT, 'public/assets/images')
GEO = os.path.join(ROOT, 'public/assets/geometry')
DEC = os.path.join(ROOT, 'public/assets/decoded')
REF = os.path.join(ROOT, 'reference/lettering')

BLOCKS = [
    {
        'name': 'sail-away-stay-golden',
        'lines': ['SAIL AWAY', 'STAY GOLDEN'],
        'source_mesh': 'indulgenowatonelater.json',
        'source_map': 'indulge-now-atone-later-map.png',
        'canvas': (4386, 1229),
        'pitch': 0.505,           # row pitch / canvas height
        'cap': 0.43,             # cap height / canvas height
        'ornaments': True,
        'sdf_scale': 0.5,        # distance field resolution / canvas
        'range': 112 * 0.5,      # distance (field px) from edge to 0 / 1
        'out_mesh': os.path.join(GEO, 'sailawaystaygolden.json'),
        'sdf_jpg': False,
    },
    {
        'name': 'chill-your-voyage',
        'lines': ['WEAR YOUR VOYAGE.', 'THE SUMMER STARTS', 'AT SUNSET.', 'FASTEN THE CLASP.', 'LET THE TIDE',
                  'RISE. FOLLOW', 'THE PEARL. WHERE', 'YOU SAIL NEXT', 'IS UP TO YOU.'],
        'source_mesh': 'chillYourSpirit.bin.mesh',
        'canvas': (1105, 1140),
        'pitch': 0.1115,
        'cap': 0.087,
        'sdf_scale': 1.0,
        'range': 16.4,
        'out_mesh': os.path.join(DEC, 'fromuil/chillYourVoyage.bin.mesh'),
        'sdf_jpg': True,
    },
]
# The Tides pendants (the file names keep the slots of the carousel they fill).
PRODUCTS = [
    ('lagoon-yuzu-and-sea-salt', ['LAGOON', 'PEARL', '& GOLD']),
    ('jade-lime-and-mint', ['JADE', 'PEARL', '& GOLD']),
    ('coral-peach-and-hibiscus', ['CORAL', 'PEARL', '& GOLD']),
]
for name, lines in PRODUCTS:
    BLOCKS.append({
        'name': name,
        'lines': lines,
        'source_mesh': 'orangeChocolateAndCream.bin.mesh',
        'canvas': (None, 1868),
        'pitch': 0.318,
        'cap': 0.262,
        'sdf_scale': 0.6,
        'range': 92 * 0.6,
        'out_mesh': os.path.join(DEC, 'fromuil/%s.bin.mesh' % ''.join(
            w.capitalize() if i else w for i, w in enumerate(name.split('-')))),
        'sdf_jpg': False,
    })


def load_source(path):
    """Quad positions/uvs of the Spirit block, for the uv -> world transform."""
    if path.endswith('.json'):
        d = json.load(open(path))['data']['attributes']
        P = np.array(d['position']['array']).reshape(-1, 3)
        U = np.array(d['uv']['array']).reshape(-1, 2)
    else:
        _, a, _ = meshio.read(path)
        P, U = a['position'], a['uv']
    fx = np.polyfit(U[:, 0], P[:, 0], 1)
    fz = np.polyfit(U[:, 1], P[:, 2], 1)
    return fx, fz


def render_rows(lines, font_px, width, height, pitch_px):
    font = ImageFont.truetype(FONT, font_px, layout_engine=ImageFont.Layout.RAQM)
    rows = []
    top0 = (height - pitch_px * len(lines)) / 2
    for i, text in enumerate(lines):
        x0, y0, x1, y1 = font.getbbox(text)
        strip = Image.new('L', (width, height), 0)
        d = ImageDraw.Draw(strip)
        cap_top = font.getbbox('H')[1]
        cap_h = font.getbbox('H')[3] - cap_top
        y = top0 + i * pitch_px + (pitch_px - cap_h) / 2 - cap_top
        d.text(((width - (x1 - x0)) / 2 - x0, y), text, font=font, fill=255)
        rows.append(np.array(strip))
    return rows


def segments(mask_cols, min_gap=2):
    on = np.flatnonzero(mask_cols)
    if not len(on):
        return []
    segs, start, prev = [], on[0], on[0]
    for c in on[1:]:
        if c - prev > min_gap:
            segs.append([start, prev + 1])
            start = c
        prev = c
    segs.append([start, prev + 1])
    return segs


def signed_distance(mask):
    inside = mask > 127
    din = ndimage.distance_transform_edt(inside)
    dout = ndimage.distance_transform_edt(~inside)
    return np.where(inside, din - 0.5, 0.5 - dout)


def build(block):
    fx, fz = load_source(os.path.join(REF, block['source_mesh']))
    W, H = block['canvas']
    pitch_px = block['pitch'] * H
    cap_px = block['cap'] * H
    probe = ImageFont.truetype(FONT, 1000, layout_engine=ImageFont.Layout.RAQM)
    cap_ratio = (probe.getbbox('H')[3] - probe.getbbox('H')[1]) / 1000
    font_px = int(round(cap_px / cap_ratio))
    if W is None:  # size the canvas to the widest row, at the source's world scale
        font = ImageFont.truetype(FONT, font_px, layout_engine=ImageFont.Layout.RAQM)
        widest = max(font.getbbox(t)[2] - font.getbbox(t)[0] for t in block['lines'])
        W = int(widest + 0.06 * H) // 2 * 2
        k, cx = fx[0] / 3392, fx[1] + fx[0] / 2  # source canvas: 3392 px wide
        fx = np.array([k * W, cx - k * W / 2])
    font = ImageFont.truetype(FONT, font_px, layout_engine=ImageFont.Layout.RAQM)
    widest = max(font.getbbox(t)[2] - font.getbbox(t)[0] for t in block['lines'])
    if widest > 0.97 * W:  # shrink to fit the source canvas
        font_px = int(font_px * 0.97 * W / widest)
    rows = render_rows(block['lines'], font_px, W, H, pitch_px)

    if block.get('ornaments'):
        src = np.array(Image.open(os.path.join(REF, block['source_map'])).split()[-1])
        band = int(0.06 * W)
        sh, sw = src.shape
        orn = np.zeros((H, W), np.uint8)
        sy = slice(sh // 2, sh)
        ys = slice(H - (sh - sh // 2), H)
        orn[ys, :band] = np.array(Image.fromarray(src[sy, :int(0.06 * sw)]).resize((band, sh - sh // 2)))
        orn[ys, W - band:] = np.array(Image.fromarray(src[sy, sw - int(0.06 * sw):]).resize((band, sh - sh // 2)))
        # Re-centre the ornaments on the second row.
        rr = np.flatnonzero(rows[1].max(1) > 127)
        oo = np.flatnonzero(orn.max(1) > 127)
        orn = np.roll(orn, int((rr.mean() - oo.mean())), axis=0)
        assert rows[1][:, :band].max() < 64 and rows[1][:, W - band:].max() < 64, 'row 2 runs into the ornaments'
        rows[1] = np.maximum(rows[1], orn)

    mask = np.max(rows, axis=0)

    # Quads: one per glyph cluster, splitting gaps at their midpoint.
    pad = max(4, int(0.012 * H))
    P, UV, Q, R, C, I = [], [], [], [], [], []
    for r, row in enumerate(rows):
        ink_rows = np.flatnonzero(row.max(1) > 8)
        y0, y1 = max(0, ink_rows[0] - pad), min(H, ink_rows[-1] + 1 + pad)
        segs = segments(row.max(0) > 8)
        cuts = [max(0, segs[0][0] - pad)]
        for a, b in zip(segs[:-1], segs[1:]):
            cuts.append((a[1] + b[0]) // 2)
        cuts.append(min(W, segs[-1][1] + pad))
        n = len(segs)
        for q in range(n):
            xa, xb = cuts[q], cuts[q + 1]
            base = len(P)
            for px, py in ((xa, y1), (xa, y0), (xb, y1), (xb, y0)):
                u, v = px / W, 1 - py / H
                P.append((np.polyval(fx, u), 0.0, np.polyval(fz, v)))
                UV.append((u, v))
                Q.append(q + 1)
                R.append(r + 1)
                C.append(n)
            I += [base + 2, base + 1, base, base + 1, base + 2, base + 3]
    P, UV = np.array(P, np.float32), np.array(UV, np.float32)
    Q, R, C = (np.array(x, np.float32)[:, None] for x in (Q, R, C))
    I = np.array(I, np.uint32)
    # Faces must point +y like the source quads.
    a, b, c = P[I[0::3]], P[I[1::3]], P[I[2::3]]
    assert (np.cross(b - a, c - a)[:, 1] > 0).all()
    N = np.tile(np.array([[0, 1, 0]], np.float32), (len(P), 1))

    out = block['out_mesh']
    if out.endswith('.json'):
        attr = lambda arr: {'itemSize': arr.shape[1], 'type': 'Float32Array',
                            'array': [round(float(x), 4) for x in arr.ravel()], 'normalized': False}
        geo = {'metadata': {'version': 4.6, 'type': 'BufferGeometry', 'generator': 'build_lettering.py'},
               'data': {'attributes': {'position': attr(P), 'normal': attr(N), 'uv': attr(UV),
                                       'quadIndex': attr(Q), 'rowIndex': attr(R), 'rowCount': attr(C)},
                        'index': {'type': 'Uint16Array', 'array': [int(x) for x in I]}}}
        json.dump(geo, open(out, 'w'), separators=(',', ':'))
    else:
        meshio.write(out, {'position': P, 'normal': N, 'uv': UV, 'quadIndex': Q, 'rowIndex': R, 'rowCount': C}, I)

    # Distance field: signed distance at 2x, area-averaged down to the field size.
    s = block['sdf_scale']
    fw, fh = int(round(W * s)), int(round(H * s))
    hi = np.array(Image.fromarray(mask).resize((fw * 2, fh * 2), Image.LANCZOS))
    sd = signed_distance(hi) / 2
    sd = sd.reshape(fh, 2, fw, 2).mean((1, 3))
    field = np.clip(0.5 + sd / block['range'], 0, 1)
    f8 = (field * 255 + 0.5).astype(np.uint8)
    Image.fromarray(np.dstack([f8] * 3)).save(os.path.join(IMG, 'msdf/%s.png' % block['name']), optimize=True)

    # Coverage map (white glyphs) and soft alpha field at the canvas size.
    Image.fromarray(np.dstack([np.full_like(mask, 255)] * 3 + [mask])).save(
        os.path.join(IMG, '%s.png' % block['name']), optimize=True)
    soft = np.clip(0.5 + signed_distance(mask) / 48, 0, 1)
    soft = (soft * 255).astype(np.uint8)
    if block['sdf_jpg']:
        Image.fromarray(soft).convert('RGB').save(os.path.join(IMG, '%s-sdf.jpg' % block['name']), quality=90)
    else:
        Image.fromarray(np.dstack([np.full_like(soft, 255)] * 3 + [soft])).save(
            os.path.join(IMG, '%s-sdf.png' % block['name']), optimize=True)
    print('%-26s %dx%d  field %dx%d  font %dpx  quads %d' % (block['name'], W, H, fw, fh, font_px, len(P) // 4))


if __name__ == '__main__':
    for b in BLOCKS:
        build(b)
