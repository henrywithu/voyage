#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;
uniform sampler2D tNoise;
uniform sampler2D tLines;
uniform float uDiscardTop;
uniform float uDiscardBottom;
uniform float uClipSection;
uniform float uSteppedTime;
uniform float uLinesTile;
uniform float uStep;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uCoreColor;
uniform float uCore;
uniform float uDotSize;
uniform float uDPR;

#!VARYINGS
varying vec2 vUv;
varying vec2 vUv2;
varying vec3 vPos;
varying float vNdcHeight;
varying float vAspect;

mat2 rotate2d(float a) {
	float s = sin(a);
	float c = cos(a);
	return mat2(c, s, -s, c);
}

#!SHADER: Vertex
void main() {
    vUv2 = position.xz + 0.5;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 modelViewPos = viewMatrix * worldPos;
    gl_Position = projectionMatrix * modelViewPos;

    vUv = uv;
    vPos = position;

    float aspect = resolution.y / resolution.x;
    vPos.x *= aspect;
    vPos.x *= 2.0;
    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);

    vAspect = resolution.x / resolution.y;
}

#!SHADER: Fragment
#require(mousefluid.fs)

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    // Voyage: a disc larger than its panel (the arch light) stays inside its own section.
    if (uClipSection > 0.5 && (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0)) discard;
    vec2 uv = vUv;
    uv.x -= uv.y * 0.5;

    vec2 screenUv = gl_FragCoord.xy / resolution.xy;
    float fluidMask = smoothstep(0.4, 0.7, texture2D(tFluidMask, screenUv).r);
    vec3 fluid = vec3(texture2D(tFluid, screenUv).xy * fluidMask, fluidMask);

    fluid *= smoothstep(0.0, 0.3, length(vUv2 - 0.5));

    float steppedTime = floor(time * uSteppedTime) / uSteppedTime;
    // float value = texture2D(tMap, uv * vec2(2.0, 1.0) + vec2(-steppedTime * 0.3, steppedTime * 0.05)).r;
    // value = mix(value, 1.0, 0.35);
    // float edge = aastep(0.01, pow(value, 3.0) - (pow(vUv.x, 5.0) * 0.1 + 1.0 * smoothstep(0.8, 1.0, vPos.z)));
    // float edge2 = 1.0 - pow(vUv.x, 20.0);
    // value *= edge2;
    // value += pow(1.0 - vUv.x, 15.0);
    // value = aastep(0.3, value);

    vec3 color1 = vec3(0.0);
    vec3 color2 = vec3(1.0);

    vec2 nuv = vUv;

    // nuv += (fluid.xy * 0.00001);
    nuv += step(0.2, fluid.z) * 0.03;

    float value = texture2D(tLines, nuv * vec2(1.0 * uLinesTile, 4.0) + vec2(-steppedTime * 0.05, -steppedTime * 0.3)).r;
    float n1 = texture2D(tNoise, nuv + vec2(-steppedTime * 0.05, steppedTime * 0.02) + fluid.z).r;
    float n2 = texture2D(tNoise, nuv * 1.0 * uLinesTile + vec2(steppedTime * 0.025, steppedTime * 0.025)).r;

    // n1 += fluid.z * 0.2;
    // n2 -= fluid.z * 0.2;

    fluid.z *= 0.1 + sin(steppedTime + n1 * 3.0) * 0.5 + 0.5;
    fluid.z *= n2;

    value += fluid.z * 0.1;
    value += pow(n1, 5.0);
    value += pow(n2, 5.0) * 0.5;
    value += smoothstep(0.65, 1.0, nuv.x);
    value = aastep(0.35 + uStep + fluid.z * 0.1, value);
    // Voyage: the sun glows from within. Toward the centre the amber gives way to a pale
    // gold core through a halftone screen, the way print renders a gradient (uCore 0: the
    // flat source disc).
    vec3 light = uColor1;
    if (uCore > 0.0) {
        float radius = length(vUv2 - 0.5) * 2.0;
        float tone = (1.0 - smoothstep(0.05, 0.92, radius)) * uCore;
        vec2 cellUv = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / (uDotSize * uDPR);
        float d = length(fract(cellUv) - 0.5);
        float r = 0.72 * sqrt(clamp(tone, 0.0, 1.0));
        float dw = fwidth(d);
        float dots = (1.0 - smoothstep(r - dw, r + dw, d)) * smoothstep(0.0, 0.04, tone);
        light = mix(uColor1, uCoreColor, dots);
    }
    vec3 color = mix(uColor2, light, value - fluid.z * 0.2);

    color = mix(color, color * 0.86, step(0.9, sin(fluid.z * 4.0)));

    // color.r = pow(color.r, 1.0 - fluid.z * 0.3);

    // color += 0.2;

    // float fluidMask = smoothstep(0.9, 1.0, texture2D(tFluidMask, screenUv).r);
    // color.r += (n1 + n2) * fluidMask * 0.2;


    // alpha
    float alpha = 1.0;
    alpha *= smoothstep(1.0, 0.7, vUv.x);
    alpha += pow(n2, 2.0) * smoothstep(1.0, 0.8 - fluid.z * 0.5, vUv.x);
    alpha = clamp(alpha, 0.0, 1.0);
    color *= aastep(0.55, alpha);

    // color = mix(1.0 - color, color, 1.0 - fluidMask);

    // color += step(0.4, fluidMask);

    // vec3 oColor = color;

    alpha = aastep(0.5, alpha);
    // alpha += fluidMask;

    gl_FragColor = vec4(color, alpha);
}