#!ATTRIBUTES

#!UNIFORMS
uniform vec3 uColor;
uniform sampler2D tNoise;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Vertex
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

#!SHADER: Fragment
#require(mousefluid.fs)

void main() {
  vec3 color = uColor;

  vec2 screenUv = gl_FragCoord.xy / resolution.xy;
  screenUv -= 0.5;
  screenUv *= 0.9;
  screenUv += 0.5;
  float fluidMask = smoothstep(0.4, 0.7, texture2D(tFluidMask, screenUv).r);
  vec3 fluid = vec3(texture2D(tFluid, screenUv).xy * fluidMask, fluidMask);

  float steppedTime = floor(time * 8.0) / 8.0;
  float n1 = texture2D(tNoise, screenUv * 1.3 + vec2(-steppedTime * 0.05, steppedTime * 0.02)).r;

  color += fluid * 0.00004;

  // fluid.z *= 0.1 + sin(steppedTime + n1 * 4.0) * 0.5 + 0.5;

  float show = smoothstep(0.0, 0.2 * n1, length(fluid.xy) * 0.01);

  color = mix(color, color - 0.01, step(0.5, fluid.z * n1 * 1.2) * show);

  gl_FragColor = vec4(color, 1.0);
}