#!ATTRIBUTES
attribute vec2 uv2;

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
varying float vFloor;
varying vec3 vNdc;
varying vec3 vPos;
varying vec3 vLightDir;

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
    vLightDir = normalize(vec3(0.0, 0.5, -0.5));
    vLineUv = (rotation3d(normalize(vec3(-1.0, 0.0, 0.1)), 0.2) * position).xy;

    // masks for background, floor
    vBackground = position.z < -1.0 ? 1.0 : 0.0;
    vFloor = position.y < -0.001 && position.z > -1.1 ? 1.0 : 0.0;

    vec3 pos = position;
    applySkin(pos, vNormal);

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

    edgeNoise -= uHover * 70.0;

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

    bool isFloor = vFloor > 0.5;
    bool isBackground = vBackground > 0.5;

    vec3 normal = normalize(vNormal);
    
    // lines
    vec2 lineUv = vLineUv * 5.0;
    lineUv.x -= steppedTime * 3.0;

    // scroll floor texture to match feet
    if (isFloor) {
        lineUv.y -= time * 0.9;
    }

    float lines = texture2D(tLines, lineUv.yx * (0.7 - vBackground * 0.2)).r * 2.0 - 1.0;

    // trim texture
    // float atlas = texture2D(tAtlas, vUv2).r;
    // atlas = aastep(0.55, atlas);

    // trim texture
    float trim = texture2D(tTrim, vUv).r;
    trim = aastep(0.55, trim);

    // lighting
    vec3 lightDir = normalize(vec3(-0.25, 0.75, 1.0));
    float lighting = dot(normal, lightDir) * 0.5 + 0.5;
    lighting *= clamp(vPos.y * 0.5 + 0.8, 0.0, 1.0);
    lighting = pow(lighting - 0.1, 4.0);
    // lighting = clamp(lighting, 0.0, 1.0);

    // floor shadow
    float floorShadow = min(1.0, length(vUv * vec2(1.0, 0.5) - vec2(0.5, 0.25)) * 1.1);
    if (isFloor) {
        lighting *= max(0.75, floorShadow);
        lighting += (floorShadow) * 0.5;
    }

    // compositing
    vec3 backgroundColor = mix(uColor1, uColor3, aastep(0.01, vPos.y + lines * 0.1));
    float skinMask = step(0.55, vUv2.y);
    float noise = texture2D(tNoise, lineUv * 2.0).r;
    float value = aastep(0.5, lighting + (1.0 - lines) * 0.3 + noise * lighting + vBackground);
    vec3 color = mix(mix(uColor2, backgroundColor, step(0.5, vBackground)), vec3(1.0), min(1.0, skinMask));
    color = mix(color, uColor1, vFloor);
    color *= mix(trim, 1.0, min(1.0, vFloor + vBackground));
    color *= vec3(value);

    // frame outline
    color *= outline;

    vec3 nearBlack = vec3(18.0 / 255.0);
    color = max(nearBlack, color);

    float alpha = 1.0 - aastep(0.00001, sdf);

    gl_FragColor = vec4(color, alpha);

    // move elements in front of frame border
    gl_FragDepth = gl_FragCoord.z - 0.03;
}