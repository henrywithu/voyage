#!ATTRIBUTES
attribute float ao;
attribute float thickness;

#!UNIFORMS
uniform sampler2D tText;
uniform sampler2D tEnvDiffuse;
uniform sampler2D tEnvSpecular;

#!VARYINGS
varying vec2 vUv;
varying float vThickness;
varying float vAo;
varying vec3 viewDir;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

#!SHADER: Vertex
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

  vWorldPosition = vec3(modelMatrix * vec4(position, 1.0));
  viewDir = -vec3(modelViewMatrix * vec4(position, 1.0));
  vNormal = normal;
  vUv = uv;
  vThickness = thickness;
  vAo = ao;
  vPosition = position;
}

#!SHADER: Fragment
float getFresnel(vec3 normal, vec3 viewDir, float power) {
    float d = dot(normalize(normal), normalize(viewDir));
    return 1.0 - pow(abs(d), power);
}

vec4 getRGB(sampler2D tDiffuse, vec2 uv, float angle, float amount) {
    vec2 offset = vec2(cos(angle), sin(angle)) * amount;
    vec4 r = texture2D(tDiffuse, uv + offset);
    vec4 g = texture2D(tDiffuse, uv);
    vec4 b = texture2D(tDiffuse, uv - offset);
    return vec4(r.r, g.g, b.b, g.a);
}

// vec4 blur(sampler2D tDiffuse, vec2 uv, float sampleDist, float strength) {
//     float samples[6];
//     samples[0] = -0.08;
//     samples[1] = -0.03;
//     samples[2] = -0.01;
//     samples[3] =  0.01;
//     samples[4] =  0.03;
//     samples[5] =  0.08;

//     vec2 dir = normalize(0.5 - uv);
//     vec4 texel = texture2D(tDiffuse, uv);
//     vec4 sum = texel;

//     for (int i = 0; i < 6; i++) {
//         sum += texture2D(tDiffuse, uv + (dir * samples[i] * sampleDist * strength));
//     }

//     sum /= 6.0;
//     return sum;
// }

float lodweight(float t, float log2radius, float gamma) {
	return exp(-gamma*pow(log2radius-t,2.));
}


vec4 lodBlur(sampler2D tMap, vec2 uv, float radius, float gamma) {
	vec4 pix = vec4(0.);
	float norm = 0.;
	//weighted integration over mipmap levels
	for(float i = 0.; i < 10.; i += 0.5)
	{
		float k = lodweight(i, log2(radius), gamma);
		pix += k*textureLod(tMap, uv, i);
		norm += k;
	}
	//nomalize, and a bit of brigtness hacking
	return pix*pow(norm,-0.99);
}


const vec2 INV_ATAN = vec2(0.1591, 0.3183);
const float LN2 = 0.6931472;
const float ENV_LODS = 7.0;

vec3 unreal(vec3 x) {
  return x / (x + 0.155) * 1.019;
}

vec3 fresnelSphericalGaussianRoughness(float cosTheta, vec3 F0, float roughness) {
	return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(2.0, (-5.55473 * cosTheta - 6.98316) * cosTheta);
}

vec2 sampleSphericalMap(vec3 v)
{
    vec2 uv = vec2(atan(v.z, v.x), asin(v.y));
    uv *= INV_ATAN;
    uv += 0.5;

    // match default C4D baked HDRI
    uv.x = fract(uv.x + 0.25 + 0.0 + 0.8 - 0.1);

    return uv;
}

vec4 SRGBtoLinear(vec4 srgb) {
    vec3 linOut = pow(srgb.xyz, vec3(2.2));
    return vec4(linOut, srgb.w);
}

vec3 linearToSRGB(vec3 color) {
    return pow(color, vec3(0.4545454545454545));
}

vec4 RGBMToLinear(vec4 value) {
    float maxRange = 6.0;
    return vec4(value.xyz * value.w * maxRange, 1.0);
}

vec4 autoToLinear(vec4 texel, float uHDR) {
    vec4 color = RGBMToLinear(texel);
    if (uHDR == 0.0) { color = SRGBtoLinear(texel); }
    return color;
}

void main() {
  float fresnel = getFresnel(vNormal, viewDir, 0.7);
  float thickness = vThickness * 2.0;
  float ao = vAo * 0.8;


  vec2 screenUv = (gl_FragCoord.xy / resolution.xy);
  screenUv += vNormal.xy * 0.05;
  // screenUv.xy += vWorldPosition.z * 0.03;

  // screenUv += sampleSphericalMap(vNormal) * 0.02;

  // vec4 textColor = getRGB(tText, screenUv, sin(time * 0.2), 0.0003);
//   vec4 textColor = blur(tText, screenUv, 0.8, 0.2);
  vec4 textColor = lodBlur(tText, screenUv, 5.0 + fresnel * 120.0, 3.0);
  vec3 baseColor = vec3(0.5, 0.75, 0.78);

  float alpha = 1.1;
  alpha -= (fresnel * 0.3);

  vec3 finalColor = mix(baseColor, textColor.rgb, 0.13);

  // finalColor += fresnel * 0.3;
  // finalColor += fresnel * 0.3;
  // finalColor -= ao * 0.3;
  // finalColor += thickness * 0.3;


  vec3 lightDir = normalize(vec3(1.0, 1.0, 0.1));
  vec3 diffuse = max(0.0, dot(vNormal, lightDir)) * vec3(1.0);
  finalColor += diffuse * 0.2;

  alpha -= vWorldPosition.z * 0.15;
  // finalColor += thickness * 0.2;

  vec2 diffuseUV = sampleSphericalMap(vNormal);
  vec3 envSpecular = texture2D(tEnvSpecular, diffuseUV).rgb;
  finalColor += (1.0 - thickness) * envSpecular * 10.0;
  finalColor -= ao * 0.4;
  finalColor += fresnel * 0.5;

  finalColor += thickness * 0.6;


  gl_FragColor = vec4(finalColor, alpha);
}