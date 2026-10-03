#!ATTRIBUTES

#!UNIFORMS
uniform vec2 uSize;
uniform vec2 uDirection;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Fragment
#require(gaussianblur.fs)

#test Tests.blurSamples() == 13
    #define blur blur13
#endtest
#test Tests.blurSamples() == 9
    #define blur blur9
#endtest
#test Tests.blurSamples() == 5
    #define blur blur5
#endtest

void main() {
    vec2 uv = vUv;
    gl_FragColor = texture2D(tDiffuse, uv);
}
