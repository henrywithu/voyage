// Voyage: Chaewon's painted face and skin. The atlas is a colour painting: ink is near-black (inkLevel maps
// it below the 0.55 the shaders threshold their line art at) and everything lighter is paint (her skin
// tone, make-up, dark brown irises), multiplied over her shading here.
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

// Her hair: locks map into the trim's hair bands (v 0.10-0.30) and the scalp cap into its black row
// (0.05-0.10). Sleek, glossy dark brown: smoothly lighter where the light falls, each lock its own shade
// (the band it maps into, the outer layers lighter than those beneath), only a faint seam between locks,
// a soft gloss ring across the crown (u 0.15-0.30 along a strand, hair.py strand_u) brightest down the
// middle of each lock, and the trim's sheen strokes catching the light inside it.
float hairMask(vec2 trimUv) {
    return step(0.05, trimUv.y) * step(trimUv.y, 0.30);
}
vec3 hairShade(float lit, float sheen, vec2 trimUv) {
    float lock = step(0.10, trimUv.y);
    float band = clamp(floor((trimUv.y - 0.10) / 0.025) / 7.0, 0.0, 1.0);
    float tone = mix(0.7, mix(0.84, 1.14, band), lock);
    vec3 base = mix(vec3(0.07, 0.047, 0.04), vec3(0.235, 0.165, 0.138), lit) * tone;
    // Across the band, 0 and 1 are a lock's two edges and 0.5 its middle.
    float across = fract((trimUv.y - 0.10) / 0.025);
    float edge = (1.0 - smoothstep(0.0, 0.12, min(across, 1.0 - across))) * lock;
    float middle = 1.0 - abs(across - 0.5) * 2.0;
    base *= 1.0 - 0.22 * edge;
    float u = trimUv.x;
    float ring = smoothstep(0.11, 0.19, u) * (1.0 - smoothstep(0.25, 0.35, u)) * lock;
    float core = smoothstep(0.16, 0.2, u) * (1.0 - smoothstep(0.22, 0.27, u)) * lock;
    base = mix(base, vec3(0.5, 0.4, 0.35), ring * (0.35 + 0.45 * lit) * (0.45 + 0.55 * middle));
    base = mix(base, vec3(0.74, 0.64, 0.59), core * (0.3 + 0.7 * lit) * middle * 0.6);
    return mix(base, vec3(0.62, 0.53, 0.49), sheen * 0.5 * (1.0 - edge));
}
