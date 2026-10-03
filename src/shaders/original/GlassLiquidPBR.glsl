#!ATTRIBUTES

#!UNIFORMS
uniform vec3 uColor;
uniform vec3 uColorDark;
uniform vec3 uColor2;
uniform vec3 uColor2Dark;
uniform float uTransition;
uniform sampler2D tRefraction;
uniform sampler2D tNoise;
uniform float uMultiplier;
uniform float uOpacity;
uniform float uFillAmount;
uniform vec3 uObjectPosition;
uniform float uWobbleX;
uniform float uWobbleZ;
uniform vec2 uRefractionStrength;

#!VARYINGS
varying vec3 vWorldPosition;
varying vec3 vLocalPosition;
varying vec3 vFoamPosition;
#!SHADER: Vertex

#require(pbr.vs)

mat3 rotateAboutAxis(vec3 axis, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat3(oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c);
}

void main() {
    vec3 pos = position;
    setupPBR(position);
    vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    vFoamPosition = vWorldPosition - uObjectPosition;
    mat3 wobbleZMatrix = rotateAboutAxis(vec3(0.0, 0.0, 1.0), 0.05 * uWobbleZ);
    mat3 wobbleXMatrix = rotateAboutAxis(vec3(1.0, 0.0, 0.0), 0.05 * uWobbleX);
    mat3 wobble = wobbleZMatrix * wobbleXMatrix;
    vFoamPosition = wobble * vFoamPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

#!SHADER: Fragment

#require(pbr.fs)

float lodweight(float t, float log2radius, float gamma) {
    return exp(-gamma * pow(log2radius - t, 2.));
}

float getFresnel(vec3 normal, vec3 viewDir, float power) {
    float d = dot(normalize(normal), normalize(viewDir));
    return 1.0 - pow(abs(d), power);
}

vec4 lodBlur(sampler2D tMap, vec2 uv, float radius, float gamma) {
    vec4 pix = vec4(0.);
    float norm = 0.;
	//weighted integration over mipmap levels
    for(float i = 0.; i < 10.; i += 0.5) {
        float k = lodweight(i, log2(radius), gamma);
        pix += k * textureLod(tMap, uv, i);
        norm += k;
    }
	//nomalize, and a bit of brigtness hacking
    return pix * pow(norm, -0.99);
}

void main() {
    // PBR Config
    // this is the default config that can be tweaked
    PBRConfig baseConfig;
    baseConfig.clearcoat = 1.0;
    baseConfig.reflection = 1.0;
    baseConfig.color = vec3(1.0, 1.0, 1.0);

    vec2 screenUv = (gl_FragCoord.xy / resolution.xy);
    vec3 refractedDir = refract(-normalize(vV), normalize(vWorldNormal), 1.0 / 1.5);
    vec2 bluenoise = texture2D(tNoise, screenUv * 10.0).xy * 2.0 - 1.0;
    float refraction = texture(tRefraction, screenUv).r;

    vec3 pbr = getPBR(vec3(1.0, 1.0, 1.0), baseConfig).rgb;

    float fresnel = getFresnel(vWorldNormal, vV, 4.0);

    float progress = smoothstep(uTransition - 0.01, uTransition, vFoamPosition.y * 0.5 + 0.1);
    vec3 color = mix(uColor, uColor2, 1.0 - progress);
    vec3 colorDark = mix(uColorDark, uColor2Dark, 1.0 - progress);

    vec3 col = mix(color, colorDark, refraction) * (uRefractionStrength.y + (1.0 - refraction) * uRefractionStrength.x);

    col *= uMultiplier;

    if(!gl_FrontFacing) {
        col = col * 1.05;
    }

    gl_FragColor = vec4(col, 1.0 * uOpacity);

    // foam edge
    vec3 foamPosition = vFoamPosition;

    float waveFrequency = 5.0;
    float foamWave = ((foamPosition.x * waveFrequency) + (foamPosition.z * waveFrequency)) + (time * 1.2);
    foamWave = sin(foamWave) * 0.025;
    foamPosition.y += foamWave * (uWobbleX + uWobbleZ);

    float foam = smoothstep(uFillAmount, uFillAmount - 0.005, foamPosition.y + 0.075);

    //gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 1.05, 1.0 - foam);

    // Use local position so the liquid moves with the parent
    if(foamPosition.y - uFillAmount > 0.0) {
        discard;
    }
}