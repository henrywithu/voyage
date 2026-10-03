#!ATTRIBUTES
attribute float ao;

#!UNIFORMS
uniform sampler2D tMap;

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
    
    // lines
    vec2 lineUv = vUv.yx * uLinesTile;
    lineUv.x -= steppedTime * 2.0;
    float lines = texture2D(tLines, lineUv.yx).r;
    // // lines -= texture2D(tNoise, lineUv.yx * vec2(1.0, 0.05)).r * 0.5;

    // // lighting
    // float verticalGrad = smoothstep(uVerticalGrad.x, uVerticalGrad.y, vPos.y);
    // float lighting = vUv.y;
    // float lightMask = max(0.0, lighting);
    // float terminatormid = aastep(uThreshold.x, lighting + lines * 0.3 - vAo - verticalGrad);
    // float terminatorhigh = aastep(uThreshold.y, lighting + lines * 0.1 - vAo - verticalGrad);

    // // reduce lines in areas of brightness
    // float maskedLines = lines;

    // // break up lines with dots as light gets brighter
    float noise = texture2D(tNoise, vUv * 3.2 - vec2(steppedTime * 0.2, -steppedTime)).r;
    float noise2 = texture2D(tNoise, vUv * 1.5 - vec2(-steppedTime * 0.3, steppedTime)).r;
    // maskedLines -= noise * lightMask * 1.0;
    // maskedLines *= 1.0 - clamp(length(vUv - 0.5) * 1.0, 0.0, 1.0);
    // maskedLines *= smoothstep(0.95, 0.3, vUv.y);
    // maskedLines = aastep(0.5, maskedLines);

    // // compositing;
    // vec3 color = uColorHighlight;
    // color *= maskedLines;

    // color = max(vec3(18.0 / 255.0), color);

    float tile = 120.0;
    float value = sin(vUv.y * tile * 0.5) * 0.5 + 0.5;
    value = min(value, sin(vUv.x * tile) * 0.5 + 0.5);
    // value += 0.1;
    value += noise * 0.015;
    value += noise2 * 0.02;
    // value -= lines * 0.5;
    value = aastep(0.05, 1.0 - pow(1.0 - value, 2.0));

    float lineTexture = lines + noise * 0.75;
    value *= aastep(0.4, lineTexture * (1.0 - clamp(length(vUv - 0.5) * 1.5, 0.0, 1.0)));

    vec3 color = uColorHighlight * value;
    color = max(vec3(18.0 / 255.0), color);

    float alpha = 1.0;
    gl_FragColor = vec4(color, alpha);
}