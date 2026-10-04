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

def eye(e, outer, s=1.0, closeup=False, rng=None):
    """One eye. `outer` is +1 if the outer corner is toward +x in the image."""
    rng = rng or np.random.default_rng(3)
    cols, top, bot = e['cols'], e['top'], e['bot']
    up = smooth(np.c_[cols, top], 5)
    lo = smooth(np.c_[cols, bot], 5)
    if outer < 0:
        up, lo = up[::-1], lo[::-1]  # inner -> outer
    inner_c, outer_c = up[0], up[-1]
    W = abs(outer_c[0] - inner_c[0])
    H = (lo[:, 1] - up[:, 1]).max()
    out = []
    # Sultry almond: the drawn upper lid sits lower than the opening at the middle (flatter arc).
    tt = np.linspace(0, 1, len(up))
    up = up + np.c_[np.zeros(len(up)), 0.09 * H * np.sin(np.pi * tt) ** 1.5 + 0.02 * H * tt]
    # Iris and pupil: large, tucked under the upper lid.
    icx = e['cx'] + outer * 0.03 * W
    icy = e['cy'] + 0.08 * H
    ir = 0.33 * W
    clip_id = 'eyeclip%d' % int(e['cx'])
    opening = np.vstack([up, lo[::-1]])
    out.append('<clipPath id="%s"><path d="%s"/></clipPath>' % (clip_id, path(opening, close=True)))
    g = ['<g clip-path="url(#%s)">' % clip_id]
    g.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#000"/>' % (icx, icy, ir))
    # Iris texture: radial white streaks in the lower half (visible when tinted), pupil.
    for k in range(18):
        a = np.pi * (0.15 + 0.7 * k / 17)
        r0, r1 = ir * 0.45, ir * 0.9
        g.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#fff" stroke-width="%.1f" stroke-linecap="round"/>' % (
            icx + np.cos(a) * r0, icy + np.sin(a) * r0, icx + np.cos(a) * r1, icy + np.sin(a) * r1, 1.2 * s))
    g.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#000"/>' % (icx, icy, ir * 0.42))
    # Catch-lights: a large one upper outer, a small one lower inner.
    g.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#fff"/>' % (
        icx + outer * ir * 0.36, icy - ir * 0.30, ir * 0.22, ir * 0.18))
    g.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#fff"/>' % (icx - outer * ir * 0.35, icy + ir * 0.40, ir * 0.08))
    g.append('</g>')
    out += g
    # Lid shadow: a soft band under the lash line over the eyeball (hatched lines read as shade in ink).
    for k in range(4):
        band = up[int(len(up) * 0.15):int(len(up) * 0.9)] + np.array([0, (0.07 + 0.05 * k) * H])
        out.append(ribbon(band, 0.3 * s, 0.3 * s, wmid=(1.4 - 0.25 * k) * s))
    # Upper lash line: follows the lid, thick from the middle, ends in a short wing.
    wing_tip = outer_c + np.array([outer * 0.16 * W, -0.10 * H])
    lash = np.vstack([up[: int(len(up) * 0.98)], bez(up[-1], up[-1] + np.array([outer * 0.06 * W, -0.01 * H]), wing_tip, 12)])
    lash = lash + np.array([0, -0.03 * H])
    out.append(ribbon(lash, 3.5 * s, 1.5 * s, wmid=18.0 * s))
    # Lash flicks at the outer third.
    n = len(up)
    for k in range(5):
        i = int(n * (0.62 + 0.07 * k))
        p = up[min(i, n - 1)] + np.array([0, -0.06 * H])
        d = np.array([outer * (0.35 + 0.12 * k), -1.0])
        d /= np.linalg.norm(d)
        q = p + d * (0.10 + 0.02 * k) * W
        out.append(ribbon(np.vstack([p, (p + q) / 2 + np.array([outer * 0.01 * W, 0]), q]), 3.0 * s, 0.4 * s))
    # Double eyelid crease.
    crease = smooth(up[int(n * 0.18):int(n * 0.95)] + np.array([0, -0.50 * H]), 4)
    crease[:, 0] += outer * np.linspace(0, 0.03 * W, len(crease))
    out.append(ribbon(crease, 0.6 * s, 0.8 * s, wmid=2.6 * s))
    # Lower lash line (outer two thirds), very fine.
    lo_line = lo[int(len(lo) * 0.35):] + np.array([0, 0.04 * H])
    out.append(ribbon(lo_line, 0.5 * s, 2.6 * s, wmid=2.8 * s))
    # Aegyo-sal: a soft short curve under the eye.
    ag = smooth(lo[int(len(lo) * 0.2):int(len(lo) * 0.8)] + np.array([0, 0.42 * H]), 4)
    out.append(ribbon(ag, 0.3 * s, 0.3 * s, wmid=1.8 * s))
    # Inner corner: a tiny curve tucking the lid line into the tear duct.
    ic = inner_c
    out.append(ribbon(bez(ic + np.array([outer * 0.04 * W, -0.05 * H]), ic + np.array([-outer * 0.04 * W, 0.0]),
                          ic + np.array([outer * 0.02 * W, 0.30 * H]), 10), 1.6 * s, 0.3 * s))
    return out


def brow(e, b, outer, s=1.0, rng=None):
    """Straight, soft brow drawn as fine hair strokes along a gentle line."""
    rng = rng or np.random.default_rng(5)
    cols = e['cols']
    W = cols.max() - cols.min()
    x_in = (cols.min() if outer > 0 else cols.max()) - outer * 0.06 * W
    x_out = (cols.max() if outer > 0 else cols.min()) + outer * 0.26 * W
    y = e['top'].min() - 0.50 * W
    base = bez((x_in, y + 0.02 * W), ((x_in + x_out) / 2, y - 0.07 * W), (x_out, y + 0.06 * W), 40)
    out = []
    # Soft brow body: a light tapered fill under the hair strokes.
    out.append(ribbon(base + np.array([0, 0.012 * W]), 0.07 * W, 0.015 * W, wmid=0.055 * W, fill='#000'))
    for k in range(120):
        t = rng.uniform(0, 1)
        p = base[int(t * 39)]
        thick = 0.13 * W * (1 - 0.6 * t)  # fuller at the inner end
        off = rng.uniform(-0.5, 0.5) * thick
        ang = np.radians(-75 if t < 0.15 else -25 + 15 * t) * (1 if outer > 0 else -1)
        d = np.array([np.cos(ang) * outer, np.sin(-abs(ang))])
        if t >= 0.15:
            d = np.array([outer * np.cos(np.radians(20 - 15 * t)), -np.sin(np.radians(20 - 15 * t))])
        L = (0.07 + 0.05 * rng.random()) * W
        p0 = p + np.array([0, off])
        out.append(ribbon(np.vstack([p0, p0 + d * L * 0.5, p0 + d * L]), 1.6 * s, 0.3 * s))
    return out


def nose(cx, y, w, s=1.0):
    """Minimal manga nose: a soft tick on the shadow side of the tip."""
    return [ribbon(bez((cx + 0.20 * w, y - 0.02 * w), (cx + 0.26 * w, y + 0.10 * w), (cx + 0.08 * w, y + 0.15 * w), 12),
                   0.5 * s, 0.4 * s, wmid=3.2 * s)]


def lips(m, s=1.0):
    out = []
    seam = m['seam']
    x0, x1 = seam[0, 0], seam[-1, 0]
    cx = (x0 + x1) / 2
    x0, x1 = cx + (x0 - cx) * 0.8, cx + (x1 - cx) * 0.8
    W = x1 - x0
    sy = float(np.median(seam[:, 1]))
    # Seam: slight upturned corners, a soft dip at the centre.
    line = np.vstack([bez((x0 - 0.02 * W, sy - 0.035 * W), (x0 + 0.25 * W, sy + 0.02 * W), (cx, sy + 0.012 * W), 20),
                      bez((cx, sy + 0.012 * W), (x1 - 0.25 * W, sy + 0.02 * W), (x1 + 0.02 * W, sy - 0.035 * W), 20)[1:]])
    out.append(ribbon(line, 1.6 * s, 1.6 * s, wmid=8.0 * s))
    # Corner dimples (tiny commas).
    for sgn, x in ((-1, x0 - 0.02 * W), (1, x1 + 0.02 * W)):
        out.append(ribbon(np.vstack([(x, sy - 0.035 * W), (x + sgn * 0.03 * W, sy - 0.01 * W)]), 2.0 * s, 0.3 * s))
    # Upper lip: cupid's bow, drawn light and only through the centre.
    top_y = sy - 0.17 * W
    bow = np.vstack([bez((cx - 0.30 * W, sy - 0.05 * W), (cx - 0.16 * W, top_y - 0.005 * W), (cx - 0.06 * W, top_y), 12),
                     bez((cx - 0.06 * W, top_y), (cx, top_y + 0.035 * W), (cx + 0.06 * W, top_y), 6)[1:],
                     bez((cx + 0.06 * W, top_y), (cx + 0.16 * W, top_y - 0.005 * W), (cx + 0.30 * W, sy - 0.05 * W), 12)[1:]])
    out.append(ribbon(bow, 0.3 * s, 0.3 * s, wmid=2.8 * s))
    # Lower lip: a full curve under the lip (its shadow) and a soft centre line.
    bot_y = sy + 0.23 * W
    lower = bez((cx - 0.22 * W, bot_y - 0.04 * W), (cx, bot_y + 0.05 * W), (cx + 0.22 * W, bot_y - 0.04 * W), 30)
    out.append(ribbon(lower, 0.4 * s, 0.4 * s, wmid=5.5 * s))
    out.append(ribbon(bez((cx - 0.08 * W, sy + 0.10 * W), (cx, sy + 0.12 * W), (cx + 0.08 * W, sy + 0.10 * W), 10),
                      0.2 * s, 0.2 * s, wmid=1.0 * s))
    return out


def blush(cx, cy, w, s=1.0, rng=None):
    rng = rng or np.random.default_rng(9)
    out = []
    for k in range(5):
        x = cx + (k - 2) * 0.12 * w + rng.normal(0, 0.01 * w)
        out.append(ribbon(np.vstack([(x + 0.06 * w, cy - 0.09 * w), (x - 0.06 * w, cy + 0.09 * w)]), 0.5 * s, 0.5 * s,
                          wmid=1.6 * s))
    return out


def face_svg(lm, size=None, closeup=False):
    R = lm['R']
    s = 1.0 if not closeup else 0.6
    out = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (R, R, R, R),
           '<rect width="%d" height="%d" fill="#fff"/>' % (R, R)]
    eyes = lm['eyes']
    mid = (eyes[0]['cx'] + eyes[1]['cx']) / 2
    for e, b in zip(eyes, lm['brows']):
        outer = -1 if e['cx'] < mid else 1
        out += eye(e, outer, s=s * 1.2, closeup=closeup)
        out += brow(e, b, outer, s=s * 1.2)
    m = lm['mouth']
    eye_y = (eyes[0]['cy'] + eyes[1]['cy']) / 2
    W = eyes[1]['x1'] - eyes[0]['x0']
    nose_y = lm.get('nose_y', eye_y + 0.62 * (m['seam_y'] - eye_y))
    out += nose(mid, nose_y, 0.32 * W, s=s * 1.2)
    out += lips(m, s=s * 1.2)
    for e in eyes:
        outer = -1 if e['cx'] < mid else 1
        out += blush(e['cx'] + outer * 0.12 * W, e['cy'] + 0.30 * W, 0.28 * W, s=s * 1.2)
    out.append('</svg>')
    return '\n'.join(out)
