"""Rasterise SVG with Chromium via Playwright (node).

PW_DIR must contain node_modules/playwright (e.g. `npm i playwright` there);
CHROMIUM_PATH may point to a pre-installed Chromium executable.
"""
import os
import shutil
import subprocess
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
PW_DIR = os.environ.get('PW_DIR', os.path.join(HERE, 'build/pw'))


def svg2png(svg, out, w, h):
    runner = os.path.join(PW_DIR, 'svg2png.mjs')
    shutil.copyfile(os.path.join(HERE, 'svg2png.mjs'), runner)
    with tempfile.NamedTemporaryFile('w', suffix='.svg', delete=False) as f:
        f.write(svg)
        path = f.name
    try:
        subprocess.run(['node', runner, path, os.path.abspath(out), str(w), str(h)], check=True, cwd=PW_DIR)
    finally:
        os.remove(path)
