#!ATTRIBUTES

#!UNIFORMS
uniform vec3 color;
uniform float alpha;
uniform float uFixed;
uniform mat4 uFixedCameraMatrix;
#!VARYINGS

#!SHADER: ColorMaterial.vs
void main() {
    vec3 localPos = position;
    if (uFixed > 0.5) {
        gl_Position = projectionMatrix * uFixedCameraMatrix * modelMatrix * vec4(localPos, 1.0);
    } else {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(localPos, 1.0);
    }
}

#!SHADER: ColorMaterial.fs
void main() {
    gl_FragColor = vec4(color, alpha);
    //gl_FragColor.rgb /= gl_FragColor.a;
}