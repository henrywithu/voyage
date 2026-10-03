#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;
uniform sampler2D tNoise;
uniform sampler2D tLines;
uniform float uLinesTile;
uniform float uDiscardTop;
uniform float uDiscardBottom;
uniform float uSteppedTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uCutout;

#!VARYINGS
varying vec2 vUv;
varying vec3 vPos;
varying float vNdcHeight;
varying float vAspect;
varying float vCenter;

mat2 rotate2d(float a) {
	float s = sin(a);
	float c = cos(a);
	return mat2(c, s, -s, c);
}

#!SHADER: Vertex
void main() {

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 modelViewPos = viewMatrix * worldPos;
    gl_Position = projectionMatrix * modelViewPos;

    vAspect = resolution.x / resolution.y;
    vUv = uv;

    // for portal window mask
    vPos = gl_Position.xyz / gl_Position.w;
    vPos.x *= vAspect;
    vPos = 1.0 - (vPos * 0.5 + 0.5);
    vPos.x -= 0.5;

    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);

    vCenter = (uDiscardBottom + uDiscardTop) * 0.5;
}

#!SHADER: Fragment
#require(mousefluid.fs)

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    vec2 screenUv = gl_FragCoord.xy / resolution.xy;
    float fluidMask = smoothstep(0.4, 0.7, texture2D(tFluidMask, screenUv).r);
    vec3 fluid = vec3(texture2D(tFluid, screenUv).xy * fluidMask, fluidMask);

    float steppedTime = floor(time * uSteppedTime) / uSteppedTime;

    vec2 nuv = vUv;
    // nuv += (fluid.xy * 0.00001);

    nuv += step(0.2, fluid.z) * 0.03;

    float value = texture2D(tLines, nuv * vec2(1.85, 4.0) + vec2(-steppedTime * 0.05, -steppedTime * 0.3)).r;
    float n1 = texture2D(tNoise, nuv + vec2(-steppedTime * 0.05, steppedTime * 0.02)).r;
    float n2 = texture2D(tNoise, nuv * 1.0 + vec2(steppedTime * 0.025, steppedTime * 0.025)).r;

    fluid.z *= 0.1 + sin(steppedTime + n1 * 3.0) * 0.5 + 0.5;

    fluid.z *= n2;

    value += fluid.z * 0.1;
    value += pow(n1, 5.0) * 2.0;
    value += pow(n2, 5.0) * 0.5;
    value += smoothstep(0.65, 1.0, nuv.x);
    value = aastep(0.35 + fluid.z * 0.1, value);
    vec3 color = mix(uColor2, uColor1, value - fluid.z * 0.2);

    color = mix(color, color * 0.86, step(0.5, sin(fluid.z * 4.0)));

    // vec2 screenUv = gl_FragCoord.xy / resolution.xy;
    // float fluidMask = smoothstep(0.4, 1.0, texture2D(tFluidMask, screenUv).r);
    // color.r += (n1 - n2) * fluidMask * 0.9;

    if (length(vPos - vec3(0.0, vCenter, 0.0)) > uCutout) {
        discard;
    };

    // color = vec3(vUv, 1.0);

    gl_FragColor = vec4(color, 1.0);
}