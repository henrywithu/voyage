#!ATTRIBUTES
attribute float speed;

#!UNIFORMS
uniform vec3 uColor2;

#!VARYINGS

#!SHADER: Vertex

void main() {
    vColor = mix(uColor, uColor2, speed);
}

void customDirection() {
    // Use screen space coordinates for final position, so line thickness is
    // independent of camera.
    finalPosition = vec4(currentP.x / aspect, currentP.y, min(0.0, finalPosition.z), 1.0);
}

#!SHADER: Fragment
float tri(float v) {
    return mix(v, 1.0 - v, step(0.5, v)) * 2.0;
}

void main() {
    float signedDist = tri(vUv.y) - 0.5;
    gl_FragColor.a *= clamp(signedDist/fwidth(signedDist) + 0.5, 0.0, 1.0);
}
