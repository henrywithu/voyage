varying vec2 vUv;
uniform sampler2D uTarget;
uniform sampler2D uSplatTexture;
uniform float isSplatTexture;
uniform float isSplatSpeed;
uniform float aspectRatio;
uniform vec3 color;
uniform vec3 bgColor;
uniform vec2 point;
uniform vec2 prevPoint;
uniform float radius;
uniform float canRender;
uniform float uAdd;

float blendScreen(float base, float blend) {
    return 1.0-((1.0-base)*(1.0-blend));
}

vec3 blendScreen(vec3 base, vec3 blend) {
    return vec3(blendScreen(base.r, blend.r), blendScreen(base.g, blend.g), blendScreen(base.b, blend.b));
}

float l(vec2 uv, vec2 point1, vec2 point2) {
    vec2 pa = uv - point1, ba = point2 - point1;
    pa.x *= aspectRatio;
    ba.x *= aspectRatio;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float cubicOut(float t) {
    float f = t - 1.0;
    return f * f * f + 1.0;
}

void main () {
    vec3 splat = vec3(0.);

    if(isSplatTexture > 0.5) {
        vec2 st = vUv;
        st = 2.*st -1.;
        st.x *= aspectRatio * 0.5625;
        st = 0.5 * st + 0.5;

        if(isSplatSpeed > 0.5) {
            splat = vec3( texture2D(uSplatTexture, st).xy, 1.);
        } else {
            splat = texture2D(uSplatTexture, st).z * color;
        }
    } else {
        splat = (1.0 - cubicOut(clamp(l(vUv, prevPoint.xy, point.xy) / radius, 0.0, 1.0))) * color;
    }

    
    vec3 base = texture2D(uTarget, vUv).xyz;
    base *= canRender;

    vec3 outColor = mix(blendScreen(base, splat), base + splat, uAdd);
    gl_FragColor = vec4(outColor, 1.0);
}