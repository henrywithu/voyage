
#!ATTRIBUTES

#!UNIFORMS
uniform vec2 uDiscard;
uniform float uDisplacement;
uniform vec4 uPortalPlane;
uniform float uPortalFeather;

#!VARYINGS
varying vec2 vUv;
varying vec3 vNormal;
varying float vNdcHeight;
varying vec3 vViewDir;
varying vec3 vWorldPos;
varying float vDepth;

#!SHADER: Vertex

#require(skinning.glsl)

void main() {
    vUv = uv;
    vNormal = normalize(normal);

    vec3 pos = position;
    applySkin(pos, vNormal);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vec4 projectionPos = projectionMatrix * mvPosition;
    vec4 projectionNormal = projectionMatrix * modelViewMatrix * vec4(vNormal, 0.0);

    vec2 screenNormal = normalize(projectionNormal.xy);
    projectionPos.xy += screenNormal * uDisplacement * projectionPos.w * 0.004;

    gl_Position = projectionPos;

    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);

    vec3 worldPos = (modelMatrix * vec4(pos, 1.0)).xyz;

    vViewDir = -mvPosition.xyz;
    vWorldPos = worldPos;

    vDepth = dot(worldPos, uPortalPlane.xyz) + uPortalPlane.w;
}

#!SHADER: Fragment
#require(range.glsl)

bool isClipping(vec2 vUv, vec3 vWorldPos) {
    vec2 uvRepeat = fract(vUv * 1000.0) - 0.5;
    float radius = smoothstep(1.25, .9, length(cameraPosition - vWorldPos));

    float circle = 1.0 - smoothstep(radius - radius * 0.1, radius, length(uvRepeat));
    return circle > 0.5;
}

void main() {
    if(isClipping(vViewDir.xz * 0.07, vWorldPos))
        discard;

    if(uDiscard.y - vNdcHeight > 0.0 || uDiscard.x - vNdcHeight < 0.0)
        discard;

    float depthMask = smoothstep(-uPortalFeather, uPortalFeather, vDepth);
    float fringe = 1.0 - smoothstep(0.0, uPortalFeather, abs(vDepth));

    vec3 color = vec3(18.0 / 255.0);

    float distBeforePortal = smoothstep(1., uPortalFeather , vDepth);

    #drawbuffer HandInfo gl_FragColor = vec4(distBeforePortal, 1.0 - depthMask, fringe, 1.0);
    #drawbuffer Color gl_FragColor = vec4(color, depthMask);
}