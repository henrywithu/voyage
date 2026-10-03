"""Minimal MakeHuman (CC0 hm08 base mesh + targets) loader.

Builds Chaewon's body from the public MakeHuman macro targets without the
MakeHuman application: female, 25 years, slim, East Asian, ideal proportions,
plus a handful of local shape targets.
"""
import os
import numpy as np

MH = os.environ.get('MAKEHUMAN_DATA', '/home/user/makehumancommunity/makehuman/makehuman/data')


def load_obj(path=os.path.join(MH, '3dobjs/base.obj')):
    verts, uvs, faces, fuvs, groups = [], [], [], [], []
    group = None
    for line in open(path):
        if line.startswith('v '):
            verts.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('vt '):
            uvs.append([float(x) for x in line.split()[1:3]])
        elif line.startswith('g '):
            group = line.split()[1]
        elif line.startswith('f '):
            parts = [p.split('/') for p in line.split()[1:]]
            faces.append([int(p[0]) - 1 for p in parts])
            fuvs.append([int(p[1]) - 1 if len(p) > 1 and p[1] else -1 for p in parts])
            groups.append(group)
    return np.array(verts), np.array(uvs), faces, fuvs, groups


_cache = {}


def target(rel):
    if rel in _cache:
        return _cache[rel]
    idx, d = [], []
    for line in open(os.path.join(MH, 'targets', rel)):
        if line.startswith('#') or not line.strip():
            continue
        p = line.split()
        idx.append(int(p[0]))
        d.append([float(x) for x in p[1:4]])
    _cache[rel] = (np.array(idx, int), np.array(d, float).reshape(-1, 3))
    return _cache[rel]


def apply(verts, rel, w):
    if abs(w) < 1e-6:
        return
    i, d = target(rel)
    if len(i):
        verts[i] += d * w


def macro(verts, gender=0.0, age=0.5, muscle=0.5, weight=0.5, height=0.5,
          proportions=0.5, asian=1.0, caucasian=0.0, african=0.0,
          cup=0.5, firmness=0.5):
    def three(v, lo, mid, hi):
        mx = max(0.0, v * 2 - 1)
        mn = max(0.0, 1 - v * 2)
        return {lo: mn, mid: 1 - mx - mn, hi: mx}
    genders = {'female': 1 - gender, 'male': gender}
    if age < 0.5:
        young = max(0.0, (age - 0.1875) * 3.2)
        ages = {'young': young, 'child': max(0.0, min(1.0, 5.333 * age) - young), 'baby': max(0.0, 1 - age * 5.333)}
    else:
        ages = {'young': 1 - max(0.0, age * 2 - 1), 'old': max(0.0, age * 2 - 1)}
    muscles = three(muscle, 'minmuscle', 'averagemuscle', 'maxmuscle')
    weights = three(weight, 'minweight', 'averageweight', 'maxweight')
    races = {'asian': asian, 'caucasian': caucasian, 'african': african}
    for g, gw in genders.items():
        for a, aw in ages.items():
            for r, rw in races.items():
                apply(verts, f'macrodetails/{r}-{g}-{a}.target', gw * aw * rw)
            for m, mw in muscles.items():
                for wt, ww in weights.items():
                    base = gw * aw * mw * ww
                    if base < 1e-6:
                        continue
                    apply(verts, f'macrodetails/universal-{g}-{a}-{m}-{wt}.target', base)
                    hmx, hmn = max(0.0, height * 2 - 1), max(0.0, 1 - height * 2)
                    apply(verts, f'macrodetails/height/{g}-{a}-{m}-{wt}-maxheight.target', base * hmx)
                    apply(verts, f'macrodetails/height/{g}-{a}-{m}-{wt}-minheight.target', base * hmn)
                    pi, pu = max(0.0, proportions * 2 - 1), max(0.0, 1 - proportions * 2)
                    apply(verts, f'macrodetails/proportions/{g}-{a}-{m}-{wt}-idealproportions.target', base * pi)
                    apply(verts, f'macrodetails/proportions/{g}-{a}-{m}-{wt}-uncommonproportions.target', base * pu)
                    if g == 'female':
                        cups = three(cup, 'mincup', 'averagecup', 'maxcup')
                        firms = three(firmness, 'minfirmness', 'averagefirmness', 'maxfirmness')
                        for c, cw in cups.items():
                            for f, fw in firms.items():
                                if c == 'averagecup' and f == 'averagefirmness':
                                    continue
                                rel = f'breast/{g}-{a}-{m}-{wt}-{c}-{f}.target'
                                if os.path.exists(os.path.join(MH, 'targets', rel)):
                                    apply(verts, rel, base * cw * fw)


def pair(verts, group, name, value, neg='decr', pos='incr'):
    """Apply a two-sided modifier such as torso/torso-scale-horiz-decr|incr."""
    if value < 0:
        apply(verts, f'{group}/{name}-{neg}.target', -value)
    elif value > 0:
        apply(verts, f'{group}/{name}-{pos}.target', value)


def build(**overrides):
    verts, uvs, faces, fuvs, groups = load_obj()
    params = dict(gender=0.0, age=0.5 * 23 / 25, muscle=0.42, weight=0.22, height=0.55,
                  proportions=1.0, asian=1.0, cup=0.55, firmness=0.7)
    params.update(overrides)
    macro(verts, **params)
    return verts, uvs, faces, fuvs, groups


CHAEWON_SHAPE = [
    # face: soft V-line, small refined nose, large eyes, full lips
    ('head', 'head-oval', 0.6, None, None),
    ('head', 'head-scale-vert', -0.15, 'decr', 'incr'),
    ('head', 'head-round', 0.25, None, None),
    ('eyes', 'l-eye-height1', 0.5, 'decr', 'incr'),
    ('eyes', 'r-eye-height1', 0.5, 'decr', 'incr'),
    ('eyes', 'l-eye-height3', 0.4, 'decr', 'incr'),
    ('eyes', 'r-eye-height3', 0.4, 'decr', 'incr'),
    ('eyes', 'l-eye-epicanthus', -0.3, 'in', 'out'),
    ('eyes', 'r-eye-epicanthus', -0.3, 'in', 'out'),
    ('head', 'head-scale-horiz', -0.12, 'decr', 'incr'),
    ('head', 'head-age', -0.4, 'decr', 'incr'),
    ('chin', 'chin-width', -0.45, 'decr', 'incr'),
    ('chin', 'chin-prominent', 0.15, 'decr', 'incr'),
    ('chin', 'chin-height', -0.35, 'decr', 'incr'),
    ('cheek', 'l-cheek-volume', -0.25, 'decr', 'incr'),
    ('cheek', 'r-cheek-volume', -0.25, 'decr', 'incr'),
    ('cheek', 'l-cheek-bones', -0.3, 'decr', 'incr'),
    ('cheek', 'r-cheek-bones', -0.3, 'decr', 'incr'),
    ('eyes', 'l-eye-scale', 0.8, 'decr', 'incr'),
    ('eyes', 'r-eye-scale', 0.8, 'decr', 'incr'),
    ('eyes', 'l-eye-height2', 0.6, 'decr', 'incr'),
    ('eyes', 'r-eye-height2', 0.6, 'decr', 'incr'),
    ('eyes', 'l-eye-bag', -0.5, 'decr', 'incr'),
    ('eyes', 'r-eye-bag', -0.5, 'decr', 'incr'),
    ('nose', 'nose-scale-horiz', -0.35, 'decr', 'incr'),
    ('nose', 'nose-scale-vert', -0.2, 'decr', 'incr'),
    ('nose', 'nose-point-width', -0.4, 'decr', 'incr'),
    ('nose', 'nose-nostrils-width', -0.35, 'decr', 'incr'),
    ('nose', 'nose-point', 0.25, 'down', 'up'),
    ('nose', 'nose-volume', -0.3, 'decr', 'incr'),
    ('mouth', 'mouth-scale-horiz', -0.12, 'decr', 'incr'),
    ('mouth', 'mouth-upperlip-volume', 0.45, 'decr', 'incr'),
    ('mouth', 'mouth-lowerlip-volume', 0.5, 'decr', 'incr'),
    ('mouth', 'mouth-cupidsbow', 0.5, 'decr', 'incr'),
    ('mouth', 'mouth-angles', 0.25, 'down', 'up'),
    ('forehead', 'forehead-scale-vert', -0.2, 'decr', 'incr'),
    ('neck', 'neck-scale-horiz', -0.2, 'decr', 'incr'),
    ('neck', 'neck-scale-vert', 0.0, 'decr', 'incr'),
    # body: slim waist, long legs, slender limbs
    ('measure', 'measure-waist-circ', -0.45, 'decr', 'incr'),
    ('measure', 'measure-thigh-circ', -0.2, 'decr', 'incr'),
    ('measure', 'measure-upperarm-circ', -0.2, 'decr', 'incr'),
    ('measure', 'measure-upperleg-height', 0.3, 'decr', 'incr'),
    ('measure', 'measure-lowerleg-height', 0.25, 'decr', 'incr'),
    ('measure', 'measure-shoulder-dist', -0.15, 'decr', 'incr'),
    ('hip', 'hip-scale-horiz', -0.05, 'decr', 'incr'),
    ('buttocks', 'buttocks-volume', 0.15, 'decr', 'incr'),
]


def build_chaewon(shape=None):
    verts, uvs, faces, fuvs, groups = build()
    for group, name, value, neg, pos in (shape or CHAEWON_SHAPE):
        if neg is None:
            apply(verts, f'{group}/{name}.target', value)
        else:
            pair(verts, group, name, value, neg, pos)
    return verts, uvs, faces, fuvs, groups
