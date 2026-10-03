#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;
uniform vec3 uPoint1;
uniform vec3 uPoint2;
uniform vec3 uPoint3;
uniform vec3 uPoint4;

#!VARYINGS
varying vec2 vUv;
varying vec3 vNdc;

#!SHADER: Vertex
void main() {
    vUv = uv;

    vec3 pos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    vNdc = gl_Position.xyz / gl_Position.w;
}

#!SHADER: Fragment
    float aastep(float threshold, float value) {
        float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
        return smoothstep(threshold-afwidth, threshold+afwidth, value);
    }

    float isLeft( vec3 P0, vec3 P1, vec3 P2 ) {
        return ( (P1.x - P0.x) * (P2.y - P0.y) - (P2.x - P0.x) * (P1.y - P0.y) );
    }

void main() {
    // check if ndc point is inside rectangle
    vec3 pos1 = uPoint1;
    vec3 pos2 = uPoint2;
    vec3 pos3 = uPoint3;
    vec3 pos4 = uPoint4;

    float grad1 = isLeft(pos1, pos2, vNdc);
    float grad2 = isLeft(pos2, pos3, vNdc);
    float grad3 = isLeft(pos3, pos4, vNdc);
    float grad4 = isLeft(pos4, pos1, vNdc);

    // make sdf from distances
    float sdfx = max(grad2, grad4);
    float sdfy = max(grad1, grad3);
    float sdf = max(sdfx, sdfy);

    if (sdf > 0.0025) discard;

    vec3 color = texture2D(tMap, vUv).rgb;

    // if (sdf > 0.0025) color = vec3(1.0, 0.0, 0.0);

    gl_FragColor = vec4(color, 1.0);
}