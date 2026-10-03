uniform sampler2D heightmap;
uniform float heightScale;
uniform float WIDTH;
uniform float BOUNDS;

vec3 calculateWaterPos() {
    vec2 cellSize = vec2( 1.0 / WIDTH, 1.0 / WIDTH );
    vec3 objectNormal = vec3(
                        ( texture2D( heightmap, uv + vec2( - cellSize.x, 0 ) ).x - texture2D( heightmap, uv + vec2( cellSize.x, 0 ) ).x ) * WIDTH / BOUNDS,
                        ( texture2D( heightmap, uv + vec2( 0, - cellSize.y ) ).x - texture2D( heightmap, uv + vec2( 0, cellSize.y ) ).x ) * WIDTH / BOUNDS,
                        1.0 );


    vNormal = normalize(normalMatrix * objectNormal);

    float heightValue = texture2D(heightmap, uv).x;
    vec3 pos = position;
    pos.z += heightValue * heightScale;

    return pos;
}