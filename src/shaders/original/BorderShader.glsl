#!ATTRIBUTES
attribute float inner;
attribute float outer;

#!UNIFORMS
uniform sampler2D tMap;

uniform vec3 uColor;
uniform float uPadX;
uniform float uPadY;
uniform float uPadTop;
uniform float uSceneHeightWorld;
uniform float uScreenHeightWorld;
uniform float uFixedWidth;
uniform float uDepthSkew;
uniform float uDepthOffset;
uniform float uFragDepth;
uniform float uSkewCorrection;
uniform float uMaxWidth;
uniform float uDPR;
uniform float uTransition;

uniform vec4 uFluidEdge;
uniform float uFadeTop;

#!VARYINGS
varying vec2 vUv;
varying vec3 vPos;
varying float vInner;
varying float vDepth;
varying float vOuter;
varying float vFadeTop;

#!SHADER: Vertex
void main() {
    vUv = uv;
    vInner = inner;

    vec3 pos = position;
    float aspect = resolution.x / resolution.y;
    float maxAspect = 2.0;
    float clampedAspect = min(maxAspect, aspect);

    float mask = 1.0 - outer;

    float halfWidth = uScreenHeightWorld * aspect * 0.5;
    float halfHeight = uSceneHeightWorld * 0.5;

    // clamp width to max pixel width
    float resx = resolution.x / uDPR;
    float halfWidthClamped = uScreenHeightWorld * (uMaxWidth / resx) * 0.5 * aspect;
    float blend = resx < uMaxWidth ? 1.0 : outer;
    halfWidth = mix(halfWidthClamped, halfWidth, blend);

    float padx = mix(halfWidth, halfWidth * uPadX, uTransition);
    float pady = mix(halfHeight, halfHeight * uPadY, uTransition);
    float padyTop = mix(0.0, halfHeight * uPadTop, uTransition);

    // if (abs(uPadTop) > 0.1) {
    //     padyTop = mix(0.0, halfHeight * uPadTop, uTransition);
    // }

    vFadeTop = 0.0;
    if (vUv.y > 0.5 && uFadeTop > 0.5) {
        vFadeTop = 1.0;
    }

    float outlineThickness = 0.1;

    // fit border to world space screen size, with padding
    // if (uFixedWidth > 0.5) {
    //     padx = halfWidth - halfWidth * uPadX;
    // }

    if (pos.x < 0.0) {
        pos.x = -halfWidth;
        pos.x += mask * padx;
    }

    if (pos.x > 0.0) {
        pos.x = halfWidth;
        pos.x -= mask * padx;
    }

    if (pos.y > 0.0) {
        pos.y = halfHeight;
        pos.y -= mask * (pady + padyTop);
    }

    if (pos.y < 0.0) {
        pos.y = -halfHeight;
        pos.y += mask * pady;
    }

    // extend outer edges
    if (abs(position.x) > 0.9) {
        pos.x += outer * pos.x;
    }

    // skew along depth when objects need to pop out
    float ygrad = sign(position.y);
    ygrad = ygrad + 1.0;
    float depthGrad = ygrad * uDepthSkew;
    float depthMask = (1.0 - outer);
    pos.z -= depthGrad * depthMask;
    pos.z += uDepthOffset * depthMask;

    // vDepth = (1.0 - (position.y * 0.5 + 0.5)) * uFragDepth * depthMask;

    // skew along x axis to correct for perspective distortion
    pos.x += ygrad * uSkewCorrection * sign(position.x);

    // pass transformed pos to fragment shader
    vPos = position;

    // extrude outline in screen space
    vec4 projPos = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vec2 norm = vec2(0.0);
    norm.x -= sign(position.x) / aspect * (uDepthSkew * 0.5 + 1.0);
    norm.y -= sign(position.y);
    projPos.xy += norm * inner * outlineThickness;

    gl_Position = projPos;

    vOuter = outer;
}

#!SHADER: Fragment
#require(mousefluid.fs)

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    float steppedTime = floor(time * 8.0) / 8.0;
    float noise = texture2D(tMap, vPos.xy * vec2(uFluidEdge.xy * 0.2) + vec2(0.0, steppedTime)).r;

    float value = 1.0;
    value *= (1.0 - vInner);


    // fluid on the edges
    float ax = abs(vPos.x);
    float ay = abs(vPos.y);

    // blend 0..1 across a small band near the diagonal
    float blend = smoothstep(0.9, 1.1, ax / max(ay, 1e-5));

    float edgeTB = uFluidEdge.z * 0.05;
    float edgeLR = uFluidEdge.w * 0.05;

    float edge = mix(edgeTB, edgeLR, blend);

    if (edge > 0.0 && uTransition > 0.95) {
        vec2 screenUv = gl_FragCoord.xy / resolution.xy;
        float fluidMask = smoothstep(0.0, 1.0, texture2D(tFluidMask, screenUv).r) * 0.8;
    
        float outer = smoothstep(0.0, edge, vOuter);
        value *= 1.0 - fluidMask * (1.0 - outer);
    }

    // value *= vUv.y;

    value -= noise * 0.6;

    float outline = aastep(0.4, value);
    vec3 color = max(vec3(18.0 / 255.0), outline * uColor);

    float alpha = aastep(0.01, value);

    // color = vec3(vOuter);
    // alpha = 1.0;

    // alpha = 1.0;
    // color = vec3(step(0.9, vOuter));

    // alpha = 1.0;
    // color = vec3(vInner);

    if (vFadeTop > 0.5) {
        alpha = smoothstep(0.0, 0.5, vOuter);
        color = vec3(18.0 / 255.0);
    }

    gl_FragColor = vec4(color, alpha);
    // gl_FragColor = vec4(vDepth, 1.0, 1.0, 1.0);
    // gl_FragDepth = gl_FragCoord.z + vDepth * 0.0125;
}