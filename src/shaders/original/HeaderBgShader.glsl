#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tNoise;
uniform sampler2D tScene;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float uAspectRatio;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Vertex
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

#!SHADER: Fragment
float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}


float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    vec2 uv = vUv;

    float steppedTime = floor(time * 8.0) / 8.0;
    float noise = texture2D(tNoise, vUv.xy * (vec2(0.5)) + vec2(0.0, -steppedTime)).r;

    float border = 1.0;
    float cut = 0.005 + (noise * 0.003);
    border *= aastep(cut, vUv.x);
    border *= 1.0 - aastep(1.0 - cut, vUv.x);
    border *= aastep(cut * uAspectRatio, vUv.y);
    border *= 1.0 - aastep(1.0 - cut * uAspectRatio, vUv.y);

    vec3 color = mix(uColor, uColor2, 1.0 - border);
    // vec3 color = uBorder;


    float opacity = 1.0;
    // float alphaBorder = 1.0;
    // float cutOut = 0.001 + (noise * 0.002);
    // alphaBorder *= aastep(cutOut, vUv.x);
    // alphaBorder *= 1.0 - aastep(1.0 - cutOut, vUv.x);
    // alphaBorder *= aastep(cutOut * uAspectRatio, vUv.y);
    // alphaBorder *= 1.0 - aastep(1.0 - cutOut * uAspectRatio, vUv.y);


    // float opacity = alpha * alphaBorder;
    // opacity = aastep(0.5, opacity);
    // opacity = mix(1.0, (1.0 - border) * noise, 1.0 - border);


    gl_FragColor = vec4(color, opacity);
}