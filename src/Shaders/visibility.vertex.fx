// Attributes
in vec3 position;

// Uniforms
uniform mat4 projection;
uniform mat4 view;
uniform mat4 world;

// Outputs
out vec4 vDepthMetric;

void main(void) {
    vec4 viewPos = projection * view * world * vec4(position, 1.0);
    gl_Position = viewPos;
    vDepthMetric = viewPos;
}
