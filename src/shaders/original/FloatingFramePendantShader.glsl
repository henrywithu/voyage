#!ATTRIBUTES
attribute vec2 uv2;
attribute vec3 color;

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
uniform vec3 uDrinkColor;
uniform float uHover;

#!VARYINGS
varying vec2 vUv;
varying vec2 vUv2;
varying vec2 vLineUv;
varying vec3 vNormal;
varying float vBackground;
varying float vFloor;
varying vec3 vNdc;
varying vec3 vPos;
varying vec3 vViewPos;
varying vec3 vLightDir;
varying float vChain;

#!SHADER: Vertex

#require(skinning.glsl)

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
    vUv = uv;
    vUv2 = uv2;
    vNormal = normalMatrix * normal;
    vLightDir = vec3(-0.4, 0.4, 1.2);
    vLineUv = (rotation3d(normalize(vec3(-0.25, 0.0, 1.0)), 1.0) * position).xy * 5.0;
    vBackground = 0.0;
    vChain = color.r;

    vec3 pos = position;
    applySkin(pos, vNormal);

    pos.z -= 0.1;

    vec4 modelViewPos = modelViewMatrix * vec4(pos, 1.0);
    vViewPos = -modelViewPos.xyz;

    gl_Position = projectionMatrix * modelViewPos;

    vNdc = gl_Position.xyz / gl_Position.w;
}

#!SHADER: Fragment
#require(makeup.glsl)
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

    float pixelWidth = 3.0 * uDPR; // desired width in pixels
    float widthX = mix(0.00001, pixelWidth * fwidth(sdfx), uTransition);
    float widthY = mix(0.00001, pixelWidth * fwidth(sdfy), uTransition);

    float outline = aastep(widthX, -sdfx) * aastep(widthY, -sdfy);

    if (sdf > 0.005) discard;
    // After the clasp: only the closed chain.
    if (vChain > 0.25 && vChain < 0.75) discard;

    vec3 normal = normalize(vNormal);
    
    // lines
    vec2 lineUv = vLineUv.yx;
    lineUv.x -= steppedTime * 1.0;

    float lines = texture2D(tLines, lineUv.yx * (0.7 - vBackground * 0.1)).r * 2.0 - 1.0;

    // trim texture
    float atlas = texture2D(tAtlas, vUv2).r;
    atlas = aastep(0.55, atlas);

    // trim texture
    vec4 trimData = texture2D(tTrim, vUv);
    if (trimData.a + vBackground < 0.2) discard;
    float trim = trimData.r;
    trim = aastep(0.55, trim * atlas);

    // lighting
    vec3 lightDir = vLightDir;
    float lighting = dot(normal, lightDir) * 0.5 + 0.5;
    lighting = pow(lighting - 0.1, 2.0) * 1.6;

    // compositing
    float skinMask = step(0.55, vUv2.y);
    float fresnel = max(0.0, dot(normalize(vNormal), normalize(vViewPos)));
    fresnel = (1.0 - fresnel) * skinMask;
    vec3 nearBlack = vec3(18.0 / 255.0);
    vec3 backgroundColor = mix(uColor1, nearBlack, aastep(0.1, -vPos.y * 2.1 - 0.8 + lines * 0.75));
    float noise = texture2D(tNoise, lineUv * 2.0).r;
    float value = aastep(0.5, lighting + lines + noise * lighting - fresnel);
    vec3 color = mix(mix(uColor2, backgroundColor, step(0.5, vBackground)), vec3(1.0), skinMask);
    color *= mix(trim, 1.0, vBackground);
    color = mix(color, applyMakeup(color, tAtlas, vUv2, 1.0), skinMask * (1.0 - vBackground));

    // The lace has taken the tide's colour; the pearl glows with it.
    float dress = 1.0 - skinMask;
    color = mix(color, uDrinkColor * mix(0.85, 1.0, trim), dress);
    float pearl = step(0.995, min(vUv2.x, vUv2.y));
    color = mix(color, mix(uDrinkColor, vec3(1.0), smoothstep(0.75, 0.95, lighting)), pearl);
    value = max(value, pearl);

    // frame outline
    color *= value;
    color *= outline;

    color = max(nearBlack, color);

    float alpha = 1.0 - aastep(0.00001, sdf);

    gl_FragColor = vec4(color, alpha);

    // move elements in front of frame border
    gl_FragDepth = gl_FragCoord.z - 0.03;
}