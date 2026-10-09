#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;
uniform vec3 uColor;
uniform vec3 uLight;
uniform vec3 uShade;
uniform vec3 uCloudColor;
uniform vec3 uInk;
uniform vec2 uGlowCenter;
uniform vec2 uGlowRadius;
uniform float uGlow;
uniform float uShadeAmount;
uniform vec2 uShadeRange;
uniform float uClouds;
uniform vec4 uCloudBand;
uniform float uDotSize;
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
// Voyage: a printed sky for the flat colour fields. Over the base colour a halftone
// glow gathers around the light (uGlowCenter, in the plane's uv), a finer screen of
// shade deepens the sky toward its top (uShadeRange: uv heights where the shade starts
// and is full), and optional clouds drift in a band (uCloudBand: bottom, top, scale,
// speed), filled pale and outlined in ink.

float screenDots(float tone, float cell, float angle) {
    float c = cos(angle), s = sin(angle);
    vec2 p = mat2(c, -s, s, c) * gl_FragCoord.xy / cell;
    float d = length(fract(p) - 0.5);
    float r = 0.7 * sqrt(clamp(tone, 0.0, 1.0));
    float w = fwidth(d);
    return (1.0 - smoothstep(r - w, r + w, d)) * smoothstep(0.0, 0.04, tone);
}

void main() {
    float ndcHeight = 1.0 - gl_FragCoord.y / resolution.y;
    if (uDiscardBottom - ndcHeight > 0.0 || uDiscardTop - ndcHeight < 0.0) discard;
    float t = floor(time * 8.0) / 8.0;
    vec3 color = uColor;
    float cell = uDotSize * uDPR;

    // Shade toward the top of the sky: a fine screen of darker dots.
    if (uShadeAmount > 0.0) {
        float shade = smoothstep(uShadeRange.x, uShadeRange.y, vUv.y) * uShadeAmount;
        color = mix(color, uShade, screenDots(shade, cell * 0.8, 0.26));
    }

    // The glow around the light: solid at its heart, then a halftone falling away.
    if (uGlow > 0.0) {
        vec2 q = (vUv - uGlowCenter) / uGlowRadius;
        float glow = (1.0 - smoothstep(0.0, 1.0, length(q))) * uGlow;
        color = mix(color, uLight, screenDots(glow * 1.15, cell, 0.785));
    }

    // Clouds: a band of soft-edged shapes, pale fill and an ink rim.
    if (uClouds > 0.0) {
        vec2 cuv = vec2(vUv.x * uCloudBand.z + t * uCloudBand.w, vUv.y * uCloudBand.z * 0.5);
        float n = texture2D(tMap, cuv).r * 0.65 + texture2D(tMap, cuv * 2.3 + 0.37).r * 0.35;
        float band = smoothstep(uCloudBand.x, mix(uCloudBand.x, uCloudBand.y, 0.35), vUv.y)
                   * (1.0 - smoothstep(mix(uCloudBand.x, uCloudBand.y, 0.55), uCloudBand.y, vUv.y));
        float value = n * band;
        float threshold = 0.42;
        float fw = fwidth(value);
        float fill = smoothstep(threshold - fw, threshold + fw, value) * uClouds;
        float rim = fill * (1.0 - smoothstep(threshold + 0.02 - fw, threshold + 0.02 + fw, value));
        color = mix(color, uCloudColor, fill);
        color = mix(color, uInk, rim);
    }

    gl_FragColor = vec4(color, 1.0);
}
