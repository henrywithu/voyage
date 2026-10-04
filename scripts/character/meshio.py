"""Read and write the decoded `.mesh` container used by the runtime.

Layout: uint32 little-endian header length, JSON header (space padded to 4
bytes), then typed payloads addressed by byte offsets in the header (each
4-byte aligned). Attributes are Float32 unless the header names another type:
compact meshes store normals as normalized Int8, trim uvs as Float16, colours and
masks as normalized Uint8, skin indices as Uint8 and weights as normalized
Uint16 (src/engine/assets.ts decodes them; shaders see the same floats).
"""
import json
import struct
import numpy as np

DTYPES = {'Float32Array': np.float32, 'Float16Array': np.float16, 'Uint32Array': np.uint32, 'Uint16Array': np.uint16,
          'Int16Array': np.int16, 'Uint8Array': np.uint8, 'Int8Array': np.int8}
# name -> (array type, normalized)
# (uv2 stays Float32: it addresses the 4096 face atlas, where half floats would shift the drawn lines.)
COMPACT = {'normal': ('Int8Array', True), 'uv': ('Float16Array', False),
           'color': ('Uint8Array', True), 'windmask': ('Uint8Array', True), 'ao': ('Uint8Array', True),
           'skinIndex': ('Uint8Array', False), 'skinWeight': ('Uint16Array', True)}


def _decode(a, att):
    if not att.get('normalized'):
        return a.astype(np.float32)
    lim = {np.int8: 127.0, np.uint8: 255.0, np.int16: 32767.0, np.uint16: 65535.0}[a.dtype.type]
    return np.maximum(a.astype(np.float32) / lim, -1.0)


def read(path):
    data = open(path, 'rb').read()
    size = struct.unpack('<I', data[:4])[0]
    header = json.loads(data[4:4 + size])
    base = 4 + size
    arrays = {}
    for name, att in header['attributes'].items():
        a = np.frombuffer(data, DTYPES[att.get('type', 'Float32Array')], att['count'], base + att['offset'])
        arrays[name] = _decode(a, att).reshape(-1, att['itemSize']).copy()
    index = None
    if header.get('index'):
        ix = header['index']
        index = np.frombuffer(data, DTYPES[ix.get('type', 'Uint32Array')], ix['count'], base + ix['offset']).astype(np.uint32)
    return header, arrays, index


def _encode(name, a, compact):
    """Array and header fields for one attribute, compacted when its values allow it."""
    a = np.asarray(a, np.float32)
    if a.ndim == 1:
        a = a[:, None]
    kind = COMPACT.get(name) if compact else None
    if kind is not None:
        t, norm = kind
        lo, hi = (float(a.min()), float(a.max())) if a.size else (0.0, 0.0)
        if t == 'Int8Array' and lo >= -1.001 and hi <= 1.001:
            return np.round(np.clip(a, -1, 1) * 127).astype(np.int8), t, True
        if t == 'Uint8Array' and norm and lo >= 0 and hi <= 1.0001:
            return np.round(np.clip(a, 0, 1) * 255).astype(np.uint8), t, True
        if t == 'Uint8Array' and not norm and lo >= 0 and hi < 256 and np.all(a == np.round(a)):
            return a.astype(np.uint8), t, False
        if t == 'Uint16Array' and norm and lo >= 0 and hi <= 1.0001:
            return np.round(np.clip(a, 0, 1) * 65535).astype(np.uint16), t, True
        if t == 'Float16Array' and np.all(np.abs(a) < 60000):
            return a.astype(np.float16), t, False
    return np.ascontiguousarray(a, np.float32), 'Float32Array', False


def write(path, arrays, index=None, bones=None, extra=None, compact=True):
    """arrays: ordered dict name -> (N, k) float array. `compact` stores known attributes in smaller types."""
    attributes, chunks, offset = {}, [], 0
    for name, a in arrays.items():
        a, t, norm = _encode(name, a, compact)
        att = {'offset': offset, 'count': int(a.size), 'itemSize': int(a.shape[1]), 'type': t}
        if norm:
            att['normalized'] = True
        attributes[name] = att
        raw = np.ascontiguousarray(a).tobytes()
        raw += b'\0' * (-len(raw) % 4)
        chunks.append(raw)
        offset += len(raw)
    spec = {'attributes': attributes}
    if index is not None:
        ix = np.ascontiguousarray(index, np.uint32).ravel()
        small = compact and ix.size and int(ix.max()) < 65536
        ix = ix.astype(np.uint16) if small else ix
        spec['index'] = {'offset': offset, 'count': int(ix.size), 'itemSize': 1, 'type': 'Uint16Array' if small else 'Uint32Array'}
        raw = ix.tobytes()
        raw += b'\0' * (-len(raw) % 4)
        chunks.append(raw)
        offset += len(raw)
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
