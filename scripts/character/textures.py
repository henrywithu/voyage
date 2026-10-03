"""Chaewon texture set: line-art atlas (sampled via the atlas UV) and trim
(lace, scalloped bands, hair strands with alpha cut-outs).

Trim layout (v measured bottom -> top, like GL texture coordinates):
  0.00-0.05 plain white     0.05-0.10 solid black (hair cap)
  0.10-0.30 hair strands (8 sub-bands, root at u=0, tip at u=1)
  0.36-0.46 scalloped hem lace band (scallops at the bottom edge)
  0.46-0.94 allover floral lace (tiles in u)
  0.94-1.00 neckline lace edge (scallops at the top edge)
Atlas layout: skin when v > 0.55; head projection in u 0-0.45, v 0.56-1.0.
"""
import numpy as np

T = 2048
HAIR_BANDS = 8


def vrow(v):
    """GL v -> pixel row."""
    return (1 - v) * T


def lace_tile_svg(x0, y0, w, h, rng, density=1.0):
    """Floral lace motifs inside a rectangle; wraps horizontally."""
    out = []
    flowers = []
    n = int(9 * density * w / T * (h / 900) * 2.2) + 4
    for _ in range(n * 3):
        if len(flowers) >= n:
            break
        cx, cy = rng.uniform(0, w), rng.uniform(70, h - 70)
        r = rng.uniform(60, 105)
        if all(np.hypot(cx - fx, cy - fy) > (r + fr) * 0.95 for fx, fy, fr in flowers):
            flowers.append((cx, cy, r))
    for cx, cy, r in flowers:
        for dx in (-w, 0, w):
            x, y = x0 + cx + dx, y0 + cy
            petals = rng.integers(5, 7)
            rot = rng.uniform(0, np.pi)
            for k in range(petals):
                a = rot + 2 * np.pi * k / petals
                px, py = x + np.cos(a) * r * 0.55, y + np.sin(a) * r * 0.55
                out.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{r * 0.48:.1f}" ry="{r * 0.30:.1f}" '
                           f'transform="rotate({np.degrees(a):.1f} {px:.1f} {py:.1f})" fill="none" stroke="#000" stroke-width="4"/>')
                # petal veins
                for j in (-1, 0, 1):
                    b = a + j * 0.22
                    out.append(f'<line x1="{x + np.cos(b) * r * 0.22:.1f}" y1="{y + np.sin(b) * r * 0.22:.1f}" '
                               f'x2="{x + np.cos(b) * r * 0.78:.1f}" y2="{y + np.sin(b) * r * 0.78:.1f}" stroke="#000" stroke-width="2"/>')
            out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r * 0.18:.1f}" fill="none" stroke="#000" stroke-width="4"/>')
            for k in range(8):
                a = 2 * np.pi * k / 8
                out.append(f'<circle cx="{x + np.cos(a) * r * 0.1:.1f}" cy="{y + np.sin(a) * r * 0.1:.1f}" r="3" fill="#000"/>')
    # leaves and tendrils between flowers
    for _ in range(int(n * 2.5)):
        cx, cy = rng.uniform(0, w), rng.uniform(40, h - 40)
        if any(np.hypot(cx - fx, cy - fy) < fr * 1.05 for fx, fy, fr in flowers):
            continue
        a = rng.uniform(0, 2 * np.pi)
        L = rng.uniform(35, 60)
        for dx in (-w, 0, w):
            x, y = x0 + cx + dx, y0 + cy
            out.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{L:.1f}" ry="{L * 0.38:.1f}" transform="rotate({np.degrees(a):.1f} {x:.1f} {y:.1f})" '
                       f'fill="none" stroke="#000" stroke-width="3.5"/>')
            out.append(f'<line x1="{x - np.cos(a) * L:.1f}" y1="{y - np.sin(a) * L:.1f}" x2="{x + np.cos(a) * L:.1f}" y2="{y + np.sin(a) * L:.1f}" stroke="#000" stroke-width="2"/>')
    # fine net dots (tulle) in the background
    for _ in range(int(w * h / 900)):
        x, y = x0 + rng.uniform(0, w), y0 + rng.uniform(0, h)
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.6" fill="#000"/>')
    return out


def scallop_band_svg(y_top, y_bot, edge='bottom', count=48, rng=None):
    """Opaque white band with scalloped edge (outside scallops transparent)."""
    h = y_bot - y_top
    w = T / count
    pts = []
    if edge == 'bottom':
        d = f'M 0 {y_top:.1f} L {T} {y_top:.1f} '
        for k in range(count, 0, -1):
            x1, x0 = k * w, (k - 1) * w
            d += f'L {x1:.1f} {y_bot - h * 0.35:.1f} A {w / 2:.1f} {h * 0.35:.1f} 0 0 1 {x0:.1f} {y_bot - h * 0.35:.1f} '
        d += 'Z'
        holes_y = y_bot - h * 0.42
        line_y = y_top + h * 0.22
    else:
        d = f'M 0 {y_bot:.1f} L {T} {y_bot:.1f} '
        for k in range(count, 0, -1):
            x1, x0 = k * w, (k - 1) * w
            d += f'L {x1:.1f} {y_top + h * 0.35:.1f} A {w / 2:.1f} {h * 0.35:.1f} 0 0 0 {x0:.1f} {y_top + h * 0.35:.1f} '
        d += 'Z'
        holes_y = y_top + h * 0.45
        line_y = y_bot - h * 0.2
    out = [f'<path d="{d}" fill="#fff"/>']
    for k in range(count):
        cx = (k + 0.5) * w
        out.append(f'<circle cx="{cx:.1f}" cy="{holes_y:.1f}" r="{min(w, h) * 0.13:.1f}" fill="none" stroke="#000" stroke-width="3"/>')
        out.append(f'<circle cx="{cx:.1f}" cy="{holes_y:.1f}" r="{min(w, h) * 0.06:.1f}" fill="#000"/>')
    out.append(f'<line x1="0" y1="{line_y:.1f}" x2="{T}" y2="{line_y:.1f}" stroke="#000" stroke-width="3"/>')
    # scallop outlines
    out.append(f'<path d="{d}" fill="none" stroke="#000" stroke-width="4"/>')
    return out


def hair_bands(img_rgba, rng):
    """Paint the hair strand sub-bands directly with numpy (alpha + highlights)."""
    y0 = int(vrow(0.30))
    y1 = int(vrow(0.10))
    bh = (y1 - y0) // HAIR_BANDS
    u = np.linspace(0, 1, T)[None, :]
    for b in range(HAIR_BANDS):
        top = y0 + b * bh
        rows = np.arange(bh)[:, None] / bh
        alpha = np.ones((bh, T))
        # strand separations: thin transparent gaps running along u
        n_gap = rng.integers(3, 6)
        for _ in range(n_gap):
            c = rng.uniform(0.15, 0.85)
            wob = c + 0.03 * np.sin(u * rng.uniform(6, 14) + rng.uniform(0, 6))
            start = rng.uniform(0.25, 0.7)
            gap = (np.abs(rows - wob) < 0.035) & (u > start)
            alpha[gap] = 0
        # tapered tips: each sub-strand ends at its own length
        edges = np.sort(rng.uniform(0, 1, rng.integers(3, 5)))
        bounds = np.concatenate([[0], edges, [1]])
        for k in range(len(bounds) - 1):
            lo, hi = bounds[k], bounds[k + 1]
            mid = 0.5 * (lo + hi)
            end = rng.uniform(0.86, 1.0)
            half = 0.5 * (hi - lo) * np.clip((end - u) / 0.14, 0, 1)
            inside = (rows >= lo) & (rows <= hi)
            keep = np.abs(rows - mid) <= half
            alpha[np.broadcast_to(inside, alpha.shape) & ~keep] = 0
        # side edges of the card are soft/transparent so cards blend
        alpha[(np.abs(rows - 0.5) > 0.47)[:, 0], :] = 0
        col = np.zeros((bh, T))
        # white shine lines along the strand flow
        for _ in range(rng.integers(2, 5)):
            c = rng.uniform(0.2, 0.8)
            a0 = rng.uniform(0.05, 0.45)
            a1 = a0 + rng.uniform(0.12, 0.4)
            wob = c + 0.02 * np.sin(u * rng.uniform(5, 11) + rng.uniform(0, 6))
            line = (np.abs(rows - wob) < 0.012 + 0.008 * np.sin(np.pi * np.clip((u - a0) / (a1 - a0), 0, 1))) & (u > a0) & (u < a1)
            col[line] = 1
        img_rgba[top:top + bh, :, 0] = col * 255
        img_rgba[top:top + bh, :, 1] = col * 255
        img_rgba[top:top + bh, :, 2] = col * 255
        img_rgba[top:top + bh, :, 3] = alpha * 255
    return img_rgba


def trim_svg(seed=21):
    rng = np.random.default_rng(seed)
    parts = [f'<rect x="0" y="0" width="{T}" height="{T}" fill="#fff"/>']
    # allover lace 0.46-0.94
    ya, yb = vrow(0.94), vrow(0.46)
    parts += lace_tile_svg(0, ya, T, yb - ya, rng)
    # hem band 0.36-0.46 (scallops at bottom); neckline band 0.94-1.0 (scallops at top)
    parts.append(f'<rect x="0" y="{vrow(0.46):.1f}" width="{T}" height="{vrow(0.36) - vrow(0.46):.1f}" fill="#000" fill-opacity="0"/>')
    parts += scallop_band_svg(vrow(0.46), vrow(0.36), 'bottom', 40)
    parts += scallop_band_svg(vrow(1.0) + 2, vrow(0.94), 'top', 64)
    # black (hair cap) 0.05-0.10
    parts.append(f'<rect x="0" y="{vrow(0.10):.1f}" width="{T}" height="{vrow(0.05) - vrow(0.10):.1f}" fill="#000"/>')
    body = '\n'.join(parts)
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{T}" height="{T}" viewBox="0 0 {T} {T}">{body}</svg>'


def write_textures(out_dir, face_png, svg2png):
    """svg2png(svg_text, path, w, h) renders an SVG to PNG."""
    import os
    from PIL import Image
    os.makedirs(out_dir, exist_ok=True)
    # --- trim colour pass
    tmp_c = os.path.join(out_dir, '_trim_color.png')
    svg2png(trim_svg(), tmp_c, T, T)
    # --- trim alpha pass: opaque everywhere except outside scallops and the
    # spare 0.30-0.36 strip
    alpha_svg = trim_alpha_svg()
    tmp_a = os.path.join(out_dir, '_trim_alpha.png')
    svg2png(alpha_svg, tmp_a, T, T)
    c = np.asarray(Image.open(tmp_c).convert('RGB'))
    a = np.asarray(Image.open(tmp_a).convert('L'))
    rgba = np.dstack([c, a]).astype(np.uint8)
    rgba = hair_bands(rgba.astype(np.float32), np.random.default_rng(9)).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(out_dir, 'chaewon_trim.png'), optimize=True)
    os.remove(tmp_c); os.remove(tmp_a)
    # --- atlas
    face = Image.open(face_png).convert('L')
    size = int(0.45 * T)
    atlas = Image.new('L', (T, T), 255)
    atlas.paste(face.resize((size, size), Image.LANCZOS), (0, 0))
    atlas.convert('RGB').save(os.path.join(out_dir, 'chaewon_atlas.png'), optimize=True)


def trim_alpha_svg():
    parts = [f'<rect x="0" y="0" width="{T}" height="{T}" fill="#fff"/>']
    # spare strip transparent
    parts.append(f'<rect x="0" y="{vrow(0.36):.1f}" width="{T}" height="{vrow(0.30) - vrow(0.36):.1f}" fill="#000"/>')
    # hem band: transparent below scallops
    for (yt, yb, edge, count) in ((vrow(0.46), vrow(0.36), 'bottom', 40), (vrow(1.0) + 2, vrow(0.94), 'top', 64)):
        h = yb - yt
        w = T / count
        if edge == 'bottom':
            parts.append(f'<rect x="0" y="{yb - h * 0.36:.1f}" width="{T}" height="{h * 0.36 + 1:.1f}" fill="#000"/>')
            for k in range(count):
                cx = (k + 0.5) * w
                parts.append(f'<ellipse cx="{cx:.1f}" cy="{yb - h * 0.35:.1f}" rx="{w / 2:.1f}" ry="{h * 0.35:.1f}" fill="#fff"/>')
        else:
            parts.append(f'<rect x="0" y="{yt - 2:.1f}" width="{T}" height="{h * 0.36 + 2:.1f}" fill="#000"/>')
            for k in range(count):
                cx = (k + 0.5) * w
                parts.append(f'<ellipse cx="{cx:.1f}" cy="{yt + h * 0.35:.1f}" rx="{w / 2:.1f}" ry="{h * 0.35:.1f}" fill="#fff"/>')
    body = '\n'.join(parts)
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{T}" height="{T}" viewBox="0 0 {T} {T}">{body}</svg>'
