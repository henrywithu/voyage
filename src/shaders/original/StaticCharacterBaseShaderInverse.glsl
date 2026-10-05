#!ATTRIBUTES
attribute float windmask;
attribute vec2 uv2;

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
    // Voyage: on her face the shell sits a little behind the skin and draws finer, so it inks her face's
    // outline but not the folds inside it (the wings of her nose, the creases of her smile).
    float face = step(0.555, uv2.y) * step(uv2.x, 0.445);
    float hair = step(0.10, uv.y) * step(uv.y, 0.30);
    pos += normal * uLineWidth * mix(1.0, 0.65, face) * mix(1.0, 0.55, hair);
    vec4 viewPos = modelViewMatrix * vec4(pos, 1.0);
    viewPos.xyz += normalize(viewPos.xyz) * 0.02 * face;

    gl_Position = projectionMatrix * viewPos;
}

#!SHADER: Fragment

void main() {
    // trim texture
    float trimAlpha = texture2D(tTrim, vUv).a;
    if (trimAlpha < 0.95) discard;

    // Voyage: her hair's outline is a dark brown line, not ink.
    float hair = step(0.10, vUv.y) * step(vUv.y, 0.30);
    vec3 color = mix(vec3(0.0), vec3(0.075, 0.05, 0.042), hair);

    float alpha = 1.0;
    
    gl_FragColor = vec4(color, alpha);
}