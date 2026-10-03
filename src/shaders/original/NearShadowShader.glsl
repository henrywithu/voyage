#!ATTRIBUTES
attribute vec2 uv2;

#!UNIFORMS
uniform sampler2D tMap;
uniform sampler2D tLines;
uniform sampler2D tNoise;
uniform float uLinesTile;
uniform float uAngle;
uniform float uSpeed;
uniform vec3 uColor;

#!VARYINGS
varying vec2 vUv;
varying vec2 vLineUv;

#!SHADER: Vertex

mat2 rotate2d(float a) {
	float s = sin(a);
	float c = cos(a);
	return mat2(c, s, -s, c);
}

void main() {
    vUv = uv;
    vLineUv = vUv - 0.5;
    vLineUv = rotate2d(uAngle) * vLineUv;
    vLineUv *= uLinesTile;
    vLineUv = vLineUv + 0.5;
    vec3 pos = position;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

#!SHADER: Fragment

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {

    float steppedTime = floor(time * 8.0) / 8.0 * 0.5 * uLinesTile;
    float t = time * 0.28 * uLinesTile;
    float alpha = texture2D(tMap, vec2(1.0 - vUv.x, 1.0 - vUv.y)).r + 0.5;
    alpha = pow(alpha, 2.0);
    float lines = texture2D(tLines, (vLineUv.xy * 1.25 - vec2(0.0, steppedTime)) * 0.7 ).r;
    alpha -= 1.0 - lines * 1.1;
    alpha = aastep(0.55, alpha);

    vec3 color = vec3(1.0 - alpha);

    float altMask = smoothstep(0.7, 1.0, vUv.y);
    altMask = max(altMask, smoothstep(0.7, 1.0, abs(vUv.x - 0.5) * 2.0));
    altMask += lines * 0.3;
    altMask = aastep(0.5, altMask);
    color *= mix(uColor, vec3(1.0), altMask);
    color = max(vec3(18.0 / 255.0), color);


    gl_FragColor = vec4(color, 1.0);
}