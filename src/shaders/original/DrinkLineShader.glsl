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
uniform float uThickness;
uniform float uTile;
uniform float uFrameRate;
uniform float uDiscardTop;
uniform float uDiscardBottom;
uniform float uAnimate;

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
    vec3 offset = vec3(0.0, 0.0, 0.0);
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
    float thickness = uThickness * pos.w;

    // fade in thickness tip on both sides of the line
    thickness *= smoothstep(0.0, 0.05, uv.y);
    thickness *= smoothstep(0.0, 0.05, 1.0 - uv.y);

    float progressIn = uAnimate + thickness;
    float progressOut = uAnimate;
    float progress = uAnimate > 1.0 ? smoothstep(progressOut - 1.0, progressIn - 1.0, uv.y) : smoothstep(progressIn, progressOut, uv.y);

    float sinNoise = sin(vUv.y * 20.0 + time * 0.1) * 0.3 + sin(vUv.y * 40.0 + time * 0.2) * 0.1;
    vec2 noiseInfluence = vec2(0.05, 0.45);
    pos.xy += vec2(
        -(noiseInfluence.x / 2.0) + sinNoise * noiseInfluence.x,
        -(noiseInfluence.y / 2.0) + sinNoise * noiseInfluence.y
    );
    pos.xy += (norm.xy) * ((uv.x - 0.5) * 2.0) * thickness * progress;

    vPos = currpos;
    // vRandom = random;

    gl_Position = pos;

    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment

#require(simplenoise.glsl)

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold - afwidth, threshold + afwidth, value);
}

void main() {
    if(uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0)
        discard;

    float steppedTime = -floor(time * uFrameRate) / uFrameRate * uSpeed;
    float noise = texture2D(tMap, vec2(0.0, vUv.y * 1.0 * uTile) + vec2(0.0, steppedTime)).r;

    float scrollFactor = 1.0 - min(1.0, -uScroll * 0.25 + 0.5);

    float threshold = uThreshold + scrollFactor * 0.4 * uAnimate;

    float alpha = 1.0 - abs(vUv.x - 0.5) * 2.0;

    alpha *= step(threshold, noise);

    if(alpha < 0.26)
        discard;
    alpha = aastep(0.25, alpha);

    float stepped = aastep(0.5, vUv.x);
    vec3 color = mix(vec3(1.0), vec3(18.0 / 255.0), stepped);

    // if (uDiscardTop - vNdcHeight < 0.0) {
    //     alpha = 1.0;
    //     color = vec3(1.0, 0.0, 0.0);
    // }

    gl_FragColor = vec4(color, alpha);
}