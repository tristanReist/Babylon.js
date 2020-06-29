// Uniforms
uniform vec2 nearFar;
uniform float bias;

// Inputs
in vec4 vDepthMetric;

void main(void) {
    float depth = (vDepthMetric.z / vDepthMetric.w) * 2.0 - 1.0;
    float linearDepth = (2.0 * nearFar.x * nearFar.y) / (nearFar.y + nearFar.x - depth * (nearFar.y - nearFar.x));
    gl_FragColor = vec4(linearDepth, 0.0, 0.0, 1.0);

    // Debug
    // gl_FragColor = vec4(linearDepth / nearFar.y, 0.0, 0.0, 1.0);
}
