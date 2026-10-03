#!ATTRIBUTES


#!UNIFORMS
uniform vec3 color;
uniform vec3 color2;
uniform float alpha;
uniform float uDiscardBottom;
uniform float uDiscardTop;
uniform vec3 colorB;
uniform sampler2D tWindNoise;
uniform sampler2D tNoise;
uniform sampler2D tLines;
uniform float uTime;
uniform float uTimeUp;
// Vertex shader uniforms - grouped by type
uniform vec3 uScale;              // x, y, z scale
uniform float uOffsetX;           // x offset
uniform vec2 uMask;               // multiplier, timeSpeed
uniform vec3 uNoise;              // scale, timeSpeed, amount
uniform vec2 uRotation;           // angle, timeSpeed
uniform vec2 uXZScale;            // min, max
uniform vec2 uSmoothstep;         // min, max
uniform float uParabolaK;         // parabola exponent
// Fragment shader uniforms - grouped by type
uniform vec2 uEndNoise;           // rotation, scale
uniform vec2 uEndsMask;           // threshold, parabolaK
uniform vec2 uNoiseUVTimeSpeed;   // x, y timeSpeed
uniform vec2 uNoiseUVScaleA;      // x, y scale for noiseUv
uniform vec2 uNoiseUVScaleB;      // x, y scale for noiseUvB
uniform float uWindNoiseThreshold;
uniform float uAnimateInMask;
uniform float uAnimateNoise;
uniform mat4 modelMatrix;

#!VARYINGS
varying vec2 vUv;
varying float vNdcHeight;
varying vec3 vNormal;
varying float vMask;
varying vec3 vWorldPos;
varying float vDotProduct;
varying vec3 vViewDir;
#!SHADER: LightBeamShader.vs


float parabola( float x, float k ){
    return pow( 4.0*x*(1.0-x), k );
}

#require(quaternion.glsl)
#require(simplenoise.glsl)

void main() {

    vec3 worldPos = position;
    vNormal = normal;
    
    worldPos *= uScale;
  
    float mask = (worldPos.y * uMask.x) - (uTime * uMask.y);
    vMask = mask;
    float noise = cnoise((worldPos.xyz * uNoise.x) - (uTime * uNoise.y)) * uNoise.z;


    worldPos = rotateVertexPosition(worldPos, vec3(0.0, 1.0, 0.0), mask * uRotation.x);
    vNormal = rotateVertexPosition(vNormal, vec3(0.0, 1.0, 0.0), mask * uRotation.x);

    worldPos.xz = mix(worldPos.xz * uXZScale.x, worldPos.xz, (1.0 - parabola(uv.y, uParabolaK)));
    worldPos.xz = mix(worldPos.xz * uXZScale.y, worldPos.xz, smoothstep(uSmoothstep.x, uSmoothstep.y, uv.y));

    worldPos = rotateVertexPosition(worldPos, vec3(0.0, 1.0, 0.0), -uTimeUp * uRotation.y);
    vNormal = rotateVertexPosition(vNormal, vec3(0.0, 1.0, 0.0), -uTimeUp * uRotation.y);

    worldPos.xz -= noise;

    vWorldPos = worldPos;

    worldPos.x *= uAnimateInMask;


    float dotProduct = dot(vNormal, vec3(0.0, 0.0, 1.0));
    vDotProduct = dotProduct;

    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
    vViewDir = -vec3(modelViewMatrix * vec4(position, 1.0));
}

#!SHADER: LightBeamShader.fs

float parabola( float x, float k ){
    return pow( 4.0*x*(1.0-x), k );
}

#require(transformUV.glsl)
#require(range.glsl)
float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

float getFresnel(vec3 normal, vec3 viewDir, float power) {
    float d = dot(normalize(normal), normalize(viewDir));
    return 1.0 - pow(abs(d), power);
}

void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    if(vDotProduct < 0.2) discard;

    vec2 noiseUv = vUv;
    noiseUv.y -= uTime * uNoiseUVTimeSpeed.y;
    noiseUv = scaleUV(noiseUv, uNoiseUVScaleA);

    noiseUv += vec2(
        texture2D(tNoise, (noiseUv * 1.0) + vec2(uTime * 0.025)).r,
        texture2D(tNoise, (noiseUv * 1.0) + vec2((uTime + 5.0) * 0.025)).r
    ) * 0.2;

    vec2 noiseUvB = vUv;

    noiseUvB.y -= uTime * uNoiseUVTimeSpeed.y;
    noiseUvB = scaleUV(noiseUvB, uNoiseUVScaleB);

    noiseUvB += vec2(
        texture2D(tNoise, (noiseUvB * 1.0) + vec2(uTime * 0.025)).r,
        texture2D(tNoise, (noiseUvB * 1.0) + vec2((uTime + 10.0) * 0.025)).r
    ) * 0.1;


    float windNoiseA = texture2D(tNoise, noiseUv).r;
    float windNoiseB = texture2D(tNoise, noiseUvB).r;

    vec3 lightDir = vec3(0.25, 0.25, 1.25);
    float lighting = dot(vNormal, lightDir);
    float lightMask = max(0.0, lighting);

    vec2 lineUv = vUv * 4.;

    lineUv = rotateUV(lineUv, 0.4);

    float steppedTime = floor(time * 8.0) / 8.0 * 0.15;
    lineUv.x -= steppedTime * 30.;

    float lines = texture2D(tLines, lineUv.yx).r * 2.0 - 1.0;

    float maskedLines = lines;

    float gradMask = (vWorldPos.y + 2.75);
    float fresn = getFresnel(vNormal , normalize(vViewDir), 0.5);
    float fresnel = aastep(windNoiseA * 0.6, fresn);
    vec3 finalColor = mix(color, colorB, fresnel);

    vec3 taperMaskColor = mix(finalColor, colorB, vec3(1.0 - step(windNoiseB * 0.3, gradMask)));

    if(taperMaskColor.r < 0.01) discard;
    gl_FragColor = vec4(taperMaskColor, taperMaskColor.r);

    float animateInMask = step(vWorldPos.y + mix(-4.0, 4.0, 1.0 - uAnimateNoise), windNoiseB + windNoiseA);

    float fadeTop = 1.0 - smoothstep(0.95, 1.0, vUv.y);

    fadeTop += (windNoiseB) * 0.4;
    fadeTop = step(0.4, fadeTop);

    animateInMask *= fadeTop;

    gl_FragColor.a *= animateInMask;

    // gl_FragColor = vec4(vUv.y, 1.0, 1.0, 1.0);

    //gl_FragColor = vec4(vec3(vDotProduct), 1.0);
}