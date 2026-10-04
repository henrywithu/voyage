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
        alpha = np.ones((bh, T))
        for _ in range(rng.integers(2, 4)):
            c = rng.uniform(0.2, 0.8)
            wob = c + 0.025 * np.sin(u * rng.uniform(6, 12) + rng.uniform(0, 6))
            start = rng.uniform(0.45, 0.8)
            alpha[(np.abs(rows - wob) < 0.03) & (u > start)] = 0
        edges = np.sort(rng.uniform(0.15, 0.85, rng.integers(2, 4)))
        bounds = np.concatenate([[0], edges, [1]])
        for k in range(len(bounds) - 1):
            lo, hi = bounds[k], bounds[k + 1]
            mid = 0.5 * (lo + hi)
            end = rng.uniform(0.88, 1.0)
            half = 0.5 * (hi - lo) * np.clip((end - u) / 0.16, 0, 1) ** 0.7
            inside = (rows >= lo) & (rows <= hi)
            keep = np.abs(rows - mid) <= half
            alpha[np.broadcast_to(inside, alpha.shape) & ~keep] = 0
        alpha[(np.abs(rows - 0.5) > 0.48)[:, 0], :] = 0
        col = np.zeros((bh, T))
        # Sheen: 3-5 strokes in the crown band, tapered at both ends.
        for _ in range(rng.integers(3, 6)):
            c = rng.uniform(0.15, 0.85)
            a0 = rng.uniform(0.15, 0.2)
            a1 = a0 + rng.uniform(0.06, 0.12)
            prof = np.sin(np.pi * np.clip((u - a0) / (a1 - a0), 0, 1))
            wob = c + 0.015 * np.sin(u * rng.uniform(8, 14) + rng.uniform(0, 6))
            col[(np.abs(rows - wob) < 0.028 * prof) & (u > a0) & (u < a1)] = 1
        # A few fine flow lines lower down.
        for _ in range(rng.integers(1, 3)):
            c = rng.uniform(0.25, 0.75)
            a0 = rng.uniform(0.3, 0.55)
            a1 = a0 + rng.uniform(0.1, 0.25)
            prof = np.sin(np.pi * np.clip((u - a0) / (a1 - a0), 0, 1))
            col[(np.abs(rows - c) < 0.012 * prof) & (u > a0) & (u < a1)] = 1
        img[top:top + bh, :, :3] = (col * 255)[..., None]
        img[top:top + bh, :, 3] = alpha * 255
    return img


def build(src, out, seed=7):
    img = np.array(Image.open(src).convert('RGBA'))
    if img.shape[0] != T:
        img = np.array(Image.fromarray(img).resize((T, T)))
    img = hair_bands(img, np.random.default_rng(seed))
    Image.fromarray(img).save(out, optimize=True)


if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2])
