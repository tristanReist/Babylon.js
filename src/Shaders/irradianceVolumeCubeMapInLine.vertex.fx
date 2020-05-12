attribute vec3 position;

varying vec2 vUV;

void main( void )
{
    vUV = vec2(position.x, position.y);
    gl_Position = vec4(position.x, position.y, 0, 1);
}