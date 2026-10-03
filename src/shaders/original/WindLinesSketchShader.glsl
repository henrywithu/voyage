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
uniform float uTime;

#!VARYINGS
varying vec2 vUv;
varying float vRandom;
varying vec3 vPos;
varying float vNdcHeight;

#!SHADER: Vertex

#require(simplenoise.glsl)

void main() {
    vUv = uv;

    float steppedTime = -time * 0.525;

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
    float thickness = 0.01 * pos.w;

    pos.xy += norm.xy * ((uv.x - 0.5) * 2.0) * thickness;

    vPos = currpos;
    vRandom = random;

    gl_Position = pos;

    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment

#require(simplenoise.glsl)

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    float steppedTime = -floor((uTime * 6.) * uFrameRate) / uFrameRate * mix(0.075, 0.2, vRandom) * 0.2;
    float noise = texture2D(tMap, vec2(vRandom * 0.314, vUv.y * 1.0 * uTile) + vec2(0.0, steppedTime + vRandom * 2.23 * uTile)).r;
    
    float scrollFactor = 1.0 - min(1.0, -uScroll * 0.25 + 0.5);
    float alpha = 1.0 - abs(vUv.x - 0.5) * 2.0;
    alpha *= step(uThreshold + scrollFactor * 0.4, noise);

    if (alpha < 0.26) discard;
    alpha = aastep(0.25, alpha);

    float n = cnoise(vPos.xyz * 1.1);
    float stepped = aastep(0.5, vUv.x + n * 0.3);
    vec3 color = mix(vec3(18.0 / 255.0), vec3(1.0), stepped);

    // if (uDiscardTop - vNdcHeight < 0.0) {
    //     alpha = 1.0;
    //     color = vec3(1.0, 0.0, 0.0);
    // }

    gl_FragColor = vec4(color, alpha); 
}