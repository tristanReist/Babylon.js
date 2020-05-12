#version 300 es
precision highp float;
precision highp int;


out vec4 glFragData[2];

in vec2 vUV;
in vec3 wNormal;
in vec3 wPosition;

uniform vec3 probePosition;
uniform vec3 albedoColor;
uniform sampler2D albedoTexture;

void main( void )
{   
    vec2 uv = vec2(vUV.x, 1. - vUV.y);

    vec3 vector = wPosition - probePosition;
    if (dot(wNormal, vector) > 0.){
        glFragData[0] = vec4(-1, -1, 0, 1);
        glFragData[1] = vec4(0., 0., 0., 1.);
    }
    else {    
        glFragData[0] = vec4(uv, 0, 1);
        if (texture(albedoTexture, uv).rgb !=  vec3(0., 0., 0.)) {
            glFragData[1]= vec4(texture(albedoTexture, uv).rgb, 1.);
        }
        else {
            glFragData[1]= vec4(albedoColor, 1.);
        }

    }
}