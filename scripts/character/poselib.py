"""Authoring helpers: pose Chaewon in her own frame (metres, facing +z,
feet on y=0), then place her with a similarity transform."""
import numpy as np
import geom
import skeleton as sk


class Author:
    def __init__(self, ps, scale=1.0, yaw_deg=0.0, place=(0, 0, 0)):
        self.ps = ps
        self.s = scale
        self.R = geom.axis_angle([0, 1, 0], np.radians(yaw_deg))
        self.rest_root = ps.heads[sk.INDEX['hips']].copy()
        self.place = np.asarray(place, float)
        ps.scale = scale
        ps.root_rot = self.R.copy()
        ps.root_pos = self.w(self.rest_root)

    def w(self, p):
        """Local authoring point -> world."""
        p = np.asarray(p, float)
        return self.R @ (p * self.s) + self.place

    def d(self, v):
        """Local direction -> world."""
        return self.R @ np.asarray(v, float)

    def rest(self, name, tail=False):
        i = sk.INDEX[name]
        return (self.ps.tails if tail else self.ps.heads)[i]

    # ---------------------------------------------------------------- body
    def hips(self, shift=(0, 0, 0), tilt_side=0.0, twist=0.0, lean=0.0):
        """Shift/rotate the pelvis (degrees: side tilt, twist about y, lean fwd)."""
        ps = self.ps
        ps.root_pos = self.w(self.rest_root + np.asarray(shift, float))
        R = geom.axis_angle([0, 1, 0], np.radians(twist)) @ geom.axis_angle([0, 0, 1], np.radians(tilt_side)) \
            @ geom.axis_angle([1, 0, 0], np.radians(lean))
        ps.root_rot = self.R @ R

    def spine(self, bend_side=0.0, lean=0.0, twist=0.0):
        """Distribute a bend over the spine (degrees, local axes)."""
        for b, k in (('spine1', 0.15), ('spine2', 0.2), ('spine3', 0.2), ('chest', 0.25), ('upperchest', 0.2)):
            if bend_side:
                self.ps.rotate(b, self.d([0, 0, 1]), np.radians(bend_side * k))
            if lean:
                self.ps.rotate(b, self.d([1, 0, 0]), np.radians(lean * k))
            if twist:
                self.ps.rotate(b, self.d([0, 1, 0]), np.radians(twist * k))

    def head(self, yaw=0.0, pitch=0.0, roll=0.0, neck_share=0.4):
        """Turn the head: yaw (+ = toward her left), pitch (+ = look down), roll (+ = tilt to her left)."""
        for b, k in (('neck', neck_share), ('head', 1 - neck_share)):
            self.ps.rotate(b, self.d([0, 1, 0]), np.radians(yaw * k))
            self.ps.rotate(b, self.d([1, 0, 0]), np.radians(pitch * k))
            self.ps.rotate(b, self.d([0, 0, -1]), np.radians(roll * k))

    def leg(self, side, ankle, knee_fwd=0.4, toe_dir=(0, -0.3, 1)):
        ps = self.ps
        a = self.w(ankle)
        pole = a + self.d([0, 0.5, knee_fwd])
        ps.two_bone(f'thigh.{side}', f'shin.{side}', a, pole)
        ps.aim(f'foot.{side}', self.d(toe_dir))
        ps.aim(f'toes.{side}', self.d(np.asarray(toe_dir) * np.array([1, 0.2, 1])))

    def arm(self, side, wrist, elbow_pole=(0, 0, -1), hand_dir=None, palm=None):
        ps = self.ps
        sh = ps.joint(f'upperarm.{side}')
        wr = self.w(wrist)
        ps.two_bone(f'upperarm.{side}', f'forearm.{side}', wr, wr + self.d(elbow_pole) + (sh - wr) * 0.5)
        if hand_dir is not None:
            if palm is not None:
                sg = 1 if side == 'L' else -1
                ps.aim(f'hand.{side}', self.d(hand_dir), roll_axis=np.array([0, -1.0, 0]), roll_target=self.d(palm))
            else:
                ps.aim(f'hand.{side}', self.d(hand_dir))

    def clavicle(self, side, raise_deg=0.0, fwd_deg=0.0):
        sg = 1 if side == 'L' else -1
        self.ps.rotate(f'clavicle.{side}', self.d([0, 0, sg]), np.radians(raise_deg))
        self.ps.rotate(f'clavicle.{side}', self.d([0, 1, 0]), np.radians(-sg * fwd_deg))

    def fingers(self, side, curl=0.3, thumb=0.2, spread=0.0, per=None):
        """Curl fingers about their own lateral axis (radians-ish factor)."""
        ps = self.ps
        for f in range(1, 6):
            c = thumb if f == 1 else (per[f - 2] if per else curl)
            for seg in range(1, 4):
                name = f'finger{f}-{seg}.{side}'
                i = sk.INDEX[name]
                Rp = ps.parent_rot(i)
                ax = Rp @ ps.local[i] @ np.array([1.0, 0, 0])
                ps.rotate(name, ax, -c * (0.75 + 0.25 * seg))

    def joint_local(self, name, tail=False):
        """Current world joint back in the authoring frame."""
        p = self.ps.joint(name, tail)
        return self.R.T @ (p - self.place) / self.s
