#!ATTRIBUTES
attribute vec4 aSeed;

#!UNIFORMS
uniform vec3 uColor;
uniform vec3 uInk;
uniform vec3 uBoxMin;
uniform vec3 uBoxMax;
uniform vec3 uVelocity;
uniform vec2 uSize;
uniform float uWobble;
uniform float uMode;
uniform float uShape;
uniform float uOutline;
uniform float uPeriod;
uniform float uFrameRate;
uniform float uAlpha;
uniform float uSpread;
uniform float uClock;
uniform float uClockOn;
uniform float uDiscardTop;
uniform float uDiscardBottom;

#!VARYINGS
varying vec2 vUv;
varying float vFade;

#!SHADER: Vertex
// Voyage: specks of light in the air and on the water, drawn as flat paper cut-outs.
// uMode 0 (motes): each instance drifts through the box with uVelocity, wrapping
//   around it, and wobbles; it fades in and out at the box's ends.
// uMode 1 (glints): each instance flashes for one uPeriod at a random place in the
//   box, then reappears somewhere else. uSpread > 0 gathers them toward the box's
//   centre line along x (the road of light on the water).

float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
    // uClockOn: the scene drives the motes' clock (to quicken them without a jump).
    float now = uClockOn > 0.5 ? uClock : time;
    float t = floor(now * uFrameRate) / uFrameRate;
    vec3 size3 = uBoxMax - uBoxMin;
    vec3 p;
    float scale;
    if (uMode < 0.5) {
        vec3 f = fract(aSeed.xyz + uVelocity * t / max(size3, vec3(1e-3)));
        p = uBoxMin + f * size3;
        float w = t * (0.6 + 0.8 * aSeed.w) + aSeed.w * 30.0;
        p += uWobble * vec3(sin(w), sin(w * 0.73 + 1.7), cos(w * 0.61)) ;
        // Fade toward the ends of the box along the direction of travel.
        vec3 edge = smoothstep(0.0, 0.12, f) * smoothstep(1.0, 0.88, f);
        vec3 moving = step(1e-4, abs(uVelocity));
        scale = mix(1.0, edge.x, moving.x) * mix(1.0, edge.y, moving.y) * mix(1.0, edge.z, moving.z);
        // A slow twinkle.
        scale *= 0.75 + 0.25 * sin(time * (1.5 + aSeed.w * 2.0) + aSeed.x * 40.0);
    } else {
        float cycle = t / uPeriod + aSeed.w * 7.0;
        float k = floor(cycle);
        float life = fract(cycle);
        vec3 r = vec3(hash(aSeed.xyz * 13.1 + k), hash(aSeed.yzx * 7.7 + k * 1.31), hash(aSeed.zxy * 3.3 + k * 2.17));
        if (uSpread > 0.0) {
            // Gather toward the centre line: a narrow road of glints.
            float c = r.x * 2.0 - 1.0;
            r.x = 0.5 + 0.5 * sign(c) * pow(abs(c), uSpread);
        }
        p = uBoxMin + r * size3;
        // Pop in fast, fade out slower; a third of the time an instance rests unseen.
        scale = smoothstep(0.0, 0.12, life) * smoothstep(0.66, 0.3, life);
    }
    float size = mix(uSize.x, uSize.y, fract(aSeed.w * 7.31 + aSeed.x)) * scale;
    vFade = scale;

    vec4 center = modelMatrix * vec4(p, 1.0);
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    float s = size * length(modelMatrix[0].xyz);
    vec3 world = center.xyz + (right * position.x + up * position.y) * s;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
    vUv = position.xy;
}

#!SHADER: Fragment
void main() {
    // The section bounds, tested per fragment (a plane may reach behind the camera).
    float ndcHeight = 1.0 - gl_FragCoord.y / resolution.y;
    if (uDiscardBottom - ndcHeight > 0.0 || uDiscardTop - ndcHeight < 0.0) discard;
    if (vFade < 0.02) discard;
    vec2 q = abs(vUv);
    // uShape 0: a round speck; 1: a four-point sparkle (an astroid, concave sides);
    // 2: a bubble, a thin ring with a fleck of light inside its rim.
    float d = uShape > 0.5 && uShape < 1.5 ? pow(pow(q.x, 0.5) + pow(q.y, 0.5), 2.0) : length(q);
    float w = fwidth(d) * 1.2;
    float body = 1.0 - smoothstep(1.0 - w, 1.0, d);
    if (uShape > 1.5) {
        float ring = body * smoothstep(0.78 - w, 0.78, d);
        float fleck = 1.0 - smoothstep(0.16 - w, 0.16 + w, length(vUv - vec2(-0.38, 0.38)));
        body = max(ring, fleck);
    }
    if (body < 0.01) discard;
    // An ink rim keeps a pale speck legible against pale paper.
    float rim = uOutline > 0.0 ? smoothstep(1.0 - uOutline - w, 1.0 - uOutline, d) : 0.0;
    vec3 color = mix(uColor, uInk, rim);
    gl_FragColor = vec4(color, body * uAlpha);
}
