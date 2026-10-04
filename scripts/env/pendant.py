"""The Trapnest Voyage compass pendant: a gold compass rose around a pearl, on a fine chain.

    python3 pendant.py     # line-art meshes for the grotto and the choice scene

Local units: the rose is centred at y = CY facing +Z, the chain rises from the
bail toward +Y. The mesh has position, normal and ao (the ink shaders), and an
`part` attribute in the ao-free 'uv' slot is not needed: parts are separate
meshes when they need different shading.
"""
import math
import os

import numpy as np

import meshkit as mk

HERE = os.path.dirname(os.path.abspath(__file__))
DEC = os.path.join(HERE, '../../public/assets/decoded/story')

CY = 0.45
R_RING = 0.25


def torus(center, normal, R, r, nu=48, nv=10):
    normal = np.asarray(normal, float)
    normal /= np.linalg.norm(normal)
    a = np.array([1.0, 0, 0]) if abs(normal[0]) < 0.9 else np.array([0, 1.0, 0])
    u = np.cross(normal, a)
    u /= np.linalg.norm(u)
    v = np.cross(normal, u)
    t = np.linspace(0, 2 * np.pi, nu, endpoint=False)
    s = np.linspace(0, 2 * np.pi, nv, endpoint=False)
    P = []
    for ti in t:
        c = np.cos(ti) * u + np.sin(ti) * v
        for si in s:
            P.append(np.asarray(center) + c * (R + r * np.cos(si)) + normal * r * np.sin(si))
    P = np.array(P)
    G = np.arange(nu * nv).reshape(nu, nv)
    F = []
    for i in range(nu):
        for j in range(nv):
            a0, b0 = G[i, j], G[(i + 1) % nu, j]
            a1, b1 = G[i, (j + 1) % nv], G[(i + 1) % nu, (j + 1) % nv]
            F += [(a0, b0, b1), (a0, b1, a1)]
    F = np.array(F)
    N = mk.normals(P, F)
    c0 = np.asarray(center)
    # Orient outward from the tube centre line.
    ring_c = c0 + ((P - c0) - normal * ((P - c0) @ normal)[:, None])
    ring_c = c0 + (ring_c - c0) / np.maximum(np.linalg.norm(ring_c - c0, axis=1, keepdims=True), 1e-9) * R
    if np.mean(np.einsum('ij,ij->i', N, P - ring_c)) < 0:
        F = F[:, ::-1]
        N = -N
    return P, F, N


def sphere(center, r, nu=24, nv=16):
    th = np.linspace(0, np.pi, nv)
    ph = np.linspace(0, 2 * np.pi, nu, endpoint=False)
    P = np.array([[r * math.sin(a) * math.cos(b), r * math.cos(a), r * math.sin(a) * math.sin(b)] for a in th for b in ph])
    G = np.arange(nv * nu).reshape(nv, nu)
    F = mk.grid(G, close_u=True)
    P = P + np.asarray(center)
    N = (P - np.asarray(center)) / r
    fn = mk.face_normals(P, F)
    cen = P[F].mean(1) - np.asarray(center)
    if np.mean(np.einsum('ij,ij->i', fn, cen)) < 0:
        F = F[:, ::-1]
    return P, F, N


def rose(m, cy=CY, thick=0.045, tag=1):
    """Eight-point compass rose with ridged points (front and back)."""
    for k in range(8):
        ang = math.pi / 2 - k * math.pi / 4
        L = 0.36 if k % 2 == 0 else 0.23
        w = 0.085 if k % 2 == 0 else 0.065
        d = np.array([math.cos(ang), math.sin(ang), 0])
        side = np.array([-d[1], d[0], 0])
        c = np.array([0, cy, 0])
        tip = c + d * L
        l = c + side * w + d * 0.02
        r = c - side * w + d * 0.02
        for sz in (1, -1):
            ridge = c + d * 0.02 + np.array([0, 0, sz * thick])
            tipz = tip + np.array([0, 0, sz * 0.004])
            P = np.array([tipz, l, ridge, r])
            F = np.array([(0, 2, 1), (0, 3, 2)]) if sz > 0 else np.array([(0, 1, 2), (0, 2, 3)])
            m.add(P, F, smooth=False, tag=tag)


def chain(m, top, links=12, link=0.055, wire=0.008, sway=0.0, tag=3):
    """Links rising from `top`; each link a small torus, alternately turned."""
    p = np.asarray(top, float)
    for i in range(links):
        c = p + np.array([sway * math.sin(i * 0.4), link * 0.8 * (i + 0.5), 0])
        n = np.array([1.0, 0, 0]) if i % 2 == 0 else np.array([0, 0, 1.0])
        P, F, N = torus(c, n, link * 0.45, wire, nu=12, nv=5)
        # Elongate along y.
        P[:, 1] = c[1] + (P[:, 1] - c[1]) * 1.35
        m.add(P, F, N=N, tag=tag)


def chain_loop(m, bottom, a=0.2, b=0.29, links=28, link=0.042, wire=0.0068, tag=3):
    """A necklace loop rising from the bail: a pear-shaped ring of links in the XY plane."""
    t = np.linspace(0, 2 * np.pi, 400)
    x = a * np.sin(t) * (0.75 + 0.25 * (1 - np.cos(t)) / 2)
    y = bottom[1] + b * (1 - np.cos(t))
    pts = np.c_[x, y, np.zeros_like(t)]
    seg = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
    L = seg[-1]
    for i in range(links):
        s0 = (i + 0.5) / links * L
        k = np.searchsorted(seg, s0)
        c = pts[min(k, len(pts) - 1)]
        d = pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]
        d /= np.linalg.norm(d)
        n = np.array([0, 0, 1.0]) if i % 2 == 0 else np.cross(d, [0, 0, 1.0])
        P, F, N = torus(c, n, link * 0.42, wire, nu=12, nv=5)
        # Elongate along the chain direction.
        rel = P - c
        P = c + rel + d * (rel @ d)[:, None] * 0.4
        m.add(P, F, N=N, tag=tag)


def pendant(chain_links=12, loop=True):
    m = mk.Mesh()
    # The dial: a thin disc of the tide's enamel under the rose (uv.x = 0.5 marks it). It also keeps the
    # rose readable when the pendant turns edge-on.
    P, F = mk.cylinder((0, CY, -0.012), (0, CY, 0.012), 0.2, 0.2, sides=48, segs=1)
    m.add(P, F, uv=np.tile([0.5, 0.0], (len(P), 1)), tag=1)
    rose(m)
    m.add(*torus((0, CY, 0), (0, 0, 1), R_RING, 0.02), tag=2)
    # Fine inner ring and a pearl at the heart.
    m.add(*torus((0, CY, 0), (0, 0, 1), 0.13, 0.009, nu=40, nv=6), tag=2)
    P, F, N = sphere((0, CY, 0), 0.085)
    m.add(P, F, N=N, uv=np.tile([1.0, 0.0], (len(P), 1)), tag=4)   # uv.x = 1 marks the pearl
    # Bail and chain.
    m.add(*torus((0, CY + R_RING + 0.045, 0), (1, 0, 0), 0.035, 0.012, nu=20, nv=6), tag=2)
    if loop:
        chain_loop(m, (0, CY + R_RING + 0.07, 0))
    elif chain_links:
        chain(m, (0, CY + R_RING + 0.07, 0), links=chain_links)
    return m


if __name__ == '__main__':
    mk.write(os.path.join(DEC, 'grotto/pendant.bin.mesh'), pendant(), ao=True, ao_rays=12, ao_dist=0.15)
