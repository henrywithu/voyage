#!ATTRIBUTES

#!UNIFORMS
uniform vec3 uColor;

#!VARYINGS

#!SHADER: ScreenQuadColor.vs
void main() {
    vec3 pos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

#!SHADER: ScreenQuadColor.fs
void main() {
    gl_FragColor = vec4(uColor, 1.0);
}