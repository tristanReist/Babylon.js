attribute vec3 position;
attribute vec2 uv;


uniform mat4 world;
uniform mat4 projection;
uniform mat4 view;
varying vec2 vUV;
varying vec3 vPosition;

void main( void )
{
    vUV = uv;
    vPosition = position;
    gl_Position = projection * view * world * vec4(position, 1.0);
}