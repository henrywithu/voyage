"""Hexagonal basalt columns: the building block of the sea arch, the Pearl Grotto and the breaking pillars.

A column is a hexagonal prism split into drums by shallow grooves (the cross
joints of real columnar basalt), with flat-shaded faces so the ink shader draws
crisp facets, a chamfered top and an optional jagged bottom.
"""
import math

import numpy as np

import meshkit as mk


def column(m, cx, cz, r, y0, y1, rot=0.0, joints=(), chamfer=0.035, groove=0.03, top_tilt=(0.0, 0.0),
           bottom_cap=False, tag=0, lean=(0.0, 0.0)):
    """Add one prism from y0 to y1 at (cx, cz). joints: heights of cross joints (grooves)."""
    a = rot + np.arange(6) * np.pi / 3
    ring = np.c_[np.cos(a), np.sin(a)]                      # unit hexagon (x, z)
    ys = [y0]
    rs = [r]
    for j in sorted(joints):
        if y0 + 0.15 < j < y1 - 0.2:
            ys += [j - groove, j, j + groove]
            rs += [r, r - groove * 0.8, r]
    ys += [y1 - chamfer, y1]
    rs += [r, r - chamfer]
    ys, rs = np.array(ys), np.array(rs)
    lx, lz = lean
    tx, tz = top_tilt

    def pt(k, i):
        y = ys[i]
        h = (y - y0)
        x = cx + rs[i] * ring[k, 0] + lx * h
        z = cz + rs[i] * ring[k, 1] + lz * h
        if i == len(ys) - 1 or i == len(ys) - 2:
            y = y + tx * (x - cx) + tz * (z - cz)
        return (x, y, z)

    # Sides: per face strips (two verts per ring) for flat facets.
    P, F, N = [], [], []
    for k in range(6):
        k2 = (k + 1) % 6
        base = len(P)
        for i in range(len(ys)):
            P.append(pt(k, i))
            P.append(pt(k2, i))
        for i in range(len(ys) - 1):
            a0, b0, a1, b1 = base + 2 * i, base + 2 * i + 1, base + 2 * i + 2, base + 2 * i + 3
            F += [(a0, a1, b1), (a0, b1, b0)]
    P = np.array(P, float)
    F = np.array(F)
    # Normals per triangle -> per vertex within each strip quad row (flat look, faces share rows).
    fn = mk.face_normals(P, F)
    N = np.zeros_like(P)
    for k in range(3):
        np.add.at(N, F[:, k], fn)
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
    # Make sure the sides face outward.
    c = np.array([cx, 0, cz])
    out = (P - c)
    out[:, 1] = 0
    if np.sum(np.einsum('ij,ij->i', N, out)) < 0:
        F = F[:, ::-1]
        N = -N
    m.add(P, F, N=N, tag=tag)
    # Top cap (flat).
    top = np.array([pt(k, len(ys) - 1) for k in range(6)])
    Pc = np.vstack([top, top.mean(0)])
    Fc = np.array([(6, (k + 1) % 6, k) for k in range(6)])
    n = mk.face_normals(Pc, Fc).mean(0)
    if n[1] < 0:
        Fc = Fc[:, ::-1]
        n = -n
    m.add(Pc, Fc, N=np.tile(n / np.linalg.norm(n), (7, 1)), tag=tag)
    if bottom_cap:
        bot = np.array([pt(k, 0) for k in range(6)])
        Pb = np.vstack([bot, bot.mean(0)])
        Fb = np.array([(6, k, (k + 1) % 6) for k in range(6)])
        n = mk.face_normals(Pb, Fb).mean(0)
        if n[1] > 0:
            Fb = Fb[:, ::-1]
            n = -n
        m.add(Pb, Fb, N=np.tile(n / np.linalg.norm(n), (7, 1)), tag=tag)


def hex_grid(x0, x1, z0, z1, spacing, jitter, rng):
    """Jittered hexagonal lattice of column centres."""
    pts = []
    dz = spacing * math.sqrt(3) / 2
    row = 0
    z = z0
    while z <= z1:
        off = spacing / 2 if row % 2 else 0
        x = x0 + off
        while x <= x1:
            pts.append((x + rng.uniform(-jitter, jitter), z + rng.uniform(-jitter, jitter)))
            x += spacing
        z += dz
        row += 1
    return np.array(pts)


def joints_for(y0, y1, rng, step=(0.7, 1.8)):
    out = []
    y = y0 + rng.uniform(*step)
    while y < y1 - 0.3:
        out.append(y)
        y += rng.uniform(*step)
    return out
