#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;
uniform float uAlpha;
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
void main() {
  gl_FragColor = texture2D(tMap, vUv);
  gl_FragColor.a *= uAlpha;
  gl_FragColor.rgb /= gl_FragColor.a;
}