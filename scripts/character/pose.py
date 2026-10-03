"""Forward kinematics, aiming, two-bone IK and linear blend skinning."""
import numpy as np
import geom
import skeleton as sk


class Pose:
    def __init__(self, M):
        self.heads = M['heads']
        self.tails = M['tails']
        self.parents = M['parents']
        self.W = M['W']
        self.n = len(self.heads)
        self.local = [np.eye(3) for _ in range(self.n)]
        self.root_pos = self.heads[0].copy()
        self.root_rot = np.eye(3)
        self.scale = 1.0
        self.order = self._order()

    def _order(self):
        done, order = set(), []
        while len(order) < self.n:
            for i in range(self.n):
                if i not in done and (self.parents[i] < 0 or self.parents[i] in done):
                    done.add(i)
                    order.append(i)
        return order

    def world(self):
        Rw = [None] * self.n
        Hw = [None] * self.n
        for i in self.order:
            p = self.parents[i]
            if p < 0:
                Rw[i] = self.root_rot @ self.local[i]
                Hw[i] = self.root_pos.copy()
            else:
                Rw[i] = Rw[p] @ self.local[i]
                Hw[i] = Hw[p] + Rw[p] @ (self.heads[i] - self.heads[p]) * self.scale
        return Rw, Hw

    def joint(self, name, tail=False):
        Rw, Hw = self.world()
        i = sk.INDEX[name]
        if tail:
            return Hw[i] + Rw[i] @ (self.tails[i] - self.heads[i]) * self.scale
        return Hw[i]

    def bone_dir(self, name):
        Rw, _ = self.world()
        i = sk.INDEX[name]
        d = Rw[i] @ (self.tails[i] - self.heads[i])
        return d / np.linalg.norm(d)

    def parent_rot(self, i):
        Rw, _ = self.world()
        p = self.parents[i]
        return self.root_rot if p < 0 else Rw[p]

    def aim(self, name, direction, roll_axis=None, roll_target=None):
        """Point bone `name` along world `direction` (minimal swing).

        roll_axis: optional rest-space vector on the bone to align (after the
        swing) toward world `roll_target`, twisting about the bone axis.
        """
        i = sk.INDEX[name]
        Rp = self.parent_rot(i)
        u = self.tails[i] - self.heads[i]
        d = Rp.T @ np.asarray(direction, float)
        R = geom.rot_between(u, d)
        if roll_axis is not None:
            a = R @ np.asarray(roll_axis, float)
            t = Rp.T @ np.asarray(roll_target, float)
            axis = d / np.linalg.norm(d)
            a -= axis * a.dot(axis)
            t -= axis * t.dot(axis)
            if np.linalg.norm(a) > 1e-6 and np.linalg.norm(t) > 1e-6:
                a /= np.linalg.norm(a)
                t /= np.linalg.norm(t)
                ang = np.arctan2(np.cross(a, t).dot(axis), a.dot(t))
                R = geom.axis_angle(axis, ang) @ R
        self.local[i] = R

    def rotate(self, name, axis_world, angle):
        """Extra rotation of a bone about a world axis through its head."""
        i = sk.INDEX[name]
        Rp = self.parent_rot(i)
        Rw = Rp @ self.local[i]
        Rw = geom.axis_angle(axis_world, angle) @ Rw
        self.local[i] = Rp.T @ Rw

    def two_bone(self, upper, lower, target, pole):
        """Analytic two-bone IK: place `lower`'s tail at target, bend toward pole."""
        a = self.joint(upper)
        l1 = np.linalg.norm(self.heads[sk.INDEX[lower]] - self.heads[sk.INDEX[upper]]) * self.scale
        l2 = np.linalg.norm(self.tails[sk.INDEX[lower]] - self.heads[sk.INDEX[lower]]) * self.scale
        t = np.asarray(target, float)
        d = t - a
        dist = np.clip(np.linalg.norm(d), 1e-6, (l1 + l2) * 0.9999)
        dn = d / np.linalg.norm(d)
        pole = np.asarray(pole, float)
        pv = pole - a
        pv -= dn * pv.dot(dn)
        if np.linalg.norm(pv) < 1e-6:
            pv = np.cross(dn, [1, 0, 0])
        pv /= np.linalg.norm(pv)
        cos_a = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)
        ang = np.arccos(np.clip(cos_a, -1, 1))
        elbow = a + dn * np.cos(ang) * l1 + pv * np.sin(ang) * l1
        self.aim(upper, elbow - a)
        self.aim(lower, t - elbow)

    def matrices(self):
        Rw, Hw = self.world()
        return Rw, Hw

    def skin(self, P, N=None):
        Rw, Hw = self.world()
        out = np.zeros_like(P)
        nout = np.zeros_like(P) if N is not None else None
        W = self.W
        for i in range(self.n):
            w = W[:, i]
            m = w > 1e-5
            if not m.any():
                continue
            q = (P[m] - self.heads[i]) * self.scale
            out[m] += w[m, None] * (q @ Rw[i].T + Hw[i])
            if N is not None:
                nout[m] += w[m, None] * (N[m] @ Rw[i].T)
        if N is not None:
            nout /= np.maximum(np.linalg.norm(nout, axis=1, keepdims=True), 1e-9)
        return out, nout
