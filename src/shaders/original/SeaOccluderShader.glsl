#!ATTRIBUTES

#!UNIFORMS
uniform float uDiscardTop;
uniform float uDiscardBottom;

#!VARYINGS
varying float vNdcHeight;

#!SHADER: Vertex
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment
// The sea surface as a depth mask: hides what lies under the water (hulls, rocks)
// and lets the paper background show through.
void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;
    gl_FragColor = vec4(0.0);
}
