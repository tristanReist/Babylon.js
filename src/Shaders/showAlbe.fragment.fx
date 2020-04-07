varying vec2 vUV;

uniform sampler2D albedo;

void main (void) 
{
    gl_FragColor = vec4(texture2D(albedo, vUV).rgb, 1);
}
