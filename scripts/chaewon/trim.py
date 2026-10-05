"""Chaewon's trim texture: Spirit-style lace bands (from the v1 trim) and new manga hair strands.

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


def lace_svg(w, h, seed=13):
    """The lace field (tiles in u): a fine hexagonal net with large flower appliqués and small leaves."""
    rng = np.random.default_rng(seed)
    out = ['<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' % (w, h, w, h),
           '<rect width="%d" height="%d" fill="#fff"/>' % (w, h)]
    # Net: three families of fine lines (a hexagonal tulle) - reads as a light tone between the flowers.
    step = 22
    for ang in (0, 60, 120):
        out.append('<g transform="rotate(%d %d %d)">' % (ang, w // 2, h // 2))
        for k in range(-w, 2 * w, step):
            out.append('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#000" stroke-width="0.8"/>' % (k, -w, k, 2 * w))
        out.append('</g>')
    # Flowers: big appliqués scattered without overlap (wrapping in u), with leaves in between.
    flowers = []
    for _ in range(4000):
        if len(flowers) >= 46:
            break
        x, y, r = rng.uniform(0, w), rng.uniform(50, h - 50), rng.uniform(38, 58)
        if all(min(abs(x - fx), w - abs(x - fx)) ** 2 + (y - fy) ** 2 > ((r + fr) * 1.05) ** 2 for fx, fy, fr in flowers):
            flowers.append((x, y, r))
    for x, y, r in flowers:
        for dx in (-w, 0, w):
            out += flower(x + dx, y, r, np.random.default_rng(int(x * 7 + y)))
    for _ in range(90):
        x, y = rng.uniform(0, w), rng.uniform(40, h - 40)
        if any(min(abs(x - fx), w - abs(x - fx)) ** 2 + (y - fy) ** 2 < (fr * 1.6) ** 2 for fx, fy, fr in flowers):
            continue
        # A leaf sprig: a fine stem with two or three slender leaves.
        a, L = rng.uniform(0, 360), rng.uniform(48, 70)
        for dx in (-w, 0, w):
            g = ['<g transform="translate(%.1f %.1f) rotate(%.1f)" fill="#fff" stroke="#000" stroke-width="2.4" '
                 'stroke-linejoin="round" stroke-linecap="round">' % (x + dx, y, a),
                 '<path d="M 0 0 Q %.1f %.1f %.1f 0" fill="none"/>' % (L * 0.5, -L * 0.12, L)]
            for t, sg in ((0.35, 1), (0.6, -1), (0.85, 1)):
                bx, ll = t * L, L * 0.42 * (1.15 - t * 0.5)
                g.append('<path d="M %.1f 0 Q %.1f %.1f %.1f %.1f Q %.1f %.1f %.1f 0 Z"/>' % (
                    bx, bx + ll * 0.2, sg * ll * 0.45, bx + ll * 0.75, sg * ll * 0.55, bx + ll * 0.55, sg * ll * 0.05, bx))
            g.append('</g>')
            out += g
    out.append('</svg>')
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
    svg2png(lace_svg(T, y1 - y0), tmp, T, y1 - y0)
    lace = np.asarray(Image.open(tmp).convert('L'))
    os.remove(tmp)
    img[y0:y1, :, :3] = lace[..., None]
    img[y0:y1, :, 3] = 255
    img = hair_bands(img, np.random.default_rng(seed))
    Image.fromarray(img).save(out, optimize=True)


if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2])
