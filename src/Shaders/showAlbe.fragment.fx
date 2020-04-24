varying vec2 vUV;

uniform sampler2D albedo;

void main (void) 
{
    vec2 uv = vec2(vUV.x, 1. - vUV.y);
    gl_FragColor = vec4(texture2D(albedo, uv).rgb, 1);
}
