#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;
uniform float uAlpha;
uniform float uFixed;
uniform mat4 uFixedCameraMatrix;

#!VARYINGS
varying vec2 vUv;

#!SHADER: TextureMaterial.vs
void main() {
    vUv = uv;
    vec3 localPos = position;
    if (uFixed > 0.5) {
        gl_Position = projectionMatrix * uFixedCameraMatrix * modelMatrix * vec4(localPos, 1.0);
    } else {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
}

#!SHADER: TextureMaterial.fs
void main() {
    gl_FragColor = texture2D(tMap, vUv);
    gl_FragColor.a *= uAlpha;
    gl_FragColor.rgb /= gl_FragColor.a;
}