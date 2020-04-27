attribute vec3 position;

varying vec3 vPosition;

void main( void ) {
    vPosition = vec3(position.x, - position.y, position.z);
    gl_Position = vec4(vPosition, 1.);
}