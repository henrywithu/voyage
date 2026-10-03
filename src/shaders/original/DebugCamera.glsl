#!ATTRIBUTES

#!UNIFORMS
uniform vec3 uColor;

#!VARYINGS
varying vec3 vColor;

#!SHADER: DebugCamera.vs
void main() {
    vColor = mix(uColor, vec3(1.0, 0.0, 0.0), step(position.z, -0.1));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

#!SHADER: DebugCamera.fs
void main() {
    gl_FragColor = vec4(vColor, 1.0);
}