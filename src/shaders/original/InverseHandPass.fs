uniform sampler2D tDiffuse;
uniform sampler2D tHand;
uniform sampler2D tHeightmap;
uniform sampler2D tLines;
uniform sampler2D tNoise;
uniform sampler2D tBlueNoise;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform float uScroll;

#require(blendmodes.glsl)
#require(rgb2hsv.fs)

float sampleHeightmap(sampler2D tex, vec2 uv) {
    vec2 texSize = vec2(256.0);
    vec2 texel = 1.0 / texSize;

    // Convert UV to texel space, offset by half-texel to get to texel centers
    vec2 f = fract(uv * texSize - 0.5);
    vec2 base = (floor(uv * texSize - 0.5) + 0.5) * texel;

    // Sample the 4 nearest texels
    float tl = texture2D(tex, base).x;
    float tr = texture2D(tex, base + vec2(texel.x, 0.0)).x;
    float bl = texture2D(tex, base + vec2(0.0, texel.y)).x;
    float br = texture2D(tex, base + vec2(texel.x, texel.y)).x;

    // Bilinear blend
    float top = mix(tl, tr, f.x);
    float bottom = mix(bl, br, f.x);
    return mix(top, bottom, f.y);
}

void main() {
  vec2 screenUv = gl_FragCoord.xy / resolution.xy;

  vec2 screenUvFlipped = screenUv;
  screenUvFlipped.x = 1.0 - screenUvFlipped.x;

  float heightValue = sampleHeightmap(tHeightmap, screenUvFlipped);
  float steppedTime = floor(time * 8.0) / 8.0;

  vec3 color = uColor1;

  vec2 lineuv = screenUv;
  lineuv /= resolution.x > resolution.y ? vec2(1.0, resolution.x / resolution.y) : vec2(resolution.y / resolution.x, 1.0);
  lineuv.x -= sin(lineuv.y) * 0.3;
  lineuv.y += steppedTime * 0.05;
  lineuv.x -= steppedTime * 0.015;
  lineuv *= 0.8;

  lineuv += heightValue * 0.01;

  vec4 lines = texture2D(tLines, lineuv);
  vec4 noise = texture2D(tNoise, lineuv * 0.4 + vec2(steppedTime * 0.01, 0.0));
  vec4 noise2 = texture2D(tBlueNoise, lineuv * 6.0 + vec2(steppedTime * 0.01, 0.0));

  float value = 0.0;
  value += lines.r;
  value -= noise.r * 0.2;
  value = step(0.7 + noise.r * 0.04, value);

  color = mix(color, uColor2, value);

  float minval = 0.3;

  color = mix(color, vec3(0.0), step(minval + 0.01 + noise2.b * 0.1, heightValue));
  color = mix(color, uColor4, step(minval + 0.1 + noise2.b * 0.1, heightValue));
  color = mix(color, uColor3, step(minval + 1.5 - noise2.g * 0.1, heightValue));

  vec2 handUv = screenUv;
  handUv.y -= uScroll;
  handUv -= 0.5;
  handUv += noise2.rg * 0.05;
  handUv += 0.5;
  vec4 hand = texture2D(tHand, handUv, 0.0);

  // hand *= hand.r;

  color = blendNormal(color,uColor4, hand.r * 0.3);

  gl_FragColor = vec4(color, 1.0);

screenUv.y -= uScroll;
  hand = texture2D(tHand, screenUv, 0.0);
  gl_FragColor.rgb = blendNormal(texture2D(tDiffuse, screenUv).rgb, gl_FragColor.rgb, 1.0 - hand.g * hand.r);
  // gl_FragColor = hand;
}