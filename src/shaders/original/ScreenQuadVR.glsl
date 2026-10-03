#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;
uniform float uEye;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Vertex

vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
    vec2 st = uv - origin;
    st /= scale;
    return st + origin;
}

void main() {
    vUv = scaleUV(uv, vec2(2.0, 1.0), vec2(0.0)) - vec2(uEye, 0.0);
    gl_Position = vec4(position, 1.0);
}

#!SHADER: Fragment
void main() {
    gl_FragColor = texture2D(tMap, vUv);
}