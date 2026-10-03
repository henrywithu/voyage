#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tText;
uniform vec3 uTint;
uniform vec2 uVelocity;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Vertex
void main() {
    vUv = uv;

    vec3 pos = position;

    // Calculate velocity magnitude for stretch intensity
    vec2 vel2D = uVelocity;
    float velocityMag = length(vel2D);

    // Normalize velocity direction
    vec2 velDir = normalize(vel2D);

    if (velocityMag > 0.) {
        // Create stretch factor (adjust multiplier for more/less stretch)
        float stretchFactor = velocityMag * 0.03;
        stretchFactor = min(stretchFactor, 1.0); // Cap maximum stretch

        // Offset the entire mesh center backward along velocity to create trailing effect
        vec2 centerOffset = -velDir * stretchFactor;
        vec2 pos2D = pos.xy;

        float projectionAlongVel = dot(pos2D, velDir);
        vec2 parallelComponent = velDir * projectionAlongVel;
        vec2 perpendicularComponent = pos2D - parallelComponent;

        // Stretch along velocity direction, compress perpendicular slightly
        vec2 stretchedPos2D = parallelComponent * (1.0 + stretchFactor) +
                perpendicularComponent * (1.0 - stretchFactor * 0.1);

        pos.xy = stretchedPos2D;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

#!SHADER: Fragment
#require(aastep.glsl)

void main() {
    vec2 screenPos = gl_FragCoord.xy / resolution.xy;
    float color = texture2D(tText, screenPos).r;
    float alpha = aastep(0.5, 1.0 - length(vUv - 0.5));
    gl_FragColor = vec4(mix(vec3(1.0), uTint, color), alpha);
}
