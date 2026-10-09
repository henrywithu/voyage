#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tNoise;
uniform vec3 uColor;
uniform float uCount;
uniform float uWidth;
uniform float uAlpha;
uniform float uDots;
uniform float uDotSize;
uniform float uSeed;
uniform float uDPR;
uniform float uDiscardTop;
uniform float uDiscardBottom;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Vertex
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

#!SHADER: Fragment
// Voyage: shafts of light falling through openings above, drawn as a pale wash
// with a halftone screen in their cores. vUv.x runs across the quad (the shafts are
// bands in x), vUv.y from the bottom (0) to the openings above (1).
float hash(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }

float halftone(float tone, float cell) {
    vec2 p = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / cell;
    float d = length(fract(p) - 0.5);
    float r = 0.62 * sqrt(clamp(tone, 0.0, 1.0));
    float w = fwidth(d);
    // No tone, no dot (a zero radius would still leave a pixel at each cell's centre).
    return (1.0 - smoothstep(r - w, r + w, d)) * smoothstep(0.0, 0.04, tone);
}

void main() {
    // The section bounds, tested per fragment (a plane may reach behind the camera).
    float ndcHeight = 1.0 - gl_FragCoord.y / resolution.y;
    if (uDiscardBottom - ndcHeight > 0.0 || uDiscardTop - ndcHeight < 0.0) discard;
    float t = floor(time * 8.0) / 8.0;
    float light = 0.0;
    for (int i = 0; i < 6; i++) {
        float fi = float(i);
        if (fi >= uCount) break;
        float h1 = hash(fi + uSeed), h2 = hash(fi * 3.7 + uSeed + 1.3);
        float center = (fi + 0.5 + (h1 - 0.5) * 0.6) / uCount + 0.006 * sin(t * 0.7 + fi * 2.0);
        float width = uWidth * (0.55 + 0.9 * h2);
        float d = abs(vUv.x - center) / width;
        // A bright core with soft edges, brightest where it enters from above and pooling
        // out just before it reaches the floor.
        float band = 1.0 - smoothstep(0.35, 1.0, d);
        float reach = 0.25 * hash(fi * 5.1 + uSeed);
        band *= smoothstep(reach - 0.05, reach + 0.2, vUv.y) * mix(0.55, 1.0, vUv.y) * (0.6 + 0.4 * h1);
        light = max(light, band);
    }
    // Motes and haze drifting through the light.
    float haze = texture2D(tNoise, vUv * vec2(3.0, 1.5) + vec2(t * 0.01, -t * 0.03)).r;
    light *= 0.75 + 0.5 * haze;
    float dots = halftone(light * uDots, uDotSize * uDPR);
    float alpha = clamp(light * uAlpha + dots * smoothstep(0.05, 0.25, light), 0.0, 1.0);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor, alpha);
}
