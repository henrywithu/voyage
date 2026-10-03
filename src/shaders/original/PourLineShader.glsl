#!ATTRIBUTES
attribute vec3 currpos;
attribute vec3 nextpos;
attribute vec3 prevpos;
attribute float random;

#!UNIFORMS
uniform sampler2D tNoise;
uniform float uPourStrength;
uniform float uClipHeight;
uniform float uClipAngle;
uniform float uThickness;
uniform vec3 uColor;
uniform vec3 uBasePlanePos;

#!VARYINGS
varying vec2 vUv;
varying vec2 vUv2;
varying vec3 vPos;
varying vec3 vTranslation;
varying vec2 vNorm;
varying float vRandom;
varying float vThickness;

#!SHADER: Vertex

void main() {
    vUv = uv;
    vUv2 = uv;
    vTranslation = modelMatrix[3].xyz;

    mat4 m = projectionMatrix * viewMatrix;
    vec4 projCurrPos = m * vec4(currpos, 1.0);
    vec4 projNextPos = m * vec4(nextpos, 1.0);
    vec4 projPrevPos = m * vec4(prevpos, 1.0);

    vec2 screenCurrPos = projCurrPos.xy / projCurrPos.w;
    vec2 screenNextPos = projNextPos.xy / projNextPos.w;
    vec2 screenPrevPos = projPrevPos.xy / projPrevPos.w;

    vec2 dir1 = normalize(screenNextPos - screenCurrPos);
    vec2 dir2 = normalize(screenCurrPos - screenPrevPos);
    vec2 tangent = normalize(dir1 + dir2);

    vec2 norm = normalize(vec2(-tangent.y, tangent.x));

    float aspect = resolution.y / resolution.x;
    norm.x *= aspect;

    float thickness = 0.75 * (vUv.y * 0.5 + 0.5) * smoothstep(-0.6, 0.2, vUv.y);
    vec4 pos = projCurrPos;

    thickness *= uThickness;

    pos.xy += norm.xy * ((uv.x - 0.5) * 2.0) * thickness;

    vPos = currpos;
    vRandom = random;
    vThickness = thickness;
    vNorm = norm;

    gl_Position = pos;
}

#!SHADER: Fragment
#require(transformUV.glsl)

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold - afwidth, threshold + afwidth, value);
}

void main() {
    vec2 clipPlane = vTranslation.xy + vec2(0.0, uClipHeight);
    if (vPos.y < clipPlane.y) discard;

    // clip along a given angle to stop the pour clipping out of the right side of the glass

    // NOTE(balraj): This logic is a little iffy and doesn't generalise to the left side of the glass also,
    // a less bad angled clip plane function would be better
    vec2 fragDirectionFromClipPlane = normalize(vPos.xy - clipPlane);
    vec2 clipPlaneDirectionFromOrigin = rotateUV(vec2(0.0, 1.0), uClipAngle, vec2(0.0));
    float isInsideGlass = 2.0 * dot(fragDirectionFromClipPlane, clipPlaneDirectionFromOrigin) - 1.0;
    if (isInsideGlass < .35 && vPos.x > 0.0) discard;

    vec2 uv = vUv * vec2(1.25, 1.0);

    float steppedTime = floor(time * 18.0) / 18.0;
    uv.y -= steppedTime * 1.75;
    uv.x += steppedTime * 0.1;

    // edge gradient
    float gradient = (1.0 - pow(abs(vUv.x - 0.5) * 2.0, 1.0)) - (1.0 - uPourStrength);

    // fade at start to hide seam
    // gradient *= smoothstep(0.0, 0.05, vUv.y);

    // scrolling noise texture
    float noise = texture2D(tNoise, uv).r;
    noise = pow(noise, 2.0);
    float value = gradient - noise * (1.0 - gradient) * 3.0;
    value = aastep(0.3, value);

    vec3 color = uColor;

    gl_FragColor = vec4(color, value);
}
