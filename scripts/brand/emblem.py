"""Chaewon emblem line art for the loader animation, in the Lottie composition's 400 x 400 frame.

Art Nouveau line style like the Spirit saint it replaces: Chaewon before a
setting sun, long straight hair with wispy bangs falling over her shoulders,
her spaghetti-strap lace sundress, cradling a Voyage flask in both hands.

Paths are absolute SVG commands (M, L, C, Q, Z), drawn for the left half and
mirrored where marked. DOTS are small filled circles.
"""


def mirror(d):
    """Mirror an absolute path about x = 200."""
    import re
    out, toks, k = [], re.findall(r'[MLCQZ]|-?\d*\.?\d+', d), 0
    for t in toks:
        if t in 'MLCQZ':
            out.append(t)
            k = 0
        else:
            v = float(t)
            out.append('%g' % (400 - v if k % 2 == 0 else v))
            k += 1
    return ' '.join(out)


SIDE = [  # drawn on the viewer's left, mirrored for the right
    # Hair: crown half, and the long front panel falling over the shoulder.
    'M160 104 C154 60 175 40 200 39',
    'M160 104 C158 140 152 166 147 192 C142 220 144 246 152 270 L161 262 C157 238 160 212 166 188 C171 160 173 130 171 96',
    'M156 150 C152 176 147 204 148 236', 'M164 160 C160 190 155 220 156 250',
    # Bangs.
    'M196 44 C187 58 179 74 176 92', 'M198 46 C193 62 189 78 187 95', 'M199 45 C193 54 187 62 181 70',
    # Brow, eye, lashes.
    'M181 99 C185 96 190 96 194 98',
    'M180 108 C184 103 191 102 196 107', 'M182 110 C186 113 191 113 194 109', 'M177 106.5 L180.5 105',
    # Neck and shoulder.
    'M190 141 L190 158', 'M190 158 C182 163 175 166 168 168', 'M148 184 C140 188 136 196 135 208',
    # Arm: upper arm, elbow, forearm rising to the hand at the flask.
    'M135 208 C132 228 131 248 135 264 C139 274 151 272 162 262 L182 240',
    'M151 214 C149 232 149 246 152 255 C160 250 170 242 179 231',
    # Hand cupping the flask from below.
    'M182 240 C182 249 188 255 197 255',
    # Strap, lace neckline, bodice side, skirt.
    'M178 168 L180 205', 'M167 209 Q170 214 174 212 Q177 217 181 214 Q183 219 186 218',
    'M166 214 C168 246 173 274 180 300', 'M180 300 C170 330 160 368 148 404', 'M190 304 C187 340 183 372 179 404',
]
CENTER = [
    # Sun disc behind the head.
    'M200 28 C239 28 270 59 270 98 C270 137 239 168 200 168 C161 168 130 137 130 98 C130 59 161 28 200 28 Z',
    # Face: temples down to a soft V-line chin.
    'M169 88 C168 113 177 133 191 142 C196 146 204 146 209 142 C223 133 232 113 231 88',
    # Centre bangs, nose, lips.
    'M200 46 C199 62 198 78 197 95', 'M199 119 C198 122 197.5 124 199 125.5 L202 125',
    'M191 131 C194.5 129 198 129 200 130.5 C202 129 205.5 129 209 131', 'M192 132 C196 137 204 137 208 132',
    # Waist and the centre fold.
    'M180 300 C193 305 207 305 220 300', 'M200 306 L200 404',
    # The Voyage flask: teardrop body, liquid line, neck, compass medallion stopper.
    'M200 252 C185 252 178 243 178 232 C178 220 190 213 197 205 L197 193 L203 193 L203 205 C210 213 222 220 222 232 C222 243 215 252 200 252 Z',
    'M180 236 C193 240 207 240 220 236', 'M192 191 L208 191',
    'M200 171 C205 171 209 175 209 180 C209 185 205 189 200 189 C195 189 191 185 191 180 C191 175 195 171 200 171 Z',
    'M200 173 L202 178 L207 180 L202 182 L200 187 L198 182 L193 180 L198 178 Z',
]
STROKE = CENTER + SIDE + [mirror(d) for d in SIDE]

DOTS = [(187.5, 108.5, 2.7), (212.5, 108.5, 2.7), (176, 262, 1.5), (224, 262, 1.5), (172, 284, 1.5),
        (228, 284, 1.5), (186, 378, 1.7), (214, 378, 1.7), (168, 396, 1.5), (232, 396, 1.5), (200, 246, 1.6)]

# Outline of sun, hair, arms and skirt for the matte and the dark backing.
SILHOUETTE = ('M200 26 C160 26 128 58 128 98 C128 130 140 156 144 178 C134 188 128 202 128 220 C126 246 128 266 140 '
              '276 C152 282 166 288 176 300 C168 330 158 368 144 406 L256 406 C242 368 232 330 224 300 C234 288 248 '
              '282 260 276 C272 266 274 246 272 220 C272 202 266 188 256 178 C260 156 272 130 272 98 C272 58 240 26 '
              '200 26 Z')
