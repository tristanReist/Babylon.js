attribute vec3 position;
attribute vec2 uv;

uniform mat4 worldViewProjection;
varying vec3 vPosition;
varying vec2 vUV;

void main( void )
{
    vPosition = position;
    vUV = uv;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}