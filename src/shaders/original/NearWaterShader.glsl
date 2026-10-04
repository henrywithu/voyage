#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tNoise;
uniform vec3 uColor;
uniform vec3 uGlowColor;
uniform vec3 uSun;
uniform float uSpacing;
uniform float uDiscardTop;
uniform float uDiscardBottom;

#!VARYINGS
varying vec3 vWorld;
varying float vNdcHeight;

#!SHADER: Vertex
void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment
// Still water under the arch, drawn in ink: broken ripple strokes in rows, and the
// sun's road (a widening column of gold dashes) running from the disc to the viewer.

float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    float t = floor(time * 8.0) / 8.0;
    vec2 p = vWorld.xz;

    // Rows of ripples, gently wavering.
    float v = p.y / uSpacing;
    float row = floor(v);
    float h = hash(row);
    v += 0.18 * sin(p.x * (0.35 + 0.2 * h) + t * (0.6 + 0.5 * h) + h * 6.28);
    row = floor(v);
    h = hash(row);
    float across = abs(fract(v) - 0.5) * 2.0;           // 1 at the row centre line
    float w = fwidth(v) * 1.2;
    float stroke = smoothstep(1.0 - 0.16 - w, 1.0 - 0.16 + w, across);
    // Break each row into dashes that drift slowly sideways.
    float dash = texture2D(tNoise, vec2(p.x * (0.045 + 0.03 * h) + t * 0.02 * (h - 0.5) + h * 3.1, row * 0.137)).r;

    // The sun's road: widening toward the viewer from the foot of the disc.
    float d = max(0.0, p.y - uSun.z);
    float halfWidth = uSun.y + 0.11 * d;
    float road = 1.0 - smoothstep(halfWidth * 0.55, halfWidth, abs(p.x - uSun.x));
    float roadDash = texture2D(tNoise, vec2(p.x * 0.12 + h * 2.7, row * 0.311 + t * 0.05)).r;

    float ink = stroke * step(0.52 - 0.08 * road, dash);
    float gold = stroke * road * step(0.36, roadDash);

    // A faint glow on the water near the disc.
    float glow = road * exp(-d * 0.08) * 0.35;
    vec3 color = mix(uColor, uGlowColor, glow);
    color = mix(color, vec3(18.0 / 255.0), ink * (1.0 - road * 0.85));
    color = mix(color, uGlowColor, gold);
    gl_FragColor = vec4(color, 1.0);
}
