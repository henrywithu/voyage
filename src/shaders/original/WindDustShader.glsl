#!ATTRIBUTES
attribute vec3 currpos; 
attribute vec3 nextpos;
attribute vec3 prevpos;
attribute float random;

#!UNIFORMS
uniform sampler2D tMap;
uniform vec3 uColor;
uniform float uScroll;
uniform float uSpeed;
uniform float uThreshold;
uniform float uAnimatePosition;
uniform float uTile;
uniform float uFrameRate;
uniform float uThickness;
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
    float thickness = mix(0.1, 0.06, random) * pos.w;

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

    float t = floor(time * 12.0) / 12.0;

    float value = 1.0;
    float edgeGrad = 1.0 - abs(vUv.x - 0.5) * 2.0;
    edgeGrad = smoothstep(0.65, 1.0, edgeGrad);

    float noise = texture2D(tMap, vUv * vec2(0.7, mix(3.0, 4.0, vRandom)) + vRandom * 10.0 + vec2(0.0, -t * 0.2)).r;
    noise *= texture2D(tMap, vUv * vec2(0.5, 3.0) + vRandom * 5.0 + vec2(0.0, -t * 0.1)).r;

    value = edgeGrad;
    value *= noise;
    value *= smoothstep(1.0, 0.95, vUv.y);
    value -= (sin(t * 0.25- vUv.y * 4.0 + vRandom * 12.0) * 0.5 + 0.5) * 0.15;

    float alpha = aastep(0.5, value);
    float outline = aastep(0.5 + uThickness * 0.05 * 4.0, value);
    vec3 color = vec3(mix(uColor, vec3(1.0), outline));

    if (alpha < 0.5) {
        discard;
    }

    gl_FragColor = vec4(color, alpha); 
}