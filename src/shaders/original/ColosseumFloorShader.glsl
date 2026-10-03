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
    // if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    float steppedTime = floor(time * 8.0) / 8.0 * 0.15;

    // lines
    float textureBlend = abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
    // vec2 lineUv = mix(vPos.zx, vPos.yx, uvBlend) * uLinesTile * 0.025;
    vec2 lineUv1 = vPos.zx * uLinesTile * 0.025;
    vec2 lineUv2 = vPos.yx * uLinesTile * 0.025;
    lineUv1.x += steppedTime * 2.0;
    lineUv2.x += steppedTime * 2.0;

    // tiles
    vec2 tileUv = vec2(abs(fract(vUv * 17.0 * vec2(1.0, 0.15) + 0.5 + vec2(0.0, 0.25)) - 0.5));
    float noise2 = texture2D(tNoise, vUv * 1.5 - vec2(steppedTime * 0.1, -steppedTime * 0.5)).r;
    noise2 = smoothstep(0.5, 1.0, noise2);
    // float tiles = max(aastep(0.485, tileUv.x - noise2 * 0.125 - smoothstep(0.9, 1.0, vUv.y)), aastep(0.485, tileUv.y - noise2 * 0.5));
    float tiles = aastep(0.49, tileUv.x - noise2 * 0.125 - smoothstep(0.9, 1.0, vUv.y));
    tiles += aastep(0.497, tileUv.y - noise2 * 0.125);
    tiles = 1.0 - tiles;

    // lines
    float lines = texture2D(tLines, lineUv1.yx).r;
    lines = mix(lines, texture2D(tLines, lineUv2.yx).r, textureBlend);
    float noise = texture2D(tNoise, lineUv1 * 2.0).r;
    noise = mix(noise, texture2D(tNoise, lineUv2 * 2.0).r, textureBlend);
    float lightMask = pow(1.0 - vUv.y, 4.0);
    float maskedLines = lines + lightMask;
    maskedLines += noise * lightMask;
    maskedLines = aastep(0.25, maskedLines);

    // lighting
    float lighting = dot(normalize(vNormal), vec3(0.0, 1.0, 0.0)) * 0.5 + 0.4;
    lighting += lines * 0.4;
    lighting = aastep(0.4, lighting);

    // compositing
    float value = 0.0;
    value = maskedLines;
    value *= tiles;
    value *= lighting;

    vec3 color = vec3(max(18.0/255.0, value));

    float alpha = 1.0;
    
    gl_FragColor = vec4(color, alpha);
}