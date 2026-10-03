#!ATTRIBUTES

#!UNIFORMS

#!VARYINGS

#!SHADER: Vertex
void main() {
    gl_Position = vec4(position, 1.0);
}

#!SHADER: Fragment
uniform sampler2D tMap;
void main() {
    gl_FragColor = texture2D(tMap, gl_FragCoord.xy / resolution);
}