attribute vec3 position;

varying vec2 vPosition;


void main( void )
{
    vPosition = position.xy;
    gl_Position = vec4(position, 1.);
    // gl_Position = vec4(uv2 * 2. - 1., 0, 1.0);

}