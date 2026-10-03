"""Chaewon's manga face line art, drawn as SVG over the atlas projection.

Input: a flat-colour front orthographic render of the head (eyes red, upper
lip blue, lower lip red-tinted) in the atlas head projection, 1024 px square
covering x in [-0.11, 0.11] m and y in [1.36, 1.58] m.
"""
import numpy as np
from PIL import Image

PROJ = dict(x0=-0.11, y0=1.36, size=0.22)


def masks(path):
    im = np.asarray(Image.open(path).convert('RGB')).astype(int)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    red = (r > 200) & (g < 60) & (b < 60)
    h = im.shape[0]
    rows = np.arange(h)[:, None]
    eyes = red & (rows < h * 0.6)
    upper_lip = (b - r > 70) & (b - g > 70) & (rows > h * 0.55)
    lower_lip = (r - b > 70) & (r - g > 70) & (rows > h * 0.6)
    return eyes, upper_lip, lower_lip


def contour(mask, step=1):
    cols = np.where(mask.any(0))[0]
    top, bot = [], []
    for c in cols[::step]:
        ys = np.where(mask[:, c])[0]
        top.append((c, ys.min()))
        bot.append((c, ys.max()))
    return np.array(top, float), np.array(bot, float)


def split_eyes(eyes):
    w = eyes.shape[1]
    left = eyes.copy(); left[:, w // 2:] = False
    right = eyes.copy(); right[:, :w // 2] = False
    return left, right


def path(points, close=False):
    d = 'M ' + ' L '.join(f'{x:.1f} {y:.1f}' for x, y in points)
    return d + (' Z' if close else '')


def smooth(P, k=5):
    P = np.asarray(P, float)
    if len(P) < k:
        return P
    pad = np.pad(P, ((k // 2, k // 2), (0, 0)), mode='edge')
    ker = np.ones(k) / k
    return np.stack([np.convolve(pad[:, i], ker, mode='valid') for i in range(2)], 1)


def bezier(p0, p1, p2, n=24):
    t = np.linspace(0, 1, n)[:, None]
    return (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t * t * p2


def eye_svg(mask, outer_sign, rng, closeup=False):
    """outer_sign: -1 if the outer corner is toward image left."""
    top, bot = contour(mask)
    top, bot = smooth(top, 7), smooth(bot, 7)
    ys, xs = np.where(mask)
    cx, cy = xs.mean(), ys.mean()
    w = xs.max() - xs.min()
    h = ys.max() - ys.min()
    # widen the drawn eye a little beyond the geometric opening
    def widen(P):
        Q = P.copy()
        Q[:, 0] = cx + (Q[:, 0] - cx) * (1.0 if closeup else 1.12)
        Q[:, 1] = cy + (Q[:, 1] - cy) * (1.0 if closeup else 1.18)
        return Q
    top, bot = widen(top), widen(bot)
    inner_x = top[:, 0].max() if outer_sign < 0 else top[:, 0].min()
    outer_x = top[:, 0].min() if outer_sign < 0 else top[:, 0].max()
    # order the upper lid from inner to outer corner
    if outer_sign < 0:
        top = top[::-1]
        bot = bot[::-1]
    out = []
    # opening fill (white) to clear anything underneath
    opening = np.concatenate([top, bot[::-1]])
    out.append(f'<path d="{path(opening, True)}" fill="#fff"/>')
    # iris clipped to the opening
    ir = h * 0.62
    icx, icy = cx + outer_sign * w * 0.02, cy + h * 0.05
    clip_id = f'clip{int(cx)}'
    out.append(f'<clipPath id="{clip_id}"><path d="{path(opening, True)}"/></clipPath>')
    g = [f'<g clip-path="url(#{clip_id})">']
    g.append(f'<circle cx="{icx:.1f}" cy="{icy:.1f}" r="{ir:.1f}" fill="#000"/>')
    # iris texture: radial white flecks in the lower half (reads as a glossy iris)
    for k in range(26):
        a = np.pi * (0.12 + 0.76 * k / 25)
        r0, r1 = ir * 0.48, ir * (0.82 + 0.08 * rng.random())
        x0, y0 = icx + np.cos(a) * r0, icy + np.sin(a) * r0
        x1, y1 = icx + np.cos(a) * r1, icy + np.sin(a) * r1
        g.append(f'<line x1="{x0:.1f}" y1="{y0:.1f}" x2="{x1:.1f}" y2="{y1:.1f}" stroke="#fff" stroke-width="{1.4 + rng.random():.1f}" stroke-linecap="round"/>')
    g.append(f'<circle cx="{icx:.1f}" cy="{icy:.1f}" r="{ir * 0.40:.1f}" fill="#000"/>')
    g.append(f'<circle cx="{icx:.1f}" cy="{icy:.1f}" r="{ir * 0.93:.1f}" fill="none" stroke="#000" stroke-width="{ir * 0.12:.1f}"/>')
    # highlights
    g.append(f'<ellipse cx="{icx - outer_sign * ir * 0.38:.1f}" cy="{icy - ir * 0.42:.1f}" rx="{ir * 0.30:.1f}" ry="{ir * 0.24:.1f}" fill="#fff"/>')
    g.append(f'<circle cx="{icx + outer_sign * ir * 0.42:.1f}" cy="{icy + ir * 0.30:.1f}" r="{ir * 0.12:.1f}" fill="#fff"/>')
    g.append('</g>')
    if not closeup:
        out += g
    else:
        out = out[:1]
    # upper lash line: tapered filled band from inner to outer, with a wing
    n = len(top)
    thick = np.interp(np.linspace(0, 1, n), [0, 0.15, 0.6, 1], [1.5, 4.0, 7.5, 9.5])
    upper = top.copy()
    lower_edge = top.copy(); lower_edge[:, 1] += 1.0
    upper_edge = top.copy(); upper_edge[:, 1] -= thick
    wing_tip = top[-1] + np.array([outer_sign * w * 0.16, -h * 0.30])
    band = np.concatenate([lower_edge, [wing_tip], upper_edge[::-1]])
    out.append(f'<path d="{path(band, True)}" fill="#000"/>')
    # lashes along the outer half
    for k in range(5):
        t = 0.55 + 0.45 * k / 4
        i = min(n - 1, int(t * (n - 1)))
        base = upper_edge[i]
        L = h * (0.20 + 0.32 * t)
        ang = np.radians(-90 + outer_sign * (40 + 45 * t))
        tip = base + L * np.array([np.cos(ang), np.sin(ang)])
        ctrl = base + 0.6 * (tip - base) + np.array([0, -L * 0.15])
        c = bezier(base, ctrl, tip, 8)
        out.append(f'<path d="{path(c)}" stroke="#000" stroke-width="2.4" fill="none" stroke-linecap="round"/>')
    # double eyelid crease
    crease = top.copy()
    crease[:, 1] -= h * 0.42 + np.sin(np.linspace(0, np.pi, n)) * h * 0.08
    crease = crease[int(n * 0.28):int(n * 0.97)]
    out.append(f'<path d="{path(crease)}" stroke="#000" stroke-width="2.2" fill="none" stroke-linecap="round"/>')
    # lower lid: outer two thirds, fine
    lb = bot[int(len(bot) * 0.35):]
    lb = lb + np.array([0, 1.5])
    out.append(f'<path d="{path(lb)}" stroke="#000" stroke-width="1.8" fill="none" stroke-linecap="round"/>')
    for k in range(4):
        i = int(len(lb) * (0.45 + 0.15 * k))
        i = min(i, len(lb) - 1)
        p = lb[i]
        out.append(f'<line x1="{p[0]:.1f}" y1="{p[1]:.1f}" x2="{p[0] + outer_sign * 3:.1f}" y2="{p[1] + 6:.1f}" stroke="#000" stroke-width="1.3" stroke-linecap="round"/>')
    # inner corner hint
    ic = top[0]
    out.append(f'<path d="M {ic[0]:.1f} {ic[1]:.1f} q {-outer_sign * 6:.1f} {h * 0.25:.1f} {-outer_sign * 2:.1f} {h * 0.5:.1f}" stroke="#000" stroke-width="1.6" fill="none"/>')
    info = dict(cx=cx, cy=cy, w=w, h=h, inner_x=inner_x, outer_x=outer_x, top=top)
    return out, info


def brow_svg(e, outer_sign, rng):
    out = []
    y_inner = e['top'][:, 1].min() - e['h'] * 1.1
    p0 = np.array([e['inner_x'] - outer_sign * e['w'] * 0.05, y_inner + 2])
    p2 = np.array([e['outer_x'] + outer_sign * e['w'] * 0.18, y_inner + e['h'] * 0.15])
    p1 = 0.5 * (p0 + p2) + np.array([0, -e['h'] * 0.22])
    curve = bezier(p0, p1, p2, 40)
    for k in range(46):
        t = k / 45
        c = curve[min(39, int(t * 39))]
        thick = 1 - abs(t - 0.35) * 1.1
        L = 7 + 7 * max(0, thick)
        ang = np.radians(-90 + outer_sign * (60 + 25 * t)) + rng.normal(0, 0.08)
        off = rng.normal(0, 2.0)
        s = c + np.array([0, off])
        tip = s + L * np.array([np.cos(ang), np.sin(ang)])
        out.append(f'<line x1="{s[0]:.1f}" y1="{s[1]:.1f}" x2="{tip[0]:.1f}" y2="{tip[1]:.1f}" stroke="#000" stroke-width="{1.4 + 0.8 * max(0, thick):.1f}" stroke-linecap="round"/>')
    return out


def nose_svg(cx, tip_y):
    out = []
    # soft shadow under the tip, slightly to one side, and nostrils
    out.append(f'<path d="M {cx - 13:.1f} {tip_y + 6:.1f} q 13 9 26 0" stroke="#000" stroke-width="2.4" fill="none" stroke-linecap="round"/>')
    out.append(f'<path d="M {cx - 12:.1f} {tip_y + 9:.1f} q -4 -3 -2 -8" stroke="#000" stroke-width="2.2" fill="none" stroke-linecap="round"/>')
    out.append(f'<path d="M {cx + 12:.1f} {tip_y + 9:.1f} q 4 -3 2 -8" stroke="#000" stroke-width="2.2" fill="none" stroke-linecap="round"/>')
    out.append(f'<path d="M {cx + 9:.1f} {tip_y - 40:.1f} q 6 22 2 38" stroke="#000" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-dasharray="5 6"/>')
    return out


def lips_svg(upper, lower, rng):
    out = []
    ut, ub = contour(upper)
    lt, lb = contour(lower)
    ut, lb = smooth(ut, 9), smooth(lb, 9)
    # mouth line: between the lips, darker in the middle
    mid_cols = np.intersect1d(ub[:, 0], lt[:, 0])
    mouth = np.array([(c, 0.5 * (ub[ub[:, 0] == c][0, 1] + lt[lt[:, 0] == c][0, 1])) for c in mid_cols])
    mouth = smooth(mouth, 9)
    cx = mouth[:, 0].mean()
    half = (mouth[:, 0].max() - mouth[:, 0].min()) / 2
    n = len(mouth)
    thick = 1.6 + 3.2 * np.sin(np.linspace(0, np.pi, n)) ** 0.7
    top_e = mouth - np.stack([np.zeros(n), thick * 0.45], 1)
    bot_e = mouth + np.stack([np.zeros(n), thick * 0.55], 1)
    out.append(f'<path d="{path(np.concatenate([top_e, bot_e[::-1]]), True)}" fill="#000"/>')
    # corners lift slightly (a playful hint of a smile)
    for side in (-1, 1):
        p = mouth[0] if side < 0 else mouth[-1]
        out.append(f'<path d="M {p[0]:.1f} {p[1]:.1f} q {side * 5:.1f} -2 {side * 7:.1f} -6" stroke="#000" stroke-width="2" fill="none" stroke-linecap="round"/>')
    # upper lip: cupid's bow border (partial) and coral hatching
    bow = ut[(ut[:, 0] > cx - half * 0.55) & (ut[:, 0] < cx + half * 0.55)] + np.array([0, 2])
    out.append(f'<path d="{path(bow)}" stroke="#000" stroke-width="1.6" fill="none" stroke-linecap="round"/>')
    for k in range(5):
        x = cx - half * 0.32 + half * 0.64 * k / 4
        y0 = np.interp(x, ut[:, 0], ut[:, 1]) + 7
        y1 = min(y0 + 7, np.interp(x, mouth[:, 0], mouth[:, 1]) - 5)
        if y1 - y0 > 3:
            out.append(f'<line x1="{x:.1f}" y1="{y0:.1f}" x2="{x + 3:.1f}" y2="{y1:.1f}" stroke="#000" stroke-width="1.3" stroke-linecap="round"/>')
    # lower lip: soft border arc and shadow hatching below, with a gloss gap
    lo = lb[(lb[:, 0] > cx - half * 0.6) & (lb[:, 0] < cx + half * 0.6)] + np.array([0, 1])
    out.append(f'<path d="{path(lo)}" stroke="#000" stroke-width="2" fill="none" stroke-linecap="round"/>')
    for k in range(6):
        x = cx - half * 0.42 + half * 0.84 * k / 5
        if abs(x - cx) < half * 0.16:
            continue  # gloss highlight
        yb = np.interp(x, lb[:, 0], lb[:, 1])
        out.append(f'<line x1="{x:.1f}" y1="{yb - 11:.1f}" x2="{x + 3:.1f}" y2="{yb - 4:.1f}" stroke="#000" stroke-width="1.3" stroke-linecap="round"/>')
    # shadow under the lower lip
    sh = lo[int(len(lo) * 0.25):int(len(lo) * 0.75)] + np.array([0, 9])
    out.append(f'<path d="{path(sh)}" stroke="#000" stroke-width="1.4" fill="none" stroke-dasharray="6 5"/>')
    return out, mouth


def blush_svg(cx, cy, rng):
    out = []
    for k in range(6):
        x = cx - 30 + k * 11 + rng.normal(0, 1.2)
        y = cy + rng.normal(0, 1.5)
        out.append(f'<line x1="{x:.1f}" y1="{y + 7:.1f}" x2="{x + 7:.1f}" y2="{y - 7:.1f}" stroke="#000" stroke-width="2" stroke-linecap="round"/>')
    return out


def face_svg(ref_path, size=1024, seed=11, closeup=False):
    rng = np.random.default_rng(seed)
    eyes, upper, lower = masks(ref_path)
    left_img, right_img = split_eyes(eyes)
    parts = []
    # image-left eye is the character's right eye: its outer corner points left
    e_r, info_r = eye_svg(left_img, -1, rng, closeup)
    e_l, info_l = eye_svg(right_img, 1, rng, closeup)
    parts += e_r + e_l
    parts += brow_svg(info_r, -1, rng) + brow_svg(info_l, 1, rng)
    cx = 0.5 * (info_r['cx'] + info_l['cx'])
    lips, mouth = lips_svg(upper, lower, rng)
    tip_y = (1.58 - 1.452) / PROJ['size'] * size
    parts += nose_svg(cx, tip_y)
    parts += lips
    blush_y = 0.5 * (info_r['cy'] + tip_y) + 18
    parts += blush_svg(info_r['cx'] - 18, blush_y, rng) + blush_svg(info_l['cx'] + 18 - 0, blush_y, rng)
    body = '\n'.join(parts)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 1024 1024">'
            f'<rect width="1024" height="1024" fill="#fff"/>{body}</svg>')
