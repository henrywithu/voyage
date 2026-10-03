#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tLogo;
uniform sampler2D tScene;
uniform sampler2D tNoise;
uniform sampler2D tLines;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uShow;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Vertex
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

#!SHADER: Fragment
#require(range.glsl)
#require(mousefluid.fs)

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec4 color = texture2D(tLogo, vUv);

  vec2 screenUV = gl_FragCoord.xy / resolution.xy;
  vec3 scene = texture2D(tScene, screenUV).rgb;
  float sceneLuma = luma(scene);
  float isDark = step(0.3, sceneLuma);

  float tempo = floor(time * 8.0) / 8.0;
  float noise = texture2D(tNoise, vUv * 0.2 + vec2(0.0, -tempo)).r;
  color.rgb = mix(uColor2, uColor, isDark);

  float alpha = rangeTransition(uShow, noise, 0.5);
  color.a *= alpha;


  // 
  // float fluidMask = smoothstep(0.1, 0.7, texture2D(tFluidMask, screenUV).r);
  // vec3 fluid = vec3(texture2D(tFluid, screenUV).xy * fluidMask, fluidMask);

  // // color.rgb = fluid;

  // color.rgb += fluid * 0.001;


  gl_FragColor = color;
}