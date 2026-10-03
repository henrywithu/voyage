#!ATTRIBUTES

#!UNIFORMS
varying vec3 vPosition;

#!VARYINGS
#!SHADER: Vertex
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vPosition = position;
}

#!SHADER: Fragment
void main() {
  // if (vPosition.x > 0.5) {
  //   gl_FragColor = vec4(0.0, 1.0, 0.0, 0.0);
  //   return;
  // }

  gl_FragColor = vec4(0.3, 0.0, 0.0, 0.0);
}