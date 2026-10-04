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
    W = 1.15 * W0
    inner = c + np.array([-outer * W / 2, 0.035 * W])
    outer_c = c + np.array([outer * W / 2, -0.035 * W])
    Hh = H0 / 0.86
    up = cubic(inner, inner + np.array([outer * 0.16 * W, -0.74 * Hh]), outer_c + np.array([-outer * 0.32 * W, -0.70 * Hh]),
               outer_c, 60)
    lo = cubic(inner, inner + np.array([outer * 0.28 * W, 0.40 * Hh]), outer_c + np.array([-outer * 0.26 * W, 0.42 * Hh]),
               outer_c, 60)
    r = 0.245 * W
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


def eye(e, outer, s=1.0, closeup=False, rng=None):
    """One eye. `outer` is +1 if the outer corner is toward +x in the image."""
    rng = rng or np.random.default_rng(3)
    g = eye_shape(e, outer)
    W, Hh, up, lo = g['W'], g['H'], g['up'], g['lo']
    icx, icy, ir = g['iris']
    out = []
    clip_id = 'eyeclip%d' % int(e['cx'])
    opening = np.vstack([up, lo[::-1]])
    out.append('<clipPath id="%s"><path d="%s"/></clipPath>' % (clip_id, path(opening, close=True)))
    q = ['<g clip-path="url(#%s)">' % clip_id]
    if closeup:
        # Close-ups tint the iris in the shader: draw it light, with a limbal ring, fine radial fibres
        # and the pupil.
        q.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#fff" stroke="#000" stroke-width="%.1f"/>' % (
            icx, icy, ir, 0.12 * ir))
        for k in range(36):
            a = 2 * np.pi * k / 36
            r0, r1 = ir * 0.48, ir * (0.78 + 0.12 * ((k * 7) % 5) / 4)
            q.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#000" stroke-width="%.1f" stroke-linecap="round"/>' % (
                icx + np.cos(a) * r0, icy + np.sin(a) * r0, icx + np.cos(a) * r1, icy + np.sin(a) * r1, 0.8 * s))
    else:
        # A dark iris with a faint lighter ring low in it (depth), radial streaks in the lower half.
        q.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#000"/>' % (icx, icy, ir))
        for k in range(14):
            a = np.pi * (0.18 + 0.64 * k / 13)
            r0, r1 = ir * 0.55, ir * 0.86
            q.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#fff" stroke-width="%.1f" stroke-linecap="round"/>' % (
                icx + np.cos(a) * r0, icy + np.sin(a) * r0, icx + np.cos(a) * r1, icy + np.sin(a) * r1, 1.0 * s))
    q.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#000"/>' % (icx, icy, ir * 0.40))
    # Shadow of the upper lid across the eye: hatching under the lash line.
    band_hi = up + np.array([0, 0.02 * Hh])
    band_lo = up + np.array([0, 0.16 * Hh])
    q += hatch(part(band_hi, 0.12, 0.9), part(band_lo, 0.12, 0.9), 18, 1.2, s)
    # Catch-lights: a large soft one upper left, a small one lower right (the same light for both eyes).
    q.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#fff" transform="rotate(-20 %.1f %.1f)"/>' % (
        icx - ir * 0.34, icy - ir * 0.30, ir * 0.24, ir * 0.17, icx - ir * 0.34, icy - ir * 0.30))
    q.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#fff"/>' % (icx + ir * 0.38, icy + ir * 0.36, ir * 0.08))
    q.append('</g>')
    out += q
    # Upper lash line: fine at the inner corner, full across the lid, a soft short flick past the corner.
    flick = cubic(up[-1], up[-1] + np.array([outer * 0.05 * W, -0.005 * W]), up[-1] + np.array([outer * 0.10 * W, -0.03 * W]),
                  up[-1] + np.array([outer * 0.14 * W, -0.06 * W]), 14)
    lash = np.vstack([part(up, 0.04, 1.0), flick[1:]]) + np.array([0, -0.012 * W])
    out.append(ribbon(lash, 3.0 * s, 1.5 * s, wmid=0.085 * W))
    # Lashes along the outer half, sweeping out and up.
    n = len(up)
    for k in range(7):
        t = 0.45 + 0.08 * k
        i = min(int(t * (n - 1)), n - 1)
        p = up[i] + np.array([0, -0.03 * W])
        d = np.array([outer * (0.25 + 0.16 * k), -1.0])
        d /= np.linalg.norm(d)
        L = (0.07 + 0.012 * k) * W
        q0 = p + d * L
        out.append(ribbon(np.vstack([p, p + d * L * 0.5 + np.array([outer * 0.012 * W, 0]), q0]), 3.6 * s, 0.4 * s))
    # Double eyelid: a fine crease above the lid, nearer the lid at the inner end.
    crease = part(up, 0.22, 0.97).copy()
    tt = np.linspace(0, 1, len(crease))[:, None]
    crease = crease + np.c_[outer * 0.02 * W * tt[:, 0], -(0.10 + 0.14 * tt[:, 0]) * Hh]
    out.append(ribbon(smooth(crease, 3), 0.6 * s, 1.2 * s, wmid=3.4 * s))
    # Lower lid: a fine line on the outer two thirds and a few tiny lashes.
    out.append(ribbon(part(lo, 0.30, 1.0) + np.array([0, 0.012 * W]), 0.6 * s, 2.6 * s, wmid=3.0 * s))
    for k in range(3):
        i = int((0.66 + 0.1 * k) * (len(lo) - 1))
        p = lo[i] + np.array([0, 0.02 * W])
        out.append(ribbon(np.vstack([p, p + np.array([outer * 0.012 * W, 0.04 * W])]), 1.2 * s, 0.2 * s))
    # Aegyo-sal: the soft fullness under the eye, a curve with a little hatching beneath it.
    ag = part(lo, 0.14, 0.86) + np.array([0, 0.30 * Hh])
    out.append(ribbon(smooth(ag, 3), 0.4 * s, 0.4 * s, wmid=2.6 * s))
    # Inner corner: the lid lines meet in a small notch (tear duct).
    ic = g['inner']
    out.append(ribbon(cubic(ic + np.array([outer * 0.05 * W, -0.035 * W]), ic + np.array([-outer * 0.01 * W, -0.01 * W]),
                            ic + np.array([-outer * 0.01 * W, 0.02 * W]), ic + np.array([outer * 0.04 * W, 0.03 * W]), 12),
                      1.6 * s, 0.5 * s, wmid=1.8 * s))
    return out


def brow(e, b, outer, s=1.0, rng=None):
    """Soft, straight brows of fine hair strokes (mostly seen through the fringe)."""
    rng = rng or np.random.default_rng(5)
    g = eye_shape(e, outer)
    W = g['W']
    top = g['up'][:, 1].min()
    x_in = g['inner'][0] - outer * 0.02 * W
    x_out = g['outer'][0] + outer * 0.16 * W
    y = top - 0.40 * W
    base = cubic((x_in, y + 0.02 * W), (x_in + outer * 0.35 * W, y - 0.05 * W), (x_out - outer * 0.3 * W, y - 0.05 * W),
                 (x_out, y + 0.06 * W), 40)
    out = [ribbon(base + np.array([0, 0.012 * W]), 0.022 * W, 0.004 * W, wmid=0.016 * W)]
    for k in range(70):
        t = rng.uniform(0, 1)
        p = base[int(t * 39)]
        thick = 0.10 * W * (1 - 0.6 * t)
        off = rng.uniform(-0.5, 0.5) * thick
        if t < 0.15:
            d = np.array([outer * 0.35, -1.0])
        else:
            a = np.radians(18 - 14 * t)
            d = np.array([outer * np.cos(a), -np.sin(a)])
        d /= np.linalg.norm(d)
        L = (0.06 + 0.04 * rng.random()) * W
        p0 = p + np.array([0, off])
        out.append(ribbon(np.vstack([p0, p0 + d * L * 0.5, p0 + d * L]), 0.9 * s, 0.15 * s))
    return out


def nose(cx, y, w, s=1.0):
    """Small soft nose: the shadow under the tip and two light nostril marks."""
    out = [ribbon(cubic((cx + 0.22 * w, y - 0.04 * w), (cx + 0.26 * w, y + 0.06 * w), (cx + 0.14 * w, y + 0.12 * w),
                        (cx + 0.02 * w, y + 0.12 * w), 14), 0.5 * s, 0.8 * s, wmid=4.2 * s)]
    for sgn in (-1, 1):
        x = cx + sgn * 0.13 * w
        out.append(ribbon(np.vstack([(x + sgn * 0.03 * w, y + 0.02 * w), (x, y + 0.07 * w), (x - sgn * 0.04 * w, y + 0.09 * w)]),
                          0.4 * s, 0.4 * s, wmid=2.2 * s))
    # A whisper of the bridge on the shadow side.
    out.append(ribbon(np.vstack([(cx + 0.21 * w, y - 0.42 * w), (cx + 0.225 * w, y - 0.3 * w), (cx + 0.23 * w, y - 0.18 * w)]),
                      0.2 * s, 0.2 * s, wmid=0.9 * s))
    return out


def lips(m, ipd, s=1.0):
    """Full lips, slightly parted: a defined seam, a cupid's bow, a toned upper lip and a lit lower lip."""
    out = []
    seam = m['seam']
    cx = float(seam[:, 0].mean())
    sy = float(np.median(seam[:, 1]))
    Wm = 0.64 * ipd
    x0, x1 = cx - Wm / 2, cx + Wm / 2
    # Seam: corners lifted a little, a soft dip at the centre.
    line = np.vstack([cubic((x0, sy - 0.03 * Wm), (x0 + 0.18 * Wm, sy + 0.005 * Wm), (cx - 0.2 * Wm, sy + 0.02 * Wm),
                            (cx, sy + 0.012 * Wm), 24),
                      cubic((cx, sy + 0.012 * Wm), (cx + 0.2 * Wm, sy + 0.02 * Wm), (x1 - 0.18 * Wm, sy + 0.005 * Wm),
                            (x1, sy - 0.03 * Wm), 24)[1:]])
    out.append(ribbon(line, 1.6 * s, 1.6 * s, wmid=7.0 * s))
    # Parted at the centre: a narrow dark gap.
    gap = np.vstack([cubic((cx - 0.17 * Wm, sy + 0.01 * Wm), (cx - 0.06 * Wm, sy - 0.02 * Wm), (cx + 0.06 * Wm, sy - 0.02 * Wm),
                           (cx + 0.17 * Wm, sy + 0.01 * Wm), 16),
                     cubic((cx + 0.17 * Wm, sy + 0.01 * Wm), (cx + 0.06 * Wm, sy + 0.045 * Wm), (cx - 0.06 * Wm, sy + 0.045 * Wm),
                           (cx - 0.17 * Wm, sy + 0.01 * Wm), 16)[1:]])
    out.append('<path d="%s" fill="#000"/>' % path(gap, close=True))
    # Corners: tiny commas.
    for sgn, x in ((-1, x0), (1, x1)):
        out.append(ribbon(np.vstack([(x - sgn * 0.01 * Wm, sy - 0.03 * Wm), (x + sgn * 0.025 * Wm, sy - 0.005 * Wm)]),
                          2.0 * s, 0.3 * s))
    # Upper lip: cupid's bow outline (drawn through the middle) and a hatched tone (it faces down, into shadow).
    top = sy - 0.17 * Wm
    bow = np.vstack([cubic((cx - 0.40 * Wm, sy - 0.05 * Wm), (cx - 0.28 * Wm, top + 0.02 * Wm), (cx - 0.16 * Wm, top),
                           (cx - 0.07 * Wm, top), 16),
                     cubic((cx - 0.07 * Wm, top), (cx - 0.03 * Wm, top), (cx - 0.02 * Wm, top + 0.04 * Wm), (cx, top + 0.04 * Wm), 8)[1:],
                     cubic((cx, top + 0.04 * Wm), (cx + 0.02 * Wm, top + 0.04 * Wm), (cx + 0.03 * Wm, top), (cx + 0.07 * Wm, top), 8)[1:],
                     cubic((cx + 0.07 * Wm, top), (cx + 0.16 * Wm, top), (cx + 0.28 * Wm, top + 0.02 * Wm),
                           (cx + 0.40 * Wm, sy - 0.05 * Wm), 16)[1:]])
    out.append(ribbon(bow, 0.4 * s, 0.4 * s, wmid=3.2 * s))
    for k in range(17):
        u = -0.36 + 0.72 * k / 16
        x = cx + u * Wm
        yb = np.interp(x, bow[:, 0], bow[:, 1]) + 0.02 * Wm
        ys = np.interp(x, line[:, 0], line[:, 1]) - 0.01 * Wm
        if ys - yb < 0.02 * Wm:
            continue
        out.append(ribbon(np.vstack([(x + 0.012 * Wm, yb), (x, (yb + ys) / 2), (x - 0.012 * Wm, ys)]), 0.4 * s, 0.4 * s,
                          wmid=1.5 * s))
    # Lower lip: a full curve beneath it (its shadow), tone at the sides and a highlight left white in the middle.
    bot = sy + 0.25 * Wm
    lower = cubic((cx - 0.30 * Wm, sy + 0.10 * Wm), (cx - 0.20 * Wm, bot + 0.01 * Wm), (cx + 0.20 * Wm, bot + 0.01 * Wm),
                  (cx + 0.30 * Wm, sy + 0.10 * Wm), 30)
    out.append(ribbon(lower, 0.5 * s, 0.5 * s, wmid=4.4 * s))
    out.append(ribbon(cubic((cx - 0.13 * Wm, bot + 0.07 * Wm), (cx - 0.04 * Wm, bot + 0.10 * Wm), (cx + 0.04 * Wm, bot + 0.10 * Wm),
                            (cx + 0.13 * Wm, bot + 0.07 * Wm), 12), 0.3 * s, 0.3 * s, wmid=3.5 * s))
    for sgn in (-1, 1):
        for k in range(5):
            u = 0.17 + 0.03 * k
            x = cx + sgn * u * Wm
            y0 = np.interp(x, line[:, 0], line[:, 1]) + 0.04 * Wm
            y1 = np.interp(x, lower[:, 0] if sgn < 0 else lower[:, 0], lower[:, 1]) - 0.02 * Wm
            if y1 - y0 < 0.02 * Wm:
                continue
            out.append(ribbon(np.vstack([(x, y0), (x, y1)]), 0.3 * s, 0.3 * s, wmid=1.2 * s))
    return out


def blush(cx, cy, w, s=1.0, rng=None):
    rng = rng or np.random.default_rng(9)
    out = []
    for k in range(4):
        x = cx + (k - 1.5) * 0.12 * w + rng.normal(0, 0.01 * w)
        out.append(ribbon(np.vstack([(x + 0.05 * w, cy - 0.07 * w), (x - 0.05 * w, cy + 0.07 * w)]), 0.4 * s, 0.4 * s,
                          wmid=1.3 * s))
    return out


def face_svg(lm, size=None, closeup=False):
    R = lm['R']
    s = 1.0 if not closeup else 0.85
    out = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (R, R, R, R),
           '<rect width="%d" height="%d" fill="#fff"/>' % (R, R)]
    eyes = lm['eyes']
    mid = (eyes[0]['cx'] + eyes[1]['cx']) / 2
    irises = []
    for e, b in zip(eyes, lm['brows']):
        outer = -1 if e['cx'] < mid else 1
        out += eye(e, outer, s=s * 1.2, closeup=closeup)
        out += brow(e, b, outer, s=s * 1.2)
        irises.append(iris_geometry(e, outer))
    ipd = abs(irises[1][0] - irises[0][0])
    m = lm['mouth']
    eye_y = (eyes[0]['cy'] + eyes[1]['cy']) / 2
    W = eyes[1]['x1'] - eyes[0]['x0']
    nose_y = lm.get('nose_y', eye_y + 0.62 * (m['seam_y'] - eye_y))
    out += nose(mid, nose_y, 0.32 * W, s=s * 1.2)
    out += lips(m, ipd, s=s * 1.2)
    for e in eyes:
        outer = -1 if e['cx'] < mid else 1
        out += blush(e['cx'] + outer * 0.10 * W, e['cy'] + 0.30 * W, 0.26 * W, s=s * 1.2)
    out.append('</svg>')
    return '\n'.join(out)
