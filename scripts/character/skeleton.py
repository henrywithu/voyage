"""Simplified MakeHuman skeleton and skin weights for posing Chaewon."""
import json
import os
import numpy as np
from mh import MH

SIDES = ('L', 'R')


def _bones():
    b = [
        # name, parent, head joint, tail joint, merged MakeHuman bones
        ('hips', None, 'root____head', 'spine05____head', ['root', 'pelvis.L', 'pelvis.R']),
        ('spine1', 'hips', 'spine05____head', 'spine04____head', ['spine05']),
        ('spine2', 'spine1', 'spine04____head', 'spine03____head', ['spine04']),
        ('spine3', 'spine2', 'spine03____head', 'spine02____head', ['spine03']),
        ('chest', 'spine3', 'spine02____head', 'spine01____head', ['spine02', 'breast.L', 'breast.R']),
        ('upperchest', 'chest', 'spine01____head', 'neck01____head', ['spine01']),
        ('neck', 'upperchest', 'neck01____head', 'head____head', ['neck01', 'neck02', 'neck03']),
        ('head', 'neck', 'head____head', 'head____tail', ['head']),
    ]
    for s in SIDES:
        b += [
            (f'clavicle.{s}', 'upperchest', f'clavicle.{s}____head', f'upperarm01.{s}____head', [f'clavicle.{s}', f'shoulder01.{s}']),
            (f'upperarm.{s}', f'clavicle.{s}', f'upperarm01.{s}____head', f'lowerarm01.{s}____head', [f'upperarm01.{s}', f'upperarm02.{s}']),
            (f'forearm.{s}', f'upperarm.{s}', f'lowerarm01.{s}____head', f'wrist.{s}____head', [f'lowerarm01.{s}', f'lowerarm02.{s}']),
            (f'hand.{s}', f'forearm.{s}', f'wrist.{s}____head', f'finger3-1.{s}____head', [f'wrist.{s}'] + [f'metacarpal{i}.{s}' for i in range(1, 5)]),
        ]
        for f in range(1, 6):
            parent = f'hand.{s}'
            for seg in range(1, 4):
                name = f'finger{f}-{seg}.{s}'
                b.append((name, parent, f'{name}____head', f'{name}____tail', [name]))
                parent = name
        b += [
            (f'thigh.{s}', 'hips', f'upperleg01.{s}____head', f'lowerleg01.{s}____head', [f'upperleg01.{s}', f'upperleg02.{s}']),
            (f'shin.{s}', f'thigh.{s}', f'lowerleg01.{s}____head', f'foot.{s}____head', [f'lowerleg01.{s}', f'lowerleg02.{s}']),
            (f'foot.{s}', f'shin.{s}', f'foot.{s}____head', f'toe3-1.{s}____head', [f'foot.{s}']),
            (f'toes.{s}', f'foot.{s}', f'toe3-1.{s}____head', f'toe3-3.{s}____tail',
             [f'toe{t}-{k}.{s}' for t in range(1, 6) for k in range(1, 4)]),
        ]
    return b


BONES = _bones()
NAMES = [b[0] for b in BONES]
INDEX = {n: i for i, n in enumerate(NAMES)}
PARENTS = np.array([INDEX[b[1]] if b[1] else -1 for b in BONES])


def load(verts):
    """Return heads (B,3), tails (B,3), weights (V,B) for MakeHuman-space verts."""
    skel = json.load(open(os.path.join(MH, 'rigs/default.mhskel')))
    joints = {k: verts[np.array(v)].mean(0) for k, v in skel['joints'].items()}
    heads = np.array([joints[b[2]] for b in BONES])
    tails = np.array([joints[b[3]] for b in BONES])
    owner = {}
    for name, _, _, _, merged in BONES:
        for m in merged:
            owner[m] = INDEX[name]
    # Remaining MakeHuman bones fold into their closest kept ancestor.
    mh_bones = skel['bones']

    def resolve(n):
        while n not in owner:
            n = mh_bones[n]['parent']
        return owner[n]
    w = json.load(open(os.path.join(MH, 'rigs/default_weights.mhw')))['weights']
    W = np.zeros((len(verts), len(BONES)), np.float32)
    for bone, pairs in w.items():
        bi = resolve(bone)
        for vi, wt in pairs:
            W[vi, bi] += wt
    s = W.sum(1, keepdims=True)
    W = np.where(s > 0, W / np.maximum(s, 1e-9), 0)
    return heads, tails, W
