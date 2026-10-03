#!ATTRIBUTES
attribute float inner;
attribute float outer;
attribute vec3 dir;
attribute vec3 color;

#!UNIFORMS
uniform sampler2D tMap;

uniform vec3 uCloudColor;
uniform vec3 uSkyColor;

uniform float uSceneHeightWorld;
uniform float uScreenHeightWorld;
uniform float uMaxWidth;
uniform float uDPR;
uniform float uProgress;
uniform float uDiscardTop;
uniform float uDiscardBottom;
#!VARYINGS
varying vec2 vUv;
varying vec3 vPos;
varying float vInner;
varying float vOuter;
varying float vDepth;
varying vec3 vColor;
varying float vNdcHeight;

#!SHADER: Vertex
#require(range.glsl)
#require(eases.glsl)
void main() {
    vInner = inner;
    vOuter = outer;
    vUv = uv;
    vColor = color;

    vec3 pos = position;
    float aspect = resolution.x / resolution.y;

    float halfWidth = uScreenHeightWorld * aspect * 0.5;
    float halfHeight = uSceneHeightWorld * 0.5;

    pos.y *= min(halfWidth, halfHeight);
    pos.x *= min(halfWidth, halfHeight);

    if (outer > 0.5) {
        // extend edges
        pos.x += sign(position.x) * outer * halfWidth;
        pos.y += sign(position.y) * outer * halfHeight;
    }

    if (outer < 0.5) {
        pos *= crange(resolution.x, 1600.0, 344.0, 0.75, 1.);
    }


    float scale = 0.8;
    float translate = 0.5;
    float easedProgress = sineOut(uProgress);
    vec4 corners = vec4(0.0, 0.0, 0.0, 0.0);
    vec4 cornerMin = vec4(0.0, 1.5, 3.0, 4.5);
    vec4 cornerMax = vec4(1.5, 3.0, 4.5, 6.0);
    corners = crange(vec4(easedProgress), vec4(0.0), vec4(0.5), vec4(0.0), cornerMax);
    corners = range(corners, cornerMin, cornerMax, vec4(0.0), vec4(1.));
    // color attribute indicates top left corner is red
    if(color == vec3(1.0, 0.0, 0.0)) {
        pos += mix( sign(position) * translate, vec3(0.0), corners.x);
        pos *= mix(scale, 1.0, corners.x);
    }

    // color attribute indicates top right corner is green
    if(color == vec3(0.0, 1.0, 0.0)) {
        pos += mix( sign(position) * translate, vec3(0.0), corners.y);
        pos *= mix(scale, 1.0, corners.y);
    }

    // color attribute indicates bottom left corner is blue
    if(color == vec3(0.0, 0.0, 1.0)) {
        pos += mix( sign(position) * translate, vec3(0.0), corners.z);
        pos *= mix(scale, 1.0, corners.z);
    }

    // color attribute indicates bottom right corner is purple
    if(color == vec3(1.0, 0.0, 1.0)) {
        pos += mix( sign(position) * translate, vec3(0.0), corners.w);
        pos *= mix(scale, 1.0, corners.w);
    }

    // color attribute indicates circle is cyan
    if(color == vec3(0.0, 1.0, 1.0)) {
        pos *= mix(scale, 1.0, corners.w);
    }


    vec4 projPos = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    projPos.xyz += dir * 0.02;

    gl_Position = projPos;

    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment
#require(range.glsl)
float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    if (uDiscardBottom - vNdcHeight - 0.05 > 0.0 || uDiscardTop - vNdcHeight + 0.05 < 0.0) discard;

    float steppedTime = floor(time * 8.0) / 8.0;
    
    float noise = texture2D(tMap, vUv.xy * 3.0 + vec2(0.0, steppedTime)).r;


    float thickness = crange(resolution.x, 1600.0, 390.0, 0.4, 0.3);
    float value = 1.0;
    value *= (1.0 - vInner);
    value -= noise * thickness;
    float outline = aastep(1.0 -thickness, value);
    vec3 color = vec3(max(18.0 / 255.0, outline));

    float alpha = aastep(0.01, value);

    gl_FragColor = vec4(color, alpha);
}