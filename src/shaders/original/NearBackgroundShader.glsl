#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;
uniform sampler2D tNoise;
uniform vec3 uColor;
uniform sampler2D tLines;
uniform float uLinesTile;
uniform float uDiscardTop;
uniform float uDiscardBottom;

#!VARYINGS
varying vec2 vUv;
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
float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

        vec2 screenUv = gl_FragCoord.xy / resolution;

        float steppedTime = -floor(time * 16.0) * 0.004;
        vec2 uv =  (vUv - vec2(0.5, 0.0)) * vec2(4.0, 2.5) - vec2(-steppedTime * 0.4, steppedTime * 0.2);

        float n1 = texture2D(tNoise, uv * vec2(5.0, 1.0) + steppedTime * 0.1).r;

        float noise = texture2D(tMap, uv * vec2(5.0, 1.0) * 0.5).r;
        noise *= texture2D(tMap, uv * vec2(5.0, 1.0) * 1.0 + steppedTime * 0.1).r;
        noise = clamp(noise, 0.0, 1.0);
        noise = pow(noise, 2.0);

        // float haloGrad = length((vPos - vec3(0.0, 0.0, -1.0)) * 0.5);
        float haloGrad = vPos.x * 5.0 + 0.7;
        haloGrad = pow(haloGrad, 3.0);
        float horizonGrad = smoothstep(0.6, 0.3, vUv.y);
        float value = haloGrad + horizonGrad * 2.5;
        value *= 1.4;
        value -= (1.0 - pow(noise, 2.0)) * 0.6;
        value -= n1 * 0.5;

        float thickness = resolution.y * 0.0035;
        float scan = 0.5;
        float mask = aastep(scan, value);
        float line = mask;
        float width = 0.03;
        line *= 1.0 - aastep(scan + width, value);
        line = 1.0 - line;

        vec3 color = mix(uColor, vec3(1.0), step(scan, value));

    gl_FragColor = vec4(color, 1.0);
}