#version 300 es
precision highp float;

in vec2 uv2;

out vec2 vUV;

uniform mat4 world;

void main(void) {
    vUV = uv2;
    gl_Position = vec4(2. * vUV.x - 1., 2. * vUV.y - 1., 0.0, 1.0);
}
