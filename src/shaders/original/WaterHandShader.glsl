#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D heightmap;
uniform sampler2D tHand;
uniform sampler2D tLines;
uniform sampler2D tNoise;
uniform sampler2D tBlueNoise;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
// uniform float heightScale;
// uniform float WIDTH;
// uniform float BOUNDS;
uniform float uFixed;
uniform mat4 uFixedCameraMatrix;
uniform float uScroll;
uniform float uPageScroll;

#!VARYINGS
varying vec3 vNormal;
varying vec2 vUv;
varying float vHeight;

#!SHADER: Vertex

// vec3 calculateWaterPos() {
//     vec2 cellSize = vec2( 1.0 / WIDTH, 1.0 / WIDTH );

//     vec3 objectNormal = vec3(
//                         ( texture2D( heightmap, uv + vec2( - cellSize.x, 0 ) ).x - texture2D( heightmap, uv + vec2( cellSize.x, 0 ) ).x ) * WIDTH / BOUNDS,
//                         ( texture2D( heightmap, uv + vec2( 0, - cellSize.y ) ).x - texture2D( heightmap, uv + vec2( 0, cellSize.y ) ).x ) * WIDTH / BOUNDS,
//                         1.0 );


//     vNormal = normalize(normalMatrix * objectNormal);

//     float heightValue = texture2D(heightmap, uv).x;

//     vHeight = heightValue;
//     vec3 pos = position;

//     // pos.xy += vNormal.xy * 1.5;
//     // pos.z += heightValue * 1.5;
//     // z += length(vNormal.xy) * 10.5;
//     // pos.z += heightValue * heightScale;

//     // pos.z += (1.0 - heightValue) * 3.0;
//     // pos.z += (1.0 - step(0.2, heightValue)) * 0.6;

//     // if (heightValue > 0.4) {
//     //     pos.z += .0;
//     // }

//     // pos.z += heightValue * 4.5;
//     // pos.x += heightValue * 2.2;

//     return pos;
// }

void main() {
    // vec3 pos = calculateWaterPos();
    vec3 pos = position;
    
    pos.z -= 0.5;
    pos.xy *= 1.1;
    
    if (uFixed > 0.5) {
        gl_Position = projectionMatrix * uFixedCameraMatrix * modelMatrix * vec4(pos, 1.0);
    } else {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }


    vUv = uv;
}

#!SHADER: Fragment
#require(blendmodes.glsl)
#require(rgb2hsv.fs)

// bilinear sampling of heightmap
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
//   vec2 screenUv = gl_FragCoord.xy / resolution.xy;
  vec2 screenUv = vUv;

  // float heightValue = vHeight;
  // float heightValue = texture2D(heightmap, screenUv).x;
  float heightValue = sampleHeightmap(heightmap, screenUv);
  float steppedTime = floor(time * 8.0) / 8.0;

  vec3 color = uColor1;

  vec2 lineuv = vUv;
  lineuv -= 0.5;
  lineuv /= resolution.x > resolution.y ? vec2(1.0, resolution.x / resolution.y) : vec2(resolution.y / resolution.x, 1.0);
  lineuv *= 1.4;
  lineuv += 0.5;

  lineuv.x -= sin(lineuv.y) * 0.3;
  lineuv.y += time * 0.05;
  lineuv.x -= time * 0.015;
  // lineuv.y += uPageScroll * 0.15;
  lineuv *= 0.8;

  lineuv += heightValue * 0.01;

  vec4 lines = texture2D(tLines, lineuv);
  vec4 noise = texture2D(tNoise, lineuv * 0.4 + vec2(steppedTime * 0.01, steppedTime * 0.04));
  vec4 noise2 = texture2D(tBlueNoise, lineuv * 6.0 + vec2(steppedTime * 0.2, 0.0));

  float value = 0.0;
  value += lines.r;
  // value -= (noise.r - (noise2.r * 0.1)) * 1.2;
  // value += step(0.8, heightValue);
  value -= noise.r * 0.2;
  // value += lines.r * length(vNormal.xy) * 0.5;
  // value -= (lines.r * 0.1) * length(vNormal.xy) * 20.0;
  // value += length(vNormal.xy) * 4.0;
  // value -= heightValue * 0.5;
  value = step(0.7 + noise.r * 0.04, value);

  color = mix(color, uColor2, value);

  float minval = 0.3;

  color = mix(color, vec3(0.0), step(minval + 0.01 + noise2.b * 0.1, heightValue));
  color = mix(color, uColor4, step(minval + 0.1 + noise2.b * 0.1, heightValue));
  color = mix(color, uColor3, step(minval + 1.5 - noise2.g * 0.1, heightValue));


// Hue
//   color.rgb = rgb2hsv(color.rgb);
//   color.r += vNormal.x * 0.06;
//   color.g += vNormal.y * 0.35;
//   color.rgb = hsv2rgb(color.rgb);

  // color.rgb = blendPhoenix(color.rgb, hand.rgb, hand.a);
  // color.rgb = hand.rgb;
  // color -= ((1.0 - hand.r) * hand.g) * 0.2;

  // color *= (1.0 - hand.r) - step(0.4, hand.g);

  vec2 handUv = screenUv;
  handUv.y -= uScroll;
  handUv -= 0.5;
  // handUv += (vNormal.xy * 0.5) * 0.3;// + (noise2.r * 0.02);
  handUv += noise2.rg * 0.02;
  handUv += 0.5;
  vec4 hand = texture2D(tHand, handUv, 0.0);

  color.rgb = blendNormal(color.rgb, uColor4, hand.g * 0.3);

  // add light
  // float light = dot(nearbyNormal.xy, vec2(0.0, 1.0));
  color.rgb -= step(0.1, heightValue) * 0.04;


  gl_FragColor = vec4(color, 1.0);
  // gl_FragColor = vec4(nearbyNormal.xyz, 1.0);
  // gl_FragColor = vec4(vHeight, 0.0, 0.0, 1.0);
  // gl_FragColor = vec4(vNormal.xyz, 1.0);

  // gl_FragColor = hand;
}