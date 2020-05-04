attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

varying vec3 vPosition;
varying vec3 vNormal;

void main( void )
{
    vPosition = position;
    vNormal = normal;
    gl_Position = vec4(uv.x*2.0-1.0, - (uv.y * 2.0 - 1.0), 0.0, 1.0);
}

