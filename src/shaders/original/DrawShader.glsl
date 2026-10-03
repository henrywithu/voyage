#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tSource;
uniform vec2 uPosition;
uniform vec2 uResolution;
uniform float uSharp;
uniform float uSize;
uniform float uTrail;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Vertex
void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}

#!SHADER: Fragment

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xx;

    float trail = texture2D(tSource, vUv).r;

    vec2 mousePos = vec2(uPosition.x, uResolution.y - uPosition.y) / uResolution.xx;

    float sharp = uSharp * 0.5;
    float circleDist = smoothstep(0. + sharp, 1. - sharp, min(distance(mousePos, uv ) / uSize * 20., 1.));

    gl_FragColor = vec4(vec3(1. - circleDist), 1.);

    gl_FragColor.rgb += trail * uTrail;
}