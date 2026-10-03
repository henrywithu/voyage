#!ATTRIBUTES

#!UNIFORMS
uniform float uTransition;
uniform sampler2D tBaseColor2;
uniform float uUVOffset1;
uniform float uUVOffset2;

#!VARYINGS
varying vec2 vUv1;
varying vec2 vUv2;

#!SHADER: Vertex
#require(pbr.vs)
#require(quaternion.glsl)

void main() {

  vec3 pos = position;
  setupPBR(pos);

  vUv1 = vec2(vUv.x, (vUv.y - uUVOffset1));
  vUv2 = vec2(vUv.x, (vUv.y - uUVOffset2));

  vWorldNormal = rotateVertexPosition(vWorldNormal, vec3(0.0, 1.0, 0.0), 26.0);
  vWorldNormal = rotateVertexPosition(vWorldNormal, vec3(0.0, 0.0, 1.0), 10.0);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

#!SHADER: Fragment

#require(pbr.fs)

void main() {
  vec4 baseColor = texture2D(tBaseColor, vUv1);
  vec4 baseColor2 = texture2D(tBaseColor, vUv2);
  vec4 color = mix(baseColor, baseColor2, uTransition);
  gl_FragColor = getPBR(color.rgb);
}
