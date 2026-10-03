#!ATTRIBUTES

#!UNIFORMS
uniform vec3 uLightColor;
uniform sampler2D tRefraction;
uniform sampler2D tLiquid;
uniform float uOpacity;
uniform sampler2D tBlueNoise;

#!VARYINGS
varying vec3 vWorldPosition;
varying vec3 vPosition;
#!SHADER: Vertex
#require(glasspbr.vs)

void main() {
    vec3 pos = position;
    setupPBR(position);

    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vPosition = position;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

#!SHADER: Fragment
#require(glasspbr.fs)
#require(rgbshift.fs)

vec2 pinch(vec2 uv, float strength) {
    vec2 st = uv - 0.5;
    float t = atan(st.x, st.y);
    float r = sqrt(dot(st, st));
    r *= 1.0 + strength * (r * r);

    return 0.5 + r * vec2(sin(t), cos(t));
}


void main() {
    // PBR Config
		// this is the default config that can be tweaked
    PBRConfig baseConfig;
    baseConfig.overrideMRO = true;
    baseConfig.mro = vec3(0.0, 0.0, 1.0);
    baseConfig.color = vec3(1.0, 1.0, 1.0);
    
    vec2 screenUvRefraction = (gl_FragCoord.xy / resolution.xy);
    vec2 screenUvLiquid = (gl_FragCoord.xy / resolution.xy);

    // screenUvRefraction = pinch(screenUvRefraction, -1.1);

    vec3 noise = texture2D(tBlueNoise, vPosition.xy * 1.6).rgb;

    baseConfig.mro.r += noise.b * 0.01;
    baseConfig.mro.g += noise.r * .1;
    // baseConfig.mro.b += noise.g * 1.0;

    vec3 refractedDir = refract(-normalize(vV), normalize(vWorldNormal), 1.0 / 1.2);
    // screenUvRefraction += refractedDir.xy * 0.01;
    // vec3 refraction = texture2D(tRefraction, screenUvRefraction).rgb;

    float split = 0.0003;
    // split += smoothstep(1.4, 1.8, vPosition.y) * 0.001;
    // split += smoothstep(1.4, 1.8, vPosition.y) * 0.0003;

    screenUvRefraction += 0.5;
    float up = 1.0 - smoothstep(1.4, 1.9, vPosition.y);
    screenUvRefraction += (refractedDir.xy * 0.01) * up;
    // screenUvRefraction *= 1.0 - (length(vPosition.xz + vec2(0.5)) * 0.01) * up;
    // screenUvRefraction *= 1.0 - noise.g * 0.002;
    screenUvRefraction -= 0.5;

    vec3 refraction = 1.0 - getRGB(tRefraction, screenUvRefraction, sin(time * 0.2), split).rgb;

    // baseConfig.color = refraction;

    float vDotN = dot(-normalize(vV), normalize(vWorldNormal));
    float fresnel = clamp(SchlickFresnel(vDotN), 0.0, 1.0);

    vec3 pbr = getPBR(vec3(1.0, 1.0, 1.0) * 5.0 * refraction, baseConfig).rgb;

    // vec3 pbrNoRefraction = getPBR(vec3(1.0, 1.0, 1.0) * 5.0, baseConfig).rgb;

   
    vec3 liquid = texture2D(tLiquid, screenUvLiquid).rgb;

    vec3 compLiquidAndRefraction = mix(pbr, liquid, step(0.5, length(liquid)));
    // compLiquidAndRefraction = pbr;

    float alpha = 1.0;

    if (gl_FrontFacing) {
        float fade = smoothstep(1.6, 2.3, vPosition.y);
        fade *= 1.0 - smoothstep(0.0, 1.0, vPosition.z);
        alpha *= 1.0 - (fade * 0.9);
        // compLiquidAndRefraction = vec3(fade);
    }

    // alpha -= noise.g * 0.2;
    // compLiquidAndRefraction -= smoothstep(-0.0, 0.8, vPosition.z) * 0.4;

    // compLiquidAndRefraction += vec3(noise) * 0.1;

    gl_FragColor = vec4(compLiquidAndRefraction, alpha);

}