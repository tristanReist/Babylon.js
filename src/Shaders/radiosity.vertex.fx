// Attributes
in vec2 uv2;

out vec2 vUV;

uniform vec2 texelSize;
uniform vec2 texelOffset;

void main(void) {
	vUV = uv2;
	gl_Position = vec4((vUV + (texelSize * 0.5 * texelOffset)) * 2. - 1., 0.0, 1.0);
}
