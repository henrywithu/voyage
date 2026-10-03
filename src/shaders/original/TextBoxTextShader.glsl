#!ATTRIBUTES
attribute vec3 animation;
attribute vec3 karaoke;

#!UNIFORMS
uniform sampler2D tMap;
uniform vec3 uColor;
uniform vec3 uColorHighlight;
uniform float uScale;
uniform float uAlpha;
uniform vec3 uCount;
uniform sampler2D uTranslate;
uniform sampler2D uOpacity;
uniform vec4 uParentBounds;
uniform float uKaraokeTime;
uniform float uKaraokeInfluence;

#!VARYINGS
varying vec2 vUv;
varying float vAlpha;
varying vec3 vPos;
varying float vOpacity;
varying float vGlyphIndex;
varying float vIndex;
varying float vTranslate;
varying vec4 vWorldPos;
varying vec3 vKaraoke;

#!SHADER: Vertex
#require(range.glsl)

void main() {
    vUv = uv;
    vGlyphIndex = animation.z;
    vKaraoke = karaoke;

    float index01 = vGlyphIndex / uCount.z;

    float wordIndex = animation.y;

    vWorldPos = modelMatrix * vec4(position, 1.0);

    vec3 pos = position;
    float translate = texture2D(uTranslate, vec2(index01, 0.0)).r;
    pos.x -= translate * 0.4;

    vOpacity = texture2D(uOpacity, vec2(index01, 0.0)).r;

    vTranslate = translate;

    vIndex = index01;
    vPos = pos;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

#!SHADER: Fragment
#require(msdf.glsl)
#require(range.glsl)


void main() {
    if (vPos.x < -0.1) discard; // might need to update this value for mobile

    float alpha = msdf(tMap, vUv);

    float highlight = 0.0;
    float padding = 0.4;

    if (uKaraokeTime < 0.01) {
        padding = 0.0;
    }

    highlight = smoothstep(vKaraoke.x - padding, vKaraoke.x, uKaraokeTime);
    highlight *= 1.0 - smoothstep(vKaraoke.y, vKaraoke.y + padding, uKaraokeTime);
    highlight *= uKaraokeInfluence;

    gl_FragColor.rgb = mix(uColor, uColorHighlight, highlight);
    gl_FragColor.a = alpha * uAlpha;
    gl_FragColor.a *= 1.0 - vOpacity;
}
