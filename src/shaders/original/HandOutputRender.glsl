#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;

#!VARYINGS
#!SHADER: Vertex
void main() {
  gl_Position = vec4(position, 1.0);
}

#!SHADER: Fragment
#require(fastblur.fs)
#require(blendmodes.glsl)

void main() {
  vec2 vUv = gl_FragCoord.xy / resolution.xy;
  vec4 color = texture2D(tMap, vUv);
  gl_FragColor = color;
}