#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tLines;
uniform sampler2D tNoise;
uniform float uScroll;
uniform float uRepeat;
uniform float uFixed;
uniform mat4 uFixedCameraMatrix;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Vertex
void main() {
  vUv = uv;

  if (uFixed > 0.5) {
    gl_Position = projectionMatrix * uFixedCameraMatrix * modelMatrix * vec4(position, 1.0);
  } else {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
}

#!SHADER: Fragment
#require(range.glsl)

float parabola( float x, float k )
{
    return pow( 4.0*x*(1.0-x), k );
}

void main() {

  float blackValue = 1.0;
  blackValue = mix(1.0, 0.0, smoothstep(0.0, 0.8, 1.0 -vUv.y));


  float steppedTime = time * 0.1;//floor(time * 8.0) / 8.0;
  steppedTime += uScroll * 0.0002;

  vec2 noiseUV = vUv.xy;
  noiseUV -= 0.5;
  noiseUV *= uRepeat;
  noiseUV += 0.5;

  float noise = texture2D(tNoise, noiseUV.xy * vec2(4.6, 2.0) + vec2(0.0, -steppedTime)).r;
  float lines = texture2D(tLines, noiseUV.xy * vec2(7.5, 3.0) + vec2(0.0, -steppedTime)).r;

  noise -= blackValue;
  // noise += 0.04;
  noise += lines * 0.65;
  noise *= 1.0 - smoothstep(0.95, 1.0, vUv.y);

  blackValue -= step(0.4, noise);

  // blackValue -= step(0.4, noise) * alpha;

  float alpha = 1.0;

  float bottomNoise = noise;
  bottomNoise = mix(bottomNoise, 0.0, smoothstep(0.0, 0.2, vUv.y));
  alpha = smoothstep(0.0, 0.12 - bottomNoise * 0.2, vUv.y);

  // alpha = smoothstep(0.0, 0.12 - step(0.4, noise * 0.3), vUv.y);

  // float noise2 = smoothstep(0.0, 0.2, 1.0 - vUv.y);
  // noise2 += lines * 0.65;


  vec3 color = mix(vec3(0.071,0.071,0.071), vec3(1.0), step(0.1, blackValue));

  gl_FragColor = vec4(color, alpha);
}