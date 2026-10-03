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
uniform sampler2D tMap;
uniform vec2 uSize;
varying vec2 vUv;

const int CELL_SIZE = 2;

void main() {
  // compute the first pixel the source cell
  vec2 srcPixel = floor(gl_FragCoord.xy) * float(CELL_SIZE);

  // one pixel in source
  vec2 onePixel = vec2(1) / uSize;

  // uv for first pixel in cell. +0.5 for center of pixel
  vec2 uv = (srcPixel + 0.5) * onePixel;

  vec4 resultColor = vec4(0.0);

  for (int y = 0; y < CELL_SIZE; ++y) {
    for (int x = 0; x < CELL_SIZE; ++x) {
      resultColor = max(resultColor, texture2D(tMap, uv + vec2(x, y) * onePixel));
    }
  }

  gl_FragColor = resultColor;
}
