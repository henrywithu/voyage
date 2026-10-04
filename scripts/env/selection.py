"""The choice: a basalt terrace in the Pearl Grotto, the shell altar beside Chaewon, and a giant
column head below where the three pendants turn.

    python3 selection.py

Everything is authored in the DrinkSelection scene's world units; the layers that
show these meshes are set to identity transforms in scene-layouts.json.
"""
import math
import os

import numpy as np

import basalt
import grotto
import meshkit as mk

HERE = os.path.dirname(os.path.abspath(__file__))
DEC = os.path.join(HERE, '../../public/assets/decoded/story/grotto')

TOP = -0.8            # the terrace she stands on
TABLE = -3.315        # the column head the pendants hover over
FRONT = -1.2          # the terrace's front edge (behind the pendants)
ALTAR = np.array([-0.15, TOP, -3.95])


def terrace(rng):
    m = mk.Mesh()
    pts = basalt.hex_grid(-12.5, 12.0, -9.2, FRONT, 1.2, 0.06, rng)
    for x, z in pts:
        r = rng.uniform(0.58, 0.66)
        rot = rng.uniform(0, np.pi / 3)
        edge = z > FRONT - 2.2
        top = TOP + rng.uniform(-0.035, 0.03)
        if edge and rng.random() < 0.3:
            top -= rng.uniform(0.15, 0.6)          # a ragged lip
        if edge:
            basalt.column(m, x, z, r, -5.2, top, rot, basalt.joints_for(-5.2, top, rng, (1.0, 2.2)),
                          top_tilt=(rng.normal(0, 0.02), rng.normal(0, 0.02)), tag=1)
        else:
            basalt.column(m, x, z, r, top - 0.3, top, rot, (), chamfer=0.03,
                          top_tilt=(rng.normal(0, 0.015), rng.normal(0, 0.015)), tag=1)
    return m


def skyline(rng):
    """Stacks of columns rising behind the terrace: the far walls of the grotto."""
    m = mk.Mesh()
    pts = basalt.hex_grid(-18.0, 17.0, -15.0, -11.0, 1.15, 0.06, rng)
    for x, z in pts:
        h = 0.25 + 1.1 * (0.5 + 0.5 * math.sin(x * 0.45 + 1.1) * math.cos(x * 0.21)) + rng.uniform(0, 0.5)
        h *= 0.5 + 0.5 * (-11.0 - z) / 4.0 + 0.3
        basalt.column(m, x, z, rng.uniform(0.55, 0.62), TOP - 0.4, TOP + h, rng.uniform(0, 1),
                      basalt.joints_for(TOP, TOP + h, rng, (0.5, 1.2)), top_tilt=(rng.normal(0, 0.03), rng.normal(0, 0.03)),
                      tag=2)
    return m


def altar(rng):
    m = mk.Mesh()
    tops = []
    for (dx, dz, h) in ((-0.3, 0.06, 1.12), (0.04, -0.12, 1.36), (0.36, 0.08, 1.2), (-0.02, 0.43, 0.55)):
        top = TOP + h
        tops.append(top)
        basalt.column(m, ALTAR[0] + dx, ALTAR[2] + dz, 0.29, TOP - 0.2, top, rng.uniform(0, 1),
                      basalt.joints_for(TOP, top, rng, (0.3, 0.55)), tag=3)
    c = np.array([ALTAR[0] + 0.04, tops[1] + 0.03, ALTAR[2] - 0.1])
    grotto.scallop(m, c + (0, 0, 0.08), 0.5, 82, 0.1, tag=4)
    grotto.scallop(m, c + (0, 0.02, -0.08), 0.62, -8, 0.13, flip=True, tag=4)
    return m


def table(rng):
    """One giant column head, flat side to the viewer."""
    m = mk.Mesh()
    basalt.column(m, 0.0, 0.25, 2.3, -6.0, TABLE, math.pi / 6, basalt.joints_for(-6.0, TABLE, rng, (0.6, 1.1)),
                  chamfer=0.05, groove=0.05, tag=5)
    return m


if __name__ == '__main__':
    rng = np.random.default_rng(41)
    for name, mesh, dist in (('sel-terrace', terrace(rng), 2.0), ('sel-skyline', skyline(rng), 2.0),
                             ('sel-altar', altar(rng), 0.8), ('sel-table', table(rng), 1.0)):
        P, F, N = mk.write(os.path.join(DEC, name + '.bin.mesh'), mesh, ao=True, ao_rays=14, ao_dist=dist)
        print(name, P.min(0).round(2), P.max(0).round(2))
