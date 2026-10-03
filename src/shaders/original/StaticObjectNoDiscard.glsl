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

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    vLineUv = (rotation3d(normalize(uAxis), uAngle) * position).xy;
}

#!SHADER: Fragment
    float aastep(float threshold, float value) {
        float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
        return smoothstep(threshold-afwidth, threshold+afwidth, value);
    }

void main() {
    float steppedTime = floor(time * 8.0) / 8.0 * 0.15;

    vec3 normal = normalize(vNormal);
    
    // lines
    vec2 lineUv = vLineUv * uLinesTile;
    lineUv.x -= steppedTime * 2.0;
    float lines = texture2D(tLines, lineUv.yx).r * 2.0 - 1.0;

    // lighting
    float verticalGrad = smoothstep(uVerticalGrad.x, uVerticalGrad.y, vPos.y);
    float lighting = dot(normal, uLightDir);
    float lightMask = max(0.0, lighting);
    float terminatormid = aastep(uThreshold.x, lighting + lines * 0.45 - vAo - verticalGrad);
    float terminatorhigh = aastep(uThreshold.y, lighting + lines * 0.1 - vAo - verticalGrad);

    // reduce lines in areas of brightness
    float maskedLines = lines + lightMask;

    // break up lines with dots as light gets brighter
    float noise = texture2D(tNoise, lineUv * 2.0).r;
    maskedLines += noise * lightMask + lighting * 0.3;
    maskedLines = aastep(0.2, maskedLines);

    // compositing;
    vec3 color = vec3(1.0);
    color = mix(vec3(18.0 / 255.0), uColor, terminatormid);
    color = mix(color, uColorHighlight, terminatorhigh);
    color *= maskedLines;

    color = max(vec3(18.0 / 255.0), color);

    // color = vec3(terminatorhigh);

    float alpha = 1.0;
    gl_FragColor = vec4(color, alpha);
}