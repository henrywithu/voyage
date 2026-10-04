"""Drape Chaewon's sundress skirt over her rest pose and save it for the asset builders.

    python3 drape.py            (writes build/dress_sim.npz; needs build/rest.npz from rest.py)

The bodice is built fitted by dress.build; only the skirt is simulated (Blender cloth, seam welded),
pinned along its top rows at the waist.
"""
import os
import sys

import numpy as np

import bview
import cloth
import dress

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, 'build')


def main():
    rest = dict(np.load(os.path.join(BUILD, 'rest.npz')))
    V, F, UV, part, info = dress.build(rest, folds=0.0, flare=0.75, hem_drop=0.085)
    info = dress.strap_anchors(V, info)
    sv, sf, suv = dress.straps(rest, info)
    sk = info['skirt']
    ids = np.unique(sk)
    in_skirt = np.zeros(len(V), bool)
    in_skirt[ids] = True
    skirt_faces = F[np.all(in_skirt[F], axis=1)]
    pin = np.zeros(len(V))
    for r in range(4):
        pin[sk[r]] = 1.0 if r < 3 else 0.5
    bview.reset()
    loc = -np.ones(len(V), int)
    loc[ids] = np.arange(len(ids))
    weld = loc[info['weld'][ids]]
    res = cloth.drape_welded(V[ids], loc[skirt_faces], pin[ids], weld, rest['P'], rest['T'], frames=60, mass=0.1,
                             tension=10, bending=0.35)
    V2 = V.copy()
    V2[ids] = res
    np.savez(os.path.join(BUILD, 'dress_sim.npz'), V=V2, F=F, UV=UV, part=part, sv=sv, sf=sf, suv=suv)
    print('dress_sim.npz', len(V2), 'verts')


if __name__ == '__main__':
    sys.exit(main())
