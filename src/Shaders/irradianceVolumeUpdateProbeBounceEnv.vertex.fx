// attribute vec3 position;
// attribute vec3 normal;
// attribute vec2 uv;
// attribute vec2 uv2;

// uniform mat4 world;
// uniform mat4 projection;
// uniform mat4 view;
// varying vec2 vUV;
// varying vec2 vUV2;
// varying vec3 wPosition;
// varying vec3 wNormal;

// void main( void ) {
//     wNormal = (world * vec4(normal, 0.)).rgb;
//     wPosition =(world * vec4(position, 1.)).rgb;
//     vUV = uv;
//     vUV2 = uv2;
//     gl_Position = projection * view * world * vec4(position, 1.0);
// }




attribute vec3 position;
attribute vec2 uv;

uniform mat4 world;
uniform mat4 rotation;

varying vec3 vPosition;

void main( void ) {
    vPosition = (   rotation * world * vec4(position, 1.)).rgb;
    vPosition.y = -vPosition.y;
    gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
}