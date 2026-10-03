#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;
uniform float uStep;
uniform float uBlit;
uniform float uBlurAmount;
uniform sampler2D tNoise;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Vertex
void main() {
    gl_Position = vec4(position, 1.0);
    vUv = uv;
}

    #!SHADER: Fragment
void main() {

    if(uBlit > 0.5) {
        vec4 col = texture2D(tMap, vUv);
        col.xyz = smoothstep(0.05, 1.0, col.xyz);
        gl_FragColor = col;
    } else {
        vec2 texelSize = 1.0 / resolution.xy;
        vec2 stp = (texelSize * (uStep * 0.35)) + (texelSize * 0.5);
        vec2 noise = (texture2D(tNoise, vUv * 1.0).xy * 2.0 - 1.0) * 0.001;
        vec4 tL = texture2D(tMap, vUv + vec2(-stp.x, stp.y) + noise);
        vec4 tR = texture2D(tMap, vUv + vec2(stp.x, stp.y) + noise);
        vec4 bL = texture2D(tMap, vUv + vec2(-stp.x, -stp.y) + noise);
        vec4 bR = texture2D(tMap, vUv + vec2(stp.x, -stp.y) + noise);
        gl_FragColor = (tL + tR + bL + bR)*0.25;
    }

}