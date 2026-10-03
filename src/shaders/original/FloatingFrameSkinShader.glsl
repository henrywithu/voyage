#!ATTRIBUTES
attribute vec2 uv2;
attribute float ao;

#!UNIFORMS
uniform sampler2D tMap;
uniform vec3 uPoint1;
uniform vec3 uPoint2;
uniform vec3 uPoint3;
uniform vec3 uPoint4;

uniform sampler2D tAtlas;
uniform sampler2D tTrim;
uniform sampler2D tLines;
uniform sampler2D tNoise;
uniform float uLinesTile;
uniform vec3 uLightDir;

#!VARYINGS
varying vec2 vUv;
varying vec2 vUv2;
varying vec2 vLineUv;
varying vec3 vNormal;
varying float vAo;
varying float vBackground;
varying vec3 vNdc;
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
    vAo = ao;
    vUv = uv;
    vUv2 = uv2;
    vNormal = normalize(normalMatrix * normal);
    vLineUv = (rotation3d(normalize(vec3(1.0, 0.0, 2.5)), 0.5) * position).xy;
    vLightDir = normalize(uLightDir);

    vec3 pos = position;

    // subtle keep alive animation
    pos = rotation3d(vec3(1.0, 0.0, 0.5), sin(floor(time * 8.0) * 0.5 + position.x * 1.0 - position.z * 2.0) * 0.03) * position;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    vNdc = gl_Position.xyz / gl_Position.w;
    vBackground = 1.0 - step(-0.5, position.z - position.x);
}

#!SHADER: Fragment
    float aastep(float threshold, float value) {
        float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
        return smoothstep(threshold-afwidth, threshold+afwidth, value);
    }

    float isLeft( vec3 P0, vec3 P1, vec3 P2 ) {
        return ( (P1.x - P0.x) * (P2.y - P0.y) - (P2.x - P0.x) * (P1.y - P0.y) );
    }

void main() {
    // check if ndc point is inside rectangle and discard anything outside
    vec3 pos1 = uPoint1;
    vec3 pos2 = uPoint2;
    vec3 pos3 = uPoint3;
    vec3 pos4 = uPoint4;

    float grad1 = isLeft(pos1, pos2, vNdc);
    float grad2 = isLeft(pos2, pos3, vNdc);
    float grad3 = isLeft(pos3, pos4, vNdc);
    float grad4 = isLeft(pos4, pos1, vNdc);

    float sdfx = max(grad2, grad4);
    float sdfy = max(grad1, grad3);

    float aspect = resolution.x / resolution.y;
    float invaspect = resolution.y / resolution.x;
    float largestAspect = aspect > invaspect ? aspect : invaspect;

    // add noise
    float steppedTime = floor(time * 8.0) / 8.0 * 0.15;
    float edgeNoise = texture2D(tNoise, vec2(vNdc) + vec2(steppedTime, 0.0)).r;
    sdfx += edgeNoise * 0.0002;
    sdfy += edgeNoise * 0.0002;
    float sdf = max(sdfx, sdfy);
    sdf *= aspect;

    float dx = dFdx(vNdc.x);
    float dy = dFdy(vNdc.y);

    float verticalRatio = resolution.y / resolution.x;
    float horizontalRatio = resolution.x / resolution.y;
    
    float width = 0.001;
    float outline = aastep(width, -sdf);
    // outline *= aastep(width, -sdfy);

    if (sdf > 0.005) discard;

    vec3 normal = normalize(vNormal);
    
    // lines
    vec2 lineUv = vLineUv * uLinesTile;
    lineUv.x -= steppedTime * 3.0;
    float lines = texture2D(tLines, lineUv.yx).r * 2.0 - 1.0;

    // trim texture
    float atlas = texture2D(tAtlas, vUv).r;
    atlas = aastep(0.55, atlas);

    // trim texture
    float trim = texture2D(tTrim, vUv2).r;
    trim = aastep(0.55, trim);

    // lighting
    vec3 lightDir = vLightDir;
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
    color *= atlas;

    vec3 backgroundColor = vec3(58.0) / 255.0;
    color *= outline;

    float alpha = 1.0 - aastep(0.0025, sdf);

    gl_FragColor = vec4(color, alpha);

    // move elements in front of frame border
    gl_FragDepth = gl_FragCoord.z - 0.3;
}