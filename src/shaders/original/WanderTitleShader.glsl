#!ATTRIBUTES
attribute float charindex;
attribute float charsperline;
attribute float row;

#!UNIFORMS
uniform sampler2D tOpacity;
uniform sampler2D tLines;
uniform sampler2D tDistance;
uniform sampler2D tNoise;
uniform float uScreenHeightWorld;
uniform float uProgress;
uniform float uMaxWidth;
uniform float uDPR;
uniform float uScale;

#!VARYINGS
varying vec2 vUv;
varying vec3 vPos;
varying float vOffset;
varying float vProgress;
varying float vProgress2;

#!SHADER: Vertex

float qinticInOut(float t) {
    return t < 0.5
        ? + 16.0 * pow(t, 5.0)
        : -0.5 * pow(2.0 * t - 2.0, 5.0) + 1.0;
}

float quarticInOut(float t) {
    return t < 0.5
        ? +8.0 * pow(t, 4.0)
        : -8.0 * pow(t - 1.0, 4.0) + 1.0;
}

float exponentialInOut(float t) {
    return t == 0.0 || t == 1.0
        ? t
        : t < 0.5
        ? +0.5 * pow(2.0, (20.0 * t) - 10.0)
        : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;
}

float cubicInOut(float t) {
    return t < 0.5
        ? 4.0 * t * t * t
        : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0;
}

void main() {
    float t = uProgress;

    // temp while testing
    // t = fract(t);

    // row time offset
    float rowOffset = row * 0.5;

    // individual character time offset
    vOffset = abs((charindex + 1.0) / charsperline - 0.5) * 2.0;
    vOffset *= 0.5;
    vOffset += rowOffset * 0.5;

    // is char on left or right
    float charsign = sign(charindex - charsperline * 0.5);

    // specific timing for top row ('the')
    if (row < 0.1) {
        vOffset = abs(charindex - 1.0) * 0.1 + 0.35;
        charsign = sign(charindex - 1.0);
    }

    // progress value with no character offset
    float flatProgress = clamp((t - 0.25) * 0.7, 0.0, 1.0);

    // animation with character offset
    float overlap = 0.5;
    vProgress = clamp((t) * (1.0 + overlap) - vOffset * overlap, 0.0, 1.0);

    float rowDelay = 0.125;

    if (row < 0.1) {
        rowDelay = 0.32;
    }

    // animation with row offset
    vProgress2 = clamp((t - rowDelay) * (1.0 + overlap) - rowOffset * overlap * 0.6, 0.0, 1.0);

    // move characters from outwards, in
    vec3 pos = position;
    pos *= uScale;

    float xDistance = 0.25;
    pos.x += exponentialInOut(1.0 - vProgress) * xDistance * charsign;

    // animate rows vertically
    float yDistance = row < 0.1 ? - 0.1 : 0.15;
    pos.y -= exponentialInOut(1.0 - vProgress2) * yDistance;

    // animate entire block of text on z axis
    pos.z += ((1.0 - pow(1.0 - flatProgress, 4.0)));

    // scale to fit screen
    // float aspect = resolution.x / resolution.y;
    // float width = uScreenHeightWorld * aspect;
    // float resx = resolution.x / uDPR;
    // float widthClamped = uScreenHeightWorld * (uMaxWidth / resx) * aspect;
    // float blend = resx < uMaxWidth ? 1.0 : 0.0;
    // width = mix(widthClamped, width, blend);
    // float padPercent = resx < 760.0 ? 0.25 : 0.45;
    // pos *= width * (0.5 - padPercent * 0.5);
    // pos *= uScale;


    vUv = uv;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

#!SHADER: Fragment
#require(mousefluid.fs)

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

float cubicInOut(float t) {
    return t < 0.5
        ? 4.0 * t * t * t
        : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0;
}

float quarticInOut(float t) {
    return t < 0.5
        ? +8.0 * pow(t, 4.0)
        : -8.0 * pow(t - 1.0, 4.0) + 1.0;
}

float exponentialOut(float t) {
  return t == 1.0 ? t : 1.0 - pow(2.0, -10.0 * t);
}

void main() {
    vec2 uv = vUv;
    float fluidMask = getFluidMask();

    float steppedTime = floor(time * 6.0) / 6.0;
    vec2 displacement = texture2D(tNoise, vUv * 3.0 + steppedTime).rg * 2.0 - 1.0;
    uv += displacement * 0.00125;

    vec3 color = vec3(1.0);

    float opacity = texture2D(tOpacity, uv).r;
    float dist = texture2D(tDistance, uv).r;

    float ease = clamp(1.0 - cubicInOut(vProgress), 0.0, 1.0);
    float maskin = smoothstep(ease - 0.1, ease + 0.1, dist - 0.1);
    float mask = aastep(0.5, opacity);

    mask *= maskin;


    float alpha = mask;

    // float lines = texture2D(tLines, vUv * 2.0).r;
    // float grad = 1.0 - min(1.0, length(vPos.xy) * 0.8);
    // vec3 grey = vec3(58.0 / 255.0);
    // float animatedMask = aastep(1.0 - exponentialOut(vProgress * 1.5 - 0.5), grad - lines * 0.05);
    // color = mix(grey, vec3(1.0), animatedMask);

    color -= fluidMask * 0.1;

    gl_FragColor = vec4(color, alpha);
}