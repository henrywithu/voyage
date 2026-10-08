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
    # (her eyes tilt gently up toward the outer corner)
    inner = c + np.array([-outer * W / 2, 0.045 * W])
    outer_c = c + np.array([outer * W / 2, -0.045 * W])
    # (a long, soft almond as hers: the opening about 0.38 of its width tall, so the lids cover the top of the
    # iris and touch its bottom; the upper lid arches gently, highest a little inward of centre)
    Hh = H0 / 0.84 * 0.84
    up = cubic(inner, inner + np.array([outer * 0.16 * W, -0.66 * Hh]), outer_c + np.array([-outer * 0.34 * W, -0.62 * Hh]),
               outer_c, 60)
    lo = cubic(inner, inner + np.array([outer * 0.26 * W, 0.44 * Hh]), outer_c + np.array([-outer * 0.24 * W, 0.47 * Hh]),
               outer_c, 60)
    r = 0.235 * W
    ix = c[0] - outer * 0.015 * W
    k = np.argmin(np.abs(lo[:, 0] - ix))
    iy = lo[k, 1] - 0.82 * r
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

SKIN = '#feede5'          # her skin (the paper of the face): fair and a little warm
SHADE = '#f3d2ca'         # soft contour shading
BLUSH = '#ffc4c0'
EYESHADOW = '#f4c8b8'
EYESHADOW_DEEP = '#e8ad9c'
EYE_WHITE = '#fbfafc'
EYE_WHITE_SHADE = '#d6cfd8'
# (her irises are a deep brown-black; the darkest paint is kept above the atlas's ink level, red 0.16)
IRIS_TOP = '#2e2427'
IRIS_MID = '#35282a'
IRIS_LOW = '#4b3935'
IRIS_GLOW = '#664b42'
IRIS_FIBRE = '#7b5a50'
PUPIL = '#140e10'
LID_SHADOW = '#33282b'
CREASE = '#b88a7e'
LOWER_LASH = '#8d6a60'
LOWER_RIM = '#efc2ba'
TEAR = '#f4b2aa'
BROW = '#7a5544'
BROW_HAIR = '#553a2f'
LIP_DEEP = '#e47d6b'
LIP_SEAM = '#8f3a33'   # (the seam and parted gap: deep coral, not ink)
LIP_GAP = '#4a1c19'
LIP_MID = '#f1a08c'
LIP_EDGE = '#f6bdae'
LIP_HI = '#fff1ec'
TEETH = '#f4e7e3'
NOSE_SHADE = '#ebbcb2'
NOSE_DEEP = '#d99b91'
NOSE_LINE = '#a8675d'
NOSTRIL = '#b67d75'


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

    A soft, natural K-beauty eye, as hers: a large, deep brown-black iris with one crisp catch-light (and a
    faint second), the upper lid's soft shadow over its top; a fine lash line with short, dense lashes that
    fan out toward the outer corner (no winged flick); a soft brown double-eyelid crease; the light,
    smiling fullness of the aegyo-sal under the eye; a touch of peach shadow on the lid."""
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
    out.append(blur(k + 'b3', 0.012 * W))
    # Eyeshadow: soft peach over the lid, deepest along the lash line and toward the outer corner.
    lid = part(up, 0.04, 1.0)
    n_l = len(lid)
    shadow = np.vstack([lid + np.array([0, 0.04 * Hh]),
                        (lid + np.c_[np.linspace(0, outer * 0.05 * W, n_l), -np.linspace(0.34, 0.5, n_l) * Hh])[::-1]])
    out.append('<path d="%s" fill="%s" filter="url(#%sb1)" opacity="0.85"/>' % (path(shadow, close=True), EYESHADOW, k))
    deep = part(up, 0.5, 1.0)
    out.append(ribbon(deep + np.array([0, -0.05 * Hh]), 0.01 * W, 0.04 * W, wmid=0.07 * W, fill=EYESHADOW_DEEP).replace(
        '/>', ' filter="url(#%sb2)" opacity="0.55"/>' % k))
    # Aegyo-sal: the little roll right under the lower lid catches the light; only the faintest shade below it.
    ag = part(lo, 0.1, 0.92)
    roll = np.vstack([ag + np.array([0, 0.05 * Hh]), (ag + np.array([0, 0.30 * Hh]))[::-1]])
    out.append('<path d="%s" fill="#fff8f4" filter="url(#%sb2)" opacity="0.6"/>' % (path(roll, close=True), k))
    out.append(ribbon(smooth(part(lo, 0.22, 0.8) + np.array([0, 0.36 * Hh]), 3), 0.01 * W, 0.01 * W, wmid=0.035 * W,
                      fill=SHADE).replace('/>', ' filter="url(#%sb2)" opacity="0.4"/>' % k))
    # The lower rim: a soft rosy line where the waterline shows.
    out.append(ribbon(part(lo, 0.06, 0.97) + np.array([0, 0.006 * W]), 0.004 * W, 0.006 * W, wmid=0.012 * W,
                      fill=LOWER_RIM).replace('/>', ' filter="url(#%sb3)" opacity="0.9"/>' % k))
    # Tear duct.
    ic = g['inner']
    out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" filter="url(#%sb2)"/>' % (
        ic[0] + outer * 0.03 * W, ic[1] + 0.01 * W, 0.035 * W, 0.028 * W, TEAR, k))
    # --- inside the opening
    opening = np.vstack([up, lo[::-1]])
    out.append('<clipPath id="%sc"><path d="%s"/></clipPath>' % (k, path(opening, close=True)))
    out.append(vgrad(k + 'w', top, bot, [(0, EYE_WHITE_SHADE, 1), (0.45, EYE_WHITE, 1), (1, EYE_WHITE, 1)]))
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
        # The whites a touch greyer toward both corners (the eyeball turns away there).
        for cn in (g['inner'], g['outer']):
            q.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" filter="url(#%sb2)" opacity="0.6"/>' % (
                cn[0], cn[1], 0.12 * W, 0.2 * W, EYE_WHITE_SHADE, k))
        # The iris: deep brown-black, a warmer ring between the pupil and the dark limbal edge.
        q.append(rgrad(k + 'ir', icx, icy, ir, [(0, IRIS_TOP, 1), (0.42, IRIS_TOP, 1), (0.62, IRIS_MID, 1),
                                                (0.84, IRIS_LOW, 1), (0.95, IRIS_TOP, 1), (1, IRIS_TOP, 1)]))
        q.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="url(#%sir)"/>' % (icx, icy, ir, k))
        # Light from below: a soft glow in the lower iris.
        q.append('<path d="M %.1f %.1f A %.1f %.1f 0 0 0 %.1f %.1f A %.1f %.1f 0 0 1 %.1f %.1f Z" fill="%s" '
                 'filter="url(#%sb2)" opacity="0.75"/>' % (
                     icx - 0.74 * ir, icy + 0.28 * ir, ir * 0.86, ir * 0.86, icx + 0.74 * ir, icy + 0.28 * ir,
                     ir * 1.2, ir * 0.62, icx - 0.74 * ir, icy + 0.28 * ir, IRIS_GLOW, k))
        # Fibres: a few fine radial strokes, barely there.
        for j in range(28):
            a = np.pi * (0.04 + 0.92 * j / 27)
            r0, r1 = ir * 0.46, ir * (0.72 + 0.12 * ((j * 7) % 5) / 4)
            q.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%.2f" '
                     'stroke-linecap="round" opacity="0.32"/>' % (
                         icx + np.cos(a) * r0, icy + np.sin(a) * r0, icx + np.cos(a) * r1, icy + np.sin(a) * r1,
                         IRIS_FIBRE, 0.035 * ir))
        # Pupil.
        q.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" filter="url(#%sb3)"/>' % (icx, icy + 0.02 * ir, 0.42 * ir, PUPIL, k))
        # The upper lid's soft shadow over the top of the eye (paint, not ink), darkest along the lid.
        sh = np.vstack([up + np.array([0, -0.2 * Hh]),
                        (up + np.c_[np.zeros(len(up)), 0.30 * Hh * np.sin(np.linspace(0, np.pi, len(up))) ** 0.5])[::-1]])
        q.append(vgrad(k + 'ls', top, top + 0.42 * Hh, [(0, LID_SHADOW, 0.95), (0.55, LID_SHADOW, 0.55), (1, LID_SHADOW, 0)]))
        q.append('<path d="%s" fill="url(#%sls)" filter="url(#%sb3)"/>' % (path(sh, close=True), k, k))
        # Catch-lights: one crisp light upper left, a faint small one lower right.
        q.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#fff" transform="rotate(-20 %.1f %.1f)"/>' % (
            icx - ir * 0.30, icy - ir * 0.24, ir * 0.17, ir * 0.14, icx - ir * 0.30, icy - ir * 0.24))
        q.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#fff" opacity="0.7" filter="url(#%sb3)"/>' % (
            icx + ir * 0.36, icy + ir * 0.40, ir * 0.07, k))
        q.append('</g>')
        out += q
    # --- ink around the opening
    # Upper lash line: a hair at the inner corner, fuller across the lid, tapering out just past the outer
    # corner along the lid's own curve (no winged flick).
    tail = cubic(up[-1], up[-1] + np.array([outer * 0.02 * W, 0.002 * W]), up[-1] + np.array([outer * 0.035 * W, -0.004 * W]),
                 up[-1] + np.array([outer * 0.045 * W, -0.01 * W]), 10)
    lash = np.vstack([part(up, 0.03, 1.0), tail[1:]]) + np.array([0, -0.008 * W])
    out.append(ribbon(lash, 0.006 * W, 0.002 * W, wmid=0.036 * W))
    # Lashes: short and dense, close to the line, fanning out toward the outer corner.
    n = len(up)
    for j in range(30):
        t = 0.12 + 0.86 * j / 29 + rng.uniform(-0.008, 0.008)
        i = min(int(t * (n - 1)), n - 1)
        p0 = up[i] + np.array([0, -0.014 * W])
        d = np.array([outer * (0.15 + 0.85 * t ** 1.6), -1.0])
        d /= np.linalg.norm(d)
        L = (0.022 + 0.026 * t) * W * rng.uniform(0.85, 1.1)
        bend = np.array([outer * 0.012 * W * t, 0.004 * W])
        out.append(ribbon(np.vstack([p0, p0 + d * L * 0.55 + bend * 0.5, p0 + d * L + bend]), 0.008 * W, 0.0008 * W))
    # Double eyelid: a soft brown crease above the lid, nearer the lid at the inner end.
    crease = part(up, 0.2, 0.95).copy()
    tt = np.linspace(0, 1, len(crease))
    crease = crease + np.c_[outer * 0.015 * W * tt, -(0.17 + 0.12 * tt) * Hh]
    out.append(ribbon(smooth(crease, 3), 0.003 * W, 0.005 * W, wmid=0.012 * W, fill=CREASE).replace(
        '/>', ' filter="url(#%sb3)" opacity="0.95"/>' % k))
    # Lower lash line: a soft brown line along the outer two thirds, a few tiny lashes at the outer corner.
    out.append(ribbon(part(lo, 0.3, 1.0) + np.array([0, 0.012 * W]), 0.001 * W, 0.006 * W, wmid=0.006 * W,
                      fill=LOWER_LASH).replace('/>', ' opacity="0.8"/>'))
    for j in range(5):
        i = int((0.6 + 0.08 * j) * (len(lo) - 1))
        p0 = lo[i] + np.array([0, 0.016 * W])
        out.append(ribbon(np.vstack([p0, p0 + np.array([outer * 0.01 * W, 0.024 * W])]), 0.005 * W, 0.0008 * W,
                          fill=LOWER_LASH).replace('/>', ' opacity="0.8"/>'))
    # Inner corner: the lids meet in a small soft notch.
    out.append(ribbon(cubic(ic + np.array([outer * 0.05 * W, -0.03 * W]), ic + np.array([-outer * 0.01 * W, -0.01 * W]),
                            ic + np.array([-outer * 0.01 * W, 0.016 * W]), ic + np.array([outer * 0.04 * W, 0.024 * W]), 12),
                      0.006 * W, 0.001 * W, wmid=0.007 * W, fill=LOWER_LASH))
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
    """Her brows: soft, straight and full, a warm brown, a gentle arch two thirds of the way out; the inner
    end soft and light, the body feathered with fine hairs that rise at the inner end and lie flat toward
    the tail (mostly seen through the fringe)."""
    rng = rng or np.random.default_rng(5)
    g = eye_shape(e, outer)
    W = g['W']
    k = 'b%d' % int(e['cx'])
    top = g['up'][:, 1].min()
    x_in = g['inner'][0] - outer * 0.03 * W
    x_out = g['outer'][0] + outer * 0.13 * W
    y = top - 0.30 * W
    base = cubic((x_in, y + 0.03 * W), (x_in + outer * 0.38 * W, y - 0.025 * W), (x_out - outer * 0.32 * W, y - 0.045 * W),
                 (x_out, y + 0.04 * W), 48)
    xa, xb = sorted((x_in, x_out))
    gid = k + 'g'
    # Lighter at the inner end, full through the body, thinning to the tail.
    stops = [(0, 0.3), (0.22, 0.75), (0.75, 0.8), (1, 0.55)] if outer > 0 else [(0, 0.55), (0.25, 0.8), (0.78, 0.75), (1, 0.3)]
    st = ''.join('<stop offset="%.2f" stop-color="%s" stop-opacity="%.2f"/>' % (o, BROW, a) for o, a in stops)
    out = [blur(k, 0.022 * W), blur(k + 'h', 0.004 * W),
           '<linearGradient id="%s" gradientUnits="userSpaceOnUse" x1="%.1f" y1="0" x2="%.1f" y2="0">%s</linearGradient>' % (
               gid, xa, xb, st),
           ribbon(base, 0.1 * W, 0.022 * W, wmid=0.085 * W, fill='url(#%s)' % gid).replace('/>', ' filter="url(#%s)"/>' % k)]
    for j in range(70):
        t = rng.uniform(0.0, 1.0)
        p = base[int(t * 47)]
        a = np.radians(68 * (1 - t) ** 2 + 10)          # (upright at the inner end, flat toward the tail)
        d = np.array([outer * np.cos(a), -np.sin(a)])
        L = (0.045 + 0.03 * rng.random()) * W * (1.0 - 0.35 * t)
        half = (0.04 * (1 - 0.6 * t)) * W
        p0 = p + np.array([0, rng.uniform(-0.5, 0.5) * half + 0.3 * half])
        out.append(ribbon(np.vstack([p0, p0 + d * L * 0.5, p0 + d * L]), 0.0055 * W, 0.0008 * W, fill=BROW_HAIR).replace(
            '/>', ' filter="url(#%sh)" opacity="%.2f"/>' % (k, 0.35 + 0.4 * min(1.0, 0.2 + t))))
    return out


def nose(cx, y, ipd, s=1.0):
    """Her nose: small and soft with a rounded tip, as in her portrait about half an iris spacing across the
    wings. A faint shade down the shadow side of the bridge, a rosy, rounded tip lit from above, the wings
    either side of it drawn in soft crescents of shade where they meet the cheeks, the soft shadow under the
    tip and two warm, soft nostrils (no ink)."""
    w = 0.5 * ipd             # across the wings
    out = [blur('nb', 0.12 * w), blur('nb2', 0.05 * w), blur('nb3', 0.025 * w)]
    # The bridge: a faint shade down its shadow side, a fainter one down the other, a soft light between.
    for sgn, op in ((1, 0.7), (-1, 0.3)):
        out.append('<path d="%s" fill="%s" filter="url(#nb)" opacity="%.2f"/>' % (path(np.array([
            (cx + sgn * 0.12 * w, y - 1.25 * w), (cx + sgn * 0.2 * w, y - 0.8 * w), (cx + sgn * 0.3 * w, y - 0.3 * w),
            (cx + sgn * 0.22 * w, y - 0.12 * w), (cx + sgn * 0.12 * w, y - 0.5 * w)]), close=True), NOSE_SHADE, op))
    out.append('<path d="%s" fill="#fffaf7" filter="url(#nb)" opacity="0.6"/>' % path(np.array([
        (cx - 0.04 * w, y - 1.1 * w), (cx + 0.03 * w, y - 1.1 * w), (cx + 0.03 * w, y - 0.3 * w),
        (cx - 0.05 * w, y - 0.3 * w)]), close=True))
    # The tip: a soft rosy round.
    out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" filter="url(#nb2)" opacity="0.3"/>' % (
        cx, y - 0.02 * w, 0.26 * w, 0.2 * w, BLUSH))
    # The wings: soft crescents of shade round each side of the tip, deeper on the shadow side.
    for sgn in (-1, 1):
        wing = cubic((cx + sgn * 0.26 * w, y - 0.2 * w), (cx + sgn * 0.46 * w, y - 0.12 * w),
                     (cx + sgn * 0.47 * w, y + 0.1 * w), (cx + sgn * 0.3 * w, y + 0.17 * w), 16)
        out.append(ribbon(wing, 0.015 * w, 0.012 * w, wmid=0.075 * w, fill=NOSE_SHADE).replace(
            '/>', ' filter="url(#nb2)" opacity="%.2f"/>' % (0.95 if sgn > 0 else 0.7)))
        out.append(ribbon(part(wing, 0.15, 0.85), 0.004 * w, 0.004 * w, wmid=0.016 * w, fill=NOSE_DEEP).replace(
            '/>', ' filter="url(#nb3)" opacity="%.2f"/>' % (0.7 if sgn > 0 else 0.45)))
    # Light on the round of the tip.
    out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#fffaf7" filter="url(#nb2)" opacity="0.95"/>' % (
        cx - 0.03 * w, y - 0.07 * w, 0.11 * w, 0.08 * w))
    # Under the tip: a soft shade, a fine warm line on its shadow side.
    out.append('<path d="%s" fill="%s" filter="url(#nb2)" opacity="0.8"/>' % (path(cubic(
        (cx - 0.22 * w, y + 0.07 * w), (cx - 0.1 * w, y + 0.17 * w), (cx + 0.1 * w, y + 0.17 * w),
        (cx + 0.22 * w, y + 0.07 * w), 16)), NOSE_SHADE))
    out.append(ribbon(cubic((cx + 0.2 * w, y + 0.05 * w), (cx + 0.2 * w, y + 0.11 * w), (cx + 0.11 * w, y + 0.14 * w),
                            (cx + 0.03 * w, y + 0.135 * w), 14), 0.004 * w, 0.003 * w, wmid=0.016 * w,
                      fill=NOSE_LINE).replace('/>', ' filter="url(#nb3)" opacity="0.75"/>'))
    # Nostrils: two soft warm ovals tilted in toward the tip.
    for sgn in (-1, 1):
        x = cx + sgn * 0.15 * w
        out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" filter="url(#nb3)" opacity="%.2f" '
                   'transform="rotate(%.1f %.1f %.1f)"/>' % (x, y + 0.1 * w, 0.08 * w, 0.034 * w, NOSTRIL,
                                                             1.0 if sgn > 0 else 0.85, -sgn * 18, x, y + 0.1 * w))
    return out


def lip_shape(m, ipd):
    """Her lips: centre, seam y, width, and the seam, cupid's-bow and lower-lip curves (px)."""
    seam = m['seam']
    cx = float(seam[:, 0].mean())
    sy = float(np.median(seam[:, 1]))
    Wm = 0.70 * ipd   # (her mouth: about 0.70 iris spacings across, measured on her portrait)
    x0, x1 = cx - Wm / 2, cx + Wm / 2
    # Seam: the corners a little up, a soft dip at the centre.
    line = np.vstack([cubic((x0, sy - 0.025 * Wm), (x0 + 0.18 * Wm, sy + 0.006 * Wm), (cx - 0.2 * Wm, sy + 0.02 * Wm),
                            (cx, sy + 0.014 * Wm), 24),
                      cubic((cx, sy + 0.014 * Wm), (cx + 0.2 * Wm, sy + 0.02 * Wm), (x1 - 0.18 * Wm, sy + 0.006 * Wm),
                            (x1, sy - 0.025 * Wm), 24)[1:]])
    # Upper lip: a soft, wide cupid's bow (her lips are full and smooth rather than sharply peaked): the peaks
    # well out from the centre, a shallow dip between them.
    top = sy - 0.16 * Wm
    bow = np.vstack([cubic((cx - 0.43 * Wm, sy - 0.035 * Wm), (cx - 0.32 * Wm, top + 0.03 * Wm), (cx - 0.2 * Wm, top + 0.002 * Wm),
                           (cx - 0.11 * Wm, top), 16),
                     cubic((cx - 0.11 * Wm, top), (cx - 0.06 * Wm, top - 0.001 * Wm), (cx - 0.03 * Wm, top + 0.014 * Wm), (cx, top + 0.016 * Wm), 8)[1:],
                     cubic((cx, top + 0.016 * Wm), (cx + 0.03 * Wm, top + 0.014 * Wm), (cx + 0.06 * Wm, top - 0.001 * Wm), (cx + 0.11 * Wm, top), 8)[1:],
                     cubic((cx + 0.11 * Wm, top), (cx + 0.2 * Wm, top + 0.002 * Wm), (cx + 0.32 * Wm, top + 0.03 * Wm),
                           (cx + 0.43 * Wm, sy - 0.035 * Wm), 16)[1:]])
    bot = sy + 0.285 * Wm
    lower = cubic((cx - 0.40 * Wm, sy + 0.03 * Wm), (cx - 0.28 * Wm, bot + 0.012 * Wm), (cx + 0.28 * Wm, bot + 0.012 * Wm),
                  (cx + 0.40 * Wm, sy + 0.03 * Wm), 30)
    return dict(cx=cx, sy=sy, Wm=Wm, x0=x0, x1=x1, line=line, bow=bow, top=top, bot=bot, lower=lower)


def lips(m, ipd, s=1.0):
    """Full, soft coral-peach lips, deepest at the centre and fading to the edges, just parted with a hint
    of her teeth, a gloss on the lower lip; the seam a soft deep coral that thins out toward the corners,
    the corners soft points of shade."""
    L = lip_shape(m, ipd)
    cx, sy, Wm, x0, x1, line = L['cx'], L['sy'], L['Wm'], L['x0'], L['x1'], L['line']
    c0 = np.array([x0 + 0.01 * Wm, sy - 0.025 * Wm])
    c1 = np.array([x1 - 0.01 * Wm, sy - 0.025 * Wm])
    # (each lip reaches a little past the seam under the other: blurred, two shapes that only met at the
    # seam faded out along it and left a pale line, which the insides of her lips show in a three-quarter view)
    over = np.array([0, 0.045 * Wm])
    upper = np.vstack([c0, L['bow'], c1, (line + over)[::-1]])
    lower = np.vstack([line - over, c1, L['lower'][::-1], c0])
    out = [blur('lb', 0.017 * Wm), blur('lb2', 0.05 * Wm), blur('lb3', 0.008 * Wm),
           rgrad('lg', cx, sy, 0.52 * Wm, [(0, LIP_DEEP, 1), (0.5, LIP_MID, 1), (1, LIP_EDGE, 1)]),
           rgrad('lg2', cx, sy + 0.04 * Wm, 0.46 * Wm, [(0, LIP_DEEP, 1), (0.45, LIP_MID, 1), (1, LIP_EDGE, 1)])]
    out.append('<path d="%s" fill="url(#lg)" filter="url(#lb)"/>' % path(upper, close=True))
    out.append('<path d="%s" fill="url(#lg2)" filter="url(#lb)"/>' % path(lower, close=True))
    # The upper lip's lower half a little deeper (it turns into the mouth), and a soft line of light along
    # its top edge (the vermilion border).
    inner_up = np.vstack([line + np.array([0, -0.07 * Wm]), (line + np.array([0, 0.01 * Wm]))[::-1]])
    out.append('<path d="%s" fill="%s" filter="url(#lb2)" opacity="0.35"/>' % (path(inner_up, close=True), LIP_DEEP))
    out.append(ribbon(part(L['bow'], 0.12, 0.88) + np.array([0, -0.006 * Wm]), 0.002 * Wm, 0.002 * Wm, wmid=0.01 * Wm,
                      fill='#fff3ef').replace('/>', ' filter="url(#lb3)" opacity="0.65"/>'))
    # Gloss on the lower lip, a small light on the upper.
    out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" filter="url(#lb)" opacity="0.6"/>' % (
        cx - 0.04 * Wm, (sy + L['bot']) / 2 + 0.02 * Wm, 0.11 * Wm, 0.03 * Wm, LIP_HI))
    out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" filter="url(#lb)" opacity="0.55"/>' % (
        cx - 0.13 * Wm, L['top'] + 0.07 * Wm, 0.055 * Wm, 0.018 * Wm, LIP_HI))
    # Soft shade under the lower lip.
    out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" filter="url(#lb2)" opacity="0.8"/>' % (
        cx, L['bot'] + 0.07 * Wm, 0.2 * Wm, 0.045 * Wm, SHADE))
    # The seam: deep coral, full at the centre where her lips part, thinning out toward the corners and
    # fading before them.
    lx = line[:, 0]
    gid = 'lsg'
    out.append('<linearGradient id="%s" gradientUnits="userSpaceOnUse" x1="%.1f" y1="0" x2="%.1f" y2="0">%s</linearGradient>' % (
        gid, x0, x1, ''.join('<stop offset="%.2f" stop-color="%s" stop-opacity="%.2f"/>' % (o, LIP_SEAM, a)
                             for o, a in ((0, 0.0), (0.05, 0.55), (0.25, 0.9), (0.5, 1.0), (0.75, 0.9), (0.95, 0.55), (1, 0.0)))))
    out.append(ribbon(line, 0.002 * Wm, 0.002 * Wm, wmid=0.02 * Wm, fill='url(#%s)' % gid).replace('/>', ' filter="url(#lb3)"/>'))
    # Parted at the centre: a dark gap with the edge of her upper teeth just showing in it.
    gap = np.vstack([cubic((cx - 0.23 * Wm, sy + 0.008 * Wm), (cx - 0.08 * Wm, sy - 0.012 * Wm), (cx + 0.08 * Wm, sy - 0.012 * Wm),
                           (cx + 0.23 * Wm, sy + 0.008 * Wm), 18),
                     cubic((cx + 0.23 * Wm, sy + 0.008 * Wm), (cx + 0.08 * Wm, sy + 0.034 * Wm), (cx - 0.08 * Wm, sy + 0.034 * Wm),
                           (cx - 0.23 * Wm, sy + 0.008 * Wm), 18)[1:]])
    out.append('<path d="%s" fill="%s" filter="url(#lb3)"/>' % (path(gap, close=True), LIP_GAP))
    teeth = np.vstack([cubic((cx - 0.15 * Wm, sy + 0.003 * Wm), (cx - 0.05 * Wm, sy - 0.008 * Wm), (cx + 0.05 * Wm, sy - 0.008 * Wm),
                             (cx + 0.15 * Wm, sy + 0.003 * Wm), 12),
                       cubic((cx + 0.15 * Wm, sy + 0.003 * Wm), (cx + 0.05 * Wm, sy + 0.013 * Wm), (cx - 0.05 * Wm, sy + 0.013 * Wm),
                             (cx - 0.15 * Wm, sy + 0.003 * Wm), 12)[1:]])
    out.append('<path d="%s" fill="%s" filter="url(#lb3)" opacity="0.8"/>' % (path(teeth, close=True), TEETH))
    # Corners: soft little points of shade.
    for sgn, x in ((-1, x0), (1, x1)):
        out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" filter="url(#lb3)" opacity="0.6"/>' % (
            x - sgn * 0.02 * Wm, sy - 0.022 * Wm, 0.03 * Wm, 0.01 * Wm, LIP_SEAM))
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
        # (a narrow shadow just under her jaw: a deep one read as a double chin)
        depth = (0.004 + 0.018 * np.sqrt(np.clip(1 - (u / 0.75) ** 2, 0, 1))) * R
        dy = yy - np.where(ok, jaw, -1e9)[None, :]
        soft = 0.005 * R
        a_jaw = np.clip(dy / (0.004 * R) + 0.5, 0, 1) * np.clip((depth[None, :] - dy) / soft + 0.5, 0, 1)
        a_jaw *= np.clip((dy + 0.5 * soft) / (0.03 * R), 0.75, 1.0)  # a touch deeper right under the jaw
        a_jaw *= np.clip(1 - u / 0.8, 0, 1) ** 0.7  # (fading out toward the jaw's angle, never a hard edge)
        a_jaw = 0.55 * ndimage.gaussian_filter(a_jaw, 0.004 * R) * mask
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
    out += nose(mid, nose_y, ipd, s=s)
    out += lips(m, ipd, s=s)
    out.append('</svg>')
    return '\n'.join(out)
