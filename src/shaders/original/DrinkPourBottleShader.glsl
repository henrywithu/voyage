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
uniform float uDistanceCompensation;
uniform vec3 uColorHighlight;
uniform vec3 uColor;
uniform vec3 uVelocity;
uniform vec2 uVerticalGrad;
uniform float uDiscardTop;
uniform float uDiscardBottom;
uniform float uWaterLineOffset;
uniform float uPourStrength;

#!VARYINGS
varying vec2 vUv;
varying vec2 vLineUv;
varying vec3 vNormal;
varying vec3 vPos;
varying vec3 vWorldPos;
varying float vHeight;
varying float vDistance;
varying float vNdcHeight;
varying vec3 vLightDir;
varying vec3 vTranslation;

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
    vTranslation = modelMatrix[3].xyz;
    vUv = uv;
    vNormal = normalMatrix * normal;
    vHeight = position.y;
    vPos = position;

    vec3 pos = position;
    vec4 modelViewPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * modelViewPos;

    vLineUv = (rotation3d(normalize(uAxis), uAngle) * position).xy;
    vDistance = -modelViewPos.z;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;

    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment
float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    // if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    float steppedTime = floor(time * 8.0) / 8.0 * 0.15;
    float steppedTime2 = floor(time * 18.0) / 18.0 * 0.15;

    vec3 normal = normalize(vNormal);

    // texture

    // lines
    vec2 lineUv = vLineUv * uLinesTile;
    vec2 lineUvDistanceCompensated = lineUv * mix(2.0, 0.5, pow(clamp(vDistance * 0.0325, 0.0, 1.0), 2.0)) * 0.5;
    lineUv = mix(lineUv, lineUvDistanceCompensated, uDistanceCompensation);
    lineUv.x -= steppedTime * 2.0;
    float lines = texture2D(tLines, lineUv.yx).r * 2.0 - 1.0;

    // lighting
    float lighting = dot(normal, uLightDir);
    float lightMask = max(0.0, lighting);
    float terminatormid = aastep(uThreshold.x, lighting + lines * 0.45);
    float terminatorhigh = aastep(uThreshold.y, lighting + lines * 0.1);

    // reduce lines in areas of brightness
    float maskedLines = lines + lightMask * 0.3;

    // break up lines with dots as light gets brighter
    float noise = texture2D(tNoise, lineUv * 2.0).r;
    maskedLines += noise * lightMask + lighting * 0.3;
    maskedLines = aastep(0.3, maskedLines);

    // compositing;
    vec3 color = vec3(1.0);
    color = mix(vec3(18.0 / 255.0), vec3(1.0), terminatormid);
    color *= maskedLines;

    // texture
    float tex = texture2D(tMap, vUv).r;
    color *= aastep(0.5, tex);

    // liquid
    vec3 liquidColor = uColor;
    float liquidMask = 1.0 - step(0.2, vUv.y);
    float waterLine = vTranslation.y - vWorldPos.y + uWaterLineOffset + vPos.y;
    float speed = pow(min(0.03, length(uVelocity)) * 30.0, 5.0);
    waterLine += texture2D(tNoise, vWorldPos.xy * 0.1 + vec2(-steppedTime2 * 3.5, 0.0)).r * max(0.75, uPourStrength * 1.25) * 0.125;
    waterLine = aastep(0.0, waterLine);
    liquidMask *= waterLine;
    color *= mix(vec3(1.0), liquidColor, liquidMask);

    color = max(vec3(18.0 / 255.0), color);

    float alpha = 1.0;
    gl_FragColor = vec4(color, alpha);
}