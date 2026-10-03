#!ATTRIBUTES
attribute vec2 uv2;

#!UNIFORMS
uniform sampler2D tMap;
uniform sampler2D tLines;
uniform sampler2D tNoise;
uniform float uLinesTile;

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
    vLineUv = rotate2d(-0.5) * vLineUv;
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
    float alpha = texture2D(tMap, vec2(1.0 - vUv.x, 1.0 - vUv.y)).r + 0.55;
    alpha -= texture2D(tLines, (vLineUv.xy * 1.25 - vec2(t, 0.0)) * 0.7 ).r;
    alpha -= texture2D(tNoise, (vUv.xy * 3.0 - vec2(t * 2.0, -steppedTime)) * 0.7).r * (1.0 - vUv.y) * 0.5;
    alpha -= (1.0 - vUv.x) * 0.8;
    alpha = aastep(0.5, alpha);
    if (alpha < 0.5) discard;
    
    vec3 color = vec3(0.0);

    gl_FragColor = vec4(color, alpha);
}