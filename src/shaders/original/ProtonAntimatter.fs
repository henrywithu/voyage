uniform sampler2D tOrigin;
uniform sampler2D tAttribs;
uniform float uMaxCount;
//uniforms

#require(range.glsl)
//requires

void main() {
    vec2 uv = vUv;
    #test !window.Metal
    uv = gl_FragCoord.xy / fSize;
    #endtest

    vec3 origin = texture2D(tOrigin, uv).xyz;
    vec4 inputData = texture2D(tInput, uv);
    vec3 pos = inputData.xyz;
    vec4 random = texture2D(tAttribs, uv);
    float data = inputData.w;

    if (vUv.x + vUv.y * fSize > uMaxCount) {
        gl_FragColor = vec4(9999.0);
        return;
    }

    //code

    gl_FragColor = vec4(pos, data);
}