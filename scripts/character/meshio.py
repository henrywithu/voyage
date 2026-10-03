"""Read and write the decoded `.mesh` container used by the runtime.

Layout: uint32 little-endian header length, JSON header (space padded to 4
bytes), then Float32/Uint32 payloads addressed by byte offsets in the header.
"""
import json
import struct
import numpy as np


def read(path):
    data = open(path, 'rb').read()
    size = struct.unpack('<I', data[:4])[0]
    header = json.loads(data[4:4 + size])
    base = 4 + size
    arrays = {}
    for name, att in header['attributes'].items():
        a = np.frombuffer(data, np.float32, att['count'], base + att['offset'])
        arrays[name] = a.reshape(-1, att['itemSize']).copy()
    index = None
    if header.get('index'):
        ix = header['index']
        index = np.frombuffer(data, np.uint32, ix['count'], base + ix['offset']).copy()
    return header, arrays, index


def write(path, arrays, index=None, bones=None, extra=None):
    """arrays: ordered dict name -> (N, k) float array."""
    attributes, chunks, offset = {}, [], 0
    for name, a in arrays.items():
        a = np.ascontiguousarray(a, np.float32)
        if a.ndim == 1:
            a = a[:, None]
        attributes[name] = {'offset': offset, 'count': int(a.size), 'itemSize': int(a.shape[1]), 'type': 'Float32Array'}
        chunks.append(a.tobytes())
        offset += a.nbytes
    spec = {'attributes': attributes}
    if index is not None:
        ix = np.ascontiguousarray(index, np.uint32).ravel()
        spec['index'] = {'offset': offset, 'count': int(ix.size), 'itemSize': 1, 'type': 'Uint32Array'}
        chunks.append(ix.tobytes())
        offset += ix.nbytes
    if bones is not None:
        spec['bones'] = bones
    for k, v in (extra or {}).items():
        if v is not None:
            spec[k] = v
    text = json.dumps(spec, separators=(',', ':'))
    text = text.ljust((len(text) + 3) // 4 * 4)
    raw = text.encode()
    with open(path, 'wb') as f:
        f.write(struct.pack('<I', len(raw)))
        f.write(raw)
        for c in chunks:
            f.write(c)


def quat_to_mat(q):
    x, y, z, w = q
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def mat_to_quat(m):
    t = np.trace(m)
    if t > 0:
        s = 0.5 / np.sqrt(t + 1)
        w, x, y, z = 0.25 / s, (m[2, 1] - m[1, 2]) * s, (m[0, 2] - m[2, 0]) * s, (m[1, 0] - m[0, 1]) * s
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = 2 * np.sqrt(1 + m[0, 0] - m[1, 1] - m[2, 2])
        w, x, y, z = (m[2, 1] - m[1, 2]) / s, 0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s
    elif m[1, 1] > m[2, 2]:
        s = 2 * np.sqrt(1 + m[1, 1] - m[0, 0] - m[2, 2])
        w, x, y, z = (m[0, 2] - m[2, 0]) / s, (m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s
    else:
        s = 2 * np.sqrt(1 + m[2, 2] - m[0, 0] - m[1, 1])
        w, x, y, z = (m[1, 0] - m[0, 1]) / s, (m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s
    q = np.array([x, y, z, w])
    return q / np.linalg.norm(q)


def compose(pos, quat, scl):
    m = np.eye(4)
    m[:3, :3] = quat_to_mat(np.asarray(quat, float) / np.linalg.norm(quat)) * np.asarray(scl, float)[None, :]
    m[:3, 3] = pos
    return m


def world_matrices(bones, local=None):
    """local: optional list of 4x4 local matrices overriding the bind data."""
    out = [None] * len(bones)

    def solve(i):
        if out[i] is None:
            b = bones[i]
            m = local[i] if local is not None else compose(b['pos'], b['rot'], b['scl'])
            out[i] = m if b['parent'] < 0 else solve(b['parent']) @ m
        return out[i]
    for i in range(len(bones)):
        solve(i)
    return out


def anim_frames(arrays, n_bones):
    """Return list of (offset (B,3), orientation (B,4), scale (B,3)) per frame."""
    frames = []
    i = 0
    while f'orientation_{i}' in arrays:
        frames.append((arrays.get(f'offset_{i}'), arrays[f'orientation_{i}'], arrays.get(f'scale_{i}')))
        i += 1
    return frames
