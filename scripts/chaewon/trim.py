"""Chaewon's trim texture: an all-over lace field, the v1 trim's scalloped bands, and manga hair strands.

Hair bands (v 0.10-0.30, 8 sub-bands; u runs root -> tip): solid ink strands
with soft separations toward the tips, tapered ends, and a glossy sheen: broken
white highlight strokes concentrated at u 0.08-0.22, which lands on the crown
and reads as the 'angel ring' of sleek straight hair.
"""
import sys

import numpy as np
from PIL import Image

T = 2048
BANDS = 8


def vrow(v):
    return int(round((1 - v) * T))


def hair_bands(img, rng):
    y0, y1 = vrow(0.30), vrow(0.10)
    bh = (y1 - y0) // BANDS
    u = np.linspace(0, 1, T)[None, :]
    for b in range(BANDS):
        top = y0 + b * bh
        rows = (np.arange(bh)[:, None] + 0.5) / bh
        # A lock reads as one mass of ink (its pointed shape comes from the geometry); only the last few
        # percent fray into two or three points.
        alpha = np.ones((bh, T))
        edges = np.sort(rng.uniform(0.25, 0.75, rng.integers(1, 3)))
        bounds = np.concatenate([[0], edges, [1]])
        for k in range(len(bounds) - 1):
            lo, hi = bounds[k], bounds[k + 1]
            mid = 0.5 * (lo + hi)
            end = rng.uniform(0.97, 1.0)
            half = 0.5 * (hi - lo) * np.clip((end - u) / 0.07, 0, 1) ** 0.6
            inside = (rows >= lo) & (rows <= hi)
            keep = np.abs(rows - mid) <= half
            alpha[np.broadcast_to(inside, alpha.shape) & ~keep] = 0
        alpha[(np.abs(rows - 0.5) > 0.48)[:, 0], :] = 0
        col = np.zeros((bh, T))
        # Sheen: 6-8 strokes in the crown band, tapered at both ends (the 'angel ring').
        for _ in range(rng.integers(6, 9)):
            c = rng.uniform(0.12, 0.88)
            a0 = rng.uniform(0.15, 0.2)
            a1 = a0 + rng.uniform(0.07, 0.12)
            prof = np.sin(np.pi * np.clip((u - a0) / (a1 - a0), 0, 1))
            wob = c + 0.015 * np.sin(u * rng.uniform(8, 14) + rng.uniform(0, 6))
            col[(np.abs(rows - wob) < 0.07 * prof) & (u > a0) & (u < a1)] = 1
        # Fine flow lines along the lock (the strands of a manga lock), longer and fainter lower down.
        for _ in range(rng.integers(2, 4)):
            c = rng.uniform(0.15, 0.85)
            a0 = rng.uniform(0.3, 0.6)
            a1 = min(a0 + rng.uniform(0.15, 0.35), 0.97)
            prof = np.sin(np.pi * np.clip((u - a0) / (a1 - a0), 0, 1))
            wob = c + 0.01 * np.sin(u * rng.uniform(6, 12) + rng.uniform(0, 6))
            col[(np.abs(rows - wob) < 0.03 * prof) & (u > a0) & (u < a1)] = 1
        img[top:top + bh, :, :3] = (col * 255)[..., None]
        img[top:top + bh, :, 3] = alpha * 255
    return img


def flower(x, y, r, rng):
    """A lace appliqué flower: five rounded petals filled white with bold outlines and a few veins,
    a ringed centre with seed dots."""
    out = []
    rot = rng.uniform(0, 2 * np.pi)
    n = 5
    for k in range(n):
        a = rot + 2 * np.pi * k / n + rng.normal(0, 0.06)
        L = r * rng.uniform(0.92, 1.05)
        # Petal: a rounded teardrop from the centre outward.
        tip = (x + np.cos(a) * L, y + np.sin(a) * L)
        side = 0.62 * L
        c1 = (x + np.cos(a - 0.55) * side * 1.25, y + np.sin(a - 0.55) * side * 1.25)
        c2 = (x + np.cos(a + 0.55) * side * 1.25, y + np.sin(a + 0.55) * side * 1.25)
        t1 = (tip[0] + np.cos(a - 1.4) * 0.3 * L, tip[1] + np.sin(a - 1.4) * 0.3 * L)
        t2 = (tip[0] + np.cos(a + 1.4) * 0.3 * L, tip[1] + np.sin(a + 1.4) * 0.3 * L)
        d = ('M %.1f %.1f C %.1f %.1f %.1f %.1f %.1f %.1f C %.1f %.1f %.1f %.1f %.1f %.1f Z' %
             (x, y, c1[0], c1[1], t1[0], t1[1], tip[0], tip[1], t2[0], t2[1], c2[0], c2[1], x, y))
        out.append('<path d="%s" fill="#fff" stroke="#000" stroke-width="%.1f" stroke-linejoin="round"/>' % (d, 0.05 * r))
        for j in (-1, 0, 1):
            b = a + j * 0.2
            r0, r1 = 0.3 * L, (0.72 if j == 0 else 0.6) * L
            out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#000" stroke-width="%.1f" stroke-linecap="round"/>' % (
                x + np.cos(b) * r0, y + np.sin(b) * r0, x + np.cos(b) * r1, y + np.sin(b) * r1, 0.022 * r))
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#fff" stroke="#000" stroke-width="%.1f"/>' % (x, y, 0.22 * r, 0.045 * r))
    for k in range(6):
        a = 2 * np.pi * k / 6
        out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="#000" stroke-width="%.1f"/>' % (
            x + np.cos(a) * 0.11 * r, y + np.sin(a) * 0.11 * r, 0.03 * r, 0.018 * r))
    return out


def leaf(x, y, a, L, w=0.36):
    """A slender lace leaf: outline and midrib, from (x, y) pointing along angle a (radians)."""
    c, s_ = np.cos(a), np.sin(a)
    def P(u, v):
        return x + c * u - s_ * v, y + s_ * u + c * v
    tip = P(L, 0)
    l1, l2 = P(0.35 * L, w * L), P(0.75 * L, 0.6 * w * L)
    r1, r2 = P(0.35 * L, -w * L), P(0.75 * L, -0.6 * w * L)
    d = 'M %.1f %.1f C %.1f %.1f %.1f %.1f %.1f %.1f C %.1f %.1f %.1f %.1f %.1f %.1f Z' % (
        x, y, *l1, *l2, *tip, *r2, *r1, x, y)
    m0, m1 = P(0.1 * L, 0), P(0.85 * L, 0)
    return ['<path d="%s" fill="#fff" stroke="#000" stroke-width="2.0" stroke-linejoin="round"/>' % d,
            '<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#000" stroke-width="1.1" stroke-linecap="round"/>' % (*m0, *m1)]


def bloom(x, y, r, rng):
    """A lace flower: six scalloped petals (each outlined, with a few fine veins), a ringed centre."""
    out = []
    rot = rng.uniform(0, 2 * np.pi)
    n = 6
    for k in range(n):
        a = rot + 2 * np.pi * k / n + rng.normal(0, 0.05)
        L = r * rng.uniform(0.9, 1.05)
        half = np.pi / n * 0.95
        # Petal: from the centre out to a scalloped rim (two small lobes).
        p0 = (x + np.cos(a - half) * 0.28 * r, y + np.sin(a - half) * 0.28 * r)
        p3 = (x + np.cos(a + half) * 0.28 * r, y + np.sin(a + half) * 0.28 * r)
        e1 = (x + np.cos(a - half * 0.95) * L, y + np.sin(a - half * 0.95) * L)
        e2 = (x + np.cos(a) * L * 1.04, y + np.sin(a) * L * 1.04)
        e3 = (x + np.cos(a + half * 0.95) * L, y + np.sin(a + half * 0.95) * L)
        mid1 = (x + np.cos(a - half * 0.5) * L * 1.12, y + np.sin(a - half * 0.5) * L * 1.12)
        mid2 = (x + np.cos(a + half * 0.5) * L * 1.12, y + np.sin(a + half * 0.5) * L * 1.12)
        d = ('M %.1f %.1f L %.1f %.1f Q %.1f %.1f %.1f %.1f Q %.1f %.1f %.1f %.1f L %.1f %.1f Z' %
             (*p0, *e1, *mid1, *e2, *mid2, *e3, *p3))
        out.append('<path d="%s" fill="#fff" stroke="#000" stroke-width="%.1f" stroke-linejoin="round"/>' % (d, 0.055 * r))
        for j in (-1, 0, 1):
            b = a + j * half * 0.45
            r0, r1 = 0.36 * r, (0.8 if j == 0 else 0.68) * L
            out.append('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="#000" stroke-width="%.1f" stroke-linecap="round"/>' % (
                x + np.cos(b) * r0, y + np.sin(b) * r0, x + np.cos(b) * r1, y + np.sin(b) * r1, 0.028 * r))
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#fff" stroke="#000" stroke-width="%.1f"/>' % (x, y, 0.26 * r, 0.05 * r))
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="none" stroke="#000" stroke-width="%.1f"/>' % (x, y, 0.13 * r, 0.035 * r))
    return out


def spray(x, y, r, rng):
    """A lace spray: a flower with a curving stem, leaves along it and a bud at its end."""
    out = []
    a = rng.uniform(0, 2 * np.pi)
    for side in (-1, 1):
        # A stem curling out from the flower, leaves on alternate sides, a bud at the tip.
        b = a + (0 if side > 0 else np.pi) + rng.normal(0, 0.3)
        L = r * rng.uniform(1.9, 2.4)
        bend = side * r * rng.uniform(0.5, 0.9)
        p0 = np.array([x + np.cos(b) * 0.9 * r, y + np.sin(b) * 0.9 * r])
        p2 = p0 + np.array([np.cos(b), np.sin(b)]) * L
        nrm = np.array([-np.sin(b), np.cos(b)])
        p1 = (p0 + p2) / 2 + nrm * bend
        out.append('<path d="M %.1f %.1f Q %.1f %.1f %.1f %.1f" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round"/>' % (
            *p0, *p1, *p2))
        for t, sg in ((0.3, 1), (0.55, -1), (0.8, 1)):
            q = (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2
            dq = 2 * (1 - t) * (p1 - p0) + 2 * t * (p2 - p1)
            ang = np.arctan2(dq[1], dq[0]) + sg * 0.75
            out += leaf(q[0], q[1], ang, r * rng.uniform(0.55, 0.75))
        out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#fff" stroke="#000" stroke-width="1.8" '
                   'transform="rotate(%.1f %.1f %.1f)"/>' % (*p2, 0.22 * r, 0.14 * r, np.degrees(b), *p2))
    out += bloom(x, y, r, rng)
    return out


def lace_svg(w, h, seed=13, squash=1.0):
    """The lace field (tiles in u): a fine tulle net with an all-over pattern of lace sprays (flowers on curving
    stems with leaves and buds), tone on tone. Drawn in fabric space and squashed by `squash` in v, so on the
    dress (whose uvs stretch v by 1/squash) the flowers are round."""
    rng = np.random.default_rng(seed)
    H = h / squash
    out = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (w, h, w, h),
           '<rect width="%d" height="%d" fill="#fff"/>' % (w, h),
           '<g transform="scale(1 %.4f)">' % squash]
    # Tulle: a fine hexagonal net (reads as a faint grain between the sprays).
    step = 12
    for ang in (0, 60, 120):
        out.append('<g transform="rotate(%d %d %d)">' % (ang, w // 2, int(H // 2)))
        for k in range(-2 * w, 3 * w, step):
            out.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#000" stroke-width="0.7"/>' % (k, -2 * w, k, 3 * w))
        out.append('</g>')
    # Sprays on a jittered, staggered grid (wrapping in u).
    sx, sy_ = 170, 150
    cols = w // sx
    rows = int(H // sy_) + 1
    for j in range(rows):
        for i in range(cols):
            x = (i + 0.5 * (j % 2)) * (w / cols) + rng.normal(0, 14)
            y = (j + 0.5) * sy_ + rng.normal(0, 12)
            r = rng.uniform(24, 32)
            sub = np.random.default_rng(int(1000 * j + i))
            motif = spray(0, 0, r, sub)
            for dx in (-w, 0, w):
                out.append('<g transform="translate(%.1f %.1f)">' % (x + dx, y))
                out += motif
                out.append('</g>')
    out.append('</g></svg>')
    return '\n'.join(out)


def build(src, out, seed=7):
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../character'))
    from svgrender import svg2png
    os.environ.setdefault('CHROMIUM_PATH', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    img = np.array(Image.open(src).convert('RGBA'))
    if img.shape[0] != T:
        img = np.array(Image.fromarray(img).resize((T, T)))
    # The allover lace (v 0.46-0.94), redrawn: proportioned for the dress's arc-length uvs.
    y0, y1 = vrow(0.94), vrow(0.46)
    tmp = out + '.lace.png'
    # (the dress's uvs stretch the field 1.62 times in v: dress.LACE_V spans its height, the tile LACE_TILE in u)
    svg2png(lace_svg(T, y1 - y0, squash=1 / 1.62), tmp, T, y1 - y0)
    lace = np.asarray(Image.open(tmp).convert('L'))
    os.remove(tmp)
    img[y0:y1, :, :3] = lace[..., None]
    img[y0:y1, :, 3] = 255
    img = hair_bands(img, np.random.default_rng(seed))
    Image.fromarray(img).save(out, optimize=True)


if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2])
