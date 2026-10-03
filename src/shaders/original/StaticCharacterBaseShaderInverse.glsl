#!ATTRIBUTES
attribute float windmask;

#!UNIFORMS
uniform sampler2D tTrim;
uniform float uLineWidth;
uniform vec4 uWindAxisAngle;
uniform vec3 uWindParams;
uniform vec3 uBreathe;
uniform float uBend;

#!VARYINGS
varying vec2 vUv;

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

    float steppedTime = floor(time * 18.0) / 18.0;

    vec3 pos = position;

    // wind animation
    vec3 windAxis = normalize(uWindAxisAngle.xyz);
    float windAngle = uWindAxisAngle.w;
    vec3 windPos = rotation3d(windAxis, windAngle) * pos;

    float displacement = sin(windPos.y * uWindParams.y + steppedTime * uWindParams.z) * uWindParams.x * windmask;
    displacement += sin(windPos.y * uWindParams.y * 0.34159 + windPos.z * 0.5 * uWindParams.y + steppedTime * uWindParams.z * 3.14159 * 0.673) * uWindParams.x * windmask;
    displacement += sin(windPos.y * uWindParams.y * 0.2772 + windPos.z * 0.5 * uWindParams.y + steppedTime * uWindParams.z * 3.14159 * 0.673) * uWindParams.x * windmask * 0.5;
    
    pos.y += displacement;
    pos.x -= displacement * 0.5;

    // breathe animation
    float mask = smoothstep(uBreathe.x, uBreathe.y, position.y);
    vec3 pivot = vec3(0.0, 0.2, -0.1);
    pos -= pivot;
    pos = rotation3d(vec3(1.0, 0.0, 0.0), (2.5 * uBreathe.z + sin(floor(time * 8.0) * 0.3 - mask * 2.0)) * 0.02 * (mask * 0.6 + 0.2) * uBreathe.z + uBend * mask) * pos;
    pos += pivot;
    pos += normal * uLineWidth;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

#!SHADER: Fragment

void main() {
    // trim texture
    float trimAlpha = texture2D(tTrim, vUv).a;
    if (trimAlpha < 0.95) discard;

    vec3 color = vec3(0.0);

    float alpha = 1.0;
    
    gl_FragColor = vec4(color, alpha);
}