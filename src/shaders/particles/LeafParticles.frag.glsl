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
uniform float uProgress;
uniform mat4 uProjMatrix;
uniform mat4 uProjNormalMatrix;
uniform mat4 uModelMatrix;
uniform sampler2D tFluidMask;
uniform sampler2D tFluid;
uniform float uMouseStrength;

#require(range.glsl)
#require(glscreenprojection.glsl)

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
    float curveCount = uCurveCount;


vec3 posOut = vec3(0.0);

float u = 1.0 - (life);

vec3 tangentOut = vec3(0.0);
{
    float x = u * float(uCurveCount - 1.);
    float i0 = floor(x);
    float i1 = min(i0 + 1., uCurveCount - 1.);
    float f = fract(x);
    vec3 p0 = texelFetch(tCurvePos, ivec2(int(i0), 0), 0).xyz;
    vec3 p1 = texelFetch(tCurvePos, ivec2(int(i1), 0), 0).xyz;
    posOut =  mix(p0, p1, f);
}
{   
    float x = u * float(uCurveCount - 1.);
    float i0 = floor(x);
    float i1 = min(i0 + 1., uCurveCount - 1.);
    float f = fract(x);
    vec3 p0 = texelFetch(tCurveTangent, ivec2(int(i0), 0), 0).xyz;
    vec3 p1 = texelFetch(tCurveTangent, ivec2(int(i1), 0), 0).xyz;
    tangentOut =  normalize(mix(p0, p1, f));
}


vec3 targetPos = posOut;

float speed = 0.1;

vec3 toCurve = targetPos - pos;

if(data == 0.0) {
    pos = posOut;
}

float followStrength = 0.04;

vec3 side = normalize(cross(tangentOut, vec3(0.0, 0.0, 1.0)));

pos += side * (random.x - 0.5) * 0.025;
pos += ((random.xyz) * 2. - 1.) * 0.0115;


//pos += tangentOut * 0.001;
pos += toCurve * followStrength * HZ;


vec3 mpos = vec3(uModelMatrix * vec4(pos, 1.0));
vec2 screenUV = getProjection(mpos, uProjMatrix);
vec3 flow = vec3(texture2D(tFluid, screenUV).xy, 0.0);
applyNormal(flow, uProjNormalMatrix, uModelMatrix);

float fluidMask = smoothstep(0.1, 0.7, texture2D(tFluidMask, screenUV).r);
pos += flow * 0.0001 * HZ * uMouseStrength;// * fluidMask;

    gl_FragColor = vec4(pos, data);
}
