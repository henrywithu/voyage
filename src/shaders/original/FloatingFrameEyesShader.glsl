#!ATTRIBUTES
attribute vec2 uv2;
attribute float colorid;

#!UNIFORMS
uniform sampler2D tMap;
uniform vec3 uPoint1;
uniform vec3 uPoint2;
uniform vec3 uPoint3;
uniform vec3 uPoint4;
// uniform float uAspectRatio;
uniform float uTransition;
uniform float uDPR;
uniform sampler2D tAtlas;
uniform sampler2D tTrim;
uniform sampler2D tLines;
uniform sampler2D tNoise;
uniform float uLinesTile;
uniform vec3 uLightDir;
uniform vec3 uColor;


#!VARYINGS
varying vec2 vUv;
varying vec2 vUv2;
varying vec2 vLineUv;
varying vec3 vNormal;
varying vec3 vPos;
varying float vIrisMask;
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
    vIrisMask = step(0.5, colorid);
    vUv = uv;
    vUv2 = uv2;
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    vLineUv = (rotation3d(normalize(vec3(0.0, 0.0, 1.0)), 1.57) * position).xy;
    vLightDir = normalize(uLightDir);

    vec3 pos = position;

    // pos = rotation3d(vec3(1.0, 0.0, 0.5), sin(floor(time * 8.0) * 0.5 + position.x * 1.0 - position.z * 2.0) * 0.03) * position;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    vNdc = gl_Position.xyz / gl_Position.w;
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
    // float invaspect = resolution.y / resolution.x;
    // float largestAspect = aspect > invaspect ? aspect : invaspect;

    // add noise
    float steppedTime = floor(time * 8.0) / 8.0 * 0.15;
    float edgeNoise = texture2D(tNoise, vec2(vNdc) + vec2(steppedTime, 0.0)).r;
    sdfx += edgeNoise * 0.0005;
    sdfy += edgeNoise * 0.0005;
    float sdf = max(sdfx, sdfy);
    sdf * aspect;

    // float dx = dFdx(vNdc.x);
    // float dy = dFdy(vNdc.y);

    // float verticalRatio = resolution.y / resolution.x;
    // float horizontalRatio = resolution.x / resolution.y;
    
    // float width = 0.0025;
    // float outline = aastep(width, -sdf);
    // outline *= aastep(width, -sdfy);

    // float widthX = 0.002;
    // float widthY = 0.002 * uAspectRatio;
    // float outline = aastep(widthX, -sdfx) * aastep(widthY, -sdfy);

    float pixelWidth = 3.0 * uDPR; // desired width in pixels
    float widthX = mix(0.00001, pixelWidth * fwidth(sdfx), uTransition);
    float widthY = mix(0.00001, pixelWidth * fwidth(sdfy), uTransition);
    float outline = aastep(widthX, -sdfx) * aastep(widthY, -sdfy);

    if (sdf > 0.005) discard;

    vec3 normal = normalize(vNormal);
    
    // lines
    vec2 lineUv = vLineUv * uLinesTile;
    lineUv.x -= steppedTime * 3.0;
    float lines = texture2D(tLines, lineUv.yx).r * 2.0 - 1.0;

    // trim texture
    vec2 displacement = vec2(sin(vPos.y * 20.0 + floor(time * 6.0) * 1.5), 0.0);
    float atlas = texture2D(tAtlas, vUv + displacement * 0.0003).r;
    atlas += (lines) * 0.15;
    atlas = aastep(0.25, atlas);

    // trim texture
    float trim = texture2D(tTrim, vUv2).r;
    trim = aastep(0.55, trim);

    // lighting
    vec3 lightDir = vLightDir;
    float lighting = dot(normal, lightDir);
    float lightMask = max(0.0, lighting);
    float terminatormid = aastep(0.1, lighting + lines * 0.3);
    float terminatorhigh = aastep(0.9, lighting + lines * 0.075);
    float terminatorbounce = 1.0 - aastep(-0.91, lighting * 0.2 - lines * 0.2);

    // reduce lines in areas of brightness
    float maskedLines = lines;

    // break up lines with dots as light gets brighter
    float noise = texture2D(tNoise, lineUv * 2.0).r;
    maskedLines += noise* pow(lightMask, 2.0) * 3.0;
    maskedLines += pow(1.0 - (vPos.y * 0.5 + 0.4), 2.0);
    maskedLines = aastep(0.01, maskedLines);

    // compositing;
    vec3 color = vec3(1.0);
    color *= maskedLines;
    color = mix(color, vec3(1.0), terminatorbounce);
    color *= atlas;
    color *= mix(vec3(1.0), uColor, vIrisMask);

    vec3 backgroundColor = vec3(58.0) / 255.0;
    color *= outline;

    float alpha = 1.0 - aastep(0.0025, sdf);

    color = max(vec3(18.0 / 255.0), color);

    gl_FragColor = vec4(color, alpha);

    // move elements in front of frame border
    gl_FragDepth = gl_FragCoord.z - 0.3;
}