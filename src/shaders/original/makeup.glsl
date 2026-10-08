// Voyage: Chaewon's painted face and skin. The atlas is a colour painting: ink is near-black (inkLevel maps
// it below the 0.55 the shaders threshold their line art at) and everything lighter is paint (her skin
// tone, make-up, dark brown irises), multiplied over her shading here.
// Voyage: lace on her dress is drawn in the trim texture; its strokes print as a pale grey (white-on-white
// lace, tone on tone as in her portrait), not the ink of her outline and face.
float laceInk(float trimInk) {
    return mix(0.8, 1.0, trimInk);
}
float inkLevel(float red) {
    return min(1.0, red * 3.4);
}
vec3 applyMakeup(vec3 color, sampler2D atlasMap, vec2 atlasUv, float lit) {
    return color * texture2D(atlasMap, atlasUv).rgb;
}

// Her skin in light and in shadow: a warm, rosy shade rather than ink.
vec3 skinShade(float lit) {
    return mix(vec3(0.86, 0.71, 0.69), vec3(1.0), lit);
}

// Voyage: how lit her skin is - a soft cel terminator straight from the light, no hatching (the line
// texture striped her arms where they turn from it).
float skinLight(float lighting, float threshold) {
    return smoothstep(threshold - 0.14, threshold + 0.1, lighting);
}

// Voyage: a fine warm contour where her skin turns edge-on to the eye (jaw, chin, the side of the nose),
// inside the silhouette the outline pass already inks: about a pixel and a half wide wherever it falls
// (facing over its screen-space rate is the distance in pixels to the edge-on line), rosy-brown rather
// than ink, so a face seen in profile stays a face rather than a band of shade.
vec3 skinContour(vec3 viewNormal, vec3 viewPos) {
    float facing = abs(dot(normalize(viewNormal), normalize(-viewPos)));
    float px = facing / max(fwidth(facing), 1e-4);
    float line = (1.0 - smoothstep(0.6, 1.6, px)) * (1.0 - smoothstep(0.1, 0.2, facing));
    return mix(vec3(1.0), vec3(0.62, 0.42, 0.4), line);
}

// Her hair: locks and the hair shell beneath them (hair.py scalp_cap) map into the trim's hair bands
// (v 0.10-0.30). Sleek, glossy dark warm brown, shaded as one mass (their normals are the mass's,
// master.merge): smoothly lighter where the light falls, each lock only a touch its own shade (the band it
// maps into), a faint seam between locks, a soft gloss ring across the crown (u 0.15-0.30 along a strand,
// hair.py strand_u) brightest down the middle of each lock, and the trim's sheen strokes catching the light
// inside it.
float hairMask(vec2 trimUv) {
    return step(0.05, trimUv.y) * step(trimUv.y, 0.30);
}
vec3 hairShade(float lit, float sheen, vec2 trimUv) {
    float lock = step(0.10, trimUv.y);
    float band = clamp(floor((trimUv.y - 0.10) / 0.025) / 7.0, 0.0, 1.0);
    // (the top band is her fringe: fine see-through locks, lighter where the light and her skin show through)
    float fringe = step(0.99, band) * lock;
    // Voyage: one smooth, glossy mass rather than a patchwork of locks: only a slight shade from lock to
    // lock, the scalp beneath nearly as deep as the hair over it, and a soft line between locks.
    float tone = mix(0.9, mix(0.975, 1.025, band), lock) + 0.12 * fringe;
    // (her deep, warm brown: a dark cocoa in shadow, never black, a soft chestnut where the light falls)
    vec3 base = mix(vec3(0.088, 0.062, 0.062), vec3(0.335, 0.255, 0.24), lit) * tone;
    // Across the band, 0 and 1 are a lock's two edges and 0.5 its middle.
    float across = fract((trimUv.y - 0.10) / 0.025);
    float edge = (1.0 - smoothstep(0.0, 0.1, min(across, 1.0 - across))) * lock;
    base *= 1.0 - 0.04 * edge * (1.0 - fringe);
    // Strands: each lock is a few finer strands along its length, each a touch its own shade with a fine
    // darker line between them; they fade out where they would be finer than a couple of pixels (so a
    // distant head of hair stays one smooth mass instead of shimmering).
    float k = across * 5.0;
    float fw = max(fwidth(k), 1e-4);
    float vis = (1.0 - smoothstep(0.2, 0.45, fw)) * lock;
    float slot = floor(k);
    float rnd = fract(sin(slot * 12.9898 + band * 78.233 + floor(trimUv.y * 400.0) * 3.17) * 43758.5453);
    float seam = 1.0 - smoothstep(0.0, 0.18, min(fract(k), 1.0 - fract(k)));
    base *= 1.0 + vis * ((rnd - 0.5) * 0.14 - 0.09 * seam);
    // The gloss: a soft ring across the crown where the light falls (hair.py strand_u lays it at the same
    // height on every lock, so it reads as one halo across them).
    float u = trimUv.x;
    float ring = smoothstep(0.08, 0.2, u) * (1.0 - smoothstep(0.24, 0.4, u)) * lock;
    float core = smoothstep(0.15, 0.2, u) * (1.0 - smoothstep(0.22, 0.29, u)) * lock;
    // (subtle: the ring lies where each lock crosses the crown, so seen from above it falls in patches, and a
    // strong one left the hair between them looking like a dark crease)
    base = mix(base, vec3(0.45, 0.36, 0.34), ring * (0.2 + 0.45 * lit) * 0.3);
    base = mix(base, vec3(0.6, 0.5, 0.47), core * (0.15 + 0.5 * lit) * 0.15);
    return mix(base, vec3(0.52, 0.43, 0.41), sheen * 0.12 * (1.0 - edge));
}
