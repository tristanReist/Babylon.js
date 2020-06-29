// Attributes
in vec3 position;

// Uniforms
uniform mat4 projection;
uniform mat4 view;
uniform mat4 world;
uniform float bias;

// Outputs
out vec4 vDepthMetric;

void main(void) {

    vec4 viewPos = projection * view * world * vec4(position, 1.0);
    gl_Position = viewPos;
    // gl_Position = projection * viewPos;
    // gl_Position.z += bias * gl_Position.w;
    vDepthMetric = gl_Position;
}
