#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tDiffuse;
uniform sampler2D tLines;
uniform sampler2D tNoise;
uniform sampler2D tBlueNoise;
uniform float uAgeGate;
uniform float uDPR;
uniform float uLoaderFinished;
uniform float uMenuHover;
uniform float uScrollY;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Vertex
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}

#!SHADER: Fragment
#require(mousefluid.fs)
#require(blendmodes.glsl)

float rand(float co) { return fract(sin(co*(91.3458)) * 47453.5453); }
float rand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }
float rand(vec3 co){ return rand(co.xy+rand(co.z)); }

void main() {
  vec2 screenUv = gl_FragCoord.xy / resolution.xy;
  vec3 color = texture2D(tDiffuse, vUv).rgb;

  if (uAgeGate > 0.01) {
    vec2 blueUv = screenUv;
    blueUv.x *= resolution.x / resolution.y;
    blueUv *= 4.0;
    blueUv.y -= time * 0.04;
    vec3 bnoise = texture2D(tBlueNoise, blueUv).rgb;

    float fluidMask = smoothstep(0.4, 0.7, texture2D(tFluidMask, screenUv).r);
    vec3 fluid = vec3(texture2D(tFluid, screenUv).xy * fluidMask, fluidMask);

    fluid.z *= 1.0 - (bnoise.r) * 0.99;
    float steppedTime = floor(time * 8.0) / 8.0;
    float n1 = texture2D(tNoise, screenUv * 1.3 + vec2(-steppedTime * 0.05, steppedTime * 0.02)).r;
    fluid.z *= 0.1 + sin(steppedTime + n1 * 4.0) * 0.5 + 0.5;

    fluid.z *= uAgeGate;
    color = mix(color, color + 0.02, step(0.9, sin(fluid.z * 4.0)));
  }

    vec2 buv = screenUv;
    buv.x *= resolution.x / resolution.y;
    buv *= 10.0;
    vec3 bnoise = texture2D(tBlueNoise, buv).rgb;

    vec2 noiseUv = screenUv;
    noiseUv.x *= resolution.x / resolution.y;

    float st = floor(time * 8.0) / 8.0;
    float n1 = texture2D(tNoise, noiseUv * 0.2 + vec2(-st * 0.05, st * 0.02)).r;
    float n2 = texture2D(tNoise, noiseUv * 0.3 + vec2(-st * 0.03, st * 0.01)).r;
    
    // CLOUD NOISE
    // float clouds = 0.0;
    // clouds += (n1 * 0.7);
    // clouds -= (bnoise.r * 0.5);
    // clouds += smoothstep(1.0, 0.65, vUv.y);
    // clouds += smoothstep(0.8, 0.0, vUv.x);
    // clouds = step(0.31, clouds);
    // float blnd = ((1.0 - clouds) * uLoaderFinished) * 0.25;
    // color = blendMultiply(color, vec3(0.1), blnd);



    // RANDOM NOISE
    // vec3 randomNoise = vec3(rand(vUv));
    // color = randomNoise;
    // color = blendOverlay(color, randomNoise, .15);

    // SCROLLED BLUE NOISE
    vec2 scrolledUvs = screenUv;
    scrolledUvs.x *= resolution.x / resolution.y;
    scrolledUvs *= 5.;
    scrolledUvs.y += uScrollY * 1.5;
    vec3 globalNoise = vec3(texture(tBlueNoise, scrolledUvs).r * 2. + 0.1);

    color = blendMultiply(color, globalNoise, .1);


    // float layer2 = 0.0;
    // layer2 += (n1 + n2) * 0.45;
    // layer2 -= (bnoise.r * 0.3);
    // layer2 = step(0.31, layer2);
    // color = blendMultiply(color, vec3(0.0), (1.0 - layer2) * 0.05);
    

  gl_FragColor = vec4(color, 1.0);
}
