#!ATTRIBUTES
attribute vec4 aBird;
attribute vec4 aFlight;

#!UNIFORMS
uniform vec3 uColor;
uniform vec3 uBox;
uniform vec3 uDrift;
uniform float uSpan;
uniform float uThickness;
uniform float uFrameRate;
uniform float uAlpha;
uniform float uDiscardTop;
uniform float uDiscardBottom;

#!VARYINGS
varying float vEdge;

#!SHADER: Vertex
// Voyage: distant seabirds drawn as single brush strokes, the "m" of a gull's
// crooked wings. Each instance glides across a box (aBird.xyz its seed position,
// aBird.w its phase), flapping in bursts between long glides; the wing is posed
// in the camera's plane and drawn as a ribbon that tapers to the wingtips.
// position.x runs along the wings (-1 left tip, 0 body, 1 right tip), position.y
// is the ribbon side (-1, 1).

vec2 wing(float u, float flap, float lag, float bank) {
    float a = abs(u);
    float s = sign(u);
    // Inner wing (to the elbow) and outer wing (to the tip) angles; at rest the
    // inner wing lifts and the hand droops: the gull's crooked "m".
    float inner = 0.32 + 0.62 * flap;
    float outer = -0.22 + 0.95 * lag;
    float e = 0.42;
    vec2 elbow = e * vec2(cos(inner), sin(inner));
    vec2 p = a < e ? a * vec2(cos(inner), sin(inner))
                   : elbow + (a - e) * vec2(cos(outer), sin(outer));
    p.x *= s;
    // A little bank as it turns.
    float c = cos(bank), sn = sin(bank);
    return mat2(c, sn, -sn, c) * p;
}

void main() {
    float t = floor(time * uFrameRate) / uFrameRate + aBird.w * 40.0;
    float speed = aFlight.x;
    float scale = aFlight.y;

    // Glide across the box, wrapping, with a slow rise and fall.
    vec3 p = aBird.xyz + uDrift * t * speed;
    vec3 wrapped = mod(p + uBox, 2.0 * uBox) - uBox;
    wrapped.y += 0.18 * uBox.y * sin(t * 0.37 * aFlight.z + aBird.w * 6.28);
    // Shrink away toward the ends of the box instead of popping.
    float edge = smoothstep(1.0, 0.82, abs(wrapped.x) / uBox.x) * smoothstep(1.0, 0.82, abs(wrapped.z) / max(uBox.z, 1e-3));
    scale *= edge;

    // Bursts of flapping (about 2.5 beats a second) between glides.
    float burst = smoothstep(0.15, 0.6, sin(t * 0.55 * aFlight.z + aBird.w * 12.0));
    float phase = t * 15.0 * aFlight.z + aBird.w * 31.0;
    float flap = burst * sin(phase);
    float lag = burst * sin(phase - 1.1);
    float bank = 0.12 * sin(t * 0.4 + aBird.w * 9.0) * aFlight.w;

    float u = position.x;
    float du = 0.02;
    vec2 q = wing(u, flap, lag, bank);
    vec2 tangent = normalize(wing(u + du, flap, lag, bank) - wing(u - du, flap, lag, bank) + vec2(1e-5, 0.0));
    vec2 normal = vec2(-tangent.y, tangent.x);
    // Brush pressure: full at the shoulders, a tapering point at each tip, a
    // touch heavier at the body.
    float a = abs(u);
    float width = uThickness * (1.0 - smoothstep(0.25, 1.0, a) * 0.92) * (1.0 + 0.6 * smoothstep(0.12, 0.0, a));
    q += normal * position.y * width;

    vec4 center = modelMatrix * vec4(wrapped, 1.0);
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    float size = uSpan * scale * length(modelMatrix[0].xyz);
    vec3 world = center.xyz + (right * q.x + up * q.y) * size;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
    vEdge = position.y;
}

#!SHADER: Fragment
void main() {
    // The section bounds, tested per fragment (a plane may reach behind the camera).
    float ndcHeight = 1.0 - gl_FragCoord.y / resolution.y;
    if (uDiscardBottom - ndcHeight > 0.0 || uDiscardTop - ndcHeight < 0.0) discard;
    float w = fwidth(vEdge);
    float alpha = 1.0 - smoothstep(1.0 - w * 1.5, 1.0, abs(vEdge));
    alpha *= uAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor, alpha);
}
