"""Chaewon emblem line art for the loader animation, in the Lottie composition's 400 x 400 frame.

Art Nouveau line style like the Spirit saint it replaces, now telling Voyage's story: Chaewon before the
last sun of summer, framed by the basalt sea arch, the sea and her sloop behind her. The wind carries her
long hair out to one side; see-through bangs, a small V-line face, her lace sundress on spaghetti straps,
and her fingertips resting on the Trapnest compass pendant at her throat.

Paths are absolute SVG commands (M, L, C, Q, Z). Three layers, drawn top to bottom:
  STROKE  her figure (white strokes)
  FILL    closed shapes of her figure, filled with the loader's dark ground so the scenery behind her
          (BACK) stops at her outline
  BACK    the arch, the sun, the sea and the sloop (white strokes)
DOTS are small filled circles (her irises, the pearl).
"""
import math


def f(v):
    return ('%.2f' % v).rstrip('0').rstrip('.')


def P(*pts):
    return ' '.join(f(v) for p in pts for v in p)


def circle(cx, cy, r):
    k = 0.5523 * r
    return ('M%s C%s %s %s C%s %s %s C%s %s %s C%s %s %s Z' % (
        P((cx, cy - r)), P((cx + k, cy - r)), P((cx + r, cy - k)), P((cx + r, cy)), P((cx + r, cy + k)),
        P((cx + k, cy + r)), P((cx, cy + r)), P((cx - k, cy + r)), P((cx - r, cy + k)), P((cx - r, cy)),
        P((cx - r, cy - k)), P((cx - k, cy - r)), P((cx, cy - r))))


def arc(cx, cy, r, a0, a1, move=True):
    """Circular arc (degrees, y down, 0 = +x, counter-clockwise on screen = decreasing angle) as cubics."""
    n = max(1, int(math.ceil(abs(a1 - a0) / 45.0)))
    out = []
    da = (a1 - a0) / n
    for k in range(n):
        t0, t1 = math.radians(a0 + da * k), math.radians(a0 + da * (k + 1))
        h = 4 / 3 * math.tan((t1 - t0) / 4)
        p0 = (cx + r * math.cos(t0), cy + r * math.sin(t0))
        p3 = (cx + r * math.cos(t1), cy + r * math.sin(t1))
        p1 = (p0[0] - h * r * math.sin(t0), p0[1] + h * r * math.cos(t0))
        p2 = (p3[0] + h * r * math.sin(t1), p3[1] - h * r * math.cos(t1))
        if k == 0 and move:
            out.append('M%s' % P(p0))
        out.append('C%s' % P(p1, p2, p3))
    return ' '.join(out)


def mirror(d, axis=200):
    """Mirror an absolute path about x = axis."""
    import re
    out, toks, k = [], re.findall(r'[MLCQZ]|-?\d*\.?\d+', d), 0
    for t in toks:
        if t in 'MLCQZ':
            out.append(t)
            k = 0
        else:
            v = float(t)
            out.append(f(2 * axis - v if k % 2 == 0 else v))
            k += 1
    return ' '.join(out)


def xform(d, ang=0.0, about=(200, 200), dx=0.0, dy=0.0, scale=1.0):
    """Scale and rotate an absolute path (`ang` degrees) about a point, then shift it."""
    import re
    c, s = math.cos(math.radians(ang)) * scale, math.sin(math.radians(ang)) * scale
    out, toks, buf = [], re.findall(r'[MLCQZ]|-?\d*\.?\d+', d), []
    for t in toks:
        if t in 'MLCQZ':
            out.append(t)
        else:
            buf.append(float(t))
            if len(buf) == 2:
                x, y = buf[0] - about[0], buf[1] - about[1]
                out.append(P((about[0] + c * x - s * y + dx, about[1] + s * x + c * y + dy)))
                buf = []
    return ' '.join(out)


# ------------------------------------------------------------------ scenery (BACK)

ARCH_C, ARCH_RI, ARCH_RO = (200, 176), 112, 134   # the sea arch: inner opening and outer contour
HORIZON = 262
SUN = (200, 150, 76)                               # the last sun of summer, a halo behind her head


def _scenery():
    cx, cy = ARCH_C
    out = []
    # The arch: outer and inner contours down to the frame's foot, basalt blocks between them.
    for r in (ARCH_RO, ARCH_RI):
        out.append('M%s L%s ' % (P((cx - r, 404)), P((cx - r, cy))) + arc(cx, cy, r, 180, 360, move=False) +
                   ' L%s' % P((cx + r, 404)))
    for k in range(1, 10):
        a = math.radians(180 + 180 * k / 10)
        out.append('M%s L%s' % (P((cx + ARCH_RI * math.cos(a), cy + ARCH_RI * math.sin(a))),
                                P((cx + ARCH_RO * math.cos(a), cy + ARCH_RO * math.sin(a)))))
    for side in (-1, 1):
        for y in (cy, cy + 52, cy + 104, cy + 156):
            out.append('M%s L%s' % (P((cx + side * ARCH_RI, y)), P((cx + side * ARCH_RO, y))))
    # The sun: a full disc behind her head, banded low down like a sunset.
    sx, sy, sr = SUN
    out.append(circle(sx, sy, sr))
    for y, w in ((sy + 62, 1.0), (sy + 50, 1.0), (sy + 38, 1.0)):
        half = math.sqrt(max(sr * sr - (y - sy) ** 2, 0)) * w
        out.append('M%s L%s' % (P((sx - half, y)), P((sx + half, y))))
    # The sea: the horizon and three swells, inside the arch.
    x0, x1 = cx - ARCH_RI, cx + ARCH_RI
    out.append('M%s L%s' % (P((x0, HORIZON)), P((x1, HORIZON))))
    for k, y in enumerate((284, 312, 344)):
        amp, n = 4.0 + k * 1.2, 5 - (k // 2)
        step = (x1 - x0) / n
        d = 'M%s' % P((x0, y))
        for j in range(n):
            xa = x0 + j * step
            ph = 1 if (j + k) % 2 else -1
            d += ' C%s' % P((xa + step * 0.3, y - amp * ph), (xa + step * 0.7, y - amp * ph), (xa + step, y))
        out.append(d)
    # Her sloop on the horizon, sails full.
    bx, by = 112, HORIZON
    out.append('M%s L%s L%s L%s Z' % (P((bx - 13, by - 3)), P((bx + 13, by - 3)), P((bx + 9, by + 3)), P((bx - 10, by + 3))))
    out.append('M%s L%s' % (P((bx - 1, by - 3)), P((bx - 1, by - 38))))
    out.append('M%s Q%s %s L%s Z' % (P((bx + 1, by - 36)), P((bx + 15, by - 20)), P((bx + 13, by - 7)), P((bx + 1, by - 7))))
    out.append('M%s Q%s %s Z' % (P((bx - 3, by - 32)), P((bx - 13, by - 17)), P((bx - 13, by - 7))))
    return out


# ------------------------------------------------------------------ Chaewon (STROKE, FILL)

HEAD_TILT = -6.0           # her head tilts toward her right shoulder (viewer's left)
HEAD_SCALE = 1.22
NECK = (200, 186)          # pivot of the head drawing
HEAD_SHIFT = (0, 7)


def _head():
    """Face, features, bangs and the crown of her hair, drawn upright at unit scale, then scaled and tilted."""
    out, fill, dots = [], [], []
    face = 'M176 128 C175 146 182 162 192 171 C196 175 204 175 208 171 C218 162 225 146 224 128'
    out.append(face)
    crown = 'M200 98 C182 97 168 107 166 126 C165 140 167 152 171 164'
    out += [crown, mirror(crown), 'M200 98 L200 104']
    out += ['M199 104 C195 112 191 121 188 132', 'M197 104 C190 110 184 118 180 128', 'M195 103 C186 108 177 116 173 128',
            'M201 104 C205 112 209 121 212 132', 'M203 104 C210 110 216 118 220 128', 'M205 103 C214 108 223 116 227 128']
    for sg in (-1, 1):
        ex = 200 + sg * 12.5
        out.append('M%s Q%s %s' % (P((ex - sg * 6.5, 133.6)), P((ex, 131.8)), P((ex + sg * 7.5, 133.2))))
        out.append('M%s C%s %s %s' % (P((ex - sg * 7, 142)), P((ex - sg * 4, 137.6)), P((ex + sg * 4, 137.2)), P((ex + sg * 8, 140.6))))
        out.append('M%s L%s' % (P((ex + sg * 8, 140.6)), P((ex + sg * 10.5, 139.2))))
        out.append('M%s Q%s %s' % (P((ex - sg * 4.5, 145.6)), P((ex, 147.4)), P((ex + sg * 5.5, 144.4))))
        dots.append((ex, 142.3, 2.5))
    out.append('M201 152.5 C200.6 154.8 200.2 156 201.4 157')
    out.append('M194.5 163.2 C197 162 199 162.2 200 163 C201 162.2 203 162 205.5 163.2')
    out.append('M196 164.2 C198.5 167.2 201.5 167.2 204 164.2')
    fill.append(face + ' C224 116 214 104 200 103 C186 104 176 116 176 128 Z')
    fill.append(crown + ' L176 128 C176 116 186 104 200 103 C214 104 224 116 224 128 L229 164 '
                'C233 152 235 140 234 126 C232 107 218 97 200 98 Z')
    tf = lambda d: xform(d, HEAD_TILT, NECK, HEAD_SHIFT[0], HEAD_SHIFT[1], HEAD_SCALE)
    pt = lambda x, y: tuple(float(v) for v in tf('M%s' % P((x, y)))[1:].split())
    return [tf(d) for d in out], [tf(d) for d in fill], [pt(x, y) + (r * HEAD_SCALE,) for x, y, r in dots]


def _figure():
    out, fill = [], []
    # Where the drawn head meets the neck (scaled and tilted with it).
    tf = lambda x, y: tuple(float(v) for v in xform('M%s' % P((x, y)), HEAD_TILT, NECK, HEAD_SHIFT[0], HEAD_SHIFT[1],
                                                        HEAD_SCALE)[1:].split())
    jl, jr = tf(192.5, 170), tf(207.5, 170)
    # Neck and the slope of her shoulders; slender arms.
    out += ['M%s L%s' % (P(jl), P((192, 206))), 'M%s L%s' % (P(jr), P((209, 206)))]
    out.append('M192 206 C181 212 166 214 154 219 C144 223 140 233 139 247')      # her right shoulder (viewer's left)
    out.append('M209 206 C220 212 236 214 248 219 C258 223 262 233 263 249')      # her left shoulder
    # Her right arm: down to the elbow, then the forearm rises across her and the hand lifts to the pendant,
    # fingertips touching it.
    out.append('M139 247 C137 270 139 292 147 308 C152 317 160 316 166 308 C172 298 178 284 183 270')
    out.append('M151 251 C150 268 152 284 158 296 C163 288 168 278 172 268')
    out.append('M172 268 C176 262 180 258 185 256 C189 254 193 252 196 250')   # back of the hand to the index tip
    out.append('M183 270 C187 266 191 263 195 261')                              # the curled middle finger
    out.append('M185 256 C187 252 189 249 191 247')                              # the thumb, behind the chain
    # Left arm, behind her hair.
    out.append('M263 249 C265 274 264 300 260 322')
    # Straps, the lace V-neck with scallops, the bodice drawn in to the waist, the skirt's flare.
    out += ['M176 218 L178 258', 'M224 218 L222 258']
    scal = 'M178 258 Q181 263 185 261 Q188 266 192 264 Q195 270 200 276'
    out += [scal, mirror(scal)]
    side = 'M161 262 C162 284 166 300 172 316 C176 326 178 334 179 342'
    bust = 'M170 280 C175 294 189 298 197 290'
    out += [side, mirror(side), mirror(bust)]
    out.append('M179 342 C192 346 208 346 221 342')
    out += ['M179 342 C170 366 163 386 157 404', 'M221 342 C230 366 237 386 243 404',
            'M192 346 C189 368 187 388 186 404', 'M208 346 C211 368 213 388 214 404']
    for x, y in ((214, 306), (199, 324), (186, 310)):
        out.append(circle(x, y, 2.6))
    # The compass pendant on its chain.
    out.append('M194 206 C196 221 198 230 199.5 238')
    out.append('M207 206 C205 221 202 230 200.5 238')
    out.append(circle(200, 245, 7))
    out.append('M200 236 L202.3 242.7 L209 245 L202.3 247.3 L200 254 L197.7 247.3 L191 245 L197.7 242.7 Z')
    # Long hair: on her right it falls over her shoulder in front; on her left the wind carries it out
    # past the arch in long Art Nouveau curves.
    out += ['M170 182 C166 204 160 222 158 242 C156 258 158 272 162 284',
            'M176 186 C173 206 170 222 169 240']
    wind = ['M236 174 C246 192 262 202 282 206 C304 210 318 226 326 250',
            'M232 182 C242 204 262 218 284 226 C304 233 314 252 316 274',
            'M229 190 C238 216 256 236 276 248 C292 258 298 276 296 296',
            'M248 196 C266 204 290 204 312 212', 'M254 214 C276 222 298 230 308 246',
            'M238 210 C250 236 266 254 284 268']
    out += wind
    # Backing: her silhouette below the head, so the sea and the sun stop at her outline.
    fill.append('M%s L192 206 C181 212 166 214 154 219 C144 223 140 233 139 247 C137 270 139 292 147 308 '
                'C152 317 160 316 166 308 L172 316 C176 326 178 334 179 342 C170 366 163 386 157 404 L243 404 '
                'C237 386 230 366 221 342 C222 334 224 326 228 316 L260 322 C264 300 265 274 263 249 '
                'C276 262 290 270 296 296 C300 280 312 270 316 274 C318 262 322 256 326 250 '
                'C318 226 304 210 282 206 C262 202 246 192 236 174 L%s Z' % (P(jl), P(jr)))
    fill.append('M170 182 C166 204 160 222 158 242 C156 258 158 272 162 284 L170 290 L176 218 Z')
    return out, fill


_HS, _HF, _HD = _head()
_FS, _FF = _figure()
STROKE = _HS + _FS
FILL = _HF + _FF
BACK = _scenery()
DOTS = _HD + [(200, 246, 2.4)]

# Outline of the whole emblem (the arch with everything inside it) for the matte and the dark backing.
SILHOUETTE = ('M%s L%s ' % (P((ARCH_C[0] - ARCH_RO - 3, 406)), P((ARCH_C[0] - ARCH_RO - 3, ARCH_C[1]))) +
              arc(ARCH_C[0], ARCH_C[1], ARCH_RO + 3, 180, 360, move=False) +
              ' L%s Z' % P((ARCH_C[0] + ARCH_RO + 3, 406)))
