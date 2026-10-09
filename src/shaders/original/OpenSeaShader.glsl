#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tNoise;
uniform vec3 uInk;
uniform vec3 uGlintColor;
uniform vec4 uHull;
uniform vec2 uFog;
uniform float uSpacing;
uniform float uDensity;
uniform float uSwell;
uniform float uGlints;
uniform vec3 uRoad;
uniform float uAlpha;
uniform float uDiscardTop;
uniform float uDiscardBottom;

#!VARYINGS
varying vec3 vWorld;
varying vec2 vLocal;

#!SHADER: Vertex
void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    // The plane lies flat in its group (rotated -90 degrees about x): local xy is the
    // sea's x and -z in the group's (the boat's) space.
    vLocal = vec2(position.x, -position.y);
    gl_Position = projectionMatrix * viewMatrix * world;
}

#!SHADER: Fragment
// Voyage: the open sea in ink. Rows of broken ripple strokes ride a slow swell; they
// run long and heavy near the reader, then thin, shorten and dissolve into the sea fog.
// Under the hull the strokes crowd together into its reflection, and a few glints flash
// where the swell catches the light. Transparent: where there is no stroke the paper
// (and the occluder's depth) shows through.

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

void main() {
    // The section bounds, tested per fragment (a plane may reach behind the camera).
    float ndcHeight = 1.0 - gl_FragCoord.y / resolution.y;
    if (uDiscardBottom - ndcHeight > 0.0 || uDiscardTop - ndcHeight < 0.0) discard;
    float t = floor(time * 8.0) / 8.0;
    float dist = length(vWorld - cameraPosition);
    float fog = 1.0 - smoothstep(uFog.x, uFog.y, dist);
    if (fog <= 0.0) discard;

    vec2 p = vWorld.xz;
    // The swell: rows bend over long, slow waves.
    float v = p.y / uSpacing;
    v += uSwell * (sin(p.x * 0.23 + t * 0.55) * 0.6 + sin(p.x * 0.51 - p.y * 0.13 + t * 0.8) * 0.4);
    float row = floor(v);
    float h = hash(row);
    v += 0.1 * sin(p.x * (0.6 + 0.4 * h) + t * (0.7 + 0.6 * h) + h * 6.28);
    row = floor(v);
    h = hash(row);
    float h2 = hash(row + 17.0);
    // 0 on a stroke's centre line (jittered within its row), 1 at the row's edges: each
    // stroke lies wholly inside its row, and the rows do not fall into a ruled pattern.
    float across = abs(fract(v) - 0.5 - (h2 - 0.5) * 0.45) * 2.0;
    float w = fwidth(v) * 1.1;

    // The reflection under the hull (an ellipse in the boat's space), dark and crowded.
    vec2 q = (vLocal - uHull.xy) / uHull.zw;
    float hull = 1.0 - smoothstep(0.6, 1.4, length(q));

    // The road of light: under a low sun the sea's reflection is a column of the view
    // (constant bearing from the eye, uRoad.x the tangent of its bearing, uRoad.y its
    // half-width), widening a little toward the reader. Its strokes crowd and turn gold.
    float road = 0.0;
    if (uRoad.z > 0.0) {
        vec3 eye = vWorld - cameraPosition;
        float bearing = eye.x / max(-eye.z, 1e-3);
        float halfWidth = uRoad.y * (1.0 + 0.6 * fog);
        road = (1.0 - smoothstep(halfWidth * 0.4, halfWidth, abs(bearing - uRoad.x))) * uRoad.z;
    }

    // Calm stretches and ruffled ones drift across the water.
    float patchiness = texture2D(tNoise, p * 0.045 + vec2(t * 0.006, -t * 0.002)).r;

    // Break each row into dashes, long and short, that drift with the swell; far rows keep
    // fewer of them.
    float freq = mix(0.16, 0.75, h2 * h2);
    float dashUv = p.x * freq + t * 0.03 * (h - 0.5) + h * 3.7;
    float dash = texture2D(tNoise, vec2(dashUv, row * 0.173 + h)).r;
    float keep = mix(0.72, 0.5 - 0.1 * uDensity, fog) + (h - 0.5) * 0.12 + (0.5 - patchiness) * 0.3 - hull * 0.3 - road * 0.12;
    // A brush stroke swells from a point and tapers back to one.
    float body = clamp((dash - keep) / 0.14, 0.0, 1.0);
    float weight = mix(0.06, 0.09 + 0.07 * h, fog) * (1.0 + 0.6 * hull) * body;
    float ink = (1.0 - smoothstep(weight - w, weight + w, across)) * step(1e-3, body);
    float gold = road * step(0.3 - 0.2 * h, hash(row * 3.1 + floor(dashUv * 1.5)));

    // Glints: short flashes where the swell turns toward the light.
    float glint = 0.0;
    if (uGlints > 0.0) {
        vec2 cell = floor(vec2(p.x * 1.4, v));
        float g = hash(cell.x * 7.13 + cell.y * 1.37 + floor(time * 3.0 + hash(cell.x + cell.y * 3.1) * 3.0) * 0.731);
        float flash = step(1.0 - 0.025 * uGlints, g) * (1.0 - hull) * (1.0 - ink);
        vec2 f = vec2(fract(p.x * 1.4) - 0.5, (fract(v) - 0.5));
        glint = flash * (1.0 - smoothstep(0.3 - w, 0.3 + w, length(f * vec2(1.0, 3.0))));
    }

    float alpha = max(ink * fog, glint * fog) * uAlpha;
    if (alpha < 0.01) discard;
    vec3 color = mix(uInk, uGlintColor, max(glint, gold * (1.0 - hull)));
    gl_FragColor = vec4(color, alpha);
}
