vec2 frag_coord(vec4 glPos) {
    vec2 ndc = (glPos.xyz / glPos.w).xy;
    return ndc * 0.5 + 0.5;
}

vec2 getProjection(vec3 pos, mat4 projMatrix) {
    vec4 mvpPos = projMatrix * vec4(pos, 1.0);
    return frag_coord(mvpPos);
}

void applyNormal(inout vec3 pos, mat4 projNormalMatrix, mat4 modelMatrix) {
    vec4 viewSpace = inverse(projNormalMatrix) * vec4(pos.x, pos.y, 0.0, 0.0);
    vec4 worldSpace = inverse(modelMatrix) * vec4(viewSpace.xyz, 0.0);
    pos = worldSpace.xyz;
}