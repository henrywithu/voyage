#!ATTRIBUTES

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

#!SHADER: Vertex
void main() {
    vPos = position;
    vUv = uv;
    vec4 modelViewPos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPos;
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

    // Paper-yellow behind her, falling into ink-hatched shadow toward the bottom.
    vec2 lineUv = vUv.yx * vec2(6.0, 10.0);
    lineUv.x -= steppedTime;
    float lines = texture2D(tLines, lineUv).r * 2.0 - 1.0;
    vec3 nearBlack = vec3(18.0 / 255.0);
    vec3 color = mix(uColor1, nearBlack, aastep(0.1, (0.3 - vUv.y) * 2.4 + lines * 0.6));
    // frame outline
    color *= outline;

    color = max(nearBlack, color);

    float alpha = 1.0 - aastep(0.00001, sdf);

    gl_FragColor = vec4(color, alpha);

}