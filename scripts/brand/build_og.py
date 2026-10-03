"""Compose the 1200 x 630 social image from an engine render.

Capture with the dev server running (development exposes `window.__exp`):
  node scripts/brand/capture.mjs og.png CathedralScene+2.8 1600 840
Then: python3 scripts/brand/build_og.py og.png

The render sits on cream paper inside a ragged ink-splatter edge, with the
wordmark in the lower right corner, like Spirit's social card.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..')
OUT = os.path.join(ROOT, 'public/assets/social/trapnest-voyage-og.jpg')
FONT = os.path.join(ROOT, 'public/assets/fonts/CharlesRosie.woff')
W, H = 1200, 630


def fractal(shape, rng, octaves=5, base=6):
    out = np.zeros(shape)
    for o in range(octaves):
        cells = base * 2 ** o
        small = rng.standard_normal((cells, int(cells * shape[1] / shape[0]) + 1))
        big = np.array(Image.fromarray(small.astype(np.float32)).resize((shape[1], shape[0]), Image.BICUBIC))
        out += big / 2 ** o
    return out / np.abs(out).max()


def main(render):
    rng = np.random.default_rng(7)
    art = Image.open(render).convert('RGB')
    # Crop away the overlay strip at the bottom of the frame, then fit to the card.
    aw, ah = art.size
    art = art.crop((0, 0, aw, int(ah * 0.93)))
    scale = max(W / art.width, H / art.height)
    art = art.resize((int(art.width * scale + 0.5), int(art.height * scale + 0.5)), Image.LANCZOS)
    left = (art.width - W) // 2
    art = np.asarray(art.crop((left, 0, left + W, H))).astype(float) / 255

    # Paper.
    paper = np.ones((H, W, 3)) * np.array([239, 230, 210]) / 255
    grain = fractal((H, W), rng, 6, 20) * 0.025 + rng.standard_normal((H, W)) * 0.012
    paper = np.clip(paper + grain[..., None], 0, 1)

    # Ragged mask: a soft rounded box pushed around by fractal noise.
    y, x = np.mgrid[0:H, 0:W]
    dx = np.maximum(0, np.abs(x - W / 2) - (W / 2 - 120)) / 120
    dy = np.maximum(0, np.abs(y - H / 2) - (H / 2 - 95)) / 95
    box = 1 - np.sqrt(dx ** 2 + dy ** 2)
    noise = fractal((H, W), rng, 6, 5)
    mask = (box + noise * 0.55) > 0.32
    # Ink splatters around the edge.
    splat = np.zeros((H, W), bool)
    for _ in range(140):
        cx, cy = rng.uniform(0, W), rng.uniform(0, H)
        edge = box[int(min(cy, H - 1)), int(min(cx, W - 1))]
        if not 0.0 < edge < 0.6:
            continue
        r = rng.exponential(3.5) + 0.8
        splat |= (x - cx) ** 2 + (y - cy) ** 2 < r * r
    ink_edge = ndimage.binary_dilation(mask, iterations=3) & ~mask
    mask_f = ndimage.gaussian_filter(mask.astype(float), 0.8)
    out = paper * (1 - mask_f[..., None]) + art * mask_f[..., None]
    ink = np.array([18, 16, 14]) / 255
    edge_f = ndimage.gaussian_filter((ink_edge & (noise > -0.1)).astype(float), 0.7) * 0.85
    out = out * (1 - edge_f[..., None]) + ink * edge_f[..., None]
    splat_f = ndimage.gaussian_filter(splat.astype(float), 0.6)
    out = out * (1 - splat_f[..., None]) + ink * splat_f[..., None]

    img = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, 22, layout_engine=ImageFont.Layout.RAQM)
    text = 'TRAPNEST VOYAGE'
    tw = draw.textlength(text, font=font) + 2 * (len(text) - 1)
    xx = W - 34 - tw
    for ch in text:
        draw.text((xx, H - 44), ch, font=font, fill=(150, 98, 0))
        xx += draw.textlength(ch, font=font) + 2
    img = img.filter(ImageFilter.UnsharpMask(1.2, 40, 2))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT, quality=88, optimize=True, progressive=False)
    print(OUT, img.size)


if __name__ == '__main__':
    main(sys.argv[1])
