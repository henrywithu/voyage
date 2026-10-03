#!ATTRIBUTES
attribute float ao;

#!UNIFORMS
uniform sampler2D tLines;
uniform sampler2D tNoise;
uniform float uLinesTile;
uniform vec3 uLightDir;
uniform vec2 uThreshold;
uniform vec3 uAxis;
uniform float uAngle;
uniform vec3 uColorHighlight;
uniform vec3 uColor;
uniform vec2 uVerticalGrad;
uniform float uDiscardTop;
uniform float uDiscardBottom;

#!VARYINGS
varying vec2 vUv;
varying vec2 vLineUv;
varying vec3 vNormal;
varying vec3 vPos;
varying float vAo;
varying float vHeight;
varying float vNdcHeight;
varying vec3 vLightDir;

#!SHADER: Vertex

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
    vNormal = normalize(normal);
    vAo = ao;
    vHeight = position.y;
    vPos = position;

    vec3 pos = position;

    // keep alive animation
    // float mask = smoothstep(-0.2, 0.3, position.y);
    // pos = rotation3d(vec3(1.0, 0.0, 0.5), (2.5 + sin(floor(time * 8.0) * 0.3 - mask * 2.0)) * 0.02 * (mask * 0.6 + 0.2)) * position;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    vLineUv = (rotation3d(normalize(uAxis), uAngle) * position).xy;
    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment
    float aastep(float threshold, float value) {
        float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
        return smoothstep(threshold-afwidth, threshold+afwidth, value);
    }

void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    float steppedTime = floor(time * 8.0) / 8.0 * 0.15;

    // vec3 normal = normalize(vNormal);

    float altMask = smoothstep(0.4, 1.0, vUv.y);
    altMask = max(altMask, smoothstep(0.1, 1.0, abs(vUv.x - 0.5) * 2.0));
    
    // lines
    vec2 lineUv = vUv.yx * uLinesTile;
    lineUv.x -= steppedTime * 2.0;
    float lines = texture2D(tLines, lineUv.yx * vec2(2.0, 1.0)).r;

    // // break up lines with dots as light gets brighter
    float noise = texture2D(tNoise, vUv * 3.2 * vec2(5.0, 1.0) - vec2(steppedTime * 0.2, -steppedTime)).r;
    float noise2 = texture2D(tNoise, vUv * 1.5 * vec2(5.0, 1.0) - vec2(steppedTime * 0.1, -steppedTime * 0.5)).r;
    float noise3 = texture2D(tNoise, vUv * 0.6 * vec2(8.0, 1.0) - vec2(0.0, -steppedTime * 0.5)).r;

    float value = lines;
    value = aastep(0.4, value + smoothstep(0.6, 0.95, noise3) + altMask + vUv.y * 0.2);

    // tiles
    vec2 tileUv = vec2(abs(fract(vUv * 17.0 * vec2(3.0, 1.0) + 0.65) - 0.5));
    noise2 = smoothstep(0.5, 1.0, noise2);
    float tiles = max(aastep(0.485, tileUv.x - noise2 * 0.125 - altMask), aastep(0.485, tileUv.y - noise2 * 0.5 - altMask));
    tiles = 1.0 - tiles;
    value *= tiles;

    vec3 color = vec3(value);

    altMask += noise3 * 0.3;
    altMask += lines * abs(vUv.x - 0.5) * 3.0;
    altMask = aastep(0.5, altMask);
    color *= mix(uColor, vec3(1.0), altMask);
    color = max(vec3(18.0 / 255.0), color);

    // color = vec3(vUv, 1.0);

    float alpha = 1.0;
    gl_FragColor = vec4(color, alpha);
}