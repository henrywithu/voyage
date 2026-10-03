#!ATTRIBUTES
attribute vec2 uv2;
attribute float windmask;

#!UNIFORMS
uniform sampler2D tMap;
uniform vec3 uPoint1;
uniform vec3 uPoint2;
uniform vec3 uPoint3;
uniform vec3 uPoint4;
uniform vec3 uCenter;
uniform float uTransition;
// uniform float uAspectRatio;
uniform float uDPR;

uniform sampler2D tAtlas;
uniform sampler2D tTrim;
uniform sampler2D tLines;
uniform sampler2D tNoise;
uniform float uLinesTile;
uniform vec3 uLightDir;

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uHover;

#!VARYINGS
varying vec2 vUv;
varying vec2 vUv2;
varying vec2 vLineUv;
varying vec3 vNormal;
varying float vAo;
varying float vWindMask;
varying float vBackground;
varying vec3 vNdc;
varying vec3 vPos;
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
    vPos = position;
    vWindMask = windmask;
    vUv = uv;
    vUv2 = uv2;
    vNormal = normal;
    vLineUv = (rotation3d(normalize(vec3(1.0, 0.0, 2.5)), 3.14159 * 0.5) * position).xy;
    vLightDir = normalize(vec3(0.0, 0.5, -0.5));

    vec3 pos = position;

    float steppedTime = floor(time * 12.0) / 12.0;

    float freq = 25.0;
    float speed = 1.25;
    float amp = 0.05;
    float displacement = sin(pos.x * freq + steppedTime * speed) * amp * windmask;
    displacement += sin(pos.x * freq * 0.34159 + pos.z * 0.5 * freq + steppedTime * speed * 3.14159 * 0.673) * amp * windmask;
    displacement += sin(pos.x * freq * 0.2772 + pos.z * 0.5 * freq + steppedTime * speed * 3.14159 * 0.673) * amp * windmask * 0.5;

    pos.y += displacement;

    // subtle keep alive animation
    // pos = rotation3d(vec3(1.0, 0.0, 0.5), sin(floor(time * 8.0) * 0.5 - position.y * 0.8 + position.x * 2.0) * max(0.0, position.y + 0.8) * 0.03) * position;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    vNdc = gl_Position.xyz / gl_Position.w;
    vBackground = 1.0 - step(-0.5, position.z);
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
    float transition = uTransition + 0.01;
    // check if ndc point is inside rectangle and discard anything outside
    vec3 pos1 = mix(uCenter, uPoint1, transition);
    vec3 pos2 = mix(uCenter, uPoint2, transition);
    vec3 pos3 = mix(uCenter, uPoint3, transition);
    vec3 pos4 = mix(uCenter, uPoint4, transition);

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

    edgeNoise -= uHover * 100.0;

    sdfx += edgeNoise * 0.0002 * transition;
    sdfy += edgeNoise * 0.0002 * transition;
    float sdf = max(sdfx, sdfy);
    sdf *= aspect;

    // float dx = dFdx(vNdc.x);
    // float dy = dFdy(vNdc.y);

    // float verticalRatio = resolution.y / resolution.x;
    // float horizontalRatio = resolution.x / resolution.y;
    
    // float width = mix(0.00001, 0.005, uTransition);
    // float outline = aastep(width, -sdf);
    // outline *= aastep(width, -sdfy);

    // float widthX = mix(0.00001, 0.002, uTransition);
    // float widthY = mix(0.00001, 0.002 * uAspectRatio, uTransition);

    float pixelWidth = 3.0 * uDPR; // desired width in pixels
    float widthX = mix(0.00001, pixelWidth * fwidth(sdfx), uTransition);
    float widthY = mix(0.00001, pixelWidth * fwidth(sdfy), uTransition);

    float outline = aastep(widthX, -sdfx) * aastep(widthY, -sdfy);

    if (sdf > 0.005) discard;

    vec3 normal = normalize(vNormal);
    
    // lines
    vec2 lineUv = vLineUv * uLinesTile;
    lineUv.x -= steppedTime * 3.0;
    float lines = texture2D(tLines, lineUv.yx * 0.7).r * 2.0 - 1.0;

    // trim texture
    float atlas = texture2D(tAtlas, vUv).r;
    atlas = aastep(0.55, atlas);

    // trim texture
    float trim = texture2D(tTrim, vUv2).r;
    trim = aastep(0.55, trim);

    // lighting
    // vec3 lightDir = vLightDir;
    vec3 lightDir = normalize(vec3(0.15, 0.0, 1.0));
    float lighting = max(0.0, dot(normal, lightDir));
    lighting *= clamp(vPos.y * 0.5 + 0.8, 0.0, 1.0);
    lighting = pow(lighting - 0.1, 4.0);
    lighting = clamp(lighting, 0.0, 1.0);

    // compositing
    float noise = texture2D(tNoise, lineUv * 2.0).r;
    float value = aastep(0.5, lighting + (1.0 - lines) * 0.3 + noise * lighting);
    vec3 color = uColor2 * vec3(value);
    // color *= trim;
    color *= atlas;

    // color background
    vec3 backgroundColor = uColor3;
    if (vBackground > 0.5) color = backgroundColor;

    // frame outline
    color *= outline;

    vec3 nearBlack = vec3(18.0 / 255.0);
    color = max(nearBlack, color);

    float alpha = 1.0 - aastep(0.00001, sdf);

    // alpha = 1.0;
    // color = vec3(sdf);

    gl_FragColor = vec4(color, alpha);

    // move elements in front of frame border
    gl_FragDepth = gl_FragCoord.z - 0.3;
}