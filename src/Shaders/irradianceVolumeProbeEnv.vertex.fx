attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute vec2 uv2;


uniform mat4 world;
uniform mat4 projection;
uniform mat4 view;
varying vec2 vUV;
varying vec2 vUV2;
varying vec3 wPosition;
varying vec3 wNormal;

void main( void )
{
    wNormal = (world * vec4(normal, 0.)).rgb;
    wPosition =(world * vec4(position, 1.)).rgb;
    vUV = uv;
    vUV2 = uv2;
    gl_Position = projection * view * world * vec4(position, 1.0);
}