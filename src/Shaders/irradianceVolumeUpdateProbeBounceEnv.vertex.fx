attribute vec3 position;
attribute vec2 uv;

uniform mat4 world;
uniform mat4 rotation;

varying vec3 vPosition;

void main( void ) {
    vPosition = (   rotation * world * vec4(position, 1.)).rgb;
    vPosition.y = -vPosition.y;
    gl_Position = vec4(uv.x*2.0-1.0, (uv.y *2. - 1. ), 0.0, 1.0);
}