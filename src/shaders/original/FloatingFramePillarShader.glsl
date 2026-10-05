#!ATTRIBUTES
attribute vec2 uv2;
attribute float colorid;

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
varying float vBackground;
varying float vBlobs;
varying vec3 vNdc;
varying vec3 vPos;
varying vec3 vLightDir;
varying vec3 vViewPos;

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
    vec3 pos = position;

    vPos = position;
    vUv = uv;
    vUv2 = uv2;
    vNormal = normalMatrix * normal;
    vLightDir = normalize(vec3(0.0, 0.5, -0.5));
    vLineUv = (rotation3d(normalize(vec3(-1.0, 0.0, 0.5)), 0.5) * position).xy;

    vec4 modelViewPos = modelViewMatrix * vec4(pos, 1.0);
    vViewPos = -modelViewPos.xyz;

    // masks for layers
    float dist = length(position.xz);
    vBackground = step(1.2, dist);
    vBlobs = 1.0 - step(-0.01, uv.y); // blob mask stored in negative uv space

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

    // float dx = dFdx(vNdc.x);
    // float dy = dFdy(vNdc.y);

    // float verticalRatio = resolution.y / resolution.x;
    // float horizontalRatio = resolution.x / resolution.y;
    
    // float width = mix(0.00001, 0.005, uTransition);
    // float outline = aastep(width, -sdf);

    // float widthX = mix(0.00001, 0.002, uTransition);
    // float widthY = mix(0.00001, 0.002 * uAspectRatio, uTransition);

    float pixelWidth = 3.0 * uDPR; // desired width in pixels
    float widthX = mix(0.00001, pixelWidth * fwidth(sdfx), uTransition);
    float widthY = mix(0.00001, pixelWidth * fwidth(sdfy), uTransition);

    float outline = aastep(widthX, -sdfx) * aastep(widthY, -sdfy);

    if (sdf > 0.005) discard;

    vec3 normal = normalize(vNormal);

    // blobs
    float t = floor(time * 12.0) / 12.0 * 0.31;

    vec2 blobUv = vUv + vec2(0.0, 1.0);
    float blobValue = 1.0;
    float edgeGrad = 1.0 - abs(blobUv.x - 0.5) * 2.0;
    edgeGrad = smoothstep(0.65, 1.0, edgeGrad);

    float blobNoise = texture2D(tNoise, blobUv * vec2(0.3, 1.30) + vec2(0.0, -t * 0.2)).r;
    blobNoise *= texture2D(tNoise, blobUv * vec2(0.15, 1.11415) + vec2(0.0, -t * 0.2)).r;

    blobValue = edgeGrad;
    blobValue *= blobNoise;
    blobValue *= smoothstep(1.0, 0.95, blobUv.y);

    float blobAlpha = aastep(0.3, blobValue);
    float blobOutline = aastep(0.6, blobValue);

    // lines
    vec2 lineUv = vLineUv.yx * 2.2;
    lineUv.x -= steppedTime * 1.0;

    float lines = texture2D(tLines, lineUv.yx * (0.7 - vBackground * 0.1)).r * 2.0 - 1.0;

    // trim texture
    float atlas = inkLevel(texture2D(tAtlas, vUv2).r);

    // trim texture
    float trim = texture2D(tTrim, vUv).r;
    trim = aastep(0.55, trim * atlas);

    // lighting
    vec3 lightDir = normalize(vec3(-0.9, 0.1, 1.0));
    float lighting = dot(normal, lightDir) * 0.5 + 0.5;
    float hairLit = smoothstep(0.3, 0.85, lighting);
    lighting *= clamp(vPos.y * 0.5 + 0.88, 0.0, 1.0);
    lighting = pow(lighting - 0.1, 4.0);

    // compositing
    float skinMask = step(0.55, vUv2.y);
    float fresnel = max(0.0, dot(normalize(vNormal), normalize(vViewPos)));
    fresnel = (1.0 - fresnel) * skinMask;
    vec3 nearBlack = vec3(18.0 / 255.0);
    vec3 backgroundColor = mix(uColor1, nearBlack, aastep(0.1, -vPos.y * 2.1 - 0.8 + lines * 0.75));
    float noise = texture2D(tNoise, lineUv * 2.0).r;
    float value = aastep(0.4, lighting + (1.0 - lines) * 0.3 + noise * lighting + vBackground - fresnel * 0.8);
    vec3 color = mix(mix(uColor2, backgroundColor, step(0.5, vBackground)), vec3(1.0), skinMask);
    color = mix(color, nearBlack, vBlobs * blobOutline);
    color = mix(color, applyMakeup(color, tAtlas, vUv2, 1.0), skinMask * (1.0 - vBackground));
    color *= mix(trim, 1.0, vBackground + vBlobs);
    color *= mix(atlas, 1.0, vBackground + vBlobs);
    color = mix(color, vec3(1.0), blobAlpha);
    // Voyage: her skin keeps the frame's stipple, but as a light rosy shade rather than black dots.
    vec3 shade = vec3((value + vBlobs) * (blobOutline + (1.0 - vBlobs)));
    color *= mix(shade, skinShade(max(value, 0.35)), skinMask * (1.0 - vBackground) * (1.0 - vBlobs));
    color = mix(color, hairShade(hairLit, aastep(0.55, texture2D(tTrim, vUv).r), vUv), hairMask(vUv) * (1.0 - vBackground) * (1.0 - vBlobs));

    // frame outline
    color *= outline;

    color = max(nearBlack, color);

    float alpha = 1.0 - aastep(0.00001, sdf);

    alpha *= 1.0 - vBlobs;
    alpha += blobAlpha;

    gl_FragColor = vec4(color, alpha);

    // move elements in front of frame border
    gl_FragDepth = gl_FragCoord.z - 0.03;
}