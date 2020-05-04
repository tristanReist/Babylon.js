attribute vec3 position;

uniform mat4 worldViewProjection;
varying vec3 vPosition;

void main( void )
{
    vPosition = position;
    gl_Position = worldViewProjection * vec4(position, 1.0);
}