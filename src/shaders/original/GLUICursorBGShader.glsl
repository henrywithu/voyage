#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tNoise;
uniform float uHover;
uniform vec2 uVelocity;
uniform vec2 uDiscard;

#!VARYINGS
varying vec2 vUv;
varying float vNdcHeight;

#!SHADER: Vertex

void main() {
  vec3 pos = position;

  // Calculate velocity magnitude for stretch intensity
  vec2 vel2D = uVelocity;
  float velocityMag = length(vel2D);

  // Normalize velocity direction
  vec2 velDir = normalize(vel2D);

  if(velocityMag > 0.) {
  // Create stretch factor (adjust multiplier for more/less stretch)
    float stretchFactor = velocityMag * mix(0.01, 0.04, uHover);
    stretchFactor = min(stretchFactor, 1.0); // Cap maximum stretch

  // Offset the entire mesh center backward along velocity to create trailing effect
    vec2 centerOffset = -velDir * stretchFactor;
    vec2 pos2D = pos.xy + centerOffset;

    float projectionAlongVel = dot(pos2D, velDir);
    vec2 parallelComponent = velDir * projectionAlongVel;
    vec2 perpendicularComponent = pos2D - parallelComponent;

  // Stretch along velocity direction, compress perpendicular slightly
    vec2 stretchedPos2D = parallelComponent * (1.0 + stretchFactor) +
      perpendicularComponent * (1.0 - stretchFactor * 0.1);

    pos.xy = stretchedPos2D;
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  vUv = uv;

  vNdcHeight = 1.0 - (gl_Position.y / gl_Position.w * 0.5 + 0.5);
}

#!SHADER: Fragment
#require(aastep.glsl)

void main() {
  // float scale = 1.0 - mix(0.5, 1.0, clamp(uDiscard.y - vNdcHeight, 0.0, 1.0));
  // vec2 uv = (vUv - 0.5) / scale + 0.5;
  if (uDiscard.x - vNdcHeight > 0.0 || uDiscard.y - vNdcHeight < 0.0) discard;

  float steppedTime = floor(time * 8.0) / 8.0;
  float noise = texture2D(tNoise, vUv + vec2(0.0, steppedTime)).r;

  float disc = length(vUv - 0.5);
  float outer = aastep(0.5, disc + noise * 0.025);
  float border = mix(0.44, 0.42, uHover);
  float outline = 1.0 - (aastep(border, disc - noise * 0.01) + outer);

  vec3 color = max(vec3(18.0 / 255.0), outline);

  gl_FragColor = vec4(color, 1.0 - outer);
}