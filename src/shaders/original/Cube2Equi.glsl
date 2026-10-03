#!ATTRIBUTES

#!UNIFORMS
uniform samplerCube tCube;

#!VARYINGS
varying vec2 vUv;

#!SHADER: Vertex
void main() {
    vUv = vec2( 1.- uv.x, uv.y );
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

#!SHADER: Fragment

#define M_PI 3.1415926535897932384626433832795

void main() {
    vec2 uv = vUv;
    float longitude = uv.x * 2. * M_PI - M_PI + M_PI / 2.;
    float latitude = uv.y * M_PI;

    vec3 dir = vec3(
        - sin( longitude ) * sin( latitude ),
        cos( latitude ),
        - cos( longitude ) * sin( latitude )
    );

    normalize(dir);
    gl_FragColor = textureCube(tCube, dir);
}