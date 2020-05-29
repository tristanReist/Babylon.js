#version 300 es
precision highp float;

in vec2 vUV;

// Current mesh lightmap
uniform sampler2D inputTexture;

out vec4 outColor;

void main() {
    outColor = vec4(texture(inputTexture, vUV).xyz, 1.0);
}
