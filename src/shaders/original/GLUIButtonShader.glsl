#!ATTRIBUTES

#!UNIFORMS
uniform vec3 uColor;
uniform vec3 uBorder;
uniform float alpha;
uniform float uAspectRatio;
uniform sampler2D tNoise;
uniform float uHover;

#!VARYINGS
varying vec2 vUv;

#!SHADER: GLUIButtonShader.vs
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

#!SHADER: GLUIButtonShader.fs

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    vec2 uv = vUv;
    // vec3 color = uColor;

    float steppedTime = floor(time * 8.0) / 8.0;
    float noise = texture2D(tNoise, vUv.xy * (vec2(0.5)) + vec2(0.0, -steppedTime)).r;
    // float lines = texture2D(tLines, vUv.xy * (vec2(5.5)) + vec2(0.0, -steppedTime)).r;

    float baseCut = 0.03;
    baseCut += uHover * 0.03;

    float border = 1.0;
    float cut = baseCut + (noise * (0.01 + uHover * 0.01));
    border *= aastep(cut, vUv.x);
    border *= 1.0 - aastep(1.0 - cut, vUv.x);
    border *= aastep(cut * uAspectRatio, vUv.y);
    border *= 1.0 - aastep(1.0 - cut * uAspectRatio, vUv.y);

    vec3 color = mix(uColor, uBorder, 1.0 - border);
    // vec3 color = uBorder;

    float alphaBorder = 1.0;
    float cutOut = 0.002 + (noise * (0.01 + uHover * 0.01));
    alphaBorder *= aastep(cutOut, vUv.x);
    alphaBorder *= 1.0 - aastep(1.0 - cutOut, vUv.x);
    alphaBorder *= aastep(cutOut * uAspectRatio, vUv.y);
    alphaBorder *= 1.0 - aastep(1.0 - cutOut * uAspectRatio, vUv.y);


    float opacity = alphaBorder;
    opacity = aastep(0.5, opacity);
    // opacity = mix(1.0, (1.0 - border) * noise, 1.0 - border);


    gl_FragColor = vec4(color, opacity * alpha);
}