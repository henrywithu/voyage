#!ATTRIBUTES
attribute vec2 uv2;
attribute float windmask;

#!UNIFORMS
uniform sampler2D tMap;
uniform sampler2D tTrim;
uniform sampler2D tNoise;
uniform sampler2D tLines;
uniform float uLinesTile;
uniform float uDiscardTop;
uniform float uDiscardBottom;
uniform float uSteppedTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uCutout;

#!VARYINGS
varying vec2 vUv;
varying vec2 vUv2;
varying vec3 vPos;
varying vec3 vLocalPos;
varying vec3 vNormal;
varying float vNdcHeight;
varying float vAspect;
varying float vCenter;
varying float vWindMask;

mat2 rotate2d(float a) {
	float s = sin(a);
	float c = cos(a);
	return mat2(c, s, -s, c);
}

#!SHADER: Vertex
void main() {
    vWindMask = windmask;
    vNormal = normal;
    vLocalPos = position;

    float t = floor(time * uSteppedTime) / uSteppedTime;

    vec3 pos = position;

    // wind animation
    pos.y += windmask * sin(t * 1.6 + pos.x * 31.4) * 0.01;
    pos.y += windmask * sin(t * 2.0 + pos.x * 27.4) * 0.015;
    pos.z += windmask * sin(t * 1.47 + pos.y * 5.4) * 0.13;

    float displacement = 0.05;
    pos += normal * displacement * sin(normal * 5.0 + position * 16.0 + t * 5.0) * displacement;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vec4 modelViewPos = viewMatrix * worldPos;
    gl_Position = projectionMatrix * modelViewPos;

    vAspect = resolution.x / resolution.y;
    vUv = uv;
    vUv2 = uv2;

    // for portal window mask
    vPos = gl_Position.xyz / gl_Position.w;
    vPos.x *= vAspect;
    vPos = 1.0 - (vPos * 0.5 + 0.5);
    vPos.x -= 0.5;

    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);

    vCenter = (uDiscardBottom + uDiscardTop) * 0.5;
}

#!SHADER: Fragment
float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    float t = floor(time * uSteppedTime) / uSteppedTime * 0.5;

    vec4 trimData = texture2D(tTrim, vUv);
    if (trimData.a < 0.5) discard;


    float trim = aastep(0.5, trimData.r);
    float atlas = aastep(0.5, texture2D(tMap, vUv2).r);

    float steppedTime = floor(time * uSteppedTime) / uSteppedTime;

    float lines = texture2D(tLines, vLocalPos.xy * vec2(1.5) + vec2(-steppedTime * 0.01, steppedTime * 0.3)).r;
    float theta = dot(normalize(vNormal), normalize(vec3(0.0, 0.0, 1.0))) * 0.5 + 0.5;
    float lighting = theta;
    lighting -= lines * 0.2;
    lighting *= trim;
    lighting *= atlas;
    lighting *= max(0.0, vLocalPos.y - 0.5) * 0.5;
    float value = aastep(0.075, lighting) * (1.0 - aastep(0.3, theta));

    vec3 nearBlack = vec3(18.0 / 255.0);
    vec3 color = vec3(value) * uColor2;
    color = max(nearBlack, color);

    if (length(vPos - vec3(0.0, vCenter, 0.0)) > uCutout) {
        discard;
    };

    gl_FragColor = vec4(color, 1.0);
}