#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tMap;

uniform sampler2D tAtlas;
uniform sampler2D tTrim;
uniform sampler2D tLines;
uniform sampler2D tNoise;
uniform float uLinesTile;
uniform vec3 uLightDir;
uniform vec3 uBreathe;
uniform float uBend;

#!VARYINGS
varying vec2 vUv;
varying vec2 vLineUv;
varying vec3 vNormal;
varying float vAo;
varying float vHeight;
varying float vNdcHeight;
varying vec3 vLightDir;

#!SHADER: Vertex

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
    vLineUv = (rotation3d(normalize(vec3(1.0, 0.0, 0.3)), 0.75) * position).xy;
    vHeight = position.y;

    vec3 pos = position;

    // breathe animation
    float mask = smoothstep(uBreathe.x, uBreathe.y, position.y);
    vec3 pivot = vec3(0.0, 0.2, -0.1);
    pos -= pivot;
    pos = rotation3d(vec3(1.0, 0.0, 0.0), (2.5 * uBreathe.z + sin(floor(time * 8.0) * 0.3 - mask * 2.0)) * 0.02 * (mask * 0.6 + 0.2) * uBreathe.z + uBend * mask) * pos;
    pos += pivot;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment
    float aastep(float threshold, float value) {
        float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
        return smoothstep(threshold-afwidth, threshold+afwidth, value);
    }

    float isLeft( vec3 P0, vec3 P1, vec3 P2 ) {
        return ( (P1.x - P0.x) * (P2.y - P0.y) - (P2.x - P0.x) * (P1.y - P0.y) );
    }

void main() {
    // hair card texture
    vec4 atlas = texture2D(tAtlas, vUv);
    if (atlas.a < 0.3) discard;

    float steppedTime = floor(time * 8.0) / 8.0 * 0.15;
    vec3 normal = normalize(vNormal);
    
    // lines
    vec2 lineUv = vUv * 0.4;
    lineUv.x -= steppedTime * 2.0;
    float lines = texture2D(tLines, lineUv.yx).r * 2.0 - 1.0;

    // lighting
    float lighting = dot(normal, normalize(vec3(0.5, 0.75, 2.0)));
    lighting = pow(lighting, 3.0);
    float lightMask = max(0.0, lighting);
    float terminatormid = aastep(0.8, lighting - lines * 0.4 - vUv.x * 0.8);

    // compositing;
    vec3 color = vec3(terminatormid);

    // make sure bottom half of character sits inside window frame
    // gl_FragDepth = gl_FragCoord.z + clamp(-vHeight, 0.0, 1.0) * 0.01;

    if (!gl_FrontFacing) {
        color = vec3(18.0 / 255.0);
    }

    color = max(vec3(18.0 / 255.0), color);

    float alpha = aastep(0.1, atlas.a);
    gl_FragColor = vec4(color, alpha);

    float heightMask = smoothstep(0.5, 0.51, vHeight);
    // gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.0, 0.0), heightMask);
    
    // move elements in front of frame border
    gl_FragDepth = gl_FragCoord.z - 0.003 * heightMask * step(0.2, vNdcHeight);
}