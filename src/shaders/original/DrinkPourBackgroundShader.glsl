#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;
uniform sampler2D tNoise;
uniform sampler2D tLines;
uniform float uLinesTile;
uniform vec3 uColor;
uniform float uDiscardTop;
uniform float uDiscardBottom;

#!VARYINGS
varying vec2 vUv;
varying vec3 vPos;
varying float vNdcHeight;
varying float vAspect;

mat2 rotate2d(float a) {
	float s = sin(a);
	float c = cos(a);
	return mat2(c, s, -s, c);
}

#!SHADER: Vertex
void main() {

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 modelViewPos = viewMatrix * worldPos;
    gl_Position = projectionMatrix * modelViewPos;

    vUv = uv;
    vPos = position;

    float aspect = resolution.y / resolution.x;
    vPos.x *= aspect;
    // vPos.x *= 2.0;
    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);

    vAspect = resolution.x / resolution.y;
}

#!SHADER: Fragment
float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0 + 0.05) discard;

        vec3 color = uColor;

    gl_FragColor = vec4(color, 1.0);
}