"""Swap the saint in the loader animation for the Chaewon emblem.

The Lottie keeps its timing, rays and circles. Inside the figure composition
the line-art layer gets Chaewon's stroked paths (scripts/brand/emblem.py), and
both silhouette layers (the alpha matte and the dark backing that hides the
rays) get her outline.

Usage: python3 scripts/brand/build_loader.py [--preview out.svg]
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '../..')
sys.path.insert(0, HERE)
import emblem  # noqa: E402

LOADER = os.path.join(ROOT, 'public/assets/lottie/loader.json')
STROKE_W = 3.4


def parse(d):
    """SVG absolute M/L/C/Q/Z path -> list of subpaths [(points, closed)] where points are
    (vertex, in-tangent, out-tangent) in Lottie's relative-tangent form."""
    tokens = re.findall(r'[MLCQZ]|-?\d*\.?\d+', d)
    subpaths, cur, i, cmd = [], None, 0, None
    pos = (0.0, 0.0)

    def num():
        nonlocal i
        v = float(tokens[i])
        i += 1
        return v

    while i < len(tokens):
        t = tokens[i]
        if t in 'MLCQZ':
            cmd = t
            i += 1
            if cmd == 'Z':
                if cur:
                    # Merge a closing vertex that repeats the start.
                    if len(cur['v']) > 1 and abs(cur['v'][-1][0] - cur['v'][0][0]) < 1e-6 and \
                            abs(cur['v'][-1][1] - cur['v'][0][1]) < 1e-6:
                        cur['i'][0] = cur['i'][-1]
                        for k in 'vio':
                            cur[k].pop()
                    cur['c'] = True
                    subpaths.append(cur)
                    cur = None
                continue
        if cmd == 'M':
            if cur:
                subpaths.append(cur)
            pos = (num(), num())
            cur = {'v': [pos], 'i': [(0, 0)], 'o': [(0, 0)], 'c': False}
            cmd = 'L'
        elif cmd == 'L':
            pos = (num(), num())
            cur['v'].append(pos)
            cur['i'].append((0, 0))
            cur['o'].append((0, 0))
        elif cmd in 'CQ':
            if cmd == 'C':
                c1, c2, end = (num(), num()), (num(), num()), (num(), num())
            else:
                q, end = (num(), num()), (num(), num())
                c1 = (pos[0] + 2 / 3 * (q[0] - pos[0]), pos[1] + 2 / 3 * (q[1] - pos[1]))
                c2 = (end[0] + 2 / 3 * (q[0] - end[0]), end[1] + 2 / 3 * (q[1] - end[1]))
            cur['o'][-1] = (c1[0] - pos[0], c1[1] - pos[1])
            cur['v'].append(end)
            cur['i'].append((c2[0] - end[0], c2[1] - end[1]))
            cur['o'].append((0, 0))
            pos = end
    if cur:
        subpaths.append(cur)
    return subpaths


def r3(p):
    return [round(p[0], 3), round(p[1], 3)]


def lottie_path(sp, index):
    return {'ind': index, 'ty': 'sh', 'ix': index + 1, 'nm': 'Path %d' % (index + 1), 'mn': 'ADBE Vector Shape - Group',
            'hd': False, 'ks': {'a': 0, 'ix': 2, 'k': {'i': [r3(p) for p in sp['i']], 'o': [r3(p) for p in sp['o']],
                                                      'v': [r3(p) for p in sp['v']], 'c': sp['c']}}}


def transform():
    return {'ty': 'tr', 'nm': 'Transform', 'p': {'a': 0, 'k': [0, 0], 'ix': 2}, 'a': {'a': 0, 'k': [0, 0], 'ix': 1},
            's': {'a': 0, 'k': [100, 100], 'ix': 3}, 'r': {'a': 0, 'k': 0, 'ix': 6}, 'o': {'a': 0, 'k': 100, 'ix': 7},
            'sk': {'a': 0, 'k': 0, 'ix': 4}, 'sa': {'a': 0, 'k': 0, 'ix': 5}}


def circle(cx, cy, r):
    k = 0.5523 * r
    return 'M%g %g C%g %g %g %g %g %g C%g %g %g %g %g %g C%g %g %g %g %g %g C%g %g %g %g %g %g Z' % (
        cx, cy - r, cx + k, cy - r, cx + r, cy - k, cx + r, cy, cx + r, cy + k, cx + k, cy + r, cx, cy + r,
        cx - k, cy + r, cx - r, cy + k, cx - r, cy, cx - r, cy - k, cx - k, cy - r, cx, cy - r)


def line_group():
    paths = []
    for d in emblem.STROKE:
        paths += parse(d)
    items = [lottie_path(sp, k) for k, sp in enumerate(paths)]
    items.append({'ty': 'st', 'nm': 'Stroke 1', 'mn': 'ADBE Vector Graphic - Stroke', 'hd': False, 'bm': 0,
                  'c': {'a': 0, 'k': [1, 1, 1, 1], 'ix': 3}, 'o': {'a': 0, 'k': 100, 'ix': 4},
                  'w': {'a': 0, 'k': STROKE_W, 'ix': 5}, 'lc': 2, 'lj': 2})
    items.append(transform())
    dots = [lottie_path(sp, k) for k, sp in enumerate(sum((parse(circle(*c)) for c in emblem.DOTS), []))]
    dots.append({'ty': 'fl', 'nm': 'Fill 1', 'mn': 'ADBE Vector Graphic - Fill', 'hd': False, 'bm': 0, 'r': 1,
                 'c': {'a': 0, 'k': [1, 1, 1, 1], 'ix': 4}, 'o': {'a': 0, 'k': 100, 'ix': 5}})
    dots.append(transform())
    return [{'ty': 'gr', 'nm': 'Chaewon lines', 'np': len(items), 'cix': 2, 'bm': 0, 'ix': 1, 'hd': False,
             'mn': 'ADBE Vector Group', 'it': items},
            {'ty': 'gr', 'nm': 'Chaewon dots', 'np': len(dots), 'cix': 2, 'bm': 0, 'ix': 2, 'hd': False,
             'mn': 'ADBE Vector Group', 'it': dots}]


def set_silhouette(layer, grow):
    """Replace the mask layer's single path with the silhouette (scaled about its centre by `grow`)."""
    sp = parse(emblem.SILHOUETTE)[0]
    cx, cy = 200, 230
    sp = {'v': [(cx + (x - cx) * grow, cy + (y - cy) * grow) for x, y in sp['v']],
          'i': [(x * grow, y * grow) for x, y in sp['i']], 'o': [(x * grow, y * grow) for x, y in sp['o']], 'c': True}
    for item in layer['shapes'][0]['it']:
        if item['ty'] == 'sh':
            item['ks']['k'] = lottie_path(sp, 0)['ks']['k']


def preview_svg():
    rays = ''.join('<line x1="200" y1="200" x2="%g" y2="%g" stroke="#fff" stroke-width="2"/>' % (
        200 + 200 * __import__('math').cos(a / 24 * 6.2832), 200 + 200 * __import__('math').sin(a / 24 * 6.2832))
        for a in range(24))
    lines = ''.join('<path d="%s"/>' % d for d in emblem.STROKE)
    dots = ''.join('<circle cx="%g" cy="%g" r="%g"/>' % c for c in emblem.DOTS)
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 400 400">'
            '<rect width="400" height="400" fill="#1d1d1d"/><clipPath id="c"><circle cx="200" cy="200" r="196"/>'
            '</clipPath><g clip-path="url(#c)">%s<path d="%s" fill="#1d1d1d"/>'
            '<g fill="none" stroke="#fff" stroke-width="%g" stroke-linecap="round" stroke-linejoin="round">%s</g>'
            '<g fill="#fff">%s</g></g><circle cx="200" cy="200" r="196" fill="none" stroke="#fff" stroke-width="3"/>'
            '</svg>') % (rays, emblem.SILHOUETTE, STROKE_W, lines, dots)


def main():
    d = json.load(open(LOADER))
    comp = next(a for a in d['assets'] if a['id'] == 'comp_0')
    comp['nm'] = 'Chaewon'
    for layer in comp['layers']:
        if layer['nm'] == 'Saint':
            layer['shapes'] = line_group()
        elif layer['nm'] == 'Saint mask':
            set_silhouette(layer, 1.04)
        elif layer['nm'] == 'Saint mask 2':
            set_silhouette(layer, 0.99)
        layer['nm'] = layer['nm'].replace('Saint', 'Chaewon')
    for layer in d['layers']:
        layer['nm'] = layer['nm'].replace('Saint', 'Chaewon')
    json.dump(d, open(LOADER, 'w'), separators=(',', ':'))


if __name__ == '__main__':
    if '--preview' in sys.argv:
        open(sys.argv[sys.argv.index('--preview') + 1], 'w').write(preview_svg())
    else:
        main()
