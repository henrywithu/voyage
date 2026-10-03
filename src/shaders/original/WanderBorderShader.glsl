#!ATTRIBUTES
attribute float inner;
attribute float outer;
attribute float dist;

#!UNIFORMS
uniform sampler2D tMap;

uniform vec3 uCloudColor;
uniform vec3 uSkyColor;

uniform float uPadX;
uniform float uPadY;
uniform float uSceneHeightWorld;
uniform float uScreenHeightWorld;
uniform float uFixedWidth;
uniform float uScroll;
uniform float uProgress;
uniform float uMaxWidth;
uniform float uDPR;

#!VARYINGS
varying vec2 vUv;
varying vec3 vPos;
varying float vDist;
varying float vInner;
varying float vOuter;

#!SHADER: Vertex

float qinticInOut(float t) {
  return t < 0.5
    ? +16.0 * pow(t, 5.0)
    : -0.5 * pow(2.0 * t - 2.0, 5.0) + 1.0;
}

float exponentialInOut(float t) {
  return t == 0.0 || t == 1.0
    ? t
    : t < 0.5
      ? +0.5 * pow(2.0, (20.0 * t) - 10.0)
      : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;
}

float exponentialIn(float t) {
  return t == 0.0 ? t : pow(2.0, 10.0 * (t - 1.0));
}

float exponentialOut(float t) {
  return t == 1.0 ? t : 1.0 - pow(2.0, -10.0 * t);
}

void main() {
    vUv = uv;
    vInner = inner;
    vOuter = outer;
    vDist = dist;

    // use scroll or time, whichever value is larger
    float easedScroll = exponentialOut(-uScroll * 2.0 / uSceneHeightWorld);
    float progress = min(1.0, max(uProgress, exponentialIn(min(1.0, easedScroll))));

    vec3 pos = position;
    float aspect = resolution.x / resolution.y;

    vUv.x *= aspect;

    float mask = 1.0 - outer;

    // animate in
    mask *= progress;

    float halfWidth = uScreenHeightWorld * aspect * 0.5;
    float halfHeight = uScreenHeightWorld * 0.5;

    // clamp width to max pixel width
    float resx = resolution.x / uDPR;
    float halfWidthClamped = uScreenHeightWorld * (uMaxWidth / resx) * 0.5 * aspect;
    float blend = resx < uMaxWidth ? 1.0 : outer;
    float width = mix(halfWidthClamped, halfWidth, blend);

    float padx = halfWidth * uPadX;
    float pady = halfHeight * uPadY;
    
    float outlineThickness = 0.1;

    vec3 startPos = position;

    // fit border to world space screen size, with padding
    // if (uFixedWidth > 0.5) {
    //     padx = halfWidth - halfWidth * uPadX;
    // }

    if (pos.x < 0.0) {
        pos.x = -width;
        pos.x += mask * padx;

        startPos.x = -1.0;
    }

    if (pos.x > 0.0) {
        pos.x = width;
        pos.x -= mask * padx;

        startPos.x = 1.0;
    }

    if (pos.y > 0.0) {
        pos.y = halfHeight;
        pos.y -= mask * pady;

        startPos.y = 1.0;
    }

    if (pos.y < 0.0) {
        pos.y = -halfHeight;
        pos.y += mask * pady;

        startPos.y = -1.0;
    }

    // extend top for border of first scene, so you don't see the edge when camera moves
    // additional verts were exported just past the 1.0 range for this purpose
    pos.y += step(1.01, position.y) * 0.2;

    // extend bottom of border for first scene
    pos.y -= (1.0 - step(-1.01, position.y)) * 0.2;

    // extend outer edges
    if (abs(position.x) > 1.01) {
        pos.x += outer * pos.x * 0.15;
    }

    // border of this scene moves with scroll and then halts at the border of the next scene
    pos.y += uScreenHeightWorld;
    pos.y -= min(-uScroll, uSceneHeightWorld - uScreenHeightWorld);
    pos.y -= uScreenHeightWorld * 0.25;

    // position the geometry at the border of the screen
    vec2 norm = vec2(0.0);
    norm.x -= sign(position.x) / aspect;
    norm.y -= sign(position.y);

    // extrude outline in screen space
    vec4 projPos = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    projPos.xy += norm * inner * outlineThickness;

    vec4 finalPos = mix(vec4(startPos, 1.0), projPos, min(1.0, progress));

    gl_Position = finalPos;
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

float exponentialInOut(float t) {
  return t == 0.0 || t == 1.0
    ? t
    : t < 0.5
      ? +0.5 * pow(2.0, (20.0 * t) - 10.0)
      : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;
}

float exponentialOut(float t) {
  return t == 1.0 ? t : 1.0 - pow(2.0, -10.0 * t);
}

float exponentialIn(float t) {
  return t == 0.0 ? t : pow(2.0, 10.0 * (t - 1.0));
}

void main() {
    vec2 screenUv = gl_FragCoord.xy / resolution.xy;
    float fluidMask = smoothstep(0.0, 1.0, texture2D(tFluidMask, screenUv).r);
    // fluidMask = faastep(0.5, fluidMask);

    float steppedTime = floor(time * 8.0) / 8.0 * 0.5;
    float noise = texture2D(tMap, vUv * 6.0 + vec2(steppedTime * 0.23, steppedTime)).r;

    // use scroll or time, whichever value is larger
    float easedScroll = exponentialOut(-uScroll * 2.0 / uSceneHeightWorld);
    float progress = 1.0 - min(1.0, max(uProgress, exponentialIn(min(1.0, easedScroll))));

    float inner = vInner;

    float outer = smoothstep(0.0, 0.15, vOuter);

    float alpha = 1.0;
    alpha *= (1.0 - inner);
    alpha *= 1.0 - fluidMask * (1.0 - outer);
    alpha -= noise * 0.6;

    float outline = aastep(0.4, alpha);
    vec3 color = vec3(max(18.0 / 255.0, outline));

    color = mix(vec3(18.0 / 255.0), color, 1.0);

    alpha = aastep(0.0, alpha);

    // alpha = 1.0;
    // color = vec3(vOuter, 1.0, 1.0);

    gl_FragColor = vec4(color, alpha);
}