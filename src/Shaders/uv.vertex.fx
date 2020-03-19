attribute vec3 position;
attribute vec2 uv;


uniform mat4 world;
uniform mat4 projection;
uniform mat4 view;
varying vec2 vUV;

void main( void )
{
    vUV = uv;
    gl_Position = projection * view * world * vec4(position, 1.0);
}