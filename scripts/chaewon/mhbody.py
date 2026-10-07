"""Chaewon's body from the CC0 MakeHuman hm08 base mesh, without the MakeHuman app.

Shape: macro targets (female, early twenties, East Asian, slim, idealised
proportions) plus local modifiers for a K-pop idol figure: a small, soft round
face with a small chin, large eyes, a fuller bust, long neck and legs, narrow shoulders, slim arms,
a defined waist and a gentle hip curve.

Rig: the full MakeHuman default skeleton (163 bones with twist bones, finger
joints and face bones) and its artist-painted CC0 weights. Expressions come
from the CC0 Asian expression-unit targets.

Coordinates stay in MakeHuman space (Y up, facing +Z, decimetres).
"""
import json
import os

import numpy as np

MH = os.environ.get('MAKEHUMAN_DATA', '/home/user/makehumancommunity/makehuman/makehuman/data')


# ------------------------------------------------------------------ base mesh

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


_targets = {}


def target(rel):
    if rel not in _targets:
        idx, d = [], []
        for line in open(os.path.join(MH, 'targets', rel)):
            if line.startswith('#') or not line.strip():
                continue
            p = line.split()
            idx.append(int(p[0]))
            d.append([float(x) for x in p[1:4]])
        _targets[rel] = (np.array(idx, int), np.array(d, float).reshape(-1, 3))
    return _targets[rel]


def apply(verts, rel, w):
    if abs(w) > 1e-6:
        i, d = target(rel)
        if len(i):
            verts[i] += d * w


def macro(verts, gender=0.0, age=0.5, muscle=0.5, weight=0.5, height=0.5, proportions=0.5,
          asian=1.0, caucasian=0.0, african=0.0, cup=0.5, firmness=0.5):
    def three(v, lo, mid, hi):
        mx, mn = max(0.0, v * 2 - 1), max(0.0, 1 - v * 2)
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


def modifier(verts, rel, value, neg='decr', pos='incr'):
    """Two-sided modifier: 'torso/torso-scale-horiz' with value in [-1, 1]; one-sided if neg is None."""
    if neg is None:
        apply(verts, rel + '.target', value)
    elif value < 0:
        apply(verts, f'{rel}-{neg}.target', -value)
    elif value > 0:
        apply(verts, f'{rel}-{pos}.target', value)


MACRO = dict(gender=0.0, age=0.5 * 22 / 25, muscle=0.38, weight=0.2, height=0.62, proportions=1.0,
             asian=0.85, caucasian=0.15, cup=0.8, firmness=0.7)

SIDES = ('l', 'r')
SHAPE = [
    # Head: an idol's small, youthful face (about eight heads tall): a short soft oval narrowing to a V-line jaw and a
    # small, defined chin; a small button nose, the mouth close under it; a slim neck.
    ('head/head-oval', 0.3, None, None), ('head/head-age', -0.9, 'decr', 'incr'),
    ('head/head-scale-horiz', -0.55, 'decr', 'incr'), ('head/head-scale-vert', -0.15, 'decr', 'incr'),
    ('head/head-scale-depth', 0.0, 'decr', 'incr'), ('head/head-fat', -0.2, 'decr', 'incr'),
    ('head/head-back-scale-depth', -0.7, 'decr', 'incr'),
    ('chin/chin-width', -0.85, 'decr', 'incr'), ('chin/chin-height', -0.5, 'decr', 'incr'),
    ('chin/chin-prominent', 0.9, 'decr', 'incr'), ('chin/chin-bones', -0.3, 'decr', 'incr'),
    ('chin/chin-prognathism', 0.6, 'decr', 'incr'),
    ('forehead/forehead-scale-vert', -0.3, 'decr', 'incr'), ('forehead/forehead-trans', -0.5, 'forward', 'backward'),
    ('nose/nose-scale-horiz', -0.5, 'decr', 'incr'), ('nose/nose-scale-vert', -0.65, 'decr', 'incr'),
    ('nose/nose-point-width', -0.45, 'decr', 'incr'), ('nose/nose-nostrils-width', -0.4, 'decr', 'incr'),
    ('nose/nose-point', 0.55, 'down', 'up'), ('nose/nose-volume', -0.35, 'decr', 'incr'),
    ('nose/nose-scale-depth', 0.6, 'decr', 'incr'), ('nose/nose-greek', 0.0, 'decr', 'incr'),
    ('nose/nose-trans', 0.4, 'backward', 'forward'),
    ('nose/nose-flaring', -0.4, 'decr', 'incr'),
    ('mouth/mouth-scale-horiz', -0.1, 'decr', 'incr'), ('mouth/mouth-upperlip-volume', 0.35, 'decr', 'incr'),
    ('mouth/mouth-lowerlip-volume', 0.42, 'decr', 'incr'), ('mouth/mouth-cupidsbow', 0.6, 'decr', 'incr'),
    ('mouth/mouth-angles', 0.35, 'down', 'up'), ('mouth/mouth-scale-depth', -0.6, 'decr', 'incr'),
    ('mouth/mouth-trans', -0.25, 'backward', 'forward'),
    ('neck/neck-scale-horiz', -0.4, 'decr', 'incr'), ('neck/neck-scale-depth', -0.25, 'decr', 'incr'),
    ('measure/measure-neck-height', -0.55, 'decr', 'incr'), ('measure/measure-neck-circ', -0.2, 'decr', 'incr'),
    # Torso: narrow, softly sloping shoulders, defined waist, rounded hips (an hourglass, not a boy's frame).
    ('measure/measure-shoulder-dist', -0.7, 'decr', 'incr'), ('measure/measure-waist-circ', -0.55, 'decr', 'incr'),
    ('measure/measure-underbust-circ', -0.3, 'decr', 'incr'), ('measure/measure-hips-circ', 0.1, 'decr', 'incr'),
    ('measure/measure-napetowaist-dist', -0.15, 'decr', 'incr'), ('measure/measure-frontchest-dist', -0.2, 'decr', 'incr'),
    ('torso/torso-scale-horiz', -0.12, 'decr', 'incr'), ('torso/torso-vshape', -0.3, 'decr', 'incr'),
    ('torso/torso-muscle-dorsi', -0.5, 'decr', 'incr'), ('torso/torso-muscle-pectoral', -0.5, 'decr', 'incr'),
    ('hip/hip-waist', 0.25, 'down', 'up'), ('stomach/stomach-tone', 0.0, 'decr', 'incr'),
    ('buttocks/buttocks-volume', 0.2, 'decr', 'incr'),
    ('bodyshapes/bodyshapes-elvs-fem-neat-hourglass', 0.18, None, None),
    # A full, natural bust: rounded below, a soft slope above, never pointed.
    ('breast/breast-trans', 0.2, 'down', 'up'), ('breast/breast-volume-vert', 0.3, 'down', 'up'),
    ('breast/breast-point', -0.4, 'decr', 'incr'),
    # Limbs: long, slender but shapely legs (soft thighs, a curve of calf, fine knees and ankles), slender
    # arms, small hands and feet.
    ('armslegs/upperlegs-height', 0.35, 'decr', 'incr'), ('armslegs/lowerlegs-height', 0.3, 'decr', 'incr'),
    ('measure/measure-thigh-circ', 0.2, 'decr', 'incr'), ('measure/measure-calf-circ', 0.0, 'decr', 'incr'),
    ('measure/measure-knee-circ', -0.2, 'decr', 'incr'), ('measure/measure-ankle-circ', -0.35, 'decr', 'incr'),
    ('measure/measure-upperarm-circ', -0.3, 'decr', 'incr'), ('measure/measure-wrist-circ', -0.35, 'decr', 'incr'),
    ('measure/measure-upperarm-length', -0.1, 'decr', 'incr'), ('measure/measure-lowerarm-length', -0.05, 'decr', 'incr'),
]
for s in SIDES:
    SHAPE += [
        (f'eyes/{s}-eye-scale', 1.0, 'decr', 'incr'), (f'eyes/{s}-eye-height1', 0.55, 'decr', 'incr'),
        (f'eyes/{s}-eye-height2', 0.0, 'decr', 'incr'), (f'eyes/{s}-eye-height3', 0.35, 'decr', 'incr'),
        (f'eyes/{s}-eye-push1', -0.3, 'in', 'out'), (f'eyes/{s}-eye-push2', -0.3, 'in', 'out'),
        (f'eyes/{s}-eye-epicanthus', -0.4, 'in', 'out'), (f'eyes/{s}-eye-bag', -0.6, 'decr', 'incr'),
        (f'eyes/{s}-eye-corner1', 0.15, 'down', 'up'), (f'eyes/{s}-eye-corner2', 0.25, 'down', 'up'),
        (f'eyes/{s}-eye-eyefold-angle', 0.2, 'down', 'up'),
        (f'cheek/{s}-cheek-volume', 0.0, 'decr', 'incr'), (f'cheek/{s}-cheek-bones', -0.35, 'decr', 'incr'),
        # Small ears that lie close to the head (her long hair covers them).
        # (Flat to her head: one that stands out would poke through the hair over it, its ink drawn on the hair.)
        (f'ears/{s}-ear-scale', -0.8, 'decr', 'incr'), (f'ears/{s}-ear-flap', -1.0, 'decr', 'incr'),
        (f'ears/{s}-ear-wing', -1.0, 'decr', 'incr'), (f'ears/{s}-ear-scale-depth', -0.8, 'decr', 'incr'),
        (f'armslegs/{s}-hand-scale', -0.4, 'decr', 'incr'), (f'armslegs/{s}-hand-fingers-diameter', -0.45, 'decr', 'incr'),
        (f'armslegs/{s}-hand-fingers-length', 0.0, 'decr', 'incr'), (f'armslegs/{s}-foot-scale', -0.25, 'decr', 'incr'),
        (f'armslegs/{s}-lowerarm-scale-horiz', -0.2, 'decr', 'incr'), (f'armslegs/{s}-upperarm-scale-horiz', -0.15, 'decr', 'incr'),
        (f'armslegs/{s}-upperarm-shoulder-muscle', -0.8, 'decr', 'incr'),
        (f'armslegs/{s}-lowerleg-scale-horiz', -0.1, 'decr', 'incr'),
    ]


# A natural bust with a soft slope above it (never a cone or a sphere).
SHAPE += [
    ('head/head-round', 0.4, None, None), ('head/head-invertedtriangular', 0.6, None, None),
    ('mouth/mouth-trans', 0.75, 'down', 'up'),
    ('nose/nose-trans', -0.15, 'down', 'up'),  # a short philtrum: nose and mouth close together
    ('chin/chin-jaw-drop', -0.2, 'decr', 'incr'), ('breast/breast-dist', -0.1, 'decr', 'incr'),
]


# Her head, fitted to her portrait (scripts/chaewon/build/fitface.py measured it against the photo): MakeHuman's
# young East Asian head, made younger, with a short nose and a small mouth: a slim soft oval narrowing to a gentle
# V-line - lean cheeks (no puffy volume), a jaw about half the cheeks' width and a short, small rounded chin
# (a youthful lower face); a slim neck. (A fuller jaw with cheek volume read as a fat face.)
SHAPE = [t for t in SHAPE if not t[0].startswith(('head/', 'chin/', 'forehead/', 'cheek/'))
         and t[0] not in ('nose/nose-scale-vert', 'mouth/mouth-scale-horiz', 'neck/neck-scale-horiz')]
SHAPE += [
    ('head/head-age', -0.9, 'decr', 'incr'), ('head/head-oval', 0.3, None, None),
    ('head/head-invertedtriangular', 0.3, None, None),
    ('head/head-fat', -0.3, 'decr', 'incr'), ('head/head-scale-horiz', -0.15, 'decr', 'incr'),
    ('chin/chin-width', -0.2, 'decr', 'incr'), ('chin/chin-height', -0.3, 'decr', 'incr'),
    ('cheek/l-cheek-volume', -0.15, 'decr', 'incr'), ('cheek/r-cheek-volume', -0.15, 'decr', 'incr'),
    ('cheek/l-cheek-bones', -0.2, 'decr', 'incr'), ('cheek/r-cheek-bones', -0.2, 'decr', 'incr'),
    ('nose/nose-scale-vert', -0.45, 'decr', 'incr'), ('mouth/mouth-scale-horiz', -0.3, 'decr', 'incr'),
    ('neck/neck-scale-horiz', -0.35, 'decr', 'incr'),
]
# Her profile: a soft, rounded forehead; a straight, slightly raised bridge to a small upturned tip; the lips
# set back behind the line from the tip of her nose to her chin, and a small chin that comes forward to meet it.
SHAPE = [t for t in SHAPE if (t[0], t[2]) not in (('mouth/mouth-trans', 'backward'), ('nose/nose-scale-depth', 'decr'),
                                                  ('nose/nose-greek', 'decr'), ('nose/nose-point', 'down'))]
SHAPE += [
    ('chin/chin-prominent', 0.6, 'decr', 'incr'), ('chin/chin-prognathism', 0.3, 'decr', 'incr'),
    ('mouth/mouth-trans', 0.45, 'backward', 'forward'),
    ('nose/nose-scale-depth', 0.9, 'decr', 'incr'), ('nose/nose-greek', 0.35, 'decr', 'incr'),
    ('nose/nose-point', 0.7, 'down', 'up'),
    ('forehead/forehead-trans', -0.2, 'forward', 'backward'),
    # A clean line from her chin to her throat (no softness under the jaw, which read as a full face in
    # profile), and a head a little shallower front to back.
    ('neck/neck-double', -0.8, 'decr', 'incr'), ('head/head-scale-depth', -0.25, 'decr', 'incr'),
]
# Her midface, measured on her portrait (in eye spacings below the eyes): the nose tip at about 0.7 and the
# mouth at about 1.1. MakeHuman's young head puts them much higher (0.53 and 0.87), which read as a doll's
# face rather than hers.
SHAPE = [t for t in SHAPE if t[0] not in ('nose/nose-scale-vert', 'nose/nose-trans', 'mouth/mouth-trans') or t[2] in ('backward',)]
SHAPE += [('nose/nose-scale-vert', 0.5, 'decr', 'incr'), ('nose/nose-trans', -0.9, 'down', 'up'),
          ('mouth/mouth-trans', -0.1, 'down', 'up')]


EYE_SCALE = 1.07  # her eyes: the eye region (opening, lids and eyeball) grown a little past MakeHuman's range


def enlarge_eyes(verts, faces, groups, scale=EYE_SCALE, r0=0.17, r1=0.42):
    """Grow each eye about the front of its eyeball (MakeHuman units, +Z forward): the opening, the lids
    and the eyeball widen while the lid surface keeps its depth (the eyeball sinks back rather than
    bulging), easing out over the brow, cheek and nose bridge."""
    if scale == 1.0:
        return verts
    for side in ('l', 'r'):
        idx = np.unique(np.concatenate([np.asarray(f) for f, g in zip(faces, groups) if g == f'helper-{side}-eye']))
        P = verts[idx]
        c = (P.min(0) + P.max(0)) / 2
        r = (P.max(0) - P.min(0))[2] / 2
        front = c + np.array([0.0, 0.0, r])
        d = np.linalg.norm(verts - front, axis=1)
        t = np.clip((d - r0) / (r1 - r0), 0, 1)
        w = 1 - t * t * (3 - 2 * t)
        verts += (verts - front) * ((scale - 1) * w)[:, None]
    return verts


# Her resting expression: a gentle smile, lips just parted, the lower lids lifted a little (the soft,
# smiling eyes of the aegyo-sal) - never the blank stare of a neutral base mesh.
EXPRESSION = {'mouth-corner-puller': 0.24, 'mouth-parling': 0.14, 'eye-left-slit': 0.13, 'eye-right-slit': 0.13,
              'eyebrows-left-inner-up': 0.12, 'eyebrows-right-inner-up': 0.12}


HEAD_SCALE = 1.0  # her small idol's head: scaled about the top of the neck, easing out down the neck


def scale_head(verts, scale=None):
    """Scale the head (and, easing out, the upper neck) uniformly about the head joint."""
    scale = HEAD_SCALE if scale is None else scale
    if scale == 1.0:
        return verts
    order, parents, heads, tails, xs = skeleton(verts)
    pivot = heads[order.index('head')]
    t = np.clip((verts[:, 1] - (pivot[1] - 0.2)) / 0.45, 0, 1)
    w = t * t * (3 - 2 * t)
    w *= np.abs(verts[:, 0]) < 1.6  # (never the hands)
    verts += (verts - pivot) * ((scale - 1) * w)[:, None]
    return verts


CHIN = {}  # (decimetres: dict(forward=, down=, radius=)); her fitted chin needs no sculpting


def sculpt_chin(verts, groups_faces, chin=None):
    """A small, defined chin: the soft tissue of the chin tip moves forward and a little down (a gaussian
    falloff), so in profile the chin comes out under the lips and the line under it reads clearly."""
    chin = CHIN if chin is None else chin
    if not chin:
        return verts
    order, parents, heads, tails, xs = skeleton(verts)
    j = tails[order.index('jaw')]
    body = groups_faces
    mid = body[(np.abs(verts[body, 0]) < 0.05) & (verts[body, 1] < j[1] + 0.05) & (verts[body, 1] > j[1] - 0.25)]
    tip = verts[mid[np.argmax(verts[mid, 2])]].copy()
    d = np.linalg.norm((verts - tip) * np.array([1.0, 1.3, 1.0]), axis=1)
    w = np.exp(-(d / chin['radius']) ** 2)
    w *= verts[:, 2] > tip[2] - 0.5  # (only the front of the face)
    verts[:, 2] += chin['forward'] * w
    verts[:, 1] -= chin['down'] * w
    return verts


def build(shape=SHAPE, eye_scale=EYE_SCALE, expr=EXPRESSION, **macro_overrides):
    """Shaped body: (verts, uvs, faces, fuvs, groups) in MakeHuman space."""
    verts, uvs, faces, fuvs, groups = load_obj()
    params = dict(MACRO)
    params.update(macro_overrides)
    macro(verts, **params)
    for rel, value, neg, pos in shape:
        modifier(verts, rel, value, neg, pos)
    if expr:
        verts[:] = expression(verts, expr)
    enlarge_eyes(verts, faces, groups, eye_scale)
    used = np.unique(np.concatenate([np.asarray(f) for f, g in zip(faces, groups) if g == 'body']))
    sculpt_chin(verts, used)
    scale_head(verts)
    return verts, uvs, faces, fuvs, groups


def expression(verts, units):
    """Blend CC0 Asian expression units, e.g. {'mouth-corner-puller': 0.3}."""
    out = verts.copy()
    for name, w in units.items():
        apply(out, f'expression/units/asian/{name}.target', w)
    return out


# ------------------------------------------------------------------ proxies (eyes)

def fit_proxy(mhclo, verts):
    """Fit a MakeHuman .mhclo proxy (e.g. eyes/high-poly) to the current base verts."""
    base = os.path.dirname(mhclo)
    lines = open(mhclo).read().splitlines()
    scales, refs, obj = {}, [], None
    in_verts = False
    for line in lines:
        p = line.split()
        if not p or p[0].startswith('#'):
            continue
        if p[0] in ('x_scale', 'y_scale', 'z_scale'):
            scales[p[0][0]] = (int(p[1]), int(p[2]), float(p[3]))
        elif p[0] == 'obj_file':
            obj = os.path.join(base, p[1])
        elif p[0] == 'verts':
            in_verts = True
        elif in_verts and len(p) == 9:
            refs.append([float(x) for x in p])
        elif in_verts and len(p) == 1 and p[0].isdigit():
            refs.append([float(p[0]), 0, 0, 1, 0, 0, 0, 0, 0])
    refs = np.array(refs)
    idx = refs[:, :3].astype(int)
    w = refs[:, 3:6]
    off = refs[:, 6:9]
    s = np.array([abs(verts[a, k] - verts[b, k]) / d for k, (a, b, d) in
                  zip(range(3), (scales['x'], scales['y'], scales['z']))])
    P = (verts[idx] * w[..., None]).sum(1) + off * s
    pv, puv, pf, pfuv, _ = load_obj(obj)
    return P, puv, pf, pfuv


# ------------------------------------------------------------------ skeleton

def skeleton(verts):
    """Full default skeleton: names, parents, heads, tails and X axes (from rotation planes)."""
    skel = json.load(open(os.path.join(MH, 'rigs/default.mhskel')))
    joints = {k: verts[np.array(v)].mean(0) for k, v in skel['joints'].items()}
    names = list(skel['bones'].keys())
    # Parents before children.
    order, seen = [], set()

    def visit(n):
        if n in seen:
            return
        p = skel['bones'][n]['parent']
        if p:
            visit(p)
        seen.add(n)
        order.append(n)
    for n in names:
        visit(n)
    index = {n: i for i, n in enumerate(order)}
    heads = np.array([joints[skel['bones'][n]['head']] for n in order])
    tails = np.array([joints[skel['bones'][n]['tail']] for n in order])
    parents = np.array([index[skel['bones'][n]['parent']] if skel['bones'][n]['parent'] else -1 for n in order])
    xs = []
    for n, h, t in zip(order, heads, tails):
        plane = skel['planes'].get(skel['bones'][n]['rotation_plane'])
        y = t - h
        y /= np.linalg.norm(y) + 1e-12
        if plane:
            a, b, c = (joints[j] for j in plane)
            nrm = np.cross(b - a, c - b)
        else:
            nrm = np.array([1.0, 0, 0])
        x = nrm - y * np.dot(nrm, y)
        if np.linalg.norm(x) < 1e-6:
            x = np.cross(y, [0, 0, 1.0])
        xs.append(x / np.linalg.norm(x))
    return order, parents, heads, tails, np.array(xs)


def weights(order, nverts):
    """(V, B) skin weights from the CC0 default weights, normalised."""
    w = json.load(open(os.path.join(MH, 'rigs/default_weights.mhw')))['weights']
    index = {n: i for i, n in enumerate(order)}
    W = np.zeros((nverts, len(order)), np.float32)
    for bone, pairs in w.items():
        if bone in index:
            for vi, wt in pairs:
                W[vi, index[bone]] += wt
    s = W.sum(1, keepdims=True)
    return np.where(s > 0, W / np.maximum(s, 1e-9), 0)
