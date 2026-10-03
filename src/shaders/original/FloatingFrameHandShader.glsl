#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;
uniform float uBorderWidth;
uniform sampler2D tNoise;
uniform float uAspectRatio;
uniform float uDPR;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Vertex
void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 modelViewPos = viewMatrix * worldPos;
    gl_Position = projectionMatrix * modelViewPos;

    vUv = uv;
}

#!SHADER: Fragment

void main() {
    vec4 color = texture2D(tMap, vUv);
    float steppedTime = floor(time * 8.0) / 8.0 * 0.45;
    float edgeNoise = texture2D(tNoise, vec2(vUv * 0.05) + vec2(steppedTime, 0.0)).r * 0.005;

    float borderWidth = uBorderWidth + edgeNoise;
    // borderWidth *= 5.0;
    float border = step(vUv.x, borderWidth / uAspectRatio) + step(1.0 - borderWidth / uAspectRatio, vUv.x) +
        step(vUv.y, borderWidth) + step(1.0 - borderWidth, vUv.y);
    border = clamp(border, 0.0, 1.0);

    const float uAlphaBorderWidth = 0.005;
    float alphaBorderWidth = uAlphaBorderWidth + edgeNoise;
    float alphaBorder = step(vUv.x, alphaBorderWidth / uAspectRatio) + step(1.0 - alphaBorderWidth / uAspectRatio, vUv.x) +
        step(vUv.y, alphaBorderWidth) + step(1.0 - alphaBorderWidth, vUv.y);
    float alpha = 1.0 - alphaBorder;

    vec3 finalColor = mix(color.rgb, vec3(18.0 / 255.0), border);

    gl_FragColor = vec4(finalColor, alpha);
}