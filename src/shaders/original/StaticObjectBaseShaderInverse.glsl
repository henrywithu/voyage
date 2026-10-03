#!ATTRIBUTES

#!UNIFORMS
uniform float uLineWidth;
uniform float uDiscardTop;
uniform float uDiscardBottom;

#!VARYINGS
varying vec2 vUv;
varying float vNdcHeight;

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
    vec3 pos = position;

    vec4 projectionPos = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vec4 projectionNormal = projectionMatrix * modelViewMatrix * vec4(normal, 0.0);
    
    float aspect = resolution.x / resolution.y;
    projectionNormal.z = projectionNormal.z;
    // projectionNormal.x /= aspect * 0.5;
    projectionPos.xy += projectionNormal.xy * uLineWidth * sqrt(projectionPos.w) * 2.0;
    
    gl_Position = projectionPos;

    vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment

void main() {
    if (uDiscardBottom - vNdcHeight > 0.0 || uDiscardTop - vNdcHeight < 0.0) discard;

    vec3 color = vec3(18.0 / 255.0);

    float alpha = 1.0;
    gl_FragColor = vec4(color, alpha);
}