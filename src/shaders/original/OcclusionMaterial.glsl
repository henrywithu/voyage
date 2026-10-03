#!ATTRIBUTES

#!UNIFORMS
uniform vec3 bbMin;
uniform vec3 bbMax;

#!VARYINGS

#!SHADER: Vertex.vs
void main() {
    vec3 pos = position;
    pos *= bbMax - bbMin;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

#!SHADER: Fragment.fs
void main() {
    gl_FragColor = vec4(1.0);
}