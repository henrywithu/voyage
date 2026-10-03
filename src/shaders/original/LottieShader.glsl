#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;
uniform vec3 uSolidColor;
uniform vec3 uSecondColor;
uniform float uSharp;
uniform float uSharpEdge;
uniform float uUseSolidColor;
uniform float uScale;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Vertex

void main() {
  vec3 pos = position * uScale;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  vUv = uv;
}

#!SHADER: Fragment
float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
  vec4 color = texture2D(tMap, vUv);

  if (uSharp > 0.5) {
    color.a *= aastep(uSharpEdge, color.a);
  }

  if (uUseSolidColor > 0.5) {
    float cut = aastep(0.5, length(color.rgb));
    color.rgb = mix(uSolidColor, uSecondColor, cut);
  }

  gl_FragColor = color;
}