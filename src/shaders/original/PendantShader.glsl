#!ATTRIBUTES
attribute float ao;

#!UNIFORMS
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
uniform float uDiscardTop;
uniform float uDiscardBottom;

#!VARYINGS
varying vec2 vUv;
varying vec2 vLineUv;
varying vec3 vNormal;
varying vec3 vPos;
varying float vAo;
varying float vHeight;
varying float vDistance;
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
    vAo = ao;
    vHeight = position.y;
    vPos = position;

    vec3 pos = position;
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

    // texture
    
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
    // color = mix(color, uColorHighlight, terminatorhigh);
    color *= maskedLines;

    // The pearl (uv.x = 1) takes the tide's colour, with a bright catch-light where the
    // light is strongest; the gold stays ink on paper.
    float pearl = step(0.75, vUv.x);
    // Voyage: the dial (uv.x = 0.5) is enamel in the tide's colour, a shade deeper than the pearl, inked in shadow.
    float enamel = step(0.25, vUv.x) * (1.0 - pearl);
    vec3 enamelColor = uColorHighlight * mix(0.45, 0.85, terminatormid) * mix(0.75, 1.0, maskedLines);
    color = mix(color, enamelColor, enamel);
    vec3 tide = uColorHighlight * mix(0.72, 1.0, terminatormid);
    tide = mix(tide, vec3(1.0), terminatorhigh * 0.85);
    color = mix(color, tide, pearl);

    color = max(vec3(18.0 / 255.0), color);



    float alpha = 1.0;
    gl_FragColor = vec4(color, alpha);
}