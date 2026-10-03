#!ATTRIBUTES

#!UNIFORMS

#!VARYINGS
varying vec3 vNormal;

#!SHADER: Vertex

#require(water.vs)

void main() {
    vec3 pos = calculateWaterPos();
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

#!SHADER: Fragment
void main() {
    gl_FragColor = vec4(vNormal, 1.0);
}