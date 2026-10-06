"""Chaewon's manga face, drawn as SVG over landmarks measured from the feature map.

Style: K-pop idol beauty in ink. Large dark irises with two catch-lights, a
bold upper lash line that thickens toward a short winged flick, a fine double
eyelid crease, soft aegyo-sal under the eyes, straight feathered brows, a
minimal nose, full lips with a defined seam and a gloss highlight, and light
hatched blush.

Coordinates: the feature map is an orthographic front view (facemap.py).
Pixel (px, py) maps to world x = cx + (px / R - 0.5) * size and
z = cz + (0.5 - py / R) * size; the same window becomes the atlas projection.
"""
import numpy as np
from PIL import Image
from scipy import ndimage


def load_map(path):
    im = np.asarray(Image.open(path).convert('RGB')).astype(float) / 255
    return im


def nose_tip_px(rest, win, R):
    """Pixel row of the nose tip (forward-most midline point between the eyes and mouth)."""
    P = rest['P']
    k = (np.abs(P[:, 0]) < 0.012) & (P[:, 2] > win['cz'] - 0.06) & (P[:, 2] < win['cz'] + 0.02)
    tip = P[k][np.argmin(P[k][:, 1])]
    return (0.5 - (tip[2] - win['cz']) / win['size']) * R


def landmarks(im):
    R = im.shape[0]
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    eye = (r < 0.12) & (g < 0.12) & (b < 0.12)
    lab, n = ndimage.label(eye)
    sizes = ndimage.sum(eye, lab, range(1, n + 1))
    keep = np.argsort(sizes)[::-1][:2] + 1
    eyes = []
    for k in keep:
        ys, xs = np.nonzero(lab == k)
        cols = np.arange(xs.min(), xs.max() + 1)
        top = np.array([ys[xs == c].min() for c in cols])
        bot = np.array([ys[xs == c].max() for c in cols])
        eyes.append(dict(cols=cols, top=top, bot=bot, cx=xs.mean(), cy=ys.mean(), x0=xs.min(), x1=xs.max()))
    eyes.sort(key=lambda e: e['cx'])  # image left = her right eye
    lips = (r - g > 0.28) & (r > 0.8)
    ys, xs = np.nonzero(lips)
    mouth = dict(x0=xs.min(), x1=xs.max(), y0=ys.min(), y1=ys.max(), cx=xs.mean())
    # Mouth seam: whitest row inside the lip box near its centre.
    box = im[mouth['y0']:mouth['y1'], int(mouth['cx']) - 40:int(mouth['cx']) + 40]
    white = (box.min(2) > 0.93).sum(1)
    seam_y = mouth['y0'] + int(np.argmax(white))
    seam = []
    for x in range(mouth['x0'], mouth['x1'] + 1, 4):
        col = im[mouth['y0']:mouth['y1'], x]
        w = np.nonzero(col.min(1) > 0.9)[0]
        if len(w):
            seam.append((x, mouth['y0'] + w.mean()))
    mouth['seam'] = np.array(seam)
    mouth['seam_y'] = seam_y
    # Upper and lower lip boundaries per column (lip mask extents).
    up, lo = [], []
    for x in range(mouth['x0'], mouth['x1'] + 1, 4):
        c = np.nonzero(lips[:, x])[0]
        if len(c):
            up.append((x, c.min()))
            lo.append((x, c.max()))
    mouth['upper'], mouth['lower'] = np.array(up), np.array(lo)
    # Brows: blue-dominant blobs above the eyes.
    blue = (b - r > 0.25)
    brows = []
    for e in eyes:
        sl = blue[:, int(e['x0']) - 40:int(e['x1']) + 40]
        rows = np.nonzero(sl.any(1))[0]
        rows = rows[rows < e['cy']]
        brows.append(dict(y=float(np.percentile(rows, 70)) if len(rows) else e['cy'] - 120))
    return dict(R=R, eyes=eyes, mouth=mouth, brows=brows)


# ------------------------------------------------------------------ svg helpers

def path(points, close=False):
    p = np.asarray(points)
    d = 'M%.1f %.1f ' % tuple(p[0]) + ' '.join('L%.1f %.1f' % tuple(q) for q in p[1:])
    return d + (' Z' if close else '')


def smooth(P, k=7):
    P = np.asarray(P, float)
    if len(P) < 3:
        return P
    out = P.copy()
    for i in range(len(P)):
        a, b = max(0, i - k), min(len(P), i + k + 1)
        out[i] = P[a:b].mean(0)
    out[0], out[-1] = P[0], P[-1]
    return out


def resample(P, n):
    P = np.asarray(P, float)
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
    t = np.linspace(0, d[-1], n)
    return np.c_[np.interp(t, d, P[:, 0]), np.interp(t, d, P[:, 1])]


def ribbon(P, w0, w1, wmid=None, fill='#000'):
    """Filled tapered stroke along a polyline (width varies w0 -> wmid -> w1)."""
    P = resample(P, 60)
    t = np.linspace(0, 1, len(P))
    if wmid is None:
        w = w0 + (w1 - w0) * t
    else:
        w = np.where(t < 0.5, w0 + (wmid - w0) * t * 2, wmid + (w1 - wmid) * (t - 0.5) * 2)
    tan = np.gradient(P, axis=0)
    tan /= np.maximum(np.linalg.norm(tan, axis=1, keepdims=True), 1e-9)
    nrm = np.c_[-tan[:, 1], tan[:, 0]]
    a = P + nrm * (w / 2)[:, None]
    b = P - nrm * (w / 2)[:, None]
    return '<path d="%s" fill="%s"/>' % (path(np.vstack([a, b[::-1]]), close=True), fill)


def bez(p0, p1, p2, n=30):
    t = np.linspace(0, 1, n)[:, None]
    return (1 - t) ** 2 * np.asarray(p0) + 2 * (1 - t) * t * np.asarray(p1) + t ** 2 * np.asarray(p2)


# ------------------------------------------------------------------ features

def cubic(p0, p1, p2, p3, n=40):
    t = np.linspace(0, 1, n)[:, None]
    p0, p1, p2, p3 = (np.asarray(p, float) for p in (p0, p1, p2, p3))
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3


def part(P, a, b):
    """The stretch of a polyline between fractions a and b of its points."""
    n = len(P)
    return P[int(a * (n - 1)):int(np.ceil(b * (n - 1))) + 1]


def eye_shape(e, outer):
    """Her eye drawn over the mesh opening: a large almond, the outer corner a little lifted.

    Returns corners, upper and lower lid curves (inner -> outer) and the iris (cx, cy, r)."""
    W0 = e['x1'] - e['x0']
    H0 = e['bot'].max() - e['top'].min()
    # Centred on the mesh opening and as tall as it (so the lids stay on the lids in 3/4 views); a little
    # wider, for the liner past the outer corner.
    c = np.array([(e['x0'] + e['x1']) / 2 + outer * 0.04 * W0, (e['top'].min() + e['bot'].max()) / 2 + 0.058 * W0])
    W = 1.06 * W0
    inner = c + np.array([-outer * W / 2, 0.035 * W])
    outer_c = c + np.array([outer * W / 2, -0.035 * W])
    Hh = H0 / 0.84
    up = cubic(inner, inner + np.array([outer * 0.16 * W, -0.74 * Hh]), outer_c + np.array([-outer * 0.32 * W, -0.70 * Hh]),
               outer_c, 60)
    lo = cubic(inner, inner + np.array([outer * 0.28 * W, 0.40 * Hh]), outer_c + np.array([-outer * 0.26 * W, 0.42 * Hh]),
               outer_c, 60)
    r = 0.26 * W
    ix = c[0] - outer * 0.015 * W
    k = np.argmin(np.abs(lo[:, 0] - ix))
    iy = lo[k, 1] - 0.93 * r
    return dict(c=c, W=W, H=Hh, inner=inner, outer=outer_c, up=up, lo=lo, iris=(ix, iy, r))


def iris_geometry(e, outer):
    """Iris centre and radius (px) as eye() draws it."""
    return eye_shape(e, outer)['iris']


def hatch(P0, P1, n, w, s=1.0):
    """Parallel short strokes between two polylines (a drawn tone)."""
    A, B = resample(P0, n), resample(P1, n)
    return [ribbon(np.vstack([a, (a + b) / 2, b]), 0.3 * s, 0.3 * s, wmid=w * s) for a, b in zip(A, B)]


# ------------------------------------------------------------------ paint
# The atlas is a colour painting: ink is near-black (red channel below about 0.16, read as line art),
# everything lighter is paint, multiplied over her skin by the shaders (src/shaders/original/makeup.glsl),
# so paint can be as dark as her brown irises.

SKIN = '#fff1eb'          # her skin (the paper of the face)
SHADE = '#f3d2ca'         # soft contour shading
BLUSH = '#ffc4c0'
EYESHADOW = '#f2c7bb'
EYE_WHITE = '#fdfcff'
EYE_WHITE_SHADE = '#d8d0de'
IRIS_TOP = '#241612'
IRIS_MID = '#3a241c'
IRIS_LOW = '#6b4536'
IRIS_GLOW = '#9c6c55'
IRIS_FIBRE = '#7d5242'
TEAR = '#f6b3ad'
BROW = '#4f3a31'
BROW_HAIR = '#3a2a23'
LIP_DEEP = '#e8705f'
LIP_MID = '#f08a78'
LIP_EDGE = '#f7aca2'
LIP_HI = '#fff1ec'
NOSE_SHADE = '#f1cdc5'


def blur(k, std, pad=1.0):
    """An SVG blur filter (its region padded so soft shapes are not clipped)."""
    p = int(pad * 100)
    return ('<filter id="%s" x="-%d%%" y="-%d%%" width="%d%%" height="%d%%" color-interpolation-filters="sRGB">'
            '<feGaussianBlur stdDeviation="%.2f"/></filter>' % (k, p, p, 100 + 2 * p, 100 + 2 * p, std))


def vgrad(k, y0, y1, stops):
    """Vertical linear gradient in user space: stops [(offset, colour, opacity)]."""
    st = ''.join('<stop offset="%.3f" stop-color="%s" stop-opacity="%.3f"/>' % o for o in stops)
    return '<linearGradient id="%s" gradientUnits="userSpaceOnUse" x1="0" y1="%.1f" x2="0" y2="%.1f">%s</linearGradient>' % (
        k, y0, y1, st)


def rgrad(k, cx, cy, r, stops, fx=None, fy=None):
    st = ''.join('<stop offset="%.3f" stop-color="%s" stop-opacity="%.3f"/>' % o for o in stops)
    return ('<radialGradient id="%s" gradientUnits="userSpaceOnUse" cx="%.1f" cy="%.1f" r="%.1f" fx="%.1f" fy="%.1f">%s'
            '</radialGradient>' % (k, cx, cy, r, cx if fx is None else fx, cy if fy is None else fy, st))


# ------------------------------------------------------------------ eyes

def eye(e, outer, s=1.0, closeup=False, rng=None):
    """One eye, painted and inked. `outer` is +1 if the outer corner is toward +x in the image.

    A soft, warm gaze: brown irises lit from below with a glowing crescent, a dark band of lid shadow over
    their top, two catch-lights and a sparkle; a full lash line with a short flick; a fine crease; the
    smiling fullness of the aegyo-sal under the eye; a touch of warm eyeshadow above."""
    rng = rng or np.random.default_rng(3)
    g = eye_shape(e, outer)
    W, Hh, up, lo = g['W'], g['H'], g['up'], g['lo']
    icx, icy, ir = g['iris']
    k = 'e%d' % int(e['cx'])
    out = []
    top = up[:, 1].min()
    bot = lo[:, 1].max()
    cx = g['c'][0]
    # --- paint around the eye
    out.append(blur(k + 'b1', 0.07 * W))
    out.append(blur(k + 'b2', 0.025 * W))
    # Eyeshadow: warm, deepest at the lash line and toward the outer corner.
    shadow = np.vstack([part(up, 0.05, 1.0) + np.array([0, 0.05 * Hh]),
                        (part(up, 0.05, 1.0) + np.c_[np.linspace(0, outer * 0.06 * W, len(part(up, 0.05, 1.0))),
                                                    -np.linspace(0.30, 0.45, len(part(up, 0.05, 1.0))) * Hh])[::-1]])
    out.append('<path d="%s" fill="%s" filter="url(#%sb1)" opacity="0.95"/>' % (path(shadow, close=True), EYESHADOW, k))
    # Aegyo-sal: the little roll under the eye catches the light; a soft shade beneath it.
    ag = part(lo, 0.12, 0.88)
    roll = np.vstack([ag + np.array([0, 0.06 * Hh]), (ag + np.array([0, 0.34 * Hh]))[::-1]])
    out.append('<path d="%s" fill="#fff6f1" filter="url(#%sb2)" opacity="0.8"/>' % (path(roll, close=True), k))
    out.append(ribbon(smooth(part(lo, 0.18, 0.82) + np.array([0, 0.40 * Hh]), 3), 0.02 * W, 0.02 * W, wmid=0.06 * W,
                      fill=SHADE).replace('/>', ' filter="url(#%sb2)"/>' % k))
    # Tear duct.
    ic = g['inner']
    out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" filter="url(#%sb2)"/>' % (
        ic[0] + outer * 0.03 * W, ic[1] + 0.01 * W, 0.035 * W, 0.03 * W, TEAR, k))
    # --- inside the opening
    opening = np.vstack([up, lo[::-1]])
    out.append('<clipPath id="%sc"><path d="%s"/></clipPath>' % (k, path(opening, close=True)))
    out.append(vgrad(k + 'w', top, bot, [(0, EYE_WHITE_SHADE, 1), (0.42, EYE_WHITE, 1), (1, EYE_WHITE, 1)]))
    out.append(vgrad(k + 'i', icy - ir, icy + ir, [(0, IRIS_TOP, 1), (0.45, IRIS_MID, 1), (0.85, IRIS_LOW, 1),
                                                    (1, IRIS_LOW, 1)]))
    q = ['<g clip-path="url(#%sc)">' % k]
    if closeup:
        # In the close-ups the eyeballs sample their own painting (eyeball()); inside the opening only the
        # rims of the lids sample this: the upper rim reads as the lash line, the lower as a soft waterline.
        q.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#000"/>' % (cx - W, top - Hh, 2 * W, Hh + (bot - top) * 0.55))
        q.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="#f0cbc4"/>' % (
            cx - W, top + (bot - top) * 0.55, 2 * W, 2 * Hh))
        q.append('</g>')
        out += q
        q = []
    else:
        q.append('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" fill="url(#%sw)"/>' % (
            cx - W, top - Hh, 2 * W, 3 * Hh, k))
        q.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="url(#%si)"/>' % (icx, icy, ir, k))
        # Light from below: a glowing crescent in the lower iris.
        q.append('<path d="M %.1f %.1f A %.1f %.1f 0 0 0 %.1f %.1f A %.1f %.1f 0 0 1 %.1f %.1f Z" fill="%s" '
                 'filter="url(#%sb2)"/>' % (
                     icx - 0.78 * ir, icy + 0.25 * ir, ir * 0.9, ir * 0.9, icx + 0.78 * ir, icy + 0.25 * ir,
                     ir * 1.2, ir * 0.7, icx - 0.78 * ir, icy + 0.25 * ir, IRIS_GLOW, k))
        # Fibres: fine radial strokes in the lower two thirds.
        for j in range(22):
            a = np.pi * (0.08 + 0.84 * j / 21)
            r0, r1 = ir * 0.48, ir * (0.70 + 0.14 * ((j * 7) % 5) / 4)
            q.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.2f" '
                     'stroke-linecap="round" opacity="%.2f"/>' % (
                         icx + np.cos(a) * r0, icy + np.sin(a) * r0, icx + np.cos(a) * r1, icy + np.sin(a) * r1,
                         IRIS_FIBRE, 0.012 * ir * s * 4, 0.55))
        # Limbal ring and pupil.
        q.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="#000" stroke-width="%.1f"/>' % (
            icx, icy, ir * 0.965, 0.07 * ir))
        q.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#000"/>' % (icx, icy + 0.02 * ir, 0.40 * ir,
                                                                                 0.43 * ir))
        # The lid's shadow over the top of the iris and the white: a dark band with a soft hatched edge.
        band = np.vstack([up + np.array([0, -0.2 * Hh]), (up + np.c_[np.zeros(len(up)),
                                                                    0.16 * Hh * np.sin(np.linspace(0, np.pi, len(up))) ** 0.6])[::-1]])
        q.append('<path d="%s" fill="#000"/>' % path(band, close=True))
        edge = up + np.c_[np.zeros(len(up)), 0.16 * Hh * np.sin(np.linspace(0, np.pi, len(up))) ** 0.6]
        for j in range(26):
            t = 0.12 + 0.76 * j / 25
            p0 = edge[int(t * (len(edge) - 1))]
            L = (0.07 + 0.05 * ((j * 5) % 3) / 2) * Hh
            q.append(ribbon(np.vstack([p0 - [0, 0.01 * Hh], p0 + [0, L * 0.5], p0 + [0, L]]), 0.012 * W, 0.002 * W))
        # Catch-lights: a big soft one upper left, a small one lower right, and a sparkle.
        q.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#fff" transform="rotate(-25 %.1f %.1f)"/>' % (
            icx - ir * 0.30, icy - ir * 0.18, ir * 0.27, ir * 0.20, icx - ir * 0.30, icy - ir * 0.18))
        q.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#fff"/>' % (icx + ir * 0.40, icy + ir * 0.38, ir * 0.10))
        q.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#fff"/>' % (icx + ir * 0.12, icy + ir * 0.58, ir * 0.045))
        q.append('</g>')
        out += q
    # --- ink around the opening
    # Upper lash line: fine at the inner corner, full across the lid, a short flick past the corner.
    flick = cubic(up[-1], up[-1] + np.array([outer * 0.05 * W, -0.005 * W]), up[-1] + np.array([outer * 0.10 * W, -0.03 * W]),
                  up[-1] + np.array([outer * 0.135 * W, -0.055 * W]), 14)
    lash = np.vstack([part(up, 0.04, 1.0), flick[1:]]) + np.array([0, -0.012 * W])
    out.append(ribbon(lash, 0.022 * W, 0.006 * W, wmid=0.084 * W))
    # Lashes: a few clumps along the outer half, sweeping out and up.
    n = len(up)
    for j in range(8):
        t = 0.42 + 0.07 * j
        i = min(int(t * (n - 1)), n - 1)
        p0 = up[i] + np.array([0, -0.035 * W])
        d = np.array([outer * (0.2 + 0.17 * j), -1.0])
        d /= np.linalg.norm(d)
        L = (0.05 + 0.012 * j) * W
        out.append(ribbon(np.vstack([p0, p0 + d * L * 0.5 + np.array([outer * 0.01 * W, 0]), p0 + d * L]),
                          0.018 * W, 0.002 * W))
    # Double eyelid: a fine crease above the lid, nearer the lid at the inner end.
    crease = part(up, 0.22, 0.95).copy()
    tt = np.linspace(0, 1, len(crease))
    crease = crease + np.c_[outer * 0.02 * W * tt, -(0.12 + 0.16 * tt) * Hh]
    out.append(ribbon(smooth(crease, 3), 0.002 * W, 0.004 * W, wmid=0.011 * W))
    # Lower lid: a fine line the whole length (a hair at the inner corner, fuller toward the outer), a few
    # tiny lashes.
    out.append(ribbon(part(lo, 0.04, 1.0) + np.array([0, 0.01 * W]), 0.0015 * W, 0.008 * W, wmid=0.008 * W))
    for j in range(3):
        i = int((0.66 + 0.1 * j) * (len(lo) - 1))
        p0 = lo[i] + np.array([0, 0.018 * W])
        out.append(ribbon(np.vstack([p0, p0 + np.array([outer * 0.012 * W, 0.035 * W])]), 0.007 * W, 0.001 * W))
    # Inner corner: the lids meet in a small notch.
    out.append(ribbon(cubic(ic + np.array([outer * 0.05 * W, -0.035 * W]), ic + np.array([-outer * 0.01 * W, -0.01 * W]),
                            ic + np.array([-outer * 0.01 * W, 0.02 * W]), ic + np.array([outer * 0.04 * W, 0.03 * W]), 12),
                      0.008 * W, 0.002 * W, wmid=0.009 * W))
    return out


def eyeball(e, outer, s=1.0):
    """One eyeball for the close-ups, painted without lids (the lids are the mesh's, inked on the skin):
    the white, a little shaded toward the top, and the iris in warm greys (the scene's colour is multiplied
    over it) with its glow, fibres, ring, pupil and catch-lights. Painted wide of the opening, so an eye
    turning in its socket never shows an edge."""
    g = eye_shape(e, outer)
    W, Hh = g['W'], g['H']
    icx, icy, ir = g['iris']
    k = 'x%d' % int(e['cx'])
    out = [blur(k + 'b', 0.025 * W),
           vgrad(k + 'i', icy - ir, icy + ir, [(0, '#5e5553', 1), (0.45, '#8e8381', 1), (0.85, '#d9cfcc', 1), (1, '#d9cfcc', 1)])]
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="url(#%si)"/>' % (icx, icy, ir, k))
    out.append('<path d="M %.1f %.1f A %.1f %.1f 0 0 0 %.1f %.1f A %.1f %.1f 0 0 1 %.1f %.1f Z" fill="#f7f1ef" '
               'filter="url(#%sb)"/>' % (icx - 0.78 * ir, icy + 0.25 * ir, ir * 0.9, ir * 0.9, icx + 0.78 * ir,
                                         icy + 0.25 * ir, ir * 1.2, ir * 0.7, icx - 0.78 * ir, icy + 0.25 * ir, k))
    for j in range(30):
        a = 2 * np.pi * j / 30
        r0, r1 = ir * 0.48, ir * (0.72 + 0.14 * ((j * 7) % 5) / 4)
        out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#3a3331" stroke-width="%.2f" '
                   'stroke-linecap="round" opacity="0.35"/>' % (
                       icx + np.cos(a) * r0, icy + np.sin(a) * r0, icx + np.cos(a) * r1, icy + np.sin(a) * r1,
                       0.045 * ir * s))
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="#000" stroke-width="%.1f"/>' % (
        icx, icy, ir * 0.965, 0.07 * ir))
    out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#000"/>' % (icx, icy + 0.02 * ir, 0.40 * ir, 0.43 * ir))
    out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#fff" transform="rotate(-25 %.1f %.1f)"/>' % (
        icx - ir * 0.30, icy - ir * 0.18, ir * 0.27, ir * 0.20, icx - ir * 0.30, icy - ir * 0.18))
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#fff"/>' % (icx + ir * 0.40, icy + ir * 0.38, ir * 0.10))
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#fff"/>' % (icx + ir * 0.12, icy + ir * 0.58, ir * 0.045))
    return out


def eyeball_svg(lm):
    """Both eyeballs on the face's canvas (R x R): what the close-ups' eyeballs sample."""
    R = lm['R']
    eyes = lm['eyes']
    mid = (eyes[0]['cx'] + eyes[1]['cx']) / 2
    g = eye_shape(eyes[0], -1)
    cy, Hh = g['c'][1], g['H']
    # The whites: one seamless gradient, a little shaded toward the top, under both eyes.
    out = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (R, R, R, R),
           vgrad('xw', cy - 0.9 * Hh, cy + 0.9 * Hh, [(0, EYE_WHITE_SHADE, 1), (0.42, EYE_WHITE, 1), (1, EYE_WHITE, 1)]),
           '<rect width="%d" height="%d" fill="url(#xw)"/>' % (R, R)]
    for e in eyes:
        out += eyeball(e, -1 if e['cx'] < mid else 1, s=0.85)
    out.append('</svg>')
    return '\n'.join(out)


def brow(e, b, outer, s=1.0, rng=None):
    """Soft, straight brows: a feathered brown body with a few fine hair strokes (mostly seen through the fringe)."""
    rng = rng or np.random.default_rng(5)
    g = eye_shape(e, outer)
    W = g['W']
    k = 'b%d' % int(e['cx'])
    top = g['up'][:, 1].min()
    x_in = g['inner'][0] - outer * 0.02 * W
    x_out = g['outer'][0] + outer * 0.12 * W
    y = top - 0.29 * W
    base = cubic((x_in, y + 0.025 * W), (x_in + outer * 0.35 * W, y - 0.03 * W), (x_out - outer * 0.3 * W, y - 0.04 * W),
                 (x_out, y + 0.045 * W), 40)
    out = [blur(k, 0.018 * W), ribbon(base, 0.115 * W, 0.024 * W, wmid=0.095 * W, fill=BROW).replace(
        '/>', ' filter="url(#%s)" opacity="0.85"/>' % k)]
    for j in range(45):
        t = rng.uniform(0.1, 1)
        p = base[int(t * 39)]
        a = np.radians(18 - 14 * t)
        d = np.array([outer * np.cos(a), -np.sin(a)])
        L = (0.05 + 0.03 * rng.random()) * W
        p0 = p + np.array([0, rng.uniform(-0.4, 0.4) * 0.05 * W * (1 - 0.5 * t)])
        out.append(ribbon(np.vstack([p0, p0 + d * L * 0.5, p0 + d * L]), 0.005 * W, 0.0012 * W, fill=BROW_HAIR))
    return out


def nose(cx, y, w, s=1.0):
    """A small soft nose: shade down the shadow side of the bridge, a rosy tip with a highlight, the
    shadow under the tip and two light nostril marks."""
    out = [blur('nb', 0.07 * w), blur('nb2', 0.03 * w)]
    out.append('<path d="%s" fill="%s" filter="url(#nb)"/>' % (path(np.array([
        (cx + 0.10 * w, y - 0.95 * w), (cx + 0.24 * w, y - 0.5 * w), (cx + 0.30 * w, y - 0.05 * w),
        (cx + 0.12 * w, y + 0.02 * w), (cx + 0.12 * w, y - 0.5 * w)]), close=True), NOSE_SHADE))
    out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" filter="url(#nb)" opacity="0.35"/>' % (
        cx, y - 0.02 * w, 0.18 * w, 0.12 * w, BLUSH))
    out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#fffaf7" filter="url(#nb2)"/>' % (
        cx - 0.04 * w, y - 0.09 * w, 0.07 * w, 0.05 * w))
    out.append(ribbon(cubic((cx + 0.17 * w, y + 0.03 * w), (cx + 0.18 * w, y + 0.09 * w), (cx + 0.10 * w, y + 0.12 * w),
                            (cx + 0.02 * w, y + 0.115 * w), 14), 0.008 * w, 0.006 * w, wmid=0.032 * w))
    for sgn in (-1, 1):
        x = cx + sgn * 0.11 * w
        out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" filter="url(#nb2)"/>' % (
            x, y + 0.07 * w, 0.05 * w, 0.025 * w, NOSE_SHADE))
    return out


def lip_shape(m, ipd):
    """Her lips: centre, seam y, width, and the seam, cupid's-bow and lower-lip curves (px)."""
    seam = m['seam']
    cx = float(seam[:, 0].mean())
    sy = float(np.median(seam[:, 1]))
    Wm = 0.56 * ipd
    x0, x1 = cx - Wm / 2, cx + Wm / 2
    # Seam: corners lifted a little, a soft dip at the centre.
    line = np.vstack([cubic((x0, sy - 0.03 * Wm), (x0 + 0.18 * Wm, sy + 0.005 * Wm), (cx - 0.2 * Wm, sy + 0.02 * Wm),
                            (cx, sy + 0.012 * Wm), 24),
                      cubic((cx, sy + 0.012 * Wm), (cx + 0.2 * Wm, sy + 0.02 * Wm), (x1 - 0.18 * Wm, sy + 0.005 * Wm),
                            (x1, sy - 0.03 * Wm), 24)[1:]])
    top = sy - 0.19 * Wm
    bow = np.vstack([cubic((cx - 0.40 * Wm, sy - 0.05 * Wm), (cx - 0.28 * Wm, top + 0.02 * Wm), (cx - 0.16 * Wm, top),
                           (cx - 0.07 * Wm, top), 16),
                     cubic((cx - 0.07 * Wm, top), (cx - 0.03 * Wm, top), (cx - 0.02 * Wm, top + 0.04 * Wm), (cx, top + 0.04 * Wm), 8)[1:],
                     cubic((cx, top + 0.04 * Wm), (cx + 0.02 * Wm, top + 0.04 * Wm), (cx + 0.03 * Wm, top), (cx + 0.07 * Wm, top), 8)[1:],
                     cubic((cx + 0.07 * Wm, top), (cx + 0.16 * Wm, top), (cx + 0.28 * Wm, top + 0.02 * Wm),
                           (cx + 0.40 * Wm, sy - 0.05 * Wm), 16)[1:]])
    bot = sy + 0.29 * Wm
    lower = cubic((cx - 0.30 * Wm, sy + 0.10 * Wm), (cx - 0.20 * Wm, bot + 0.01 * Wm), (cx + 0.20 * Wm, bot + 0.01 * Wm),
                  (cx + 0.30 * Wm, sy + 0.10 * Wm), 30)
    return dict(cx=cx, sy=sy, Wm=Wm, x0=x0, x1=x1, line=line, bow=bow, top=top, bot=bot, lower=lower)


def lips(m, ipd, s=1.0):
    """Full gradient lips (deepest at the centre, fading to the edges), just parted, with a gloss on the
    lower lip; ink only for the seam, the parted gap and the corners."""
    L = lip_shape(m, ipd)
    cx, sy, Wm, x0, x1, line = L['cx'], L['sy'], L['Wm'], L['x0'], L['x1'], L['line']
    c0 = np.array([x0 - 0.01 * Wm, sy - 0.03 * Wm])
    c1 = np.array([x1 + 0.01 * Wm, sy - 0.03 * Wm])
    upper = np.vstack([c0, L['bow'], c1, line[::-1]])
    lower = np.vstack([line, c1, L['lower'][::-1], c0])
    out = [blur('lb', 0.025 * Wm), blur('lb2', 0.05 * Wm),
           rgrad('lg', cx, sy, 0.5 * Wm, [(0, LIP_DEEP, 1), (0.55, LIP_MID, 1), (1, LIP_EDGE, 1)]),
           rgrad('lg2', cx, sy + 0.05 * Wm, 0.45 * Wm, [(0, LIP_DEEP, 1), (0.5, LIP_MID, 1), (1, LIP_EDGE, 1)])]
    out.append('<path d="%s" fill="url(#lg)" filter="url(#lb)"/>' % path(upper, close=True))
    out.append('<path d="%s" fill="url(#lg2)" filter="url(#lb)"/>' % path(lower, close=True))
    # Gloss on the lower lip, a small light on the upper.
    out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" filter="url(#lb)"/>' % (
        cx - 0.03 * Wm, (sy + L['bot']) / 2 + 0.015 * Wm, 0.12 * Wm, 0.035 * Wm, LIP_HI))
    out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" filter="url(#lb)" opacity="0.7"/>' % (
        cx - 0.12 * Wm, L['top'] + 0.07 * Wm, 0.06 * Wm, 0.02 * Wm, LIP_HI))
    # Soft shade under the lower lip.
    out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" filter="url(#lb2)"/>' % (
        cx, L['bot'] + 0.08 * Wm, 0.2 * Wm, 0.05 * Wm, SHADE))
    # Seam with a narrow parted gap at the centre.
    out.append(ribbon(line, 0.01 * Wm, 0.01 * Wm, wmid=0.03 * Wm))
    gap = np.vstack([cubic((cx - 0.15 * Wm, sy + 0.008 * Wm), (cx - 0.05 * Wm, sy - 0.012 * Wm), (cx + 0.05 * Wm, sy - 0.012 * Wm),
                           (cx + 0.15 * Wm, sy + 0.008 * Wm), 16),
                     cubic((cx + 0.15 * Wm, sy + 0.008 * Wm), (cx + 0.05 * Wm, sy + 0.035 * Wm), (cx - 0.05 * Wm, sy + 0.035 * Wm),
                           (cx - 0.15 * Wm, sy + 0.008 * Wm), 16)[1:]])
    out.append('<path d="%s" fill="#000"/>' % path(gap, close=True))
    for sgn, x in ((-1, x0), (1, x1)):
        out.append(ribbon(np.vstack([(x - sgn * 0.015 * Wm, sy - 0.03 * Wm), (x + sgn * 0.02 * Wm, sy - 0.01 * Wm)]),
                          0.012 * Wm, 0.002 * Wm))
    # A faint line through the middle of the cupid's bow.
    bow = L['bow']
    mid = bow[(bow[:, 0] > cx - 0.2 * Wm) & (bow[:, 0] < cx + 0.2 * Wm)]
    out.append(ribbon(mid, 0.002 * Wm, 0.002 * Wm, wmid=0.008 * Wm))
    return out


JAW_SHADE = np.array([0xf1, 0xcf, 0xc6]) / 255.0


def jaw_line(rest, win, R, mouth_y):
    """Pixel row of the lower edge of her chin and jaw for every column of the projection (NaN where there
    is none): in this front view the chin stands well forward of the neck it hides, so its edge is where
    the visible surface steps back by more than a centimetre, scanning down from the mouth."""
    P = rest['P']
    n = 160
    px = ((P[:, 0] - win['cx']) / win['size'] + 0.5) * n
    py = (0.5 - (P[:, 2] - win['cz']) / win['size']) * n
    k = (px >= 0) & (px < n) & (py >= 0) & (py < n) & (P[:, 1] < 0.05)
    depth = np.full((n, n), np.inf)
    np.fmin.at(depth, (py[k].astype(int), px[k].astype(int)), P[k, 1])
    depth = -ndimage.maximum_filter(np.where(np.isinf(depth), -np.inf, -depth), 3)  # close pin-holes
    jaw = np.full(n, np.nan)
    r0 = int(mouth_y / R * n) + 2
    for c in range(n):
        col = depth[:, c]
        for r in range(r0, n - 1):
            if np.isfinite(col[r]) and (not np.isfinite(col[r + 1]) or col[r + 1] - col[r] > 0.01):
                if np.isfinite(col[r + 1]):
                    jaw[c] = r + 1
                break
    ok = ~np.isnan(jaw)
    xs = np.arange(n)
    if ok.sum() < 3:
        return np.full(R, np.nan)
    sm = ndimage.uniform_filter1d(np.interp(xs, xs[ok], jaw[ok]), 3)
    out = np.interp(np.arange(R) / R * n, xs + 0.5, np.where(ok, sm, np.nan)) / n * R
    return out


def contour_layer(fm, R, eyes_y, chin_y, hair_y, jaw=None):
    """Raster paint over the whole projection (RGBA, R x R): soft shade where the face turns away (its
    edges in this front view, below the eyes), a soft shadow cast by the fringe on the forehead, and the
    shadow her chin and jaw cast on her neck (a soft-edged cel shape, deepest under the chin)."""
    im = fm
    mask = ~((np.abs(im[..., 0] - 0.5) < 0.02) & (np.abs(im[..., 1] - 0.5) < 0.02) & (np.abs(im[..., 2] - 0.5) < 0.02))
    d = ndimage.distance_transform_edt(mask)
    yy = np.arange(R)[:, None] * np.ones((1, R))
    edge = np.clip(1 - d / (0.04 * R), 0, 1) ** 1.5
    rows = np.clip((yy - eyes_y) / (0.06 * R), 0, 1) * np.clip((chin_y + 0.02 * R - yy) / (0.04 * R), 0, 1)
    a_edge = 0.75 * edge * rows
    a_hair = 0.8 * np.clip(1 - (yy - hair_y) / (0.05 * R), 0, 1) * np.clip((yy - hair_y + 0.08 * R) / (0.03 * R), 0, 1)
    a_jaw = np.zeros((R, R))
    if jaw is not None:
        ok = ~np.isnan(jaw)
        cols = np.flatnonzero(ok)
        mid, half = (cols.min() + cols.max()) / 2, (cols.max() - cols.min()) / 2
        xs = np.arange(R)
        u = np.clip(np.abs(xs - mid) / max(half, 1), 0, 1)
        depth = (0.006 + 0.036 * np.sqrt(np.clip(1 - (u / 0.75) ** 2, 0, 1))) * R
        dy = yy - np.where(ok, jaw, -1e9)[None, :]
        soft = 0.005 * R
        a_jaw = np.clip(dy / (0.004 * R) + 0.5, 0, 1) * np.clip((depth[None, :] - dy) / soft + 0.5, 0, 1)
        a_jaw *= np.clip((dy + 0.5 * soft) / (0.03 * R), 0.75, 1.0)  # a touch deeper right under the jaw
        a_jaw *= np.clip(1 - u / 0.8, 0, 1) ** 0.7  # (fading out toward the jaw's angle, never a hard edge)
        a_jaw = 0.8 * ndimage.gaussian_filter(a_jaw, 0.004 * R) * mask
    a = np.clip(np.maximum(a_edge, a_hair), 0, 1) * mask
    shade = np.array([0xf3, 0xd2, 0xca]) / 255.0
    rgba = np.zeros((R, R, 4))
    tot = np.clip(a + a_jaw, 1e-6, None)
    rgba[..., :3] = (shade[None, None] * a[..., None] + JAW_SHADE[None, None] * a_jaw[..., None]) / tot[..., None]
    rgba[..., 3] = np.clip(np.maximum(a, a_jaw), 0, 1)
    return rgba


def face_svg(lm, size=None, closeup=False, layer_png=None):
    """The painted face (R x R, the feature map's projection). layer_png: a PNG (data URI) of contour shading."""
    R = lm['R']
    s = 1.0 if not closeup else 0.85
    out = ['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="%d" height="%d" '
           'viewBox="0 0 %d %d">' % (R, R, R, R),
           '<rect width="%d" height="%d" fill="%s"/>' % (R, R, SKIN)]
    if layer_png:
        out.append('<image x="0" y="0" width="%d" height="%d" xlink:href="%s"/>' % (R, R, layer_png))
    eyes = lm['eyes']
    mid = (eyes[0]['cx'] + eyes[1]['cx']) / 2
    W = eyes[1]['x1'] - eyes[0]['x0']
    # Blush on the apples of the cheeks, under the eyes.
    out.append(blur('bl', 0.09 * W))
    for e in eyes:
        outer = -1 if e['cx'] < mid else 1
        out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" filter="url(#bl)" opacity="0.34"/>' % (
            e['cx'] + outer * 0.08 * W, e['cy'] + 0.30 * W, 0.17 * W, 0.075 * W, BLUSH))
    irises = []
    for e, b in zip(eyes, lm['brows']):
        outer = -1 if e['cx'] < mid else 1
        out += brow(e, b, outer, s=s)
        out += eye(e, outer, s=s, closeup=closeup)
        irises.append(iris_geometry(e, outer))
    ipd = abs(irises[1][0] - irises[0][0])
    m = lm['mouth']
    eye_y = (eyes[0]['cy'] + eyes[1]['cy']) / 2
    nose_y = lm.get('nose_y', eye_y + 0.62 * (m['seam_y'] - eye_y))
    out += nose(mid, nose_y, 0.32 * W, s=s)
    out += lips(m, ipd, s=s)
    out.append('</svg>')
    return '\n'.join(out)
