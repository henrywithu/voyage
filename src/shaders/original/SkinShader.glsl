#!ATTRIBUTES
attribute vec2 uv2;
attribute vec3 color;

#!UNIFORMS
uniform sampler2D tAtlas;
uniform sampler2D tTrim;
uniform sampler2D tLines;
uniform sampler2D tNoise;

uniform float uLinesTile;
uniform float uDiscardTop;
uniform float uDiscardBottom;
uniform vec3 uAxis;
uniform float uAngle;
uniform vec3 uLightDir;
uniform vec3 uColor;
uniform vec3 uDrinkColor;
uniform float uColorScan;
uniform float uClasp;
uniform float uClipY;
uniform float uPearl;
uniform float uScanDown;

#!VARYINGS
varying vec2 vUv;
varying vec2 vUv2;
varying vec2 vLineUv;
varying vec3 vNormal;
varying vec3 vPos;
varying float vAo;
varying float vEyeMask;
varying float vNdcHeight;
varying float vChain;
varying float vWorldY;
varying vec3 vViewPos;
varying vec3 vViewNormal;

#!SHADER: Vertex

#require(skinning.glsl)

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
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    // Use the blue channel for AO, aligning with the MRO convention - In future it may be better to use a separate attribute float attribute for AO
    vAo = 1.0 - color.b;
    //use green channel for eye mask
    vEyeMask = color.g;
    // red channel: jewellery chains (0.5 = parted at the nape, 1 = closed), see uClasp
    vChain = color.r;

    vec3 pos = position;
    vec3 objectNormal = normal;
    applySkin(pos, vNormal, objectNormal);
    vViewNormal = normalMatrix * objectNormal;

    float steppedTime = floor(time * 8.0);

    vLineUv = (rotation3d(normalize(uAxis), uAngle) * position).xy;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vViewPos = (modelViewMatrix * vec4(pos, 1.0)).xyz;
    vWorldY = (modelMatrix * vec4(pos, 1.0)).y;

    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment
#require(makeup.glsl)

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    // if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    // A panel edge in world space (default far below): the close-up ends at its frame.
    float clipNoise = max(texture2D(tNoise, gl_FragCoord.xy / 180.0).r, 0.05);
    if (vWorldY < uClipY || smoothstep(uClipY, uClipY + 0.5, vWorldY) < clipNoise) discard;
    // One chain or the other: parted (held at the nape) before the clasp closes, closed after.
    if (vChain > 0.25 && vChain < 0.75 && uClasp > 0.5) discard;
    if (vChain > 0.75 && uClasp < 0.5) discard;

    // trim pattern
    vec4 trimData = texture2D(tTrim, vUv);
    float trim = trimData.r;
    if (trimData.a < 0.3) discard;
    trim = laceInk(aastep(0.4, trim));

    float skinMask = step(0.55, vUv2.y);
    vec3 normal = normalize(vNormal);
    
    float steppedTime = floor(time * 8.0);
    
    // lines
    vec2 lineUv = vLineUv * uLinesTile;
    lineUv.x += steppedTime / uLinesTile * 0.2;
    float lines = texture2D(tLines, lineUv.yx).r * 2.0 - 1.0;

    // detail texture
    float atlas = inkLevel(texture2D(tAtlas, vUv2).r);
    atlas = aastep(0.55, atlas);

    // lighting
    vec3 lightDir = normalize(uLightDir);

    // float lighting = dot(normal, lightDir);
    float lighting = dot(normal, lightDir) * vAo;
    
    float lightMask = max(0.0, lighting);
    float terminatormid = aastep(0.3, lighting + lines * 0.3);
    // Voyage: her skin keeps to the light (a soft shadow only where it turns well away).
    float skinLit = skinLight(lighting, -0.12);
    float terminatorhigh = aastep(0.85, lighting + lines * 0.1 - 0.1);
    float terminatorbounce = 1.0 - aastep(-0.91, lighting - lines * 0.2);

    // reduce lines in areas of brightness
    float maskedLines = lines + lightMask;

    // break up lines with dots as light gets brighter
    float noise = texture2D(tNoise, lineUv * 2.0).r;
    maskedLines += noise * pow(lightMask, 2.0) * 3.0;
    maskedLines = aastep(0.01, maskedLines);
    // Prevent masked lines appearing in the eyes
    maskedLines += vEyeMask;

    // compositing;
    vec3 color = vec3(1.0);

    vec3 alt = uColor;

    // for DrinkPour scene: drink uvs are stored in very top right of uv2 map, 
    // so we can mask them without needing more attributes
    float drinkMask = min(step(0.98, vUv2.x), step(0.98, vUv2.y));
    drinkMask *= step(1.6, vPos.y);
    drinkMask *= 1.0 - step(1.725, vPos.y);

    // DrinkPourScene: affect clothes color
    drinkMask += 1.0 - min(1.0, step(-uColorScan * 1.5, vPos.y * 3.5 + noise * 0.1 + lines * 0.1 + sin(-steppedTime * 0.3 + vPos.x * 8.0 + uColorScan * 6.0) * 0.15) + skinMask);

    // Voyage: the pendant's colour runs down through the lace from the collar (uColorScan 0 -> 1).
    float wob = noise * 0.03 + lines * 0.03 + sin(-steppedTime * 0.3 + vPos.x * 8.0 + uColorScan * 6.0) * 0.04;
    float level = mix(1.76, -0.05, uColorScan);   // (starting clear of her straps, wobble and all)
    // (never the chain: its parted links are bound high, where her hands hold them behind her neck)
    float down = step(level, vPos.y + wob) * (1.0 - skinMask) * (1.0 - step(0.25, vChain));
    drinkMask = mix(drinkMask, down, uScanDown);

    color = mix(alt, vec3(1.0), skinMask);
    color = mix(color, vec3(1.0), skinMask);
    color = mix(color, uDrinkColor, drinkMask);
    // Voyage: her dress falls into a soft, light grey shade (white lace in shadow), a smooth gradient with only
    // a hint of the line texture (a hatched terminator striped the lace like a striped fabric).
    float dressLit = smoothstep(0.0, 0.5, lighting + lines * 0.06);
    color = mix(color * 0.86, color, dressLit);
    color = mix(color, skinShade(skinLit), skinMask * (1.0 - drinkMask));
    color = applyMakeup(color, tAtlas, vUv2, skinLit);
    color *= mix(vec3(1.0), skinContour(vViewNormal, vViewPos), skinMask);
    // Voyage: the hatching on her dress is a faint grey stroke (white lace), far lighter than the ink of her outline.
    color *= mix(min(mix(0.95, 1.0, maskedLines), 1.0), 1.0, skinMask);
    color *= trim;
    color *= atlas;
    color = mix(color, hairShade(smoothstep(-0.45, 0.85, lighting), trim, vUv), hairMask(vUv));

    // The pendant's pearl wakes in the tide's colour (uv2 in the far corner marks it).
    float pearl = step(0.995, min(vUv2.x, vUv2.y)) * uPearl;
    vec3 tide = uDrinkColor * mix(0.62, 1.0, terminatormid);
    tide = mix(tide, vec3(1.0), terminatorhigh * 0.8);
    color = mix(color, tide, pearl);

    if (!gl_FrontFacing) {
        color = vec3(0.0);
    }
    
    color = max(vec3(18.0 / 255.0), color);

    gl_FragColor = vec4(color, 1.0);

}