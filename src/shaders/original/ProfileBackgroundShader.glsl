#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;
uniform sampler2D tNoise;
uniform sampler2D tLines;
uniform float uLinesTile;
uniform float uDiscardTop;
uniform float uDiscardBottom;

#!VARYINGS
varying vec2 vUv;
varying float vNdcHeight;
varying float vAspect;

mat2 rotate2d(float a) {
	float s = sin(a);
	float c = cos(a);
	return mat2(c, s, -s, c);
}

#!SHADER: Vertex
void main() {

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    
    vUv = uv;
    vUv -= 0.5;
    vUv = rotate2d(-3.14 * 0.15) * vUv;
    vUv += 0.5;
    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);

    vAspect = resolution.x / resolution.y;
}

#!SHADER: Fragment
float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    vec3 brown = vec3(176.0, 156.0, 118.0) / 255.0;
    vec3 lightbrown = vec3(243.0, 242.0, 235.0) / 255.0;

    // scroll uvs
    float steppedTime = -floor(time * 24.0) * 0.002;
    vec2 uv =  vUv * vec2(2.0) - vec2(-steppedTime * vAspect, steppedTime * 0.5);

    // rough noise
    float n1 = texture2D(tNoise, uv + steppedTime * 0.25).r;

    // cloud shapes
    float noise = texture2D(tMap, uv * 0.5).r;
    noise *= texture2D(tMap, uv + steppedTime * 0.5).r;
    noise = clamp(noise, 0.0, 1.0);
    noise = pow(noise, 2.0);

    float scan = 0.2;
    float value = 1.0 - vUv.y;
    value -= (1.0 - pow(noise, 2.0)) * 0.3;
    value -= n1 * 0.2;
    value = clamp(value, 0.0, 1.0);

    float thickness = resolution.y * 0.0035;
    float mask = aastep(scan, value);

    vec3 color = mix(lightbrown, vec3(1.0), aastep(scan, value));

    gl_FragColor = vec4(color, 1.0);
}