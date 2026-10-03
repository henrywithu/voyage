#!ATTRIBUTES
attribute vec3 currpos; 
attribute vec3 nextpos;
attribute vec3 prevpos;
attribute float random;

#!UNIFORMS
uniform sampler2D tMap;
uniform float uScroll;
uniform float uSpeed;
uniform float uThreshold;
uniform float uAnimatePosition;
uniform float uTile;
uniform float uFrameRate;
uniform float uDiscardTop;
uniform float uDiscardBottom;

#!VARYINGS
varying vec2 vUv;
varying float vRandom;
varying vec3 vPos;
varying float vNdcHeight;

#!SHADER: Vertex

void main() {
    vUv = uv;

    float steppedTime = -time * 0.725;

    // if uAnimatePosition set, scroll along in a loop. the pattern must be 20 units long
    vec3 offset = vec3((-fract(steppedTime / 20.0) * 20.0 + 15.0) * uAnimatePosition, 0.0, 0.0);
    vec3 displacedCurrPos = currpos + offset;
    vec3 displacedNextPos = nextpos + offset;
    vec3 displacedPrevPos = prevpos + offset;

    mat4 m = projectionMatrix * modelViewMatrix;
    vec4 projCurrPos = m * vec4(displacedCurrPos, 1.0); 
    vec4 projNextPos = m * vec4(displacedNextPos, 1.0);
    vec4 projPrevPos = m * vec4(displacedPrevPos, 1.0);

    vec2 screenCurrPos = projCurrPos.xy / projCurrPos.w;
    vec2 screenNextPos = projNextPos.xy / projNextPos.w;
    vec2 screenPrevPos = projPrevPos.xy / projPrevPos.w;

    vec2 dir1 = normalize(screenNextPos - screenCurrPos);
    vec2 dir2 = normalize(screenCurrPos - screenPrevPos);
    vec2 tangent = normalize(dir1 + dir2);

    vec2 norm = normalize(vec2(-tangent.y, tangent.x));

    // correct for resolution
    float aspect = resolution.y / resolution.x;
    norm.x *= aspect;

    vec4 pos = projCurrPos; 
    float thickness = mix(0.015, 0.0025, fract(random * 16.0 + 0.5)) * pos.w;

    pos.xy += norm.xy * ((uv.x - 0.5) * 2.0) * thickness;

    vPos = currpos;
    vRandom = random;

    gl_Position = pos;

    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    float t = floor(time * 16.0) / 16.0;

    float value = 1.0;
    float edgeGrad = 1.0 - abs(vUv.x - 0.5) * 2.0;

    value *= 1.0 - pow(1.0 - edgeGrad, 3.0);

    float noise = texture2D(tMap, vUv * vec2(0.01, 2.0) + vRandom - vec2(0.0, t * 0.1)).r;
    noise *= texture2D(tMap, vUv * vec2(0.005, 2.0) + vRandom * 10.0 - vec2(0.0, t * 0.12)).r;
    noise = pow(noise, 5.0);
    value *= noise;

    // float largeblobs = 1.0;
    // largeblobs *= smoothstep(0.7, 0.9, sin(vUv.y * 10.0 - t + vRandom * 30.0) * 0.5 + 0.5);
    // value *= largeblobs;

    // float smallblobs = 1.0;
    // smallblobs *= smoothstep(0.0, 0.9, sin(vUv.y * 61.0 - t * 1.5 + vRandom * 10.0) * 0.5 + 0.5);
    // smallblobs *= sin(vUv.y * 17.0 - t * 0.5 + vRandom * 10.0);
    // smallblobs = 1.0 - pow(1.0 - smallblobs, 5.0);
    // value += smallblobs * 0.7;

    float alpha = aastep(0.5, value);
    vec3 color = vec3(1.0);

    gl_FragColor = vec4(color, alpha); 
}