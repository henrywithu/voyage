
#!ATTRIBUTES

#!UNIFORMS
uniform float uDiscardTop;
uniform float uDiscardBottom;
uniform float uDisplacement;

#!VARYINGS
varying vec2 vUv;
varying vec3 vNormal;
varying float vNdcHeight;

#!SHADER: Vertex

#require(skinning.glsl)

void main() {
    vUv = uv;
    vNormal = normalize(normal);

    vec3 pos = position;
    applySkin(pos, vNormal);
    
    // float steppedTime = floor(time * 8.0);
    // float displacementStrength = 0.008 * uDisplacement;
    // vec3 displacement = vNormal * displacementStrength;
    // pos += displacement;

    vec4 projectionPos = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vec4 projectionNormal = projectionMatrix * modelViewMatrix * vec4(vNormal, 0.0);
    
    vec2 screenNormal = normalize(projectionNormal.xy);
    projectionPos.xy += screenNormal * uDisplacement * projectionPos.w * 0.004;

    gl_Position = projectionPos;

    // gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment

void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    vec3 color = vec3(18.0 / 255.0);

    gl_FragColor = vec4(color, 1.0);
}