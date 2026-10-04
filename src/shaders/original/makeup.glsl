// Voyage: Chaewon's make-up, from the face atlas's spare channels (green: lips, blue: cheeks; white = none).
// `lit` is 1 on the lit side, 0 in shadow: the coral deepens in shadow, the blush only warms the paper.
vec3 applyMakeup(vec3 color, sampler2D atlasMap, vec2 atlasUv, float lit) {
    vec3 a = texture2D(atlasMap, atlasUv).rgb;
    float lip = 1.0 - a.g;
    float cheek = 1.0 - a.b;
    vec3 coral = mix(vec3(0.80, 0.46, 0.42), vec3(0.98, 0.66, 0.58), lit);
    color = mix(color, color * coral, lip);
    color = mix(color, color * vec3(1.0, 0.86, 0.84), cheek * 0.5);
    return color;
}

// Voyage: an ink contour where her skin turns edge-on to the eye (jaw, chin, the side of the nose), drawn
// inside the silhouette the outline pass already inks.
float skinContour(vec3 viewNormal, vec3 viewPos) {
    float facing = abs(dot(normalize(viewNormal), normalize(-viewPos)));
    float w = fwidth(facing);
    return smoothstep(0.3 - w, 0.3 + w, facing);
}
