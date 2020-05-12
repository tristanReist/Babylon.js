attribute vec3 position;
attribute vec2 uv;

varying vec3 vPosition;

uniform mat4 world;
uniform mat4 projection;
uniform mat4 view;

void main( void )
{
    vPosition = position;
    gl_Position = vec4(uv*2.0-1.0, 0.0, 1.0);
}


