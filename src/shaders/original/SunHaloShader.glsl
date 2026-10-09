#!ATTRIBUTES

#!UNIFORMS
uniform vec3 uDiscColor;
uniform vec3 uCoreColor;
uniform float uCore;
uniform vec3 uRayColor;
uniform vec3 uRingColor;
uniform vec3 uGlowColor;
uniform float uExtent;
uniform float uDisc;
uniform float uRays;
uniform float uRayAlpha;
uniform vec2 uRayLength;
uniform float uRayWidth;
uniform float uRings;
uniform float uRingAlpha;
uniform float uGlow;
uniform float uGlowAlpha;
uniform float uDotSize;
uniform float uClipBelow;
uniform float uSeed;
uniform float uAlpha;
uniform float uDPR;
uniform float uDiscardTop;
uniform float uDiscardBottom;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Vertex
// Voyage: the light of the sun, drawn the way a manga page draws it. A billboard
// centred on the sun; vUv is measured in sun radii (the disc's edge at 1).
void main() {
    vec4 center = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    float s = length(modelMatrix[0].xyz);
    vec3 world = center.xyz + (right * position.x + up * position.y) * s * uExtent;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
    vUv = position.xy * uExtent;
}

#!SHADER: Fragment
float hash(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }

// Screen-space halftone: dots on a 45-degree grid, their area following the tone.
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
    if (vUv.y < uClipBelow) discard;
    float r = length(vUv);
    float pw = fwidth(r);
    float t = floor(time * 8.0) / 8.0;
    vec4 outColor = vec4(0.0);

    // A glow of halftone dots, densest at the rim of the disc.
    if (uGlowAlpha > 0.0) {
        float tone = 1.0 - smoothstep(1.0, uGlow, r);
        tone = tone * tone;
        float dots = halftone(tone, uDotSize * uDPR);
        // Around a disc the glow starts at its rim; without one it fills the centre too.
        float outside = uDisc > 0.0 ? step(1.0, r) : 1.0;
        outColor = mix(outColor, vec4(uGlowColor, 1.0), dots * uGlowAlpha * outside);
    }

    // Rings of light, broken into strokes.
    if (uRingAlpha > 0.0) {
        float a = atan(vUv.y, vUv.x);
        for (int i = 0; i < 4; i++) {
            if (float(i) >= uRings) break;
            float fi = float(i);
            float radius = 1.18 + fi * 0.32 + fi * fi * 0.09 + 0.015 * sin(t * 2.0 + fi);
            float width = 0.012 + 0.006 * (3.0 - fi);
            float line = 1.0 - smoothstep(width - pw, width + pw, abs(r - radius));
            float k = 5.0 + fi * 3.0;
            float dash = step(0.38, fract(sin(floor((a + fi + t * 0.05) * k / 6.2831853 * 6.0) * 91.7 + fi * 13.0 + uSeed) * 4375.85));
            outColor = mix(outColor, vec4(uRingColor, 1.0), line * dash * uRingAlpha);
        }
    }

    // Rays: fine strokes radiating from just off the disc, each tapering to a point.
    if (uRayAlpha > 0.0) {
        float a = atan(vUv.y, vUv.x) + 3.14159265 + t * 0.012;
        float sector = a / 6.2831853 * uRays;
        float k = floor(sector);
        float f = fract(sector) - 0.5;
        float h1 = hash(k + uSeed), h2 = hash(k * 1.7 + uSeed + 3.1), h3 = hash(k * 2.3 + uSeed + 7.7);
        float r0 = uRayLength.x + h2 * 0.35;
        float r1 = r0 + uRayLength.y * (0.35 + 0.65 * h3) * (1.0 + 0.06 * sin(t * 1.3 + h1 * 20.0));
        float along = clamp((r - r0) / (r1 - r0), 0.0, 1.0);
        float width = uRayWidth * (1.0 - along) * smoothstep(0.0, 0.08, along);
        float sw = uRays / 6.2831853 * pw / max(r, 1e-3);
        float ray = 1.0 - smoothstep(width - sw, width + sw, abs(f + (h2 - 0.5) * 0.5));
        ray *= step(0.3, h1) * step(r0, r) * step(r, r1);
        outColor = mix(outColor, vec4(uRayColor, 1.0), ray * uRayAlpha);
    }

    // The disc itself, where the scene has none of its own, glowing from a halftone core
    // like the arch's sun (uCore).
    if (uDisc > 0.0) {
        float disc = 1.0 - smoothstep(1.0 - pw, 1.0 + pw, r);
        vec3 discColor = uDiscColor;
        if (uCore > 0.0)
            discColor = mix(uDiscColor, uCoreColor, halftone((1.0 - smoothstep(0.05, 0.92, r)) * uCore * 1.3, uDotSize * uDPR));
        outColor = mix(outColor, vec4(discColor, 1.0), disc * uDisc);
    }

    // The layers above are composited premultiplied; the material blends straight alpha.
    if (outColor.a * uAlpha < 0.01) discard;
    gl_FragColor = vec4(outColor.rgb / outColor.a, outColor.a * uAlpha);
}
