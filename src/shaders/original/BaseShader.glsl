#!ATTRIBUTES
attribute vec2 uv2;

#!UNIFORMS
uniform sampler2D tTrim;
uniform sampler2D tLines;
uniform sampler2D tNoise;

uniform float uLinesTile;

#!VARYINGS
varying vec2 vUv;
varying vec2 vUv2;
varying vec2 vLineUv;
varying vec3 vNormal;
varying float vAo;

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

    vLineUv = (rotation3d(normalize(vec3(1.0, 0.0, 2.5)), 0.5) * position).xy;
    vAo = uv2.x;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

#!SHADER: Fragment

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    vec3 normal = normalize(vNormal);
    
    float steppedTime = floor(time * 8.0);
    
    // lines
    vec2 lineUv = vLineUv * uLinesTile;
    lineUv.y += steppedTime * 0.15;
    float lines = texture2D(tLines, lineUv.yx).r * 2.0 - 1.0;

    // trim pattern
    float trim = texture2D(tTrim, vUv).r;
    trim = aastep(0.55, trim);

    // lighting
    vec3 lightDir = normalize(vec3(-0.8, 0.1, 0.0));
    float lighting = dot(normal, lightDir);
    float lightMask = max(0.0, lighting);
    float terminatormid = aastep(0.1, lighting + lines * 0.3 - vAo);
    float terminatorhigh = aastep(0.9, lighting + lines * 0.075 - vAo);
    float terminatorbounce = 1.0 - aastep(-0.91, lighting + vAo * 0.2 - lines * 0.2);

    // reduce lines in areas of brightness
    float maskedLines = lines + lightMask;

    // break up lines with dots as light gets brighter
    float noise = texture2D(tNoise, lineUv * 2.0).r;
    maskedLines += noise* pow(lightMask, 2.0) * 3.0;
    maskedLines = aastep(0.01, maskedLines);

    // compositing;
    vec3 color = vec3(1.0);
    vec3 brown = vec3(176.0, 156.0, 118.0) / 255.0;
    color = mix(vec3(0.0), brown, terminatormid);
    color = mix(color, vec3(1.0), terminatorhigh);
    color *= maskedLines;
    color = mix(color, brown, terminatorbounce);
    color *= trim;

    if (!gl_FrontFacing) {
        color = vec3(0.0);
    }

    gl_FragColor = vec4(color, 1.0);
}