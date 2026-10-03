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
    // // break up lines with dots as light gets brighter
    float noise = texture2D(tNoise, vUv * 3.2 - vec2(steppedTime * 0.2, -steppedTime)).r;
    float noise2 = texture2D(tNoise, vUv * 1.5 - vec2(-steppedTime * 0.3, steppedTime)).r;

    float lineTile = uLinesTile;
    vec2 lineUv = vUv.yx * lineTile;
    lineUv.x -= steppedTime * 2.0;

    //lineUv.xy /= distCenter;
    

    float distCenter = distance(vUv + vec2((noise * 2.0 - 1.0) - 0.5) * 0.1, vec2(0.5, 0.5));
    distCenter = smoothstep(0.3, 0.55, distCenter);
    float alpha = 1.0;


    float lines = texture2D(tLines, lineUv.yx).r;

    float tile = 120.0;
    float value = sin(vUv.y * tile * 0.5) * 0.5 + 0.5;
    value = min(value, sin(vUv.x * tile) * 0.5 + 0.5);
    // value += 0.1;
    value += noise * 0.015;
    value += noise2 * 0.02;
    value -= lines * 0.001;
    value = aastep(0.05, 1.0 - pow(1.0 - value, 2.0));

    float lineTexture = lines * 0.75;
    value *= aastep(clamp(mix(0.2, 0.45, 1.0 - distCenter), 0.0, 1.0), lineTexture * (1.0 - clamp(length(vUv - 0.5) * 1.0, 0.0, 1.0)));

    vec3 color = uColorHighlight * value;
    color = max(vec3(18.0 / 255.0), color);

    


    gl_FragColor = vec4(color, alpha );
}