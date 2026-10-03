#!ATTRIBUTES
attribute float ao;
attribute vec3 pivot;

#!UNIFORMS
uniform sampler2D tMap;

uniform sampler2D tLines;
uniform sampler2D tNoise;
uniform float uLinesTile;
uniform vec3 uLightDir;
uniform vec2 uThreshold;
uniform vec3 uAxis;
uniform float uAngle;
uniform float uDistanceCompensation;
uniform vec3 uColorHighlight;
uniform vec3 uColor;
uniform vec2 uVerticalGrad;
uniform float uFractureThreshold;
uniform float uTimeOffset;
uniform float uDiscardTop;
uniform float uDiscardBottom;
uniform vec3 uMouse;

#!VARYINGS
varying vec2 vUv;
varying vec2 vLineUv;
varying vec3 vNormal;
varying vec3 vPos;
varying float vAo;
varying float vHeight;
varying float vDistance;
varying float vNdcHeight;

#!SHADER: Vertex
#require(simplenoise.glsl)
#require(range.glsl)
#require(eases.glsl)

//----------------------------------------------------------------------------------------
//  3 out, 1 in...
vec3 hash31(float p)
{
   vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973));
   p3 += dot(p3, p3.yzx+33.33);
   return fract((p3.xxy+p3.yzz)*p3.zyx); 
}

mat3 rotation3d(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat3(
    oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
  );
}

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vAo = ao;
    vHeight = position.y;
    vPos = position;

    vec3 pos = position;

    float steppedTime = floor(time * 6.0 + uTimeOffset) * 0.1;

    vec3 dir = normalize(pivot);
    vec3 axis = hash31(pivot.x + pivot.y);
    axis = axis * 2.0 - 1.0;
    axis = normalize(axis);
    float angle = max(0.0, pivot.y - 0.5 - sin(steppedTime + pivot.z * 15.0 + uFractureThreshold) * 0.2) * 0.5;
    float angle2 = abs(sin(pivot.y * 55.0 - steppedTime + pivot.z * 10.0) * pivot.y);
    
    mat3 r = rotation3d(axis, angle + angle2 * 0.25);

    float scale = 1.0 + angle2 * 0.1;
    pos -= pivot;
    pos = r * pos;
    pos *= scale;
    pos += dir * vec3(1.0, 0.2, 1.0) * angle;
    pos.y += pow(pivot.y, 5.0) * 0.5;
    pos.x += angle2 * 0.01;
    pos += pivot;


    // worldPosition
    vec3 worldPos = (modelMatrix * vec4(pivot, 1.0)).xyz;
    float mouseDist = distance(worldPos, uMouse);
    float forceDist = 1.0 - smoothstep(0.0, 1.3, mouseDist);
    forceDist = cubicInOut(forceDist);

    float nn = crange(sin(time * 2.5), -1.0, 1.0, 1.0, 0.6);
    pos.xz += (pivot.xz * forceDist * 1.5) * nn;

    vec4 modelViewPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * modelViewPos;

    vLineUv = (rotation3d(normalize(uAxis), uAngle) * position).xy;
    vDistance = -modelViewPos.z;
    
    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);

}

#!SHADER: Fragment
    float aastep(float threshold, float value) {
        float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
        return smoothstep(threshold-afwidth, threshold+afwidth, value);
    }

void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    float steppedTime = floor(time * 8.0) / 8.0 * 0.15;

    vec3 normal = normalize(vNormal);
    
    // lines
    vec2 lineUv = vLineUv * uLinesTile;
    vec2 lineUvDistanceCompensated = lineUv * mix(2.0, 0.5, pow(clamp(vDistance * 0.0325, 0.0, 1.0), 2.0)) * 0.5;
    lineUv = mix(lineUv, lineUvDistanceCompensated, uDistanceCompensation);
    lineUv.x -= steppedTime * 2.0;
    float lines = texture2D(tLines, lineUv.yx).r * 2.0 - 1.0;

    // lighting
    float verticalGrad = smoothstep(uVerticalGrad.x, uVerticalGrad.y, vPos.y);
    float lighting = dot(normal, uLightDir);
    float lightMask = max(0.0, lighting);
    float terminatormid = aastep(uThreshold.x, lighting + lines * 0.45 - vAo * 0.15 - verticalGrad);
    float terminatorhigh = aastep(uThreshold.y, lighting + lines * 0.1 - vAo * 0.15 - verticalGrad);

    // reduce lines in areas of brightness
    float maskedLines = lines + lightMask;

    // break up lines with dots as light gets brighter
    float noise = texture2D(tNoise, lineUv * 2.0).r;
    maskedLines += noise * lightMask + lighting * 0.3;
    maskedLines = aastep(0.2, maskedLines);

    // compositing;
    vec3 color = vec3(1.0);
    color = mix(vec3(18.0 / 255.0), uColor, terminatormid);
    color = mix(color, uColorHighlight, terminatorhigh);
    color *= maskedLines;

    float alpha = 1.0 - color.r;
    color = max(vec3(18.0 / 255.0), color);

    gl_FragColor = vec4(color, alpha);
}