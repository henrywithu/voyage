
#!ATTRIBUTES
attribute vec3 color;
attribute vec2 uv2;

#!UNIFORMS
uniform float uDiscardTop;
uniform float uDiscardBottom;
uniform float uDisplacement;
uniform float uClasp;
uniform float uClipY;
uniform sampler2D tNoise;

#!VARYINGS
varying vec2 vUv;
varying vec3 vNormal;
varying float vNdcHeight;
varying float vChain;
varying float vWorldY;

#!SHADER: Vertex

#require(skinning.glsl)

void main() {
    vUv = uv;
    vNormal = normalize(normal);
    vChain = color.r;

    vec3 pos = position;
    applySkin(pos, vNormal);
    
    // float steppedTime = floor(time * 8.0);
    // float displacementStrength = 0.008 * uDisplacement;
    // vec3 displacement = vNormal * displacementStrength;
    // pos += displacement;

    // Voyage: on her face the shell sits a little behind the skin and draws finer, so it inks her face's
    // outline but not the folds inside it (the wings of her nose, the creases of her smile).
    float face = step(0.555, uv2.y) * step(uv2.x, 0.445);
    vec4 viewPos = modelViewMatrix * vec4(pos, 1.0);
    viewPos.xyz += normalize(viewPos.xyz) * 0.02 * face;
    vec4 projectionPos = projectionMatrix * viewPos;
    vec4 projectionNormal = projectionMatrix * modelViewMatrix * vec4(vNormal, 0.0);
    
    vec2 screenNormal = normalize(projectionNormal.xy);
    float hair = step(0.10, uv.y) * step(uv.y, 0.30);
    // Voyage: the jewellery's links are a few millimetres across; a full-width outline round each would
    // merge them into a black band wherever she is small on screen.
    float chain = step(0.25, color.r);
    projectionPos.xy += screenNormal * uDisplacement * projectionPos.w * 0.004 * mix(1.0, 0.65, face) * mix(1.0, 0.55, hair) * mix(1.0, 0.25, chain);

    gl_Position = projectionPos;
    vWorldY = (modelMatrix * vec4(pos, 1.0)).y;

    // gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment

void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;
    // A panel edge in world space (default far below): the close-up ends at its frame.
    float clipNoise = max(texture2D(tNoise, gl_FragCoord.xy / 180.0).r, 0.05);
    if (vWorldY < uClipY || smoothstep(uClipY, uClipY + 0.5, vWorldY) < clipNoise) discard;
    if (vChain > 0.25 && vChain < 0.75 && uClasp > 0.5) discard;
    if (vChain > 0.75 && uClasp < 0.5) discard;

    // Voyage: her hair's outline is a dark brown line, not ink.
    float hair = step(0.10, vUv.y) * step(vUv.y, 0.30);
    vec3 color = mix(vec3(18.0 / 255.0), vec3(0.075, 0.05, 0.042), hair);

    gl_FragColor = vec4(color, 1.0);
}