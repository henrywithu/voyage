#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Vertex
void main() {
	vUv = uv;
	gl_Position = vec4(position, 1.0);
}

#!SHADER: Fragment
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform sampler2D tMap;
uniform sampler2D tHDR;
uniform vec3 uGamma;
uniform vec3 uOffsetSDR;
uniform vec3 uOffsetHDR;
uniform float uMinLog2;
uniform float uMaxLog2;

varying vec2 vUv;

void main() {
  vec3 sdrColor = texture2D(tMap, vUv).rgb;
  vec3 hdrColor = texture2D(tHDR, vUv).rgb;

  vec3 pixelGain = (hdrColor + uOffsetHDR) / (sdrColor + uOffsetSDR);
  vec3 logRecovery = (log2(pixelGain) - uMinLog2) / (uMaxLog2 - uMinLog2);
  vec3 clampedRecovery = saturate(logRecovery);
  gl_FragColor = vec4(pow(clampedRecovery, uGamma), 1.0);
}
