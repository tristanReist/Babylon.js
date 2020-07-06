attribute vec3 position;
attribute vec2 uv2;

varying vec2 vUV2;

uniform mat4 worldViewProjection;

void main ( void ) {

    vUV2 = uv2;
    gl_Position = worldViewProjection * vec4(position, 1.);

}