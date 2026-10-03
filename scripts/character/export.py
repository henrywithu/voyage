"""Write posed Chaewon geometry into the runtime `.mesh` container."""
import numpy as np
import meshio


def top4(W):
    idx = np.argsort(-W, axis=1)[:, :4]
    w = np.take_along_axis(W, idx, 1)
    w /= np.maximum(w.sum(1, keepdims=True), 1e-9)
    return idx.astype(np.float32), w.astype(np.float32)


def write(path, P, N, F, attrs, bones=None, extra=None):
    arrays = {'position': P, 'normal': N}
    arrays.update(attrs)
    meshio.write(path, arrays, F.astype(np.uint32), bones=bones, extra=extra)
