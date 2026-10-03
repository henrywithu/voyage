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
  float fluidMask = smoothstep(0.4, 0.7, texture2D(tFluidMask, screenUv).r);
  vec3 fluid = vec3(texture2D(tFluid, screenUv).xy * fluidMask, fluidMask);

  // color = mix(color, vec3(0.2), mask)

  color += fluid * 0.0001;
  float steppedTime = floor(time * 8.0) / 8.0;
  float n1 = texture2D(tNoise, screenUv * 1.3 + vec2(-steppedTime * 0.05, steppedTime * 0.02)).r;
  fluid.z *= 0.1 + sin(steppedTime + n1 * 4.0) * 0.5 + 0.5;
  color = mix(color, color + 0.02, step(0.9, sin(fluid.z * 4.0)));

  gl_FragColor = vec4(color, 1.0);
}