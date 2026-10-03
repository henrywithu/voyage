// from https://www.shadertoy.com/view/ltScRG

#define num_samples 16
#define level_of_detail 2 
#define tile_size (1 << level_of_detail)
#define sigma_val float(num_samples) * 0.25

float gaussian(vec2 i) {
    return exp( -0.5 * dot(i/sigma_val, i/sigma_val) ) / ( 6.28 * sigma_val*sigma_val );
}

vec4 blur(sampler2D sp, vec2 uv, vec2 scale) {
    vec4 result = vec4(0.);  
    int s = num_samples/tile_size;
    for ( int i = 0; i < s*s; i++ ) {
        vec2 d = vec2(i%s, i/s)*float(tile_size) - float(num_samples)/2.;
        result += gaussian(d) * textureLod( sp, uv + scale * d, float(level_of_detail) );
    }
    return result / result.a;
}

vec4 blurAlpha(sampler2D sp, vec2 uv, vec2 scale) {
    vec4 result = vec4(0.);
    float totalWeight = 0.0;
    int s = num_samples/tile_size;
    for ( int i = 0; i < s*s; i++ ) {
        vec2 d = vec2(i%s, i/s)*float(tile_size) - float(num_samples)/2.;
        float weight = gaussian(d);
        vec4 v = textureLod( sp, uv + scale * d, float(level_of_detail) );
        // Premultiply RGB by alpha before accumulating
        result.rgb += weight * v.rgb * v.a;
        result.a += weight * v.a;
        totalWeight += weight;
    }
    // Un-premultiply to get final color
    result.rgb = result.a > 0.001 ? result.rgb / result.a : vec3(0.0);
    result.a /= totalWeight;
    return result;
}
