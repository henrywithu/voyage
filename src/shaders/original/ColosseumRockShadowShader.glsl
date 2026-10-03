#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tLines;
uniform sampler2D tNoise;
uniform sampler2D tMap;

#!VARYINGS
varying vec2 vUv;
varying float vScale;

#!SHADER: Vertex

void main() {
    vUv = uv;

    vec3 pos = position;

    // extract x scale from model matrix
    vScale = length(modelMatrix[0].xyz);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

#!SHADER: Fragment
    float aastep(float threshold, float value) {
        float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
        return smoothstep(threshold-afwidth, threshold+afwidth, value);
    }

void main() {
    vec2 uv = vUv;
    uv.x *= vScale;

    float steppedTime = floor(time * 8.0) / 8.0;
    float lines = texture2D(tNoise, uv.xy * 1.0 + vec2(0.0, steppedTime * 0.1)).r;

    float edgeGrad = 1.0 - smoothstep(1.0, 0.1, abs(vUv.x - 0.5) * 2.0);
    float verticalGrad = 1.0 - vUv.y;

    float cloudNoise = texture2D(tMap, uv * 0.05).r;
    cloudNoise -= texture2D(tMap, uv * 0.2).r * 0.5;

    float value = max(verticalGrad, edgeGrad) + cloudNoise * 0.5 - lines * 0.005;
    value = aastep(0.99, value);

    vec3 nearBlack = vec3(18.0/255.0);
    vec3 color = vec3(nearBlack);

    float alpha = 1.0 - value;
    
    gl_FragColor = vec4(color, alpha);
}