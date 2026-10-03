#!ATTRIBUTES
attribute float angle;
attribute vec2 tuv;
attribute float cIndex;
attribute float cNumber;

#!UNIFORMS
uniform sampler2D tPos;
uniform sampler2D tLife;
uniform float radialSegments;
uniform float thickness;
uniform float taper;
uniform float segmentSpacing;

#!VARYINGS
varying float vLength;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vPos;
varying vec2 vUv;
varying vec2 vUv2;
varying float vIndex;
varying float vLife;
varying vec3 vDiscard;
varying float vPosIndex;

#!SHADER: Vertex

//neutrinoparams

#require(ProtonTubesUniforms.fs)
#require(range.glsl)
#require(conditionals.glsl)
#require(simplenoise.glsl)

void main() {
    float headIndex = getIndex(cNumber, 0.0, lineSegments);
    vec2 iuv = getUVFromIndex(headIndex, textureSize);
    vUv2 = iuv;
    float life = texture2D(tLife, iuv).x;
    vLife = life;

    float scale = 1.0;
    //neutrinovs
    vec2 volume = vec2(thickness * 0.065 * scale);

    vec3 transformed;
    vec3 objectNormal;

    //extrude tube
    float posIndex = getIndex(cNumber, cIndex, lineSegments);
    float nextIndex = getIndex(cNumber, cIndex + 1.0, lineSegments);

    vLength = cIndex / (lineSegments - 2.0);
    vIndex = cIndex;

    vec3 current = texture2D(tPos, getUVFromIndex(posIndex, textureSize)).xyz;
    vec3 next = texture2D(tPos, getUVFromIndex(nextIndex, textureSize)).xyz;

    if(distance(current, next) > 0.5) {
        return;
    }

    vDiscard = next - current;
    vec3 T = normalize((next - current));
    vec3 B = normalize(cross(T, next + current));
    vec3 N = -normalize(cross(B, T));

    float tubeAngle = angle;
    float circX = cos(tubeAngle);
    float circY = sin(tubeAngle);

    volume *= mix(crange(vLength, 1.0 - taper, 1.0, 1.0, 0.0) * crange(vLength, 0.0, taper, 0.0, 1.0), 1.0, when_eq(taper, 0.0));

    volume *= smoothstep(0.0, 0.1, 1.0 - life) * smoothstep(1.0, 0.9, 1.0 - life);

    objectNormal.xyz = normalize(B * circX + N * circY);
    transformed.xyz = current + B * volume.x * circX + N * volume.y * circY;
    //extrude tube
    transformed += cnoise(vec3(posIndex * 0.05)) * 0.005;

    vec3 transformedNormal = normalMatrix * objectNormal;

    vec3 pos = transformed;
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    vViewPosition = -mvPosition.xyz;
    vPos = pos;
    vPosIndex = posIndex;
    gl_Position = projectionMatrix * mvPosition;

    //neutrinovspost

    vNormal = normalize(transformedNormal);
    vUv = tuv.yx;
}

#!SHADER: Fragment

#require(simplenoise.glsl)
void main() {


    float noise = cnoise(vec3((vPosIndex + 1.0) * 0.1));

    float gaps = step(0.01, sin(noise * 0.5));

    // if(gaps > 0.0) {
    //     discard;
    // }

    gl_FragColor = vec4(vec3(1.0), gaps);
    
}   