"""Geometry of the Trapnest Voyage elixir flask.

A hand-blown teardrop flask with a slender neck, a brass collar and stem,
and a compass-rose medallion standing on top as the stopper. Units match
Spirit's bottle (base at y = 0, stopper top at y ~= 1.375, body radius
~0.18), so the flask drops into the same scene transforms.

Every part is a surface of revolution built from (radius, height) profile
runs. Runs meet at hard edges; inside a run the profile is smoothed with a
PCHIP curve and resampled evenly by arc length.
"""
import numpy as np
from scipy.interpolate import PchipInterpolator

# Outer glass, bottom centre to the top of the lip.
GLASS_RUNS = [
    [(0.000, 0.014), (0.060, 0.010), (0.100, 0.003), (0.122, 0.000), (0.140, 0.004), (0.155, 0.015),
     (0.168, 0.045), (0.180, 0.105), (0.186, 0.200), (0.185, 0.300), (0.176, 0.405), (0.158, 0.505),
     (0.130, 0.592), (0.100, 0.662), (0.075, 0.725), (0.059, 0.785), (0.051, 0.850), (0.049, 0.930),
     (0.050, 0.975), (0.058, 0.985), (0.064, 1.000), (0.064, 1.028), (0.059, 1.040), (0.050, 1.046),
     (0.041, 1.046)],
]
# Brass collar over the lip, then the stem up into the medallion.
COLLAR_RUNS = [
    [(0.049, 0.962), (0.058, 0.964), (0.066, 0.970), (0.071, 0.982)],
    [(0.071, 0.982), (0.072, 1.016), (0.071, 1.050)],
    [(0.071, 1.050), (0.067, 1.060), (0.058, 1.066), (0.040, 1.068), (0.029, 1.071)],
]
STEM_RUNS = [
    [(0.029, 1.071), (0.026, 1.082), (0.027, 1.088), (0.035, 1.094), (0.027, 1.100), (0.024, 1.110),
     (0.022, 1.126)],
]
MEDALLION_Y = 1.237
FACE_R, FACE_Z = 0.087, 0.0245
# Medallion bezel, revolved around the z axis: (rho, z) from the front face rim to the back.
RIM_RUN = [(FACE_R, FACE_Z), (0.091, 0.031), (0.100, 0.034), (0.108, 0.030), (0.114, 0.020), (0.117, 0.008),
           (0.117, -0.008), (0.114, -0.020), (0.108, -0.030), (0.100, -0.034), (0.091, -0.031),
           (FACE_R, -FACE_Z)]
KNOB_Y, KNOB_R = MEDALLION_Y + 0.117 + 0.009, 0.0135
LABEL_Y = (0.228, 0.372)
LIQUID_TOP = 0.955


def resample(points, n):
    """Smooth a profile run and resample it evenly by arc length."""
    p = np.asarray(points, float)
    t = np.r_[0, np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))]
    fr, fy = PchipInterpolator(t, p[:, 0]), PchipInterpolator(t, p[:, 1])
    dense = np.linspace(0, t[-1], 400)
    q = np.c_[fr(dense), fy(dense)]
    s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(q, axis=0), axis=1))]
    ts = np.interp(np.linspace(0, s[-1], n), s, dense)
    return np.c_[fr(ts), fy(ts)]


def profile_normals(p):
    """Outward normals of a profile traversed bottom-centre -> out -> up -> in."""
    d = np.gradient(p, axis=0)
    n = np.c_[d[:, 1], -d[:, 0]]
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)


class Part:
    """Mesh part: positions, normals, uvs, triangles, plus a per-vertex profile parameter."""

    def __init__(self, P, N, T, s, a):
        self.P, self.N, self.T, self.s, self.a = P, N, T, s, a  # s: 0..1 along profile, a: 0..1 around
        self.uv = np.zeros((len(P), 2))

    def map_uv(self, u0, u1, v0, v1, along='s'):
        """Map the around-parameter to u and the along-parameter to v."""
        self.uv = np.c_[u0 + (u1 - u0) * self.a, v0 + (v1 - v0) * (self.s if along == 's' else self.a)]
        return self


def revolve(profile, seg, axis='y', center=(0.0, 0.0, 0.0), theta0=0.0, normals=None):
    """Revolve (r, h) samples. axis 'y': x = r sin t, z = r cos t (t = 0 faces +z).
    axis 'z': h is z, the ring lies in the xy plane around `center`."""
    p = np.asarray(profile, float)
    n2 = profile_normals(p) if normals is None else np.asarray(normals, float)
    rings, cols = len(p), seg + 1
    t = theta0 + np.linspace(0, 2 * np.pi, cols)
    R, Hh = p[:, 0][:, None], p[:, 1][:, None]
    nr, nh = n2[:, 0][:, None], n2[:, 1][:, None]
    st, ct = np.sin(t)[None], np.cos(t)[None]
    if axis == 'y':
        P = np.stack([R * st, Hh + 0 * st, R * ct], -1)
        N = np.stack([nr * st, nh + 0 * st, nr * ct], -1)
    else:
        P = np.stack([R * ct, R * st, Hh + 0 * st], -1)
        N = np.stack([nr * ct, nr * st, nh + 0 * st], -1)
    P = P.reshape(-1, 3) + np.asarray(center)
    N = N.reshape(-1, 3)
    s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))]
    s = np.repeat(s / max(s[-1], 1e-9), cols)
    a = np.tile(np.linspace(0, 1, cols), rings)
    T = []
    for i in range(rings - 1):
        for j in range(seg):
            A, B, C, D = i * cols + j, i * cols + j + 1, (i + 1) * cols + j, (i + 1) * cols + j + 1
            T += [(A, B, C), (B, D, C)]
    part = Part(P, N, np.array(T), s, a)
    return fix_winding(drop_degenerate(part))


def disc(radius, z, seg, rings, center, facing):
    """Flat disc in the xy plane at depth z, facing +z (1) or -z (-1). a/s carry polar uv inputs."""
    rr = np.linspace(0, radius, rings + 1)
    t = np.linspace(0, 2 * np.pi, seg + 1)
    X = rr[:, None] * np.cos(t)[None]
    Y = rr[:, None] * np.sin(t)[None]
    P = np.stack([X, Y, np.full_like(X, z)], -1).reshape(-1, 3) + np.asarray(center)
    N = np.tile([0, 0, facing], (len(P), 1)).astype(float)
    cols = seg + 1
    T = []
    for i in range(rings):
        for j in range(seg):
            A, B, C, D = i * cols + j, i * cols + j + 1, (i + 1) * cols + j, (i + 1) * cols + j + 1
            T += [(A, B, C), (B, D, C)]
    part = Part(P, N, np.array(T), np.repeat(rr / radius, cols), np.tile(np.linspace(0, 1, cols), rings + 1))
    part.local = np.c_[X.ravel(), Y.ravel()] / radius  # unit-disc coordinates for polar uv
    return fix_winding(drop_degenerate(part))


def drop_degenerate(part):
    P, T = part.P, part.T
    area = np.linalg.norm(np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]]), axis=1)
    part.T = T[area > 1e-12]
    return part


def fix_winding(part):
    P, T, N = part.P, part.T, part.N
    fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
    flip = np.sum(fn * N[T].mean(1), axis=1) < 0
    part.T = np.where(flip[:, None], T[:, ::-1], T)
    return part


def merge(parts):
    P, N, UV, T, off = [], [], [], [], 0
    for p in parts:
        P.append(p.P)
        N.append(p.N)
        UV.append(p.uv)
        T.append(p.T + off)
        off += len(p.P)
    return np.vstack(P), np.vstack(N), np.vstack(UV), np.vstack(T)


def runs(run_list, n_total, seg, **kw):
    """Revolve several runs, giving each a share of n_total samples by length."""
    lengths = [np.sum(np.linalg.norm(np.diff(np.asarray(r, float), axis=0), axis=1)) for r in run_list]
    out = []
    for r, length in zip(run_list, lengths):
        n = max(3, int(round(n_total * length / sum(lengths))))
        out.append(revolve(resample(r, n), seg, **kw))
    return out


def glass_profile(n):
    return resample(GLASS_RUNS[0], n)


def radius_at(y, n=600):
    """Outer glass radius as a function of height on the body (single valued there)."""
    p = glass_profile(n)
    k = (p[:, 1] > 0.02) & (p[:, 1] < 0.95)
    p = p[k]
    o = np.argsort(p[:, 1])
    return np.interp(y, p[o, 1], p[o, 0])


def label_band(seg, rows=8, offset=0.0025):
    y = np.linspace(*LABEL_Y, rows + 1)
    prof = np.c_[radius_at(y) + offset, y]
    return revolve(prof, seg, theta0=-np.pi)  # seam at the back; a = 0.5 faces +z


def liquid(seg, n):
    """Inner volume of the glass: the outer profile pushed in along its normal, capped flat at LIQUID_TOP."""
    p = glass_profile(n * 3)
    nn = profile_normals(p)
    thick = np.where(p[:, 1] < 0.02, 0.012, 0.006)
    q = p - nn * thick[:, None]
    q = q[q[:, 1] < LIQUID_TOP - 0.004]
    q[:, 0] = np.maximum(q[:, 0], 0)
    q[0, 0] = 0
    r_top = radius_at(LIQUID_TOP) - 0.006
    side = revolve(resample(np.vstack([q, [r_top, LIQUID_TOP]]), n), seg)
    top = revolve(np.array([[r_top, LIQUID_TOP], [r_top * 0.5, LIQUID_TOP], [0, LIQUID_TOP]]), seg)
    return [side, top]


def medallion_rim(seg, n):
    rim = resample(RIM_RUN, n)
    return revolve(rim, seg, axis='z', center=(0, MEDALLION_Y, 0))


def knob(seg, rings):
    t = np.linspace(-np.pi / 2, np.pi / 2, rings)
    prof = np.c_[KNOB_R * np.cos(t), KNOB_Y + KNOB_R * np.sin(t)]
    prof[0, 0] = prof[-1, 0] = 0
    return revolve(prof, seg)


def faces(seg, rings, z_lift=0.001):
    front = disc(FACE_R, FACE_Z + z_lift, seg, rings, (0, MEDALLION_Y, 0), 1)
    back = disc(FACE_R, -FACE_Z - z_lift, seg, rings, (0, MEDALLION_Y, 0), -1)
    return front, back
