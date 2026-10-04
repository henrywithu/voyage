"""The fastening scene's set: a cluster of tall basalt columns (in place of the classical pillar)
and a ledge of column heads in front of Chaewon. World units of the DrinkPour scene.

    python3 fasten_set.py
"""
import os

import numpy as np

import basalt
import meshkit as mk

HERE = os.path.dirname(os.path.abspath(__file__))
DEC = os.path.join(HERE, '../../public/assets/decoded/story/grotto')


def columns(rng):
    m = mk.Mesh()
    for (x, z, r, top) in ((-4.6, -3.3, 0.78, -1.1), (-3.3, -2.75, 0.72, -2.35), (-2.1, -3.4, 0.7, -0.7),
                           (-5.6, -2.5, 0.74, -3.4), (-3.9, -4.4, 0.8, 0.2), (-1.0, -2.9, 0.6, -4.1),
                           (-5.4, -4.6, 0.8, -0.3)):
        basalt.column(m, x, z, r, -16.0, top, rng.uniform(0, np.pi / 3), basalt.joints_for(-16.0, top, rng, (1.1, 2.6)),
                      chamfer=0.05, groove=0.05, top_tilt=(rng.normal(0, 0.03), rng.normal(0, 0.03)), tag=1)
    return m


def ledge(rng):
    m = mk.Mesh()
    for x, z in basalt.hex_grid(-7.0, 7.0, -0.5, 0.7, 0.9, 0.04, rng):
        top = -4.95 + rng.uniform(-0.05, 0.04)
        basalt.column(m, x, z, rng.uniform(0.43, 0.47), -9.0, top, rng.uniform(0, np.pi / 3),
                      basalt.joints_for(-9.0, top, rng, (0.8, 1.6)), chamfer=0.04,
                      top_tilt=(rng.normal(0, 0.02), rng.normal(0, 0.02)), tag=2)
    return m


if __name__ == '__main__':
    rng = np.random.default_rng(51)
    for name, mesh in (('fasten-columns', columns(rng)), ('fasten-ledge', ledge(rng))):
        P, F, N = mk.write(os.path.join(DEC, name + '.bin.mesh'), mesh, ao=True, ao_rays=14, ao_dist=2.0)
        print(name, P.min(0).round(2), P.max(0).round(2))

