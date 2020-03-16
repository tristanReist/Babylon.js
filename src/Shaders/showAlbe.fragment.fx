varying vec2 vUV;

uniform sampler2D albedo;

void main (void) 
{
    gl_FragColor = vec4(texture(albedo, vUV).rgb, 1); 
    //gl_FragColor = vec4(vUV, 0, 1);     
}