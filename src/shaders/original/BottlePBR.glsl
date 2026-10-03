#!ATTRIBUTES

#!UNIFORMS
uniform vec3 uLightColor;
uniform sampler2D tRefraction;
uniform sampler2D tText;
uniform vec3 uBGColor;
uniform float uOpacity;

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

void main() {
    // PBR Config
		// this is the default config that can be tweaked
    PBRConfig baseConfig;
    baseConfig.overrideMRO = true;
    baseConfig.reflection = 1.0;
    baseConfig.mro = vec3(0.6, 0.0, 1.0);
    baseConfig.color = vec3(1.0, 1.0, 1.0);
    
    vec2 screenUv = (gl_FragCoord.xy / resolution.xy);
    vec3 refractedDir = refract(-normalize(vV), normalize(vWorldNormal), 1.0 / 1.9);

    float vDotN = dot(-normalize(vV), normalize(vWorldNormal));
    float fresnel = clamp(SchlickFresnel(vDotN), 0.5, 1.0);

    vec3 pbr = getPBR(vec3(1.0, 1.0, 1.0), baseConfig).rgb;

    float alpha = mix(fresnel, 1.0, 0.3);

    float mask = clamp(smoothstep(0.0, 1.0, vPosition.y), 0.1, 1.0);

    screenUv += refractedDir.xy * 0.1;
    float refraction = 1.0 - texture(tRefraction, screenUv).r;
    vec3 refractionColor = refraction * vec3(0.715, 0.75, 1.0);


    vec3 lightPos = vec3(-10, 0., -12.0);
    vec3 lightDir = normalize(lightPos - vWorldPosition);
    float spec = dot(-vWorldNormal, lightDir);
    spec = max(0.0, spec);
    spec = pow(spec, 32.0);
    vec3 specular = spec * vec3(6.0);
    
    gl_FragColor = vec4(specular + pbr + 0.3 + (refractionColor * 0.35), pow(alpha, mask) * (0.15 + smoothstep(0.7, 0.8, vPosition.y) * 0.3));;


    if(!gl_FrontFacing) {
      vec3 refractedDirBack = refract(-normalize(vV), normalize(vWorldNormal), 1.0 / 1.8);
      vec2 screen2Uv = (gl_FragCoord.xy / resolution.xy);
      screen2Uv += refractedDirBack.xy * 0.3;
      vec3 textCol = texture(tText, screen2Uv).rgb;
      gl_FragColor.rgb = mix(uBGColor.rgb, vec3(1.0), textCol.r) * 0.8;
      gl_FragColor.rgb += (pbr * 0.5 * pow(alpha, mask) * 0.3);
      gl_FragColor.a = 1.0;
    }

    gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb, clamp(spec, 0.0, 1.0));

    //gl_FragColor.rgb = vec3(vPosition.y);

    gl_FragColor.a *= uOpacity;
}