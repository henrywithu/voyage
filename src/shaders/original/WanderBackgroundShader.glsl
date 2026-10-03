#!ATTRIBUTES

#!UNIFORMS
uniform float uDiscardTop;
uniform float uDiscardBottom;
uniform float uScroll;
uniform float uHeightWorld;
uniform float uProgress;

uniform sampler2D tMap;
uniform sampler2D tNoise;
uniform vec3 uColor;
uniform vec3 uCloudColor;

#!VARYINGS
varying vec2 vUv;
varying vec3 vPos;
varying float vNdcHeight;
varying float vAspect;

#!SHADER: Vertex
void main() {

    vAspect = resolution.y / resolution.x;
    vPos = position;
    vPos.x /= vAspect;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPos, 1.0);
    
    vUv = uv;
    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment
#require(mousefluid.fs)
#require(range.glsl)

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    float fluidMask = getFluidMask();

    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    // scroll uvs
    float steppedTime = -floor(time * 24.0) * 0.004;
    vec2 uv =  vUv * vec2(3.0 / vAspect, 3.0) - vec2(-steppedTime * vAspect, steppedTime * 0.5);

    // rough noise
    float n1 = texture2D(tNoise, uv + steppedTime * 0.25).r;

    // cloud shapes
    float noise = texture2D(tMap, uv * 0.75).r;
    noise *= texture2D(tMap, uv + steppedTime * 0.5).r;
    noise = clamp(noise, 0.0, 1.0);
    noise = pow(noise, 2.0);

    // animate in on scroll
    // float scrollFactor = 1.0 - min(1.0, -uScroll / uHeightWorld);
    float scrollFactor = smoothstep(0.0, 0.8, vUv.y);
    scrollFactor -= crange(-uScroll, 0.0, uHeightWorld, 0.0, 1.0);
    float scan = pow(scrollFactor, 2.0);

    // scan -= fluidMask * 0.05;

    // circular gradient around center
    float haloGrad = length((vPos.xy) * 0.7);
    haloGrad = pow(smoothstep(0.30, 0.08, haloGrad), 3.0);
    float horizonGrad = smoothstep(0.55, 0.45, vUv.y);
    float value = haloGrad * 1.75 + horizonGrad * 1.95;
    value = value * 0.5;
    value += 0.325;
    value += fluidMask * 0.03;
    value -= (1.0 - pow(noise, 2.0)) * 0.6;
    value -= n1 * 0.35;
    value = clamp(value, 0.0, 1.0);

    value *= uProgress;


    float thickness = resolution.y * 0.0035;
    float mask = aastep(scan, value);

    float alpha = aastep(scan + 0.01, value);
    if (alpha < 0.5) discard;

    // vec3 color = mix(uColor, uCloudColor, aastep(scan + 0.01, value));
    vec3 color = vec3(1.0);
    // color = vec3(1.0, 0.0, 0.0);

    gl_FragColor = vec4(color, 1.0);
}