"""Hair bone chains: let long hair stream and flutter in animation.

Strands that hang free are clustered by where they leave the scalp; each
cluster gets a chain of bones along its mean free path, parented to the head.
Free hair vertices are weighted along their chain; scalp-hugging parts and the
bangs stay on the head. Animation layers travelling sine waves down each chain
(phase-shifted per chain), on top of the head's motion.

All matrices are 4x4 world matrices in Blender space.
"""
import numpy as np

import hair as hair_mod

SEGMENTS = 4


def _frame(head, tail, up=(0, 0, 1.0)):
    y = tail - head
    y = y / np.linalg.norm(y)
    x = np.cross(y, np.asarray(up, float))
    if np.linalg.norm(x) < 1e-6:
        x = np.cross(y, [0, 1.0, 0])
    x /= np.linalg.norm(x)
    z = np.cross(x, y)
    M = np.eye(4)
    M[:3, 0], M[:3, 1], M[:3, 2], M[:3, 3] = x, y, z, head
    return M


def _rot(axis, ang):
    axis = np.asarray(axis, float)
    axis = axis / np.linalg.norm(axis)
    K = np.array([[0, -axis[2], axis[1]], [axis[2], 0, -axis[0]], [-axis[1], axis[0], 0]])
    R = np.eye(3) + np.sin(ang) * K + (1 - np.cos(ang)) * K @ K
    M = np.eye(4)
    M[:3, :3] = R
    return M


class HairRig:
    def __init__(self, H, head_bind, head_rest, n_chains=14, seed=5):
        """H: grow() result in the bind pose; head_bind/head_rest: head world matrices in that pose and at rest."""
        X, groups, pinned = H['X'], H['groups'], H['pinned']
        S, N, _ = X.shape
        rng = np.random.default_rng(seed)
        phi = H['roots'][:, 0]
        movable = ~np.isin(groups, ('bangs', 'side')) & (H['lengths'] > 0.12)
        # Cluster by azimuth (front pieces form their own clusters per side).
        bins = np.linspace(-np.pi, np.pi, n_chains + 1)
        cid = np.full(S, -1)
        for i in np.flatnonzero(movable):
            cid[i] = np.clip(np.searchsorted(bins, phi[i]) - 1, 0, n_chains - 1)
        front = movable & np.isin(groups, ('front', 'frame'))
        cid[front] = n_chains + (phi[front] > 0).astype(int)
        self.chains = []
        self.weights_v = None
        self.names, self.rest_world, self.bind_world = [], [], []
        self.chain_of_strand = cid
        back = head_rest @ np.linalg.inv(head_bind)
        for c in np.unique(cid[cid >= 0]):
            members = np.flatnonzero(cid == c)
            # Mean free path sampled at fractions along each member's free span.
            fr = np.linspace(0, 1, SEGMENTS + 1)
            pts = []
            for i in members:
                free = np.flatnonzero(~pinned[i])
                a = max(free[0] - 1, 0) if len(free) else N - 2
                seg = X[i, a:]
                d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(seg, axis=0), axis=1))]
                t = fr * d[-1]
                pts.append(np.c_[[np.interp(t, d, seg[:, k]) for k in range(3)]].T)
            G = np.mean(pts, 0)
            mats = [_frame(G[k], G[k + 1]) for k in range(SEGMENTS)]
            names = [f'hair{c:02d}_{k}' for k in range(SEGMENTS)]
            # One wave travelling round her head rather than every chain on its own beat: neighbouring
            # chains sway nearly together (out of step, the locks of one parted from the next and her
            # shoulder showed through a tear in her hair), each a little its own.
            az = float(np.arctan2(np.sin(phi[members]).mean(), np.cos(phi[members]).mean()))
            self.chains.append(dict(id=c, members=members, guide=G, names=names, bind=mats,
                                    phase=1.0 * az + rng.uniform(-0.25, 0.25),
                                    phase2=2.0 * az + rng.uniform(-0.25, 0.25),   # (whole turns round her head: no seam behind it)
                                    amp=rng.uniform(0.9, 1.1)))
            for k, n in enumerate(names):
                self.names.append(n)
                self.bind_world.append(mats[k])
                self.rest_world.append(back @ mats[k])  # rest = carried back with the head
        self.H = H

    # ---------------------------------------------------------------- skeleton integration
    def extend(self, names, parents, rest_mats):
        """Append chain bones to a skeleton: returns (names, parents, rest_mats)."""
        hb = names.index('head')
        nn = list(names)
        pp = list(parents)
        rm = list(rest_mats)
        for ch in self.chains:
            for k, n in enumerate(ch['names']):
                pp.append(hb if k == 0 else len(nn) - 1)
                nn.append(n)
                rm.append(self.rest_world[self.names.index(n)])
        return nn, np.array(pp), np.array(rm)

    def hair_weights(self, W, names_ext, n_strand_verts=None, near=None):
        """Replace weights of free hair vertices with chain weights. W: (V, B) for the ribbon verts
        (hair.RING verts per strand point, strand-major as in hair.ribbons)."""
        X, pinned = self.H['X'], self.H['pinned']
        S, N, _ = X.shape
        Wn = np.zeros((W.shape[0], len(names_ext)), np.float32)
        Wn[:, :W.shape[1]] = W
        hb = names_ext.index('head')
        K = hair_mod.RING
        for ch in self.chains:
            idx = [names_ext.index(n) for n in ch['names']]
            G = ch['guide']
            for i in ch['members']:
                free = np.flatnonzero(~pinned[i])
                if not len(free):
                    continue
                a = max(free[0] - 1, 0)
                seg = X[i, a:]
                d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(seg, axis=0), axis=1))]
                f = d / max(d[-1], 1e-9) * SEGMENTS
                for j, ff in enumerate(f):
                    k = int(np.clip(np.floor(ff), 0, SEGMENTS - 1))
                    u = ff - k
                    w = np.zeros(len(names_ext), np.float32)
                    # Blend head -> first bone over the first half segment for a soft release.
                    lead = np.clip(ff / 0.5, 0, 1)
                    w[idx[k]] += (1 - u) * lead
                    if k + 1 < SEGMENTS:
                        w[idx[k + 1]] += u * lead
                    else:
                        w[idx[k]] += u * lead
                    w[hb] += 1 - lead
                    # A lock that has strayed from its chain's guide (hanging where the rest of the chain
                    # rises, say) would swing on a long lever and sweep through her: it keeps its body
                    # weights instead, more so the further it strays.
                    g = G[k] * (1 - u) + G[min(k + 1, SEGMENTS)] * u
                    follow = np.clip(1 - (np.linalg.norm(seg[j] - g) - 0.04) / 0.08, 0, 1)
                    rows = slice((i * N + a + j) * K, (i * N + a + j + 1) * K)
                    if near is not None:
                        # Hair lying on her does not flutter.
                        follow *= 1 - float(near[rows].mean())
                    Wn[rows] = follow * w[None] + (1 - follow) * Wn[rows]
        return Wn

    # ---------------------------------------------------------------- animation
    def frame(self, head_world, head_rest, t, amp=1.0, wind_dir=(0, 1, 0.1), cycles=(1, 2)):
        """World matrices of all chain bones at loop time t in [0, 1)."""
        out = {}
        carry = head_world @ np.linalg.inv(head_rest)
        w = np.asarray(wind_dir, float)
        w /= np.linalg.norm(w)
        for ch in self.chains:
            prev = None
            for k, n in enumerate(ch['names']):
                rest = self.rest_world[self.names.index(n)]
                if prev is None:
                    W = carry @ rest
                else:
                    W = prev @ (np.linalg.inv(prev_rest) @ rest)
                gain = (0.35 + 0.3 * k) * ch['amp'] * amp
                a1 = np.radians(7.0) * gain * np.sin(2 * np.pi * cycles[0] * t - 0.9 * k + ch['phase'])
                a2 = np.radians(4.5) * gain * np.sin(2 * np.pi * cycles[1] * t - 1.3 * k + ch['phase2'])
                # Flutter about the bone's local X (lift/drop) and Z (side to side).
                R = _rot([1, 0, 0], a1) @ _rot([0, 0, 1], a2)
                Wr = W.copy()
                Wr[:3, :3] = W[:3, :3] @ R[:3, :3]
                out[n] = Wr
                prev, prev_rest = Wr, rest
        return out
