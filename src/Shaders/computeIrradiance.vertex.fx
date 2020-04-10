attribute vec3 position;
attribute vec3 normal;

uniform mat4 worldViewProjection;

varying vec4 vNormal;

void main ( void ) {
    vNormal = vec4(normal, 1.);
    gl_Position = worldViewProjection * vec4(position, 1.);

}