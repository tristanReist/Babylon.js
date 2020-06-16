attribute vec3 position;

varying vec2 vPosition;


void main( void )
{
    vPosition = position.xy;
    gl_Position = vec4(position, 1.);
}