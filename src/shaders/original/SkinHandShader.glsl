#!ATTRIBUTES
attribute vec2 uv2;

#!UNIFORMS
uniform sampler2D tTrim;
uniform sampler2D tLines;
uniform sampler2D tNoise;

uniform float uLinesTile;
uniform vec2 uDiscard;
uniform vec3 uAxis;
uniform float uAngle;
uniform vec4 uPortalPlane;
uniform float uPortalFeather;
uniform vec3 uLightDir;
uniform vec3 uColor;

#!VARYINGS
varying vec2 vUv;
varying vec2 vUv2;
varying vec2 vLineUv;
varying vec3 vNormal;
varying float vAo;
varying float vNdcHeight;
varying float vDepth;
varying vec3 vViewDir;
varying vec3 vWorldPos;

#!SHADER: Vertex

#require(skinning.glsl)

mat3 rotation3d(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat3(oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s, oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s, oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c);
}

void main() {
  vUv = uv;
  vUv2 = uv2;
  vNormal = normalize(normalMatrix * normal);

  vec3 pos = position;
  applySkin(pos, vNormal);

  float steppedTime = floor(time * 8.0);

  vLineUv = (rotation3d(normalize(uAxis), uAngle) * position).xy;

  vAo = uv2.x;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  gl_Position = projectionMatrix * mvPosition;

  vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);

  // Signed distance to portal plane in world space
  vec3 worldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
  vDepth = dot(worldPos, uPortalPlane.xyz) + uPortalPlane.w;

  vViewDir = -mvPosition.xyz;
  vWorldPos = worldPos;
}

#!SHADER: Fragment
#require(range.glsl)
#require(blendmodes.glsl)

float aastep(float threshold, float value) {
  float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
  return smoothstep(threshold - afwidth, threshold + afwidth, value);
}

bool isClipping(vec2 vUv, vec3 vWorldPos) {
  vec2 uvRepeat = fract(vUv * 1000.0) - 0.5;
  float radius = smoothstep(1.25, .9, length(cameraPosition - vWorldPos));

  float circle = 1.0 - smoothstep(radius - radius * 0.1, radius, length(uvRepeat));
  return circle > 0.5;
}

void main() {
  if(isClipping(vViewDir.xz * 0.07, vWorldPos))
    discard;

  if(uDiscard.y - vNdcHeight > 0.0 || uDiscard.x - vNdcHeight < 0.0)
    discard;

  float ao = abs(vAo);
  float skinMask = 1.0 - step(-0.5, vAo);
  vec3 normal = normalize(vNormal);

  float steppedTime = floor(time * 8.0);

    // lines
  vec2 lineUv = vLineUv * uLinesTile;
  lineUv.x += steppedTime / uLinesTile * 0.2;
  float lines = texture2D(tLines, lineUv.yx).r * 2.0 - 1.0;

    // trim pattern
  float trim = texture2D(tTrim, vUv).r;
  trim = aastep(0.55, trim);

    // lighting
  vec3 lightDir = normalize(uLightDir);
  float lighting = dot(normal, lightDir);
  float lightMask = max(0.0, lighting);
  float terminatormid = aastep(0.3, lighting + lines * 0.3 - vAo);
  float terminatorhigh = aastep(0.85, lighting + lines * 0.1 - 0.1 - vAo);
  float terminatorbounce = 1.0 - aastep(-0.91, lighting - lines * 0.2);

    // reduce lines in areas of brightness
  float maskedLines = lines + lightMask;

    // break up lines with dots as light gets brighter
  float noise = texture2D(tNoise, lineUv * 2.0).r;
  maskedLines += noise * pow(lightMask, 2.0) * 3.0;
  maskedLines = aastep(0.01, maskedLines);

    // compositing;
  vec3 color = vec3(1.0);

  vec3 alt = uColor;

  color = mix(vec3(18.0 / 255.0), alt, terminatormid);
  color = mix(color, vec3(1.0), skinMask);
  color *= maskedLines;
  color = mix(color, alt, terminatorbounce);
  color *= trim;

  if(!gl_FrontFacing) {
    color = vec3(0.0);
  }

  color = max(vec3(18.0 / 255.0), color);

  float depthMask = smoothstep(-uPortalFeather, uPortalFeather, vDepth);
  float fringe = 1.0 - smoothstep(0.0, uPortalFeather + 0.1, abs(vDepth - 0.01));

  color *= step(0.1, 1.0 - fringe);

  float distBeforePortal = smoothstep(1., uPortalFeather , vDepth);

  #drawbuffer HandInfo gl_FragColor = vec4(distBeforePortal, 1.0 - depthMask, fringe, 1.0);
  #drawbuffer Color gl_FragColor = vec4(color, depthMask);
}