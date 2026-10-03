#!ATTRIBUTES
attribute vec4 random;
attribute vec3 lookup;

#!UNIFORMS
uniform sampler2D tPos;
uniform sampler2D tPrevPos;
uniform sampler2D tVelocity;
uniform vec3 uColor;
uniform sampler2D tMap;
uniform float uDPR;
uniform float uFade;
uniform float uInverse;
uniform float uAnimate;
uniform sampler2D tLife;

#!VARYINGS
varying vec3 vColor;
varying float vLife;
varying vec2 vUv;
varying vec4 vRandom;
varying vec4 vVelocity;
varying vec3 vWorldNormal;
varying vec3 vView;
#!SHADER: Vertex

#require(range.glsl)
#require(simplenoise.glsl)
#require(instance.vs)
#require(curl.glsl)

mat3 calcLookAtMatrix(vec3 vector, float roll) {

  vec3 rr = vec3(sin(roll), cos(roll), 0.0);

  vec3 ww = normalize(vector);
  vec3 uu = normalize(cross(ww, rr));
  vec3 vv = normalize(cross(uu, ww));

  return mat3(uu, ww, vv);

}

#define PI 3.1415926535897

void main() {
    vUv = uv;
    vec4 decodedPos = texture2D(tPos, lookup.xy);
    vec4 decodedPrevPos = texture2D(tPrevPos, lookup.xy);
    vec3 offset = decodedPos.xyz;
    vec3 prevOffset = decodedPrevPos.xyz;
    vec3 velocity = offset - prevOffset;
    vVelocity = vec4(velocity, 1.0);
    float outScale = 0.01 + random.r * 0.1;
    float scale = range(random.x, 0.0, 1.0, 0.01, 0.028);
    float life = texture2D(tLife, lookup.xy).r;
    if (life < 0.0) life = 1.0;    
    vLife = life;
    vRandom = random;

    float stretchAmount = clamp(length(max(vec3(0.0), smoothstep(0.0, 1.0, velocity)) * 350.), 0.0, 5.0);
    float stretchMask = smoothstep(0.0, 1.0, -position.y);
    stretchAmount *= stretchMask;

    vec3 stretchDirection = normalize(velocity);
    vec3 noise = snoiseVec3((position.xyz * 0.3) + (time + (random.x * 1000.)) * 2.0);
    vec3 localPos = position + noise * 0.1;


    localPos *= smoothstep(0.0, 0.05, 1.0 - life) * smoothstep(1.0, 0.9, 1.0 - life);

    
    localPos += normal * uInverse * 0.3;
    localPos *= 1.0 - uAnimate;
    
    stretchAmount *= mix(1.0, 0.8, uInverse);
    vec3 stretchedPos = localPos * (scale * vec3(1.0, 1.0 + (stretchAmount * 0.7), 1.0));

    stretchedPos.y *= 1.5;

    // if(length(velocity) > 0.6) {
    //     return;
    // }

    vec3 worldNormal = (modelMatrix * vec4(normal, 0.0)).xyz;

    mat4 lookAt = mat4( calcLookAtMatrix( normalize(velocity), 0.0 ) );
    vec3 rotatedPos    = ( lookAt * vec4(stretchedPos, 1.0 ) ).xyz;

    vec3 rotatedNormal = (lookAt * vec4(worldNormal, 0.0)).xyz;
    vWorldNormal = rotatedNormal;
    

    vec3 transformedPos = rotatedPos + offset;
    vec4 worldPos = modelMatrix * vec4(transformedPos, 1.0);
    vView = worldPos.xyz - cameraPosition;
    vec4 mvPosition = modelViewMatrix * vec4(transformedPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}

#!SHADER: Fragment

float fresnel(float amount, vec3 normal, vec3 view)
{
	return pow((1.0 - clamp(dot(normalize(normal), normalize(view)), 0.0, 1.0 )), amount);
}


#require(transformUV.glsl)
void main() {
    float multiplier = 1.0;
    float alpha = vLife * multiplier;
    

    float fresn = fresnel(1.0, vWorldNormal, -vView);
    fresn = step(0.5, fresn);

    vec3 outColor = mix(uColor, vec3(1.0), step(0.8, vRandom.y));
    outColor = mix(uColor, outColor, 1.0 - uInverse);
    //vec3 color = normalize(vVelocity.xxx);
    gl_FragColor = vec4(mix(outColor, vec3(0.0), uInverse), 1.0);
}