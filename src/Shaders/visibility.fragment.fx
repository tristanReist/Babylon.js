// Uniforms
uniform vec2 nearFar;

// Inputs
in vec4 vDepthMetric;

void main(void) {
    float depth = (vDepthMetric.z / vDepthMetric.w);

    gl_FragColor = vec4(depth, 0.0, 0.0, 1.0);

    // Debug
    // gl_FragColor = vec4(depth / nearFar.y, 0.0, 0.0, 1.0);
}
