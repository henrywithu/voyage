
// uniform vec2 mousePos;
// uniform float mouseSize;
uniform sampler2D tHand;
uniform float viscosityConstant;
uniform float WIDTH;
uniform float uScroll;
// uniform float BOUNDS;

#ifndef PI
#define PI 3.141592653589793
#endif


void main()	{
    vec2 cellSize = 1.0 / resolution;

    vec2 screenUv = gl_FragCoord.xy / resolution.xy;
    screenUv.y -= uScroll;
    vec4 handData = texture2D(tHand, screenUv);
    handData.rgb *= handData.a;
    float handFringe = handData.b;

    vec2 uv = gl_FragCoord.xy * cellSize;

    // heightmapValue.x == height from previous frame
    // heightmapValue.y == height from penultimate frame
    // heightmapValue.z, heightmapValue.w not used
    vec4 heightmapValue = texture2D( heightmap, uv );


    // Get neighbours - treat out-of-bounds as zero (open boundary)
    float mul = 1.0;
    vec2 uvN = uv + vec2(0.0, cellSize.y * mul);
    vec2 uvS = uv + vec2(0.0, -cellSize.y * mul);
    vec2 uvE = uv + vec2(cellSize.x * mul, 0.0);
    vec2 uvW = uv + vec2(-cellSize.x * mul, 0.0);

    // Clamp check - if sampling outside [0,1], use zero instead
    vec4 north = (uvN.y > 1.0) ? vec4(0.0) : texture2D(heightmap, uvN);
    vec4 south = (uvS.y < 0.0) ? vec4(0.0) : texture2D(heightmap, uvS);
    vec4 east  = (uvE.x > 1.0) ? vec4(0.0) : texture2D(heightmap, uvE);
    vec4 west  = (uvW.x < 0.0) ? vec4(0.0) : texture2D(heightmap, uvW);

    // https://web.archive.org/web/20080618181901/http://freespace.virgin.net/hugo.elias/graphics/x_water.htm

    float viscosity = 0.96;
    float newHeight = ( ( north.x + south.x + east.x + west.x ) * 0.5 - heightmapValue.y ) * viscosity;

    // float force = 0.0;
    // force += clamp(handDepth * 0.2, 0.0, 0.3);

    // newHeight += force * 2.5;
    newHeight += handFringe;
    newHeight = clamp(newHeight, -4.0, 100.0);

    heightmapValue.y = heightmapValue.x;
    heightmapValue.x = newHeight;

    gl_FragColor = heightmapValue;

}