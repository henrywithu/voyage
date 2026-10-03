#!ATTRIBUTES
attribute vec2 uv2;

#!UNIFORMS
uniform sampler2D tMap;
uniform sampler2D tLines;
uniform sampler2D tNoise;
uniform float uLinesTile;
uniform float uLinesAngle;
uniform float uLinesSpeed;
uniform float uLinesStrength;
uniform float uGradient;
uniform float uGradientAngle;

#!VARYINGS
varying vec2 vUv;
varying vec2 vLineUv;
varying vec2 vGradientUv;

#!SHADER: Vertex

mat2 rotate2d(float a) {
	float s = sin(a);
	float c = cos(a);
	return mat2(c, s, -s, c);
}

void main() {
    vUv = uv;
    vLineUv = vUv - 0.5;
    vLineUv = rotate2d(uLinesAngle) * vLineUv;
    vLineUv *= uLinesTile;
    vLineUv = vLineUv + 0.5;

    vGradientUv = uv - 0.5;
    vGradientUv = rotate2d(uGradientAngle) * vGradientUv;
    vGradientUv += 0.5;

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
    float t = time * 0.28 * uLinesTile * uLinesSpeed;

    float map = texture2D(tMap, vec2(1.0 - vUv.x, 1.0 - vUv.y)).r;
    float lines = texture2D(tLines, vLineUv - vec2(0.0, steppedTime)).r;
    
    float alpha = lines * uLinesStrength;
    alpha += vGradientUv.y * uGradient;
    alpha *= (1.0 - map);
    alpha = aastep(0.3, alpha);

    vec3 nearBlack = vec3(18.0 / 255.0);
    vec3 color = nearBlack;

    gl_FragColor = vec4(color, alpha);
}