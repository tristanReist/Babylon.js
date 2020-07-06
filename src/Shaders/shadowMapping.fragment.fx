#version 300 es

layout(location = 0) out vec4 glFragColor;

// Attributes
// in vec4 vLightSpacePos;
in vec3 vWorldPos;    // world pos of receiving element
in vec3 vWorldNormal; // world normal of receiving element
in vec2 vUV2;

uniform samplerCube depthMap;
uniform sampler2D gatherTexture;

uniform vec3 lightPos;
uniform vec2 nearFar;
uniform float normalBias;
uniform float sampleCount;

uniform mat4 view;

vec3 worldNormal;

void main(void) {
    worldNormal = normalize(vWorldNormal);

    vec3 r2 = lightPos - vWorldPos;
    vec3 worldLightDir = normalize(r2);

    vec3 directionToLight = vec3(view * vec4(vWorldPos, 1.0)).xyz * vec3(1.0, -1.0, 1.0);

    // Bias
    float minBias = 0.000001;
    float maxBias = 0.00000001;
    float bias = max(maxBias * (1.0 - dot(worldNormal, normalize(lightPos - vWorldPos))), minBias); 

    float sampledDepth = texture(depthMap, directionToLight).x;

    vec3 absDir = abs(directionToLight);
    float depth = max(max(absDir.x, absDir.y), absDir.z);
    float farMinusNear = nearFar.y - nearFar.x;
    depth = ((nearFar.y + nearFar.x) - 2.0 * nearFar.y * nearFar.x / depth) / farMinusNear;

    float gather = texture(gatherTexture, vUV2).x;

    float visible = step(depth - bias, sampledDepth) / sampleCount;
    // float visible = depth / nearFar.y;
    // float visible = sampledDepth / nearFar.y;

    // glFragColor = vec4(visible, visible, visible, 1.0);

    // Gathering mode
    glFragColor = vec4(gather + visible, gather + visible, gather + visible, 1.0);
}
