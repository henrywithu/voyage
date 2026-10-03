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
// min half float value
#define HALF_FLOAT_MIN vec3( -65504, -65504, -65504 )
// max half float value
#define HALF_FLOAT_MAX vec3( 65504, 65504, 65504 )

uniform sampler2D tMap;
uniform sampler2D tGainMap;
uniform vec3 uGamma;
uniform vec3 uOffsetHdr;
uniform vec3 uOffsetSdr;
uniform vec3 uGainMapMin;
uniform vec3 uGainMapMax;
uniform float uWeightFactor;

varying vec2 vUv;

void main() {
  vec3 rgb = texture2D( tMap, vUv ).rgb;
  vec3 recovery = texture2D( tGainMap, vUv ).rgb;
  vec3 logRecovery = pow( recovery, uGamma );
  vec3 logBoost = uGainMapMin * ( 1.0 - logRecovery ) + uGainMapMax * logRecovery;
  vec3 hdrColor = (rgb + uOffsetSdr) * exp2( logBoost * uWeightFactor ) - uOffsetHdr;
  vec3 clampedHdrColor = max( HALF_FLOAT_MIN, min( HALF_FLOAT_MAX, hdrColor ));
  gl_FragColor = vec4( clampedHdrColor , 1.0 );
}
