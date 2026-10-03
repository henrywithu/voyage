#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;

#!VARYINGS

#!SHADER: BGShader.vs
void main() {
    gl_Position = vec4(position, 1.0);
}

#!SHADER: BGShader.fs
void main() {
    gl_FragColor.rgb = vec3(0.2);
    gl_FragColor.a = 1.0;
}