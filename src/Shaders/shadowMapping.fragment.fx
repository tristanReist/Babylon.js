#version 300 es

layout(location = 0) out vec4 glFragColor;

// Attributes
in vec4 vLightSpacePos;
in vec3 vWorldPos;    // world pos of receiving element
in vec3 vWorldNormal; // world normal of receiving element

uniform sampler2D depthMap;

uniform vec3 lightPos;
uniform vec2 nearFar;
uniform float normalBias;

uniform mat4 view;

vec3 worldNormal;

// float visible()
// {
//   // Look up projected point
//   vec3 directionToLight = vec3(view * vec4(vWorldPos, 1.0)).xyz * vec3(1.0, -1.0, 1.0);
// 
//   vec3 f2l = vWorldPos - lightPos;
//   // vec3 worldLightDir = normalize(r2);
// 
//   // float ndl = dot(worldNormal, worldLightDir);
//   // float sinNL = sqrt(1.0 - ndl * ndl);
//   // float nBias = normalBias * sinNL;
// 
//   vec3 absDir = abs(directionToLight);
//   float depth = max(max(absDir.x, absDir.y), absDir.z);
//   float farMinusNear = nearFar.y - nearFar.x;
//   depth = ((nearFar.y + nearFar.x) - 2.0 * nearFar.y * nearFar.x / depth) / farMinusNear;
//   // float depth = length(f2l);
//   
//   // float shadow = texture(depthMap, directionToLight).x + nBias;
//   // float shadow = texture(depthMap, f2l).x * nearFar.y;
//   // return vec3(shadow - depth);
//   // return step(depth, shadow);
//   return depth;
// }

void main(void) {
    worldNormal = normalize(vWorldNormal);
    float minBias = 0.001;
    float maxBias = 0.5;
    float bias = max(maxBias * (1.0 - dot(worldNormal, normalize(lightPos - vWorldPos))), minBias); 

    vec2 shadowCoords = (vLightSpacePos.xy / vLightSpacePos.w) * 0.5 + 0.5;

    float sampledLinearDepth = texture(depthMap, shadowCoords).x;
    // float sampledLinearDepth = (2.0 * nearFar.x * nearFar.y) / (nearFar.y + nearFar.x - sampledDepth * (nearFar.y - nearFar.x));

    float depth = (vLightSpacePos.z / vLightSpacePos.w) * 2.0 - 1.0;
    float linearDepth = (2.0 * nearFar.x * nearFar.y) / (nearFar.y + nearFar.x - depth * (nearFar.y - nearFar.x));
    // float visible = depth - 0.1 > sampledDepth ? 0.0 : 1.0;
    float visible = linearDepth - bias > sampledLinearDepth ? 0.0 : 1.0;

    // float visible = depth / nearFar.y;
    // float visible = sampledDepth / nearFar.y;

    glFragColor = vec4(visible, visible, visible, 1.0);
}
