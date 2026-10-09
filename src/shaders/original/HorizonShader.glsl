#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tNoise;
uniform vec3 uInk;
uniform vec3 uGold;
uniform float uHorizon;
uniform float uDepth;
uniform float uRows;
uniform float uSunX;
uniform float uRoad;
uniform float uAspect;
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
// Voyage: a far horizon drawn flat on a backdrop: a fine, broken ink line, and below it
// the sea in rows of dashes that open out toward the reader and fade into the paper.
// Under the light (uSunX) the dashes turn gold and the horizon line breaks.
float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

void main() {
    float ndcHeight = 1.0 - gl_FragCoord.y / resolution.y;
    if (uDiscardBottom - ndcHeight > 0.0 || uDiscardTop - ndcHeight < 0.0) discard;
    float t = floor(time * 8.0) / 8.0;
    float x = vUv.x * uAspect;
    float sunX = uSunX * uAspect;
    float dy = uHorizon - vUv.y;
    float fw = fwidth(vUv.y);
    float road = 1.0 - smoothstep(0.012, 0.04 + max(dy, 0.0) * 0.5, abs(x - sunX));

    // The horizon: one fine line, broken now and then, washed out by the light.
    float line = 1.0 - smoothstep(fw * 0.6, fw * 1.6, abs(dy));
    float breaks = step(0.32, texture2D(tNoise, vec2(x * 1.7, 0.31)).r);
    float ink = line * breaks * (1.0 - road);
    float gold = 0.0;

    // The sea: rows that open out below the horizon (perspective), dashes lengthening.
    if (dy > 0.0 && dy < uDepth) {
        float s = dy / uDepth;
        float v = sqrt(s) * uRows;
        float row = floor(v);
        float h = hash(row + 3.0);
        float across = abs(fract(v) - 0.5) * 2.0;
        float w = fwidth(v) * 1.1;
        float dash = texture2D(tNoise, vec2(x * mix(5.0, 1.2, s) + h * 7.0 + t * 0.01 * (h - 0.5), row * 0.21)).r;
        float keep = mix(0.5, 0.6, s) + (h - 0.5) * 0.12 - road * 0.12;
        float body = clamp((dash - keep) / 0.12, 0.0, 1.0);
        float weight = mix(0.07, 0.13, s) * body;
        float stroke = (1.0 - smoothstep(weight - w, weight + w, across)) * step(1e-3, body);
        // Fade into the paper toward the reader.
        stroke *= 1.0 - smoothstep(0.55, 1.0, s);
        float isGold = road * uRoad * step(0.45, hash(row * 5.3 + floor(x * 40.0)));
        ink = max(ink, stroke * (1.0 - isGold));
        gold = stroke * isGold;
    }

    float alpha = max(ink, gold);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(mix(uInk, uGold, gold / max(alpha, 1e-3)), alpha);
}
