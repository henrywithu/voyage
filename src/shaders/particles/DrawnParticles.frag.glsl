uniform sampler2D tOrigin;
uniform sampler2D tAttribs;
uniform sampler2D tSpawn;
uniform float uMaxCount;
uniform float HZ;
uniform sampler2D tCurvePos;
uniform sampler2D tCurveTangent;
uniform vec3 uForceDir;
uniform vec3 uForceScale;
uniform float uCurveCount;
uniform float uSpeedUp;
uniform float uPullValue;
uniform float uCurlNoiseScale;
uniform float uCurlTimeScale;
uniform float uCurlNoiseSpeed;

#require(range.glsl)
#require(curl.glsl)

void main() {
    vec3 origin = texture2D(tOrigin, vUv).rgb;
    vec4 inputData = texture2D(tInput, vUv);
    vec3 pos = inputData.xyz;
    vec4 random = texture2D(tAttribs, vUv);
    float data = inputData.w;

    if (vUv.x + vUv.y * fSize > uMaxCount) {
        gl_FragColor = vec4(9999.0);
        return;
    }

    vec4 spawn = texture2D(tSpawn, vUv);
    float life = spawn.x;

    if (spawn.x < -500.0) {
        pos = spawn.xyz;
        pos.x += 999.0;
        spawn.x = 1.0;
        gl_FragColor = vec4(pos, data);
        return;
    }

    //abovespawn
    if (spawn.x <= 0.0) {
        pos.x = 9999.0;
        gl_FragColor = vec4(pos, data);
        return;
    }

    //abovecode
    
vec3 uCenter = vec3(-0.5, -2.0, -3.0);
// float uRadius = 2.0;
// float uRadius = uRadiusSize;

// float uPullStrength = 0.005;
float uPullStrength = uPullValue;
float uVortexStrength = 0.15;


vec3 center = uCenter;
vec3 dir3 = pos - center;

// work in XZ plane
vec2 dir = dir3.xz;
float dist = length(dir);

// tangential direction
vec2 tangential = vec2(dir.y, -dir.x) / (dist + 0.1);

// back to 3D
vec3 vortexForce = vec3(tangential.x, 0.0, tangential.y);

vec3 radialDir = normalize(vec3(dir.x, 0.0, dir.y));
vec3 pullForce = -radialDir * uPullStrength;

vec3 force = vortexForce * uVortexStrength * random.x
           + (pullForce);


// float influence = smoothstep(uRadius, 0.0, dist);
// force *= influence;

float ramp = 1.0 - smoothstep(0.7, 0.99, spawn.x);

force *= ramp;

vec3 forceUp = vec3(0.0, 0.025, 0.0) * ramp;

force += forceUp * HZ;

// --- APPLY ---
pos += force * (mix(1.0, 3.0, uSpeedUp)) * HZ;


vec3 curl = curlNoise(pos * uCurlNoiseScale*0.1 + (time * uCurlTimeScale * 0.1));
pos += curl * uCurlNoiseSpeed * 0.01 * HZ;

    gl_FragColor = vec4(pos, data);
}
