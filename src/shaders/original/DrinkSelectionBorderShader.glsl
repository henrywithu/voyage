#!ATTRIBUTES
attribute float inner;
attribute float outer;

#!UNIFORMS
uniform sampler2D tMap;

uniform vec3 uCloudColor;
uniform vec3 uSkyColor;

uniform float uPadX;
uniform float uPadY;
uniform float uSceneHeightWorld;
uniform float uScreenHeightWorld;
uniform float uFixedWidth;
uniform float uDepthSkew;
uniform float uDepthOffset;
uniform float uFragDepth;
uniform float uSkewCorrection;
uniform float uMaxWidth;
uniform float uDPR;

#!VARYINGS
varying vec2 vUv;
varying vec3 vPos;
varying vec3 vLocalPos;
varying float vInner;
varying float vDepth;

#!SHADER: Vertex
void main() {
    vUv = uv;
    vInner = inner;
    vLocalPos = position;

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
    float width = mix(halfWidthClamped, halfWidth, blend);

    float padx = width * uPadX;
    float pady = halfHeight * uPadY;

    float outlineThickness = 0.1;

    // fit border to world space screen size, with padding
    // if (uFixedWidth > 0.5) {
    //     padx = width - uPadX;
    // }

    if (pos.x < 0.0) {
        pos.x = -width;
        pos.x += mask * padx;
    }

    if (pos.x > 0.0) {
        pos.x = width;
        pos.x -= mask * padx;
    }

    if (pos.y > 0.0) {
        pos.y = halfHeight;
        pos.y -= mask * pady;
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
}

#!SHADER: Fragment
float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {

    
    float steppedTime = floor(time * 8.0) / 8.0;
    
    float noise = texture2D(tMap, vPos.xy * 3.0 + vec2(0.0, steppedTime)).r;

    float value = 1.0;
    value *= (1.0 - vInner);
    value -= noise * 0.6;

    float outline = aastep(0.4, value);
    vec3 nearBlack = vec3(18.0 / 255.0);
    vec3 color = vec3(max(18.0 / 255.0, outline * step(-0.35, vLocalPos.y)));

    float alpha = aastep(0.01, value);

    gl_FragColor = vec4(color, alpha);
    gl_FragDepth = gl_FragCoord.z + clamp(1.0 - (vLocalPos.y * 0.5 + 0.5), 0.0, 0.015);
}