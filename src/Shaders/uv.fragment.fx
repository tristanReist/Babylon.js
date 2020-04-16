#version 300 es
precision highp float;
precision highp int;


out vec4 glFragData[2];

in vec2 vUV;
uniform sampler2D albedo;
uniform int test;

void main( void )
{   
    
    glFragData[0] = vec4(vUV, 0, 1);
    glFragData[1]= vec4(texture(albedo, vUV).rgb, 1.);

    // if (texture(albedo, vec2(0, 0)).r == 0.) {
    //     glFragData[1] = vec4(1, 1, 1, 1);
    // }
    if (test != 5) {
        glFragData[1] = vec4(1, 0, 1, 1);
    }
    //  glFragData[1]= vec4(1., 0., 0., 1.);
}