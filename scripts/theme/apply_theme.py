"""Re-colour Spirit's red palette to Voyage's sunflower yellow.

Run once over the copied Spirit sources (idempotent: yellows are left alone).
Mapping rules (HLS):
  * saturated reds with lightness >= 0.30  -> sunflower yellow (hue 44)
  * darker saturated reds                  -> deep ochre
  * explicit overrides for text colours that sit on white
"""
import colorsys
import json
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..')
HUE = 44 / 360
TEXT_ON_WHITE = '#c88e00'
HIGHLIGHT = '#db9600'


def remap_rgb(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    deg = h * 360
    if s < 0.35 or l < 0.06 or l > 0.92 or not (deg < 18 or deg > 340):
        return None
    if l >= 0.30:
        L, S = 0.50 + (l - 0.30) * 0.35, 0.90
    else:
        L, S = l * 1.05 + 0.02, min(1.0, s * 0.95)
    return colorsys.hls_to_rgb(HUE, L, S)


def hexmap(h):
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
    out = remap_rgb(r, g, b)
    if out is None:
        return h
    return '#' + ''.join(f'{round(c * 255):02x}' for c in out)


def fix_hex_text(s):
    return re.sub(r'#[0-9a-fA-F]{6}\b', lambda m: hexmap(m.group(0)), s)


def fix_json_value(v, key=''):
    if isinstance(v, str):
        return fix_hex_text(v)
    if isinstance(v, dict):
        if v.get('kind') == 'Color' and v.get('args'):
            a = v['args'][0]
            if isinstance(a, str):
                v['args'][0] = hexmap(a)
            elif isinstance(a, (int, float)) and len(v['args']) == 1:
                h = '#%06x' % int(a)
                v['args'][0] = int(hexmap(h)[1:], 16)
            elif len(v['args']) >= 3 and all(isinstance(x, (int, float)) for x in v['args'][:3]):
                out = remap_rgb(*v['args'][:3])
                if out:
                    v['args'][:3] = [round(c, 4) for c in out]
        return {k: fix_json_value(x, k) for k, x in v.items()}
    if isinstance(v, list):
        if 'color' in key.lower() and len(v) in (3, 4) and all(isinstance(x, (int, float)) for x in v) and max(v[:3]) <= 1:
            out = remap_rgb(*v[:3])
            if out:
                return [round(c, 4) for c in out] + list(v[3:])
        return [fix_json_value(x, key) for x in v]
    return v


def vec255(m):
    r, g, b = (float(m.group(i)) / 255 for i in (2, 3, 4))
    out = remap_rgb(r, g, b)
    if out is None:
        return m.group(0)
    R, G, B = (round(c * 255) for c in out)
    return f'{m.group(1)}({R} / 255, {G} / 255, {B} / 255)'


def fix_ts(s):
    s = fix_hex_text(s)
    return re.sub(r'(new THREE\.(?:Vector3|Color))\((\d+) / 255, (\d+) / 255, (\d+) / 255\)', vec255, s)


def main():
    for rel in ('src/data/scene-layouts.json', 'src/data/shader-defaults.json', 'src/data/ui-trees.json',
                'src/data/text3d.json', 'src/data/product-settings.json', 'src/data/shader-settings.json'):
        p = os.path.join(ROOT, rel)
        raw = open(p).read()
        d = json.loads(raw)
        if rel.endswith('text3d.json'):
            for k, v in d.items():
                if isinstance(v, dict) and str(v.get('color', '')).lower() == '#c82924':
                    v['color'] = TEXT_ON_WHITE
        d = fix_json_value(d)
        out = json.dumps(d, indent=2, ensure_ascii=False) + ('\n' if raw.endswith('\n') else '')
        open(p, 'w').write(out)
    for dirpath, _, files in os.walk(os.path.join(ROOT, 'src')):
        for f in files:
            if f.endswith(('.ts', '.tsx')):
                p = os.path.join(dirpath, f)
                s = open(p).read()
                t = fix_ts(s)
                if f == 'Narration.ts':
                    t = re.sub(r'uColorHighlight: new THREE\.Vector3\([^)]*\)',
                               'uColorHighlight: new THREE.Color("%s").convertLinearToSRGB()' % HIGHLIGHT, t)
                if t != s:
                    open(p, 'w').write(t)
    for f in ('src/styles/app.css', 'src/styles/reference.css'):
        p = os.path.join(ROOT, f)
        s = open(p).read()
        s = s.replace('.RetailUI .mobile-header-text{color:#c82924', '.RetailUI .mobile-header-text{color:%s' % TEXT_ON_WHITE)
        s = s.replace('.header-row-right{color:#c82924}', '.header-row-right{color:%s}' % TEXT_ON_WHITE)
        open(p, 'w').write(fix_hex_text(s))
    p = os.path.join(ROOT, 'public/assets/lottie/loader.json')
    s = open(p).read()
    y = remap_rgb(1, 0, 0)
    s = s.replace('"k":[1,0,0,1]', '"k":[%s,1]' % ','.join(f'{c:.4f}' for c in y))
    open(p, 'w').write(s)


if __name__ == '__main__':
    main()
