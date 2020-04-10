#version 300 es
precision highp float;
precision highp int;


out vec4 glFragData[2];
in vec3 vPosition;
in vec2 vUV;
uniform samplerCube albedo;

void main( void )
{   
    
    glFragData[0] = vec4(vUV, 0, 1);
    glFragData[1]= vec4(texture(albedo, normalize(vPosition)).rgb, 1);
    
}