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
// (0.05-0.10). Dark warm brown, lighter where the light falls. Each lock's band is its own shade (the outer
// layers lighter than those beneath), its edges are drawn darker, a soft gloss ring crosses the crown (u
// 0.15-0.30 along a strand, hair.py strand_u) and the trim's sheen strokes catch the light inside it.
float hairMask(vec2 trimUv) {
    return step(0.05, trimUv.y) * step(trimUv.y, 0.30);
}
vec3 hairShade(float lit, float sheen, vec2 trimUv) {
    float lock = step(0.10, trimUv.y);
    float tone = mix(0.6, mix(0.68, 1.18, clamp(floor((trimUv.y - 0.10) / 0.025) / 7.0, 0.0, 1.0)), lock);
    vec3 base = mix(vec3(0.085, 0.06, 0.052), vec3(0.27, 0.195, 0.165), lit) * tone;
    // Each lock is drawn: a darker line along both of its edges (across the band, 0 and 1 are its sides).
    float across = fract((trimUv.y - 0.10) / 0.025);
    float edge = (1.0 - smoothstep(0.05, 0.18, min(across, 1.0 - across))) * lock;
    base *= 1.0 - 0.55 * edge;
    float ring = smoothstep(0.15, 0.19, trimUv.x) * (1.0 - smoothstep(0.26, 0.30, trimUv.x)) * lock;
    base = mix(base, vec3(0.46, 0.36, 0.32), ring * (0.2 + 0.35 * lit) * (1.0 - edge));
    return mix(base, vec3(0.68, 0.58, 0.54), sheen * (1.0 - edge));
}
