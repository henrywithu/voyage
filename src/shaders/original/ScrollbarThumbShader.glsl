#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tNoise;
uniform sampler2D tScene;

uniform float uDelta;
uniform float uHover;
uniform float uShow;

#!VARYINGS
varying vec2 vUv;
varying vec3 vPos;

#!SHADER: Vertex
void main() {
  vUv = uv;
  vPos = position;

    // vPos.y -= 0.5;
    // vPos.y *= 1.0 + (uDelta * 0.004);
    // vPos.y += 0.5;

    vPos.xy -= vec2(0.8, 0.5);
    // vPos.x *= 1.0 + (uHover * 4.4);
    vPos.x *= 1.0 + min(0.7, abs(uDelta * 0.008));
    vPos.xy += vec2(0.8, 0.5);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(vPos, 1.0);
}

#!SHADER: Fragment
float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

float parabola( float x, float k )
{
    return pow( 4.0*x*(1.0-x), k );
}

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 screenUV = gl_FragCoord.xy / resolution.xy;
    vec3 scene = texture2D(tScene, screenUV).rgb;
    float sceneLuma = luma(scene);
    float isDark = step(0.3, sceneLuma);

    vec3 baseColor = vec3(0.0);
    vec3 outColor = mix(vec3(0.784,0.161,0.141), vec3(0.071,0.071,0.071), isDark);
    float steppedTime = floor(time * 8.0) / 8.0;
    
    float noise = texture2D(tNoise, vPos.xy * 0.4 + vec2(0.0, steppedTime)).r;

    float value = 1.0;
    value *= parabola(vUv.x, 1.0);
    value *= parabola(vUv.y, 0.7);
    value -= noise * 0.6;

    value -= 0.8 * (1.0 - uShow);
    value += 0.2 * uHover;

    float outline = aastep(0.4, value);
    vec3 color = max(outColor, outline * baseColor);

    float alpha = aastep(0.01, value);
    gl_FragColor = vec4(color, alpha);
}