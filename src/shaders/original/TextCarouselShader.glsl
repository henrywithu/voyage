#!ATTRIBUTES
attribute float rowIndex;
attribute float quadIndex;
attribute float rowCount;

#!UNIFORMS
uniform sampler2D tMSDF;
// uniform float uDissolveOut;
uniform float uTranslateIn;
uniform vec3 uColor;
uniform vec2 uBoundsX;
uniform float uDirection;
uniform float uFixed;
uniform mat4 uFixedCameraMatrix;

#!VARYINGS
varying vec3 vNormal;
varying vec2 vUv;

varying float vRowIndex;
varying float vQuadIndex;
varying float vRowCount;
varying vec3 vWorldPos;
varying float vT;

#!SHADER: TextCarouselShader.vs
#require(range.glsl)
#require(eases.glsl)

void main() {
    vec3 pos = position;
    vRowIndex = rowIndex;
    vQuadIndex = quadIndex;
    vRowCount = rowCount;
    vUv = uv;
    vNormal = normalMatrix * normal;

    float quadIndex = vQuadIndex / vRowCount;

    float rowTime = rowIndex / 3.;
    float staggerAmount = .1;

    if(abs(uDirection) < 0.01) {
        float distoffset = 0.5;
        float anim = (quadIndex * 2.0 - 1.0) * distoffset;
        float delay = rowTime * staggerAmount;
        delay = clamp((uTranslateIn - delay) / (1.0 - staggerAmount), 0.0, 1.0);
        delay = smoothstep(0., 1.0, delay);
        delay = expoOut(delay);

        pos.x += (1.0 - delay) * anim;
        vT = delay;
    } else {
        float dirIn = sign(uDirection);

        float edgeIndexIn = (dirIn > 0.0) ? (vRowCount - vQuadIndex) : vQuadIndex;

        float rowDen = max(vRowCount, 1.0);
        float startIn = (1.0 - (edgeIndexIn) / rowDen) * staggerAmount;

        float tIn = clamp((uTranslateIn - startIn) / (1.0 - staggerAmount), 0.0, 1.0);
        tIn = smoothstep(0., 1.0, tIn);
        vT = cubicIn(tIn);
        tIn = expoIn(tIn);

        pos.x += (1.0 - tIn) * (dirIn * rowIndex);
        // vT = tIn;
        // vOT = expoIn(tIn * 4.0);
    }

    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;

    if(uFixed > 0.5) {
        // pos.y += 0.1;
        gl_Position = projectionMatrix * uFixedCameraMatrix * modelMatrix * vec4(pos, 1.0);
    } else {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
}

#!SHADER: TextCarouselShader.fs

#require(aastep.glsl)
#require(eases.glsl)
#require(msdf.glsl)

void main() {
    // float quadIndex = vQuadIndex / vRowCount;
    // float dist = texture2D(tSDF, vUv).r;
    // float opacity = texture2D(tMap, vUv).r;
    // dist = pow(dist, 1.0 + (3. * (uDissolveOut)));
    // float signedDist = aastep(0.4, dist);
    // if(vWorldPos.x < uBoundsX.x || vWorldPos.x > uBoundsX.y)
    //     discard;
    // gl_FragColor = vec4(uColor, signedDist * aastep(0.5, opacity) * (1.0 - uDissolveOut));

    // if(vWorldPos.x < uBoundsX.x || vWorldPos.x > uBoundsX.y) discard;

    vec3 tex = texture2D(tMSDF, vUv).rgb;
    float sdf = max(min(tex.r, tex.g), min(max(tex.r, tex.g), tex.b)) - 0.5;
    float d = fwidth(sdf);
    float padding = 1.0 - vT;
    float alpha = smoothstep(-d + padding, d + padding, sdf);

    gl_FragColor = vec4(uColor, alpha * vT);
}