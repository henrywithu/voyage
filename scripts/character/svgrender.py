"""Rasterise SVG with the pre-installed Chromium via Playwright (node)."""
import os
import subprocess
import tempfile

PW_DIR = os.environ.get('PW_DIR', '/tmp/claude-0/-home-user/6e75d724-e254-5cdf-a5ba-f3692715f190/scratchpad/pw')


def svg2png(svg, out, w, h):
    with tempfile.NamedTemporaryFile('w', suffix='.svg', delete=False) as f:
        f.write(svg)
        path = f.name
    subprocess.run(['node', os.path.join(PW_DIR, 'svg2png.mjs'), path, os.path.abspath(out), str(w), str(h)],
                   check=True, cwd=PW_DIR)
    os.remove(path)
