#!ATTRIBUTES
attribute float rowIndex;
attribute float quadIndex;
attribute float rowCount;

#!UNIFORMS
uniform sampler2D tMSDF;
uniform float uTranslateIn;
uniform vec3 uColor;
uniform vec2 uBoundsX;
uniform mat4 uFixedCameraMatrix;
uniform float uFixed;
uniform float uWhiteBits;
uniform float uRowCount;
uniform float uOffset;
uniform float uStaggerAmount;

#!VARYINGS
varying vec3 vNormal;
varying vec2 vUv;

varying float vRowIndex;
varying float vQuadIndex;
varying float vRowCount;
varying vec3 vWorldPos;
varying float vT;
varying float vOT;

#!SHADER: TextShaderMasked.vs
#require(range.glsl)
#require(eases.glsl)
#require(transformUV.glsl)

void main() {
    vec3 pos = position;
    vRowIndex = rowIndex;
    vQuadIndex = quadIndex;
    vRowCount = rowCount;
    vUv = uv;
    vNormal = normalMatrix * normal;

    float quadIndex = vQuadIndex / vRowCount;

    float offsetAmount = uOffset;

    offsetAmount *= (quadIndex * 2.0 - 1.0);

    float staggerAmount = uStaggerAmount;
    float charTime = (rowIndex / uRowCount) * staggerAmount;
    float t = clamp((uTranslateIn - charTime) / (1.0 - staggerAmount), 0.0, 1.0);
    t = smoothstep(0.0, 1.0, t);
    vT = expoOut(t * 4.0);
    vOT = expoOut(t * 4.0);
    t = expoOut(t);


    pos.x += (1.0 - t) * offsetAmount;

    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;

    if (uFixed > 0.5) {
        pos.y += 0.15;
        gl_Position = projectionMatrix * uFixedCameraMatrix * modelMatrix * vec4(pos, 1.0);
    } else {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
}


#!SHADER: TextShaderMasked.fs

#require(aastep.glsl)
#require(eases.glsl)
#require(msdf.glsl)

void main() {
    if(vWorldPos.x < uBoundsX.x || vWorldPos.x > uBoundsX.y) discard;
        vec3 tex = texture2D(tMSDF, vUv).rgb;
    float sdf = max(min(tex.r, tex.g), min(max(tex.r, tex.g), tex.b)) - 0.5;
    float d = fwidth(sdf);
    float padding = 1.0 - vT;
    float alpha = smoothstep(-d + padding, d + padding, sdf);
    gl_FragColor = vec4(uColor, alpha * vOT);
}