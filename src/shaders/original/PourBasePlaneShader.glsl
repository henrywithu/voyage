#!ATTRIBUTES

#!UNIFORMS
uniform sampler2D tNoise;
uniform vec3 uColor;
uniform vec3 uImpactPos;
uniform vec3 uSpawnPos;
uniform float uPourStrength;
uniform float uWaterLine;

#!VARYINGS
varying vec2 vUv;
varying vec3 vWorldPos;
varying vec3 vTranslation;

#!SHADER: Vertex

void main() {
    vTranslation = modelMatrix[3].xyz;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;

    vec4 modelViewPos = viewMatrix * worldPos;
    gl_Position = projectionMatrix * modelViewPos;

    vUv = uv;
}

#!SHADER: Fragment

float aastep(float threshold, float value) {
    float afwidth = length(vec2(dFdx(value), dFdy(value))) * 0.70710678118654757;
    return smoothstep(threshold-afwidth, threshold+afwidth, value);
}

void main() {
    float steppedTime = floor(time * 18.0) / 18.0 * 1.2;

    // distance to impact
    vec3 impactPos = uImpactPos;
    impactPos.y = max(vTranslation.y + 0.3, impactPos.y);
    impactPos.z = vTranslation.z + 0.22;
    float dist = distance(impactPos, vWorldPos);

    // scroll texture away from impact, horizontally
    float impactSign = sign(vWorldPos.x - impactPos.x);

    // splashy texture close to impact
    vec2 uv = vUv * 4.0;
    uv += vec2(-steppedTime * 2.0 * impactSign, 0.0);
    float noise = texture2D(tNoise, uv * 0.65).r;

    // diagonal mask for martini glass
    float diagonals = min((vUv.x * 1.1 + vUv.y) * 0.5, ((1.0 - vUv.x) * 1.1 + vUv.y) * 0.5);
    diagonals += noise * 0.01;

    // compositing
    float waterLine = smoothstep(1.0, 0.4, vUv.y);
    float invDist = 1.0 - clamp(dist * 1.8, 0.0, 1.0);
    float waves = sin(dist * 40.0 - steppedTime * 15.0) * 0.5 + 0.5;
    waves = waves * 0.5 + (sin(vUv.x * 8.0 - steppedTime * 15.0) * 0.5 + 0.5) * 0.6;
    float closeSplash = smoothstep(0.4, 0.0, dist);
    float powPourStrength = pow(uPourStrength, 3.0);
    float value = waterLine - (waves * invDist) * 0.4 * powPourStrength;
    float impactGradient = abs(vWorldPos.x - impactPos.x);
    impactGradient = clamp(impactGradient, 0.0, 1.0);
    value += noise * pow(invDist, 3.0) * 15.0 * impactGradient * 1.0 * powPourStrength;
    value += texture2D(tNoise, vUv * 2.0 + steppedTime * 0.5).r * 0.035;

    float alpha = aastep(0.3, value) * aastep(0.4, diagonals);

    vec3 color = uColor;

    gl_FragColor = vec4(color, alpha);
}
