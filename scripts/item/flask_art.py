"""Vector artwork for the Trapnest Voyage elixir flask.

* manga_atlas: black ink on white for the line-art shaders (the .r channel
  is the ink mask; the glass-body cell stays white so the shaders can tint
  it with the tide colour).
* label_atlas: the printed label for the PBR showcase, one strip per tide
  at the rows the label shader offsets to (Lagoon, Coral, Jade).
* stopper: brushed brass for the collar, stem, medallion bezel and knob.
* medallion: enamel compass-rose medallions for the stopper's two faces.

UV convention: v grows upward (three.js flips images on upload), so an
atlas cell at v0..v1 sits at image rows (1 - v1)..(1 - v0) * size.
"""
import base64
import math
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..')
FONTS = os.path.join(ROOT, 'public/assets/fonts')

NAVY = '#15223b'
NAVY_DEEP = '#0d1628'
GOLD = '#e7b43a'
GOLD_DEEP = '#a8740f'
SUN = '#f4bd28'
CREAM = '#f3ead2'
TIDES = [  # label rows follow the label shader's offsets: Lagoon 0, Jade 0.5, Coral 0.25
    {'name': 'LAGOON', 'no': '01', 'color': '#63c4f4', 'offset': 0.0,
     'notes': ['Yuzu, sea salt', '& blue lagoon.']},
    {'name': 'JADE', 'no': '02', 'color': '#97f3ad', 'offset': 0.5,
     'notes': ['Lime, matcha', '& fresh mint.']},
    {'name': 'CORAL', 'no': '03', 'color': '#ff9b8a', 'offset': 0.25,
     'notes': ['White peach, hibiscus', '& coral.']},
]
LABEL_V = (0.874, 0.992)

# Manga atlas cells (u0, u1, v0, v1).
CELLS = {
    'label': (0.005, 0.995, 0.865, 0.990),
    'collar': (0.0, 1.0, 0.800, 0.850),
    'bevel': (0.0, 1.0, 0.770, 0.790),
    'stem': (0.0, 1.0, 0.740, 0.760),
    'rim': (0.0, 1.0, 0.660, 0.720),
    'knob': (0.0, 1.0, 0.620, 0.640),
    'base': (0.200, 0.360, 0.010, 0.090),
    'neck': (0.400, 0.580, 0.010, 0.090),
    'body': (0.620, 0.980, 0.010, 0.090),  # liquid-tinted by the shaders (u > 0.6, v < 0.1)
}
MEDALLIONS = {'front': (0.170, 0.400, 0.155), 'back': (0.500, 0.400, 0.155)}  # (u, v, radius)
# PBR stopper cells.
STOPPER_CELLS = {
    'collar': (0.0, 1.0, 0.70, 0.95),
    'bevel': (0.0, 1.0, 0.58, 0.66),
    'stem': (0.0, 1.0, 0.48, 0.56),
    'rim': (0.0, 1.0, 0.25, 0.45),
    'knob': (0.0, 1.0, 0.10, 0.20),
}
PBR_MEDALLIONS = {'front': (0.25, 0.5, 0.234), 'back': (0.75, 0.5, 0.234)}


def font_face(family, file):
    data = base64.b64encode(open(os.path.join(FONTS, file), 'rb').read()).decode()
    return "@font-face{font-family:'%s';src:url(data:font/woff2;base64,%s) format('woff2');}" % (family, data)


STYLE = ('<style>' + font_face('Rosie', 'CharlesRosie.woff2') + font_face('Era', 'GT-Era-Text-Light.woff2') +
         font_face('Maru', 'PPNikkeiMaru-Ultrabold.woff2') + '</style>')


def cell_rect(cell, size):
    u0, u1, v0, v1 = cell
    return u0 * size, (1 - v1) * size, (u1 - u0) * size, (v1 - v0) * size


def text(x, y, s, size, family='Rosie', fill='#000', anchor='middle', spacing=0, weight='normal', extra=''):
    return ('<text x="%.1f" y="%.1f" font-family="%s" font-size="%.1f" fill="%s" text-anchor="%s" '
            'letter-spacing="%.1f" font-weight="%s" %s>%s</text>') % (x, y, family, size, fill, anchor, spacing, weight,
                                                                      extra, s)


def compass_rose(cx, cy, R, dark, light, line, ring, letters=None, lw=1.5, ticks=64, sun=None):
    """Eight-point compass rose with split-tone points, rings and ticks."""
    out = []
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="%s" stroke-width="%.1f"/>' % (
        cx, cy, R, ring, lw * 1.6))
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="%s" stroke-width="%.1f"/>' % (
        cx, cy, R * 0.86, ring, lw))
    for k in range(ticks):
        a = 2 * math.pi * k / ticks
        r0 = R * (0.86 if k % (ticks // 8) else 0.80)
        out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f"/>' % (
            cx + r0 * math.sin(a), cy - r0 * math.cos(a), cx + R * math.sin(a), cy - R * math.cos(a), ring, lw * 0.8))
    points = []
    for k in range(16):  # long N/E/S/W, medium diagonals, short sixteenths
        a = 2 * math.pi * k / 16
        if k % 4 == 0:
            L, w = 0.78, 0.13
        elif k % 2 == 0:
            L, w = 0.55, 0.10
        else:
            L, w = 0.40, 0.06
        points.append((L, w, a, k))
    for L, w, a, k in sorted(points, key=lambda p: p[0]):
        tip = (cx + R * L * math.sin(a), cy - R * L * math.cos(a))
        sl = (cx + R * w * math.sin(a - math.pi / 4), cy - R * w * math.cos(a - math.pi / 4))
        sr = (cx + R * w * math.sin(a + math.pi / 4), cy - R * w * math.cos(a + math.pi / 4))
        for side, fill in ((sl, dark), (sr, light)):
            out.append('<polygon points="%.1f,%.1f %.1f,%.1f %.1f,%.1f" fill="%s" stroke="%s" stroke-width="%.1f" '
                       'stroke-linejoin="round"/>' % (cx, cy, tip[0], tip[1], side[0], side[1], fill, line, lw * 0.8))
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" stroke="%s" stroke-width="%.1f"/>' % (
        cx, cy, R * 0.07, sun or light, line, lw))
    if letters:
        for k, ch in enumerate('NESW'):
            a = 2 * math.pi * k / 4
            r = R * 0.93
            out.append(text(cx + r * math.sin(a), cy - r * math.cos(a) + R * 0.045, ch, R * 0.13, fill=letters))
    return '\n'.join(out)


def waves(x0, x1, y, amp, period, stroke, lw):
    d = 'M%.1f %.1f' % (x0, y)
    x = x0
    while x < x1:
        d += ' q%.1f %.1f %.1f 0 q%.1f %.1f %.1f 0' % (period / 4, -amp, period / 2, period / 4, amp, period / 2)
        x += period
    return '<path d="%s" fill="none" stroke="%s" stroke-width="%.1f" stroke-linecap="round"/>' % (d, stroke, lw)


def sun_burst(cx, cy, r, rays, stroke, lw, fill='none'):
    out = ['<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" stroke="%s" stroke-width="%.1f"/>' % (
        cx, cy, r, fill, stroke, lw)]
    for k in range(rays):
        a = 2 * math.pi * k / rays
        r1 = r * (1.9 if k % 2 == 0 else 1.55)
        out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f" '
                   'stroke-linecap="round"/>' % (cx + r * 1.25 * math.cos(a), cy + r * 1.25 * math.sin(a),
                                                 cx + r1 * math.cos(a), cy + r1 * math.sin(a), stroke, lw))
    return '\n'.join(out)


def wax_seal(cx, cy, r, wax, deep, light, line=None):
    """An irregular wax blob with a pressed compass ring."""
    pts = []
    for k in range(28):
        a = 2 * math.pi * k / 28
        rr = r * (1 + 0.06 * math.sin(5 * a + 0.7) + 0.04 * math.sin(11 * a + 2.1))
        pts.append('%.1f,%.1f' % (cx + rr * math.cos(a), cy + rr * math.sin(a)))
    gid = 'wax%d%d' % (int(cx), int(cy))
    out = ['<defs><radialGradient id="%s" cx="40%%" cy="35%%" r="70%%"><stop offset="0" stop-color="%s"/>'
           '<stop offset="0.55" stop-color="%s"/><stop offset="1" stop-color="%s"/></radialGradient></defs>' % (
               gid, light, wax, deep)]
    out.append('<polygon points="%s" fill="url(#%s)" stroke="%s" stroke-width="1"/>' % (' '.join(pts), gid, line or deep))
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="%s" stroke-width="1.6"/>' % (cx, cy, r * 0.72, deep))
    out.append(compass_rose(cx, cy, r * 0.62, deep, light, deep, deep, lw=0.8, ticks=32))
    return '\n'.join(out)


# ---------------------------------------------------------------- label strips

def label_strip(x, y, w, h, tide, ink, accent, paper, small, seal, mark=None):
    """One label strip, upright, laid out for a band whose front centre is at x + w / 2."""
    cx = x + w / 2
    s = h / 121.0
    out = ['<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="%s"/>' % (x, y, w, h, paper)]
    for yy in (y + 7 * s, y + 11 * s, y + h - 11 * s, y + h - 7 * s):
        out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.1f"/>' % (
            x, yy, x + w, yy, ink, 1.4 * s))
    # Front: wordmark with a sun rising over waves.
    out.append(sun_burst(cx, y + 34 * s, 9 * s, 16, accent, 1.3 * s))
    out.append(text(cx, y + 75 * s, 'TRAPNEST', 44 * s, fill=mark or ink, spacing=1.5 * s))
    out.append(text(cx, y + 99 * s, 'V O Y A G E', 15 * s, family='Maru', fill=ink, spacing=3 * s))
    out.append(waves(cx - 110 * s, cx - 62 * s, y + 94 * s, 3 * s, 12 * s, accent, 1.4 * s))
    out.append(waves(cx + 62 * s, cx + 110 * s, y + 94 * s, 3 * s, 12 * s, accent, 1.4 * s))
    # Seal and number to the right of the wordmark.
    out.append(seal(cx + 150 * s, y + h / 2, 30 * s))
    bx = cx + 248 * s
    out.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="none" stroke="%s" stroke-width="%.1f"/>' % (
        bx - 34 * s, y + 30 * s, 68 * s, 34 * s, accent, 1.6 * s))
    box = tide.get('box', 'N° ' + tide['no'])
    out.append(text(bx, y + 56 * s, box, (24 if len(box) < 6 else 15) * s, fill=ink))
    out.append(text(bx, y + 86 * s, tide['name'] + ' TIDE', 10 * s, family='Maru', fill=accent, spacing=2 * s))
    # Left of the wordmark: the motto.
    mx = cx - 168 * s
    out.append(text(mx, y + 48 * s, 'SAIL AWAY,', 13 * s, family='Maru', fill=accent, spacing=1.5 * s))
    out.append(text(mx, y + 66 * s, 'STAY GOLDEN', 13 * s, family='Maru', fill=accent, spacing=1.5 * s))
    out.append(compass_rose(mx, y + 90 * s, 11 * s, ink, paper, ink, ink, lw=0.7 * s, ticks=16))
    # Sides: tasting notes and serve.
    nx = cx - 300 * s
    out.append(text(nx, y + 36 * s, 'NOTES OF', 10 * s, family='Maru', fill=accent, spacing=2 * s))
    for i, line in enumerate(tide['notes']):
        out.append(text(nx, y + (60 + 19 * i) * s, line, 16 * s, family='Era', fill=ink))
    sx = cx + 360 * s
    out.append(text(sx, y + 36 * s, 'SERVE OVER ICE', 10 * s, family='Maru', fill=accent, spacing=2 * s))
    for i, line in enumerate(['Chill your voyage,', 'shake your voyage,', 'pour your voyage.']):
        out.append(text(sx, y + (56 + 16 * i) * s, line, 13 * s, family='Era', fill=ink))
    # Back seam: small print.
    for i, line in enumerate(['Blended on the golden coast', 'by Trapnest. Keep cool and', 'away from the midday sun.']):
        out.append(text(x + 6 * s, y + (44 + 12 * i) * s, line, 8 * s, family='Era', fill=small, anchor='start'))
    out.append(text(x + w - 6 * s, y + 46 * s, '9% ABV', 11 * s, family='Maru', fill=small, anchor='end',
                    spacing=1 * s))
    out.append(text(x + w - 6 * s, y + 64 * s, '500 ML', 11 * s, family='Maru', fill=small, anchor='end',
                    spacing=1 * s))
    return '\n'.join(out)


def label_atlas(size=1024):
    out = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % ((size,) * 4), STYLE,
           '<defs><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="4"/>'
           '<feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.05 0"/></filter></defs>',
           '<rect width="%d" height="%d" fill="%s"/>' % (size, size, NAVY)]
    for tide in TIDES:
        v0, v1 = LABEL_V[0] - tide['offset'], LABEL_V[1] - tide['offset']
        y0, y1 = (1 - v1) * size, (1 - v0) * size
        pad = 3
        out.append(label_strip(0.01 * size, y0 - pad, 0.98 * size, (y1 - y0) + 2 * pad, tide, CREAM, tide['color'],
                               NAVY, '#a9b3c4', lambda cx, cy, r: wax_seal(cx, cy, r, '#e0a321', '#8f5d0b', '#ffe08a'),
                               mark=GOLD))
    out.append('<rect width="%d" height="%d" filter="url(#paper)"/>' % (size, size))
    out.append('</svg>')
    return '\n'.join(out)


# ---------------------------------------------------------------- manga atlas

def manga_atlas(size=1024):
    out = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % ((size,) * 4), STYLE,
           '<rect width="%d" height="%d" fill="#fff"/>' % (size, size)]
    ink, lw = '#000', 2.0
    # Label band.
    x, y, w, h = cell_rect(CELLS['label'], size)
    seal = lambda cx, cy, r: (  # noqa: E731 - hatched wax seal in ink
        '<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#000"/>' % (cx, cy, r) +
        compass_rose(cx, cy, r * 0.7, '#000', '#fff', '#fff', '#fff', lw=1.0, ticks=16))
    tide = {'name': 'GOLDEN', 'no': '00', 'box': 'TIDES', 'notes': ['Sunlight, sea salt', '& golden citrus.']}
    out.append(label_strip(x, y, w, h, tide, ink, ink, '#fff', ink, seal))
    # Collar: grooves and a wave engraving.
    x, y, w, h = cell_rect(CELLS['collar'], size)
    for f in (0.18, 0.30, 0.70, 0.82):
        out.append('<line x1="0" y1="%.1f" x2="%d" y2="%.1f" stroke="#000" stroke-width="%.1f"/>' % (
            y + f * h, size, y + f * h, lw))
    out.append(waves(0, size, y + 0.5 * h, 0.08 * h, size / 24, ink, lw))
    # Bevel and stem: a single fine ring line each.
    for key in ('bevel', 'stem'):
        x, y, w, h = cell_rect(CELLS[key], size)
        out.append('<line x1="0" y1="%.1f" x2="%d" y2="%.1f" stroke="#000" stroke-width="%.1f"/>' % (
            y + 0.5 * h, size, y + 0.5 * h, lw * 0.8))
    # Medallion bezel: coin-edge reeding.
    x, y, w, h = cell_rect(CELLS['rim'], size)
    for k in range(0, size, 8):
        out.append('<line x1="%d" y1="%.1f" x2="%d" y2="%.1f" stroke="#000" stroke-width="2"/>' % (
            k, y + 0.3 * h, k, y + 0.7 * h))
    # Medallion faces.
    u, v, r = MEDALLIONS['front']
    cx, cy, R = u * size, (1 - v) * size, r * size
    out.append(compass_rose(cx, cy, R * 0.96, '#000', '#fff', '#000', '#000', letters='#000', lw=3.0))
    u, v, r = MEDALLIONS['back']
    cx, cy, R = u * size, (1 - v) * size, r * size
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="#000" stroke-width="5"/>' % (cx, cy, R * 0.95))
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="#000" stroke-width="2.5"/>' % (cx, cy, R * 0.70))
    out.append(ring_text(cx, cy, R * 0.79, 'TRAPNEST · VOYAGE · SAIL AWAY · STAY GOLDEN · ', R * 0.12, '#000'))
    out.append(sun_burst(cx, cy - R * 0.12, R * 0.17, 16, '#000', 3.5))
    for k in range(3):
        out.append(waves(cx - R * 0.5, cx + R * 0.5, cy + R * (0.22 + 0.13 * k), R * 0.04, R * 0.2, '#000', 3.5))
    out.append('</svg>')
    return '\n'.join(out)


def ring_text(cx, cy, r, s, size, fill, family='Maru'):
    pid = 'ring%d%d' % (int(cx), int(cy))
    return ('<defs><path id="%s" d="M%.1f %.1f a%.1f %.1f 0 1 1 0 %.1f a%.1f %.1f 0 1 1 0 %.1f"/></defs>'
            '<text font-family="%s" font-size="%.1f" fill="%s" letter-spacing="%.1f"><textPath href="#%s" '
            'textLength="%.1f">%s</textPath></text>') % (
        pid, cx, cy - r, r, r, 2 * r, r, r, -2 * r, family, size, fill, size * 0.15, pid, 2 * math.pi * r * 0.995, s)


# ---------------------------------------------------------------- PBR stopper and medallions

def stopper(size=512):
    out = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % ((size,) * 4),
           '<defs><linearGradient id="brass" x1="0" y1="0" x2="0" y2="1">'
           '<stop offset="0" stop-color="#8a6420"/><stop offset="0.25" stop-color="#e4bf63"/>'
           '<stop offset="0.5" stop-color="#c99a3c"/><stop offset="0.8" stop-color="#f0d488"/>'
           '<stop offset="1" stop-color="#94702a"/></linearGradient>'
           '<filter id="brush"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.9" numOctaves="2" seed="7"/>'
           '<feColorMatrix values="0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0 0.05  0 0 0 0.35 0"/></filter></defs>',
           '<rect width="%d" height="%d" fill="#c99a3c"/>' % (size, size)]
    for key, cell in STOPPER_CELLS.items():
        x, y, w, h = cell_rect(cell, size)
        out.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="url(#brass)"/>' % (x, y, w, h))
    x, y, w, h = cell_rect(STOPPER_CELLS['collar'], size)
    for f in (0.16, 0.28, 0.72, 0.84):
        out.append('<rect x="0" y="%.1f" width="%d" height="2.2" fill="#5e4210"/>' % (y + f * h, size))
    out.append(waves(0, size, y + 0.5 * h, 0.07 * h, size / 24, '#6b4c12', 2.2))
    x, y, w, h = cell_rect(STOPPER_CELLS['rim'], size)
    for k in range(0, size, 6):
        out.append('<rect x="%d" y="%.1f" width="2" height="%.1f" fill="#7a5818"/>' % (k, y + 0.28 * h, 0.44 * h))
    out.append('<rect width="%d" height="%d" filter="url(#brush)"/>' % (size, size))
    out.append('</svg>')
    return '\n'.join(out)


def medallion(size=512):
    out = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % ((size,) * 4), STYLE,
           '<rect width="%d" height="%d" fill="#c99a3c"/>' % (size, size),
           '<defs><radialGradient id="enamel" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#22355a"/>'
           '<stop offset="1" stop-color="#0c1526"/></radialGradient></defs>']
    u, v, r = PBR_MEDALLIONS['front']
    cx, cy, R = u * size, (1 - v) * size, r * size
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="url(#enamel)"/>' % (cx, cy, R))
    out.append(compass_rose(cx, cy, R * 0.95, GOLD_DEEP, SUN, '#5e4210', GOLD, letters=CREAM, lw=1.6))
    u, v, r = PBR_MEDALLIONS['back']
    cx, cy, R = u * size, (1 - v) * size, r * size
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="url(#enamel)"/>' % (cx, cy, R))
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="%s" stroke-width="3"/>' % (cx, cy, R * 0.95, GOLD))
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="%s" stroke-width="1.5"/>' % (cx, cy, R * 0.70, GOLD))
    out.append(ring_text(cx, cy, R * 0.79, 'TRAPNEST · VOYAGE · SAIL AWAY · STAY GOLDEN · ', R * 0.12, CREAM))
    out.append(sun_burst(cx, cy - R * 0.12, R * 0.17, 16, SUN, 2.5, fill=SUN))
    for k in range(3):
        out.append(waves(cx - R * 0.5, cx + R * 0.5, cy + R * (0.22 + 0.13 * k), R * 0.04, R * 0.2, GOLD, 2.5))
    out.append('</svg>')
    return '\n'.join(out)
