#version 300 es

// Attributes
in vec2 uv2;
in vec3 position;
in vec3 normal;

out vec2 vUV;
out vec4 worldPosition;
out vec3 worldNormal;

// Uniforms
uniform mat4 world;
uniform vec2 texelSize;
uniform vec2 texelOffset;

void main(void) {
	vUV = uv2;
	worldPosition = world * vec4(position, 1.0);
	worldNormal = (world * vec4(normal, 0.0)).xyz;
	gl_Position = vec4((2. * (vUV + (texelSize * 0.5 * texelOffset))) - 1., 0.0, 1.0);
}
