"""Write the Trapnest Voyage logos, favicon and their PNG renders.

The emblem is the Trapnest compass rose shared with Spirit; the wordmark
reads VOYAGE, and the favicon carries the sunflower-yellow theme.

Usage: python3 scripts/brand/build_logos.py
"""
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..')
sys.path.insert(0, os.path.join(ROOT, 'scripts/character'))
from svgrender import svg2png  # noqa: E402

IMG = os.path.join(ROOT, 'public/assets/images')
YELLOW = '#f4bd28'
EMBLEM = 'M{c} 26v68M{l} 60h68M{a} 36l48 48M{b} 36L{a} 84M{c} 35l8 17 18 3-13 13 3 18-16-8-16 8 3-18-13-13 18-3z'


def logo(ink, wide=True):
    cx = 47 if wide else 42
    path = EMBLEM.format(c=cx, l=cx - 34, a=cx - 24, b=cx + 24)
    if wide:
        words = ('<text x="94" y="58" fill="{0}" font-family="Arial,Helvetica,sans-serif" font-size="31" '
                 'font-weight="700" letter-spacing="-1.5">Trapnest</text>\n'
                 '  <text x="96" y="83" fill="{0}" font-family="Arial,Helvetica,sans-serif" font-size="24" '
                 'letter-spacing="6">VOYAGE</text>').format(ink)
        box = '0 0 286 120'
    else:
        words = ('<text x="87" y="55" fill="{0}" font-family="Arial,Helvetica,sans-serif" font-size="18" '
                 'font-weight="700">Trapnest</text>\n'
                 '  <text x="88" y="75" fill="{0}" font-family="Arial,Helvetica,sans-serif" font-size="12" '
                 'letter-spacing="2.4">VOYAGE</text>').format(ink)
        box = '0 0 168 120'
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" role="img" aria-label="Trapnest Voyage">\n'
            '  <g fill="none" stroke="{ink}" stroke-width="2.2">\n'
            '    <circle cx="{cx}" cy="60" r="34"/><circle cx="{cx}" cy="60" r="25"/>\n'
            '    <path d="{path}"/>\n'
            '  </g>\n'
            '  {words}\n'
            '</svg>\n').format(box=box, ink=ink, cx=cx, path=path, words=words)


FAVICON = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="13" fill="#121212"/>
  <circle cx="32" cy="32" r="22" fill="none" stroke="{y}" stroke-width="3"/>
  <path d="M32 11v42M11 32h42M17 17l30 30M47 17L17 47" stroke="#f2ead8" stroke-width="2"/>
  <path d="M32 20l4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1z" fill="{y}" stroke="#f2ead8" stroke-width="1.3"/>
</svg>
'''.format(y=YELLOW)


def to_la(path):
    """Black ink with coverage alpha, like Spirit's grey+alpha logo PNGs.

    The rasteriser paints black ink on white, so coverage is 1 - luminance.
    """
    a = np.array(Image.open(path).convert('L')).astype(np.uint8)
    Image.fromarray(np.dstack([np.zeros_like(a), 255 - a]), 'LA').save(path, optimize=True)


if __name__ == '__main__':
    files = {
        'trapnest-voyage-logo.svg': logo('#000'),
        'trapnest-voyage-logo-mobile.svg': logo('#000', wide=False),
        'trapnest-voyage-logo-footer.svg': logo('#fff'),
    }
    for name, svg in files.items():
        open(os.path.join(IMG, name), 'w').write(svg)
    open(os.path.join(ROOT, 'public/assets/favicon/trapnest-voyage.svg'), 'w').write(FAVICON)
    for name, (w, h) in {'trapnest-voyage-logo': (286, 120), 'trapnest-voyage-logo-mobile': (168, 120)}.items():
        out = os.path.join(IMG, name + '.png')
        svg2png(files[name + '.svg'], out, w, h)
        to_la(out)
        print(out, Image.open(out).size)
