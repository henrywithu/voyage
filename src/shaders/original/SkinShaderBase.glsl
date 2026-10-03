#!ATTRIBUTES
attribute vec2 uv2;

#!UNIFORMS
uniform sampler2D tTrim;
uniform sampler2D tLines;
uniform sampler2D tNoise;

uniform float uLinesTile;
uniform float uDiscardTop;
uniform float uDiscardBottom;

#!VARYINGS
varying vec2 vUv;
varying vec2 vUv2;
varying vec2 vLineUv;
varying vec3 vNormal;
varying float vAo;
varying float vNdcHeight;

#!SHADER: Vertex

#require(skinning.glsl)

mat3 rotation3d(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat3(
    oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
  );
}

void main() {
    vUv = uv;
    vUv2 = uv2;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;
    applySkin(pos, vNormal);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

#!SHADER: Fragment

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    gl_FragColor = vec4(vNormal, 1.0);
}