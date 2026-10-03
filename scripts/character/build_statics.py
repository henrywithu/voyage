"""Static (unrigged) Chaewon poses for the standing story scenes."""
import os
import sys
import numpy as np
import master
import pose as posing
import poselib
import export
import chaewon as C

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../public/assets/decoded/story/')
S = 1.22  # Chaewon in story units (the saint is ~2.0 tall)


def windmask(X, hair_gain=1.0, skirt_gain=0.6, hips_y=None):
    w = np.zeros(len(X['P']))
    part = X['part']
    hair = part == C.PART_HAIR
    w[hair] = np.clip(X['hair_s'][hair] / (0.35 * S), 0, 1) ** 1.3 * hair_gain
    dress = part == C.PART_DRESS
    y = X['P'][dress, 1]
    lo = y.min()
    w[dress] = np.clip((hips_y - y) / (hips_y - lo), 0, 1) ** 2 * skirt_gain
    return w


def write_static(name, X, ps, clip_below=None, **gains):
    P, N, F = X['P'], X['N'], X['F']
    hips_y = ps.joint('hips')[1]
    attrs = {'uv': X['uvT'], 'uv2': X['uvA'], 'windmask': windmask(X, hips_y=hips_y, **gains)[:, None]}
    if clip_below is not None:
        F = F[(P[F][:, :, 1] > clip_below).any(1)]
    export.write(OUT + name + '.bin.mesh', P, N, F, attrs)
    print(name, len(P), 'verts', len(F), 'tris')


def selection(M, H):
    ps = posing.Pose(M)
    A = poselib.Author(ps, S, 0, (0.0, 0.0, 0.10))
    A.hips(shift=(0.025, -0.012, 0), tilt_side=-5, twist=6)
    A.spine(bend_side=6, lean=-2, twist=-4)
    A.leg('R', (-0.075, 0.065, 0.02), knee_fwd=0.3, toe_dir=(-0.25, -0.3, 1))
    A.leg('L', (0.035, 0.11, 0.06), knee_fwd=0.6, toe_dir=(0.35, -0.6, 1))
    A.clavicle('R', 4)
    A.arm('R', (-0.20, 0.93, -0.01), elbow_pole=(-0.6, 0, -0.6), hand_dir=(0.6, -0.6, 0.2), palm=(1, 0, 0))
    A.arm('L', (0.23, 0.86, 0.06), elbow_pole=(0.3, 0, -1), hand_dir=(0.1, -1, 0.15), palm=(-1, 0, 0.2))
    A.fingers('R', 0.25, 0.15)
    A.fingers('L', 0.35, 0.2)
    A.head(yaw=24, pitch=16, roll=12)
    return master.posed(M, H, ps), ps


def windswept(M, H, variant=0):
    """Seen from behind, facing the portal (-z), hair and skirt in the wind."""
    ps = posing.Pose(M)
    A = poselib.Author(ps, S, 0, (0.015, 0.0, 0.17))
    A.hips(shift=(-0.018, -0.006, 0), tilt_side=3, twist=-4)
    A.spine(bend_side=-3, lean=-3)
    A.leg('L', (0.10, 0.065, 0.03), knee_fwd=0.5, toe_dir=(0.2, -0.3, 1))
    A.leg('R', (-0.085, 0.07, -0.05), knee_fwd=0.4, toe_dir=(-0.2, -0.3, 1))
    if variant == 0:
        A.arm('L', (0.25, 0.87, 0.02), elbow_pole=(0.3, 0, -1), hand_dir=(0.15, -1, 0.1), palm=(-1, 0, 0))
        A.arm('R', (-0.24, 0.89, 0.05), elbow_pole=(-0.3, 0, -1), hand_dir=(-0.15, -1, 0.1), palm=(1, 0, 0))
    else:
        A.arm('L', (0.27, 0.90, 0.06), elbow_pole=(0.4, 0, -1), hand_dir=(0.25, -1, 0.2), palm=(-1, 0, 0))
        A.arm('R', (-0.22, 0.95, 0.10), elbow_pole=(-0.3, 0, -1), hand_dir=(-0.1, -1, 0.3), palm=(1, 0, 0))
    A.fingers('L', 0.3, 0.2)
    A.fingers('R', 0.3, 0.2)
    A.head(yaw=-8 if variant == 0 else 6, pitch=-6, roll=-3)
    return master.posed(M, H, ps), ps


def cathedral(M, H):
    """Seen from behind entering the golden hall; arms relaxed."""
    ps = posing.Pose(M)
    A = poselib.Author(ps, S, 0, (-0.01, 0.0, 0.03))
    A.hips(shift=(0.012, -0.005, 0), tilt_side=-3, twist=3)
    A.spine(bend_side=3, lean=-1)
    A.leg('L', (0.07, 0.065, 0.0), knee_fwd=0.4)
    A.leg('R', (-0.09, 0.065, 0.04), knee_fwd=0.4)
    A.arm('L', (0.24, 0.88, 0.03), elbow_pole=(0.3, 0, -1), hand_dir=(0.12, -1, 0.1), palm=(-1, 0, 0))
    A.arm('R', (-0.24, 0.88, 0.05), elbow_pole=(-0.3, 0, -1), hand_dir=(-0.12, -1, 0.1), palm=(1, 0, 0))
    A.fingers('L', 0.3, 0.2)
    A.fingers('R', 0.3, 0.2)
    A.head(yaw=10, pitch=-4)
    return master.posed(M, H, ps), ps


if __name__ == '__main__':
    M, H = master.load('build/chaewon_master.npz')
    which = sys.argv[1:] or ['selection', 'pose2', 'pose4', 'cathedral']
    if 'selection' in which:
        X, ps = selection(M, H)
        write_static('drinkselection/saint-idle-selection', X, ps, hair_gain=0.35, skirt_gain=0.25)
    if 'pose2' in which:
        X, ps = windswept(M, H, 0)
        write_static('common/saint-pose-2', X, ps, hair_gain=1.0, skirt_gain=0.7)
    if 'pose4' in which:
        X, ps = windswept(M, H, 1)
        write_static('common/saint-pose-4', X, ps, hair_gain=1.0, skirt_gain=0.7)
    if 'cathedral' in which:
        X, ps = cathedral(M, H)
        write_static('cathedral/saint-idle-3-clipped', X, ps, clip_below=0.76, hair_gain=0.3, skirt_gain=0.2)
