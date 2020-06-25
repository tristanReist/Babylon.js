// Uniforms
uniform vec2 nearFar;
uniform float bias;

// Inputs
in vec4 vDepthMetric;
in vec3 vView;

void main(void) {
        gl_FragColor = vec4(vDepthMetric.z / vDepthMetric.w, 0.0, 0.0, 1.0);
}
