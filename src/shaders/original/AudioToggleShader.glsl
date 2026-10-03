#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tNoise;
uniform sampler2D tScene;

uniform float uHover;
uniform float uShow;

#!VARYINGS
varying vec2 vUv;
varying vec3 vPos;

#!SHADER: Vertex
void main() {
  vUv = uv;
  vPos = position;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(vPos, 1.0);
}

#!SHADER: Fragment
float aastep(float threshold, float value) {
  float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
  return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

float parabola( float x, float k ){
  return pow( 4.0*x*(1.0-x), k );
}

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 screenUv = gl_FragCoord.xy / resolution.xy;

  // is scene dark
  vec3 scene = texture2D(tScene, screenUv).rgb;
  float sceneLuma = luma(scene);
  float isDark = step(0.3, sceneLuma);

  // if yes, blend to red
  vec3 baseColor = vec3(0.0);
  // vec3 outColor = mix(vec3(0.957,0.741,0.157), vec3(0.071,0.071,0.071), isDark);
  vec3 outColor = mix(vec3(1.0), vec3(0.071,0.071,0.071), isDark);

  float steppedTime = floor(time * 8.0) / 8.0;
  float noiseTiling = 0.6;
  float noiseInfluence = 0.8;
  float noise = texture2D(tNoise, vPos.xy * noiseTiling + vec2(0.0, steppedTime)).r;

  float value = 1.0;
  value *= parabola(vUv.x, 1.0);
  value *= parabola(vUv.y, 0.3);
  value -= noise * noiseInfluence;

  float outline = aastep(0.4, value);
  vec3 color = max(outColor, outline * baseColor);

  float alpha = aastep(0.01, value) * uShow;
  gl_FragColor = vec4(color, alpha);
}
