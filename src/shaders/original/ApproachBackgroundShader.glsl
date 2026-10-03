#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;
uniform sampler2D tNoise;
uniform sampler2D tLines;
uniform float uLinesTile;
uniform vec3 uColor;
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

        float steppedTime = -floor(time * 24.0) * 0.00075;
        vec2 uv =  (vUv - vec2(0.5, 0.0)) * vec2(5.0, 2.5) - vec2(-steppedTime, steppedTime * 0.5);

        float n1 = texture2D(tNoise, uv + steppedTime * 0.5).r;

        float noise = texture2D(tMap, uv * vec2(2.0, 1.0)).r;
        noise *= texture2D(tMap, uv * 1.5 * vec2(2.0, 1.0) + steppedTime * 0.5).r;
        noise = clamp(noise, 0.0, 1.0);
        noise = pow(noise, 2.0);

        // float haloGrad = length((vPos - vec3(0.0, 0.0, -1.0)) * 0.5);
        // haloGrad = pow(smoothstep(0.30, 0.08, haloGrad), 3.0);
        float haloGrad = 1.0 - vPos.x * 6.0 - vPos.y * 0.7 + 0.1;
        haloGrad = pow(haloGrad, 3.0);
        float horizonGrad = smoothstep(0.65, 0.52, vUv.y);
        float value = haloGrad + horizonGrad;
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

        // make black at bottom to hide part where ground cuts off
        color *= step(0.5, vUv.y);

    gl_FragColor = vec4(color, 1.0);
}