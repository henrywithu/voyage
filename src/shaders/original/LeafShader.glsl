#!ATTRIBUTES
attribute vec4 random;
attribute vec3 lookup;

#!UNIFORMS
uniform sampler2D tPos;
uniform sampler2D tPrevPos;
uniform sampler2D tVelocity;
uniform sampler2D tColor;
uniform vec3 uColor;
uniform sampler2D tMap;
uniform float uDPR;
uniform float uFade;
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


#require(quaternion.glsl)
float parabola( float x, float k ){
    return pow( 4.0*x*(1.0-x), k );
}

void main() {
    vUv = uv;
    vec4 decodedPos = texture2D(tPos, lookup.xy);
    vec4 decodedPrevPos = texture2D(tPrevPos, lookup.xy);
    vec3 offset = decodedPos.xyz;
    vec3 prevOffset = decodedPrevPos.xyz;
    vec3 velocity = offset - prevOffset;
    vVelocity = vec4(velocity, 1.0);
    float scale = (random.x + 0.6) * 0.06;
    float life = texture2D(tLife, lookup.xy).r;
    if (life < 0.0) life = 1.0;    
    vLife = life;
    vRandom = random;

    vec3 localPos = position;

    float noise = cnoise(localPos.xyz * 10.0);
    noise = noise * 0.1;
    localPos.z += noise;

    localPos *= scale;

    localPos *= parabola(vLife, 0.1);

    // give random rotation to the leaf

    vec3 worldNormal = (modelMatrix * vec4(normal, 0.0)).xyz;

    vec3 rotatedPos    = localPos; //( lookAt * vec4(localPos, 1.0 ) ).xyz;


    vec3 rotatedNormal = worldNormal; //(lookAt * vec4(worldNormal, 0.0)).xyz;
    vWorldNormal = rotatedNormal;

    rotatedPos = rotateVertexPosition(rotatedPos, vec3(0.0, 0.0, 1.0), (random.y + 1.0) * 360. + (time * 30.));
    rotatedPos = rotateVertexPosition(rotatedPos, vec3(1.0, 0.0, 0.0), (random.x + 1.0) * 360. * PI + (time * 30.));

    offset.y += 0.95 * (random.x * 2.0 - 1.0);
    offset.x += 0.2 * (random.y * 2.0 - 1.0);
    

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

    vec4 color = texture2D(tMap, vUv);

    vec3 lightGreen = vec3(0.1, 0.3, 0.1);

    color.rgb = mix(color.rgb, uColor, pow(color.r, 1.0));

    if(color.a < 0.5) discard;
    //vec3 color = normalize(vVelocity.xxx);
    gl_FragColor = vec4(color.rgb, color.a);
}