#!ATTRIBUTES
attribute vec2 uv2;

#!UNIFORMS
uniform sampler2D tTrim;
uniform sampler2D tLines;
uniform sampler2D tNoise;

uniform float uLinesTile;
uniform float uDisplacement;
uniform float uDiscardTop;
uniform float uDiscardBottom;
uniform vec3 uAxis;
uniform float uAngle;
uniform float uTime;
uniform float uInverse;
uniform vec3 uLightDir;
uniform vec3 uColor;
uniform float uWindSpeed;
#!VARYINGS
varying vec2 vUv;
varying vec2 vUv2;
varying vec2 vLineUv;
varying vec3 vNormal;
varying vec3 vPos;
varying float vAo;
varying float vNdcHeight;

#!SHADER: Vertex

#require(skinning.glsl)
#require(simplenoise.glsl)

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


    float steppedTime = floor(time * 8.0);

    vLineUv = (rotation3d(normalize(uAxis), uAngle) * position).xy;

    vAo = uv2.x;
    vPos = pos;

    float hairmask = step(0.001, vUv2.y);

    float hairWindMask = step(vPos.y - 1.54, 0.8);

    float clothesMask = 1.0 - step(0.55, vUv2.y);

    pos.xz += (cnoise(pos.xz * 10.0 + (uTime * uWindSpeed)) * 0.01 * clothesMask) * hairmask;

    pos.xz += (cnoise(pos.xz * 5.0 + (uTime * uWindSpeed)) * 0.01 * (1.0 - hairmask) * (1.0 - hairWindMask));

    vec4 projectionPos = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vec4 projectionNormal = projectionMatrix * modelViewMatrix * vec4(vNormal, 0.0);
    
    vec2 screenNormal = normalize(projectionNormal.xy);
    projectionPos.xy += screenNormal * uDisplacement * projectionPos.w * 0.004;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_Position = mix(gl_Position, projectionPos, uInverse);


    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    float ao = abs(vAo);
    float skinMask = step(0.55, vUv2.y);
    float hairstrips = step(0.8, vUv2.y);
    vec3 normal = normalize(vNormal);
    
    float steppedTime = floor(time * 8.0);
    
    // lines
    vec2 lineUv = vLineUv * uLinesTile;
    lineUv.x += steppedTime / uLinesTile * 0.2;
    float lines = texture2D(tLines, lineUv.yx).r * 2.0 - 1.0;

    // trim pattern
    float trim = texture2D(tTrim, vUv).r;
    trim = mix(0.66, 1.0, aastep(0.55, trim));  // Voyage: lace strokes in soft grey (see makeup.glsl laceInk)

    // lighting
    vec3 lightDir = normalize(uLightDir);
    float lighting = dot(normal, lightDir);
    float lightMask = max(0.0, lighting);
    float terminatormid = aastep(-0.3, lighting + lines * 1.3 - vAo);
    float terminatorhigh = aastep(0.85, lighting + lines * 0.1 - 0.1 - vAo);
    float terminatorbounce = 1.0 - aastep(-0.91, lighting - lines * 0.2);

    // reduce lines in areas of brightness
    float maskedLines = lines + lightMask;

    // break up lines with dots as light gets brighter
    float noise = texture2D(tNoise, lineUv * 2.0).r;
    maskedLines += noise* pow(lightMask, 2.0) * 3.0;
    maskedLines = aastep(0.01, maskedLines);

    // compositing;
    vec3 color = vec3(1.0);

    vec3 alt = uColor;

    color = mix(vec3(18.0 / 255.0), alt, terminatormid);
    color = mix(color, vec3(1.0), skinMask);
    color *= maskedLines;
    color = mix(color, alt, terminatorbounce);
    color *= trim;

    // color = vec3(skinMask);


    color = max(vec3(18.0 / 255.0), color);

    color =  mix(color, vec3(18.0 / 255.0), uInverse);

    gl_FragColor = vec4(color, 1.0);

}