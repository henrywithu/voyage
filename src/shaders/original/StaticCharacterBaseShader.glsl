#!ATTRIBUTES
attribute vec2 uv2;
attribute float windmask;

#!UNIFORMS
uniform sampler2D tMap;

uniform sampler2D tAtlas;
uniform sampler2D tTrim;
uniform sampler2D tLines;
uniform sampler2D tNoise;
uniform float uLinesTile;
uniform vec3 uLinesAxis;
uniform float uLinesAngle;
uniform vec3 uLightDir;
uniform vec2 uThreshold;
uniform vec4 uWindAxisAngle;
uniform vec3 uWindParams;
uniform vec3 uBreathe;
uniform vec3 uColor;
uniform float uBend;

#!VARYINGS
varying vec2 vUv;
varying vec2 vUv2;
varying vec2 vLineUv;
varying vec3 vNormal;
varying float vSkinMask;
varying vec3 vViewNormal;
varying vec3 vViewPos;

#!SHADER: Vertex

mat3 rotation3d(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat3(
    oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
  );
}

void main() {
    vUv = uv;
    vUv2 = uv2;
    vNormal = normal;
    vLineUv = (rotation3d(normalize(uLinesAxis), uLinesAngle) * position).xy;
    vSkinMask = step(0.55, uv2.y);

    float steppedTime = floor(time * 18.0) / 18.0;

    vec3 pos = position;

    // wind animation
    vec3 windAxis = normalize(uWindAxisAngle.xyz);
    float windAngle = uWindAxisAngle.w;
    vec3 windPos = rotation3d(windAxis, windAngle) * pos;

    float displacement = sin(windPos.y * uWindParams.y + steppedTime * uWindParams.z) * uWindParams.x * windmask;
    displacement += sin(windPos.y * uWindParams.y * 0.34159 + windPos.z * 0.5 * uWindParams.y + steppedTime * uWindParams.z * 3.14159 * 0.673) * uWindParams.x * windmask;
    displacement += sin(windPos.y * uWindParams.y * 0.2772 + windPos.z * 0.5 * uWindParams.y + steppedTime * uWindParams.z * 3.14159 * 0.673) * uWindParams.x * windmask * 0.5;
    
    pos.y += displacement;
    pos.x -= displacement * 0.5;
    vNormal.y += displacement * 7.0;

    // breathe animation
    float mask = smoothstep(uBreathe.x, uBreathe.y, position.y);
    vec3 pivot = vec3(0.0, 0.2, -0.1);
    pos -= pivot;
    pos = rotation3d(vec3(1.0, 0.0, 0.0), (2.5 * uBreathe.z + sin(floor(time * 8.0) * 0.3 - mask * 2.0)) * 0.02 * (mask * 0.6 + 0.2) * uBreathe.z + uBend * mask) * pos;
    pos += pivot;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vViewNormal = normalMatrix * normal;
    vViewPos = (modelViewMatrix * vec4(pos, 1.0)).xyz;
}

#!SHADER: Fragment
#require(makeup.glsl)
    float aastep(float threshold, float value) {
        float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
        return smoothstep(threshold-afwidth, threshold+afwidth, value);
    }

    float isLeft( vec3 P0, vec3 P1, vec3 P2 ) {
        return ( (P1.x - P0.x) * (P2.y - P0.y) - (P2.x - P0.x) * (P1.y - P0.y) );
    }

void main() {
    // trim texture
    vec4 trimData = texture2D(tTrim, vUv);
    if (trimData.a < 0.5) discard;
    float trim = trimData.r;

    float steppedTime = floor(time * 8.0) / 8.0 * 0.15;

    vec3 normal = normalize(vNormal);
    
    // lines
    vec2 lineUv = vLineUv * uLinesTile;
    lineUv.x -= steppedTime * 2.0;
    float lines = texture2D(tLines, lineUv.yx).r * 2.0 - 1.0;

    // detail texture
    float atlas = inkLevel(texture2D(tAtlas, vUv2).r);
    atlas = aastep(0.55, atlas * trim);

    // lighting
    float lighting = dot(normal, uLightDir);
    float lightMask = max(0.0, lighting);
    float terminatormid = aastep(uThreshold.x, lighting + lines * 0.45);
    // Voyage: her skin keeps to the light (a soft shadow only where it turns well away).
    float skinLit = skinLight(lighting, uThreshold.x - 0.4);
    float terminatorhigh = aastep(uThreshold.y, lighting + lines * 0.1);

    // reduce lines in areas of brightness
    float maskedLines = lines + lightMask;

    // break up lines with dots as light gets brighter
    float noise = texture2D(tNoise, lineUv * 2.0).r;
    maskedLines += noise* pow(lightMask, 2.0) * 3.0;
    maskedLines = aastep(0.01, maskedLines);

    // compositing;
    vec3 color = vec3(1.0);
    vec3 alt = uColor;
    alt = mix(alt, vec3(1.0), vSkinMask);

    // Voyage: her dress falls into a soft grey shade (the hatching draws its texture), not solid ink.
    color = mix(alt * 0.74, alt, terminatormid);
    color = mix(color, skinShade(skinLit), vSkinMask);
    color = mix(color, vec3(1.0), terminatorhigh);
    color = applyMakeup(color, tAtlas, vUv2, skinLit);
    color *= mix(vec3(1.0), skinContour(vViewNormal, vViewPos), vSkinMask);
    // Voyage: the hatching on her dress is a dark grey stroke, lighter than the ink of her outline.
    color *= mix(mix(0.66, 1.0, maskedLines), 1.0, vSkinMask);
    color *= atlas;
    color = mix(color, hairShade(smoothstep(-0.2, 0.5, lighting), aastep(0.55, trim), vUv), hairMask(vUv));

    color = max(vec3(18.0 / 255.0), color);

    if (!gl_FrontFacing) {
        color = vec3(0.0);
    }

    float alpha = 1.0;
    gl_FragColor = vec4(color, alpha);
}