#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tNoise;
uniform sampler2D tCloudsNoise;
uniform sampler2D tLines;
uniform float uLinesTile;
uniform float uDiscardTop;
uniform float uDiscardBottom;
uniform float uScroll;
uniform float uProgress;
uniform vec3 uColor1;
uniform vec3 uColor2;

#!VARYINGS
varying vec2 vUv;
varying vec2 vUv2;
varying float vNdcHeight;
varying float vAspect;

mat2 rotate2d(float a) {
	float s = sin(a);
	float c = cos(a);
	return mat2(c, s, -s, c);
}

#!SHADER: Vertex
void main() {

    vec3 pos = position;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vUv2 = uv;

    vUv = uv;
    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);

    vAspect = resolution.x / resolution.y;
}

#!SHADER: Fragment
#require(mousefluid.fs)

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

float exponentialOut(float t) {
  return t == 1.0 ? t : 1.0 - pow(2.0, -10.0 * t);
}

void main() {
    float fluidMask = getFluidMask();

    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    float steppedTime = floor(time * 24.0) / 24.0;
    float t = steppedTime * 0.05;

    vec2 uv = vUv;

    vec2 distortion = vec2(0.0, sin(uv.x * 7.0) + sin(uv.x * 5.3)) * 0.1;

    float progress = floor(uProgress * 84.0) / 84.0;
    // float invprogress = 1.0 - progress;
    float invexpprogress = 1.0 - exponentialOut(progress);

    invexpprogress -= fluidMask * 0.05;
    // float cloudsnoise = texture2D(tCloudsNoise, vUv * 2.0 + vec2(-t, 0.0)).r;
    float lines = texture2D(tLines, vUv * 3.0 * vec2(2.0, 1.0) + vec2(-t, 0.0) + distortion).r;
    float grad = sin(-steppedTime + vUv.x * 30.0 + vUv.y * 12.0) * 0.5 + 0.5;
    float circularGrad = clamp(1.1 * length((vUv - vec2(0.5, 0.0)) * vec2(2.0, 1.0)), 0.0, 1.0);

    lines = aastep(0.6, circularGrad - lines * 0.25 + grad * 0.1 + uScroll * 0.025 + invexpprogress);

    vec3 color = mix(uColor1, uColor2, lines);

    gl_FragColor = vec4(color, 1.0);
}