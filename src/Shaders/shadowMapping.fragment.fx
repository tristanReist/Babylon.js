#version 300 es

layout(location = 0) out vec4 glFragColor;

// Attributes
// in vec4 vLightSpacePos;
in vec3 vWorldPos;    // world pos of receiving element
in vec3 vWorldNormal; // world normal of receiving element

uniform samplerCube depthMap;

uniform vec3 lightPos;
uniform vec2 nearFar;
uniform float normalBias;

uniform mat4 view;

vec3 worldNormal;

// float visible()
// {
//   // Look up projected point
//   vec3 directionToLight = vec3(view * vec4(worldPos, 1.0)).xyz*vec3(1.0, -1.0, 1.0);
//    
//   // Normal inset Bias. TODO merge with formFactorEnergy
//   vec3 r2 = shootPos - worldPos;
//   vec3 worldLightDir = normalize(r2);
// 
//   float ndl = dot(worldNormal, worldLightDir);
//   float sinNL = sqrt(1.0 - ndl * ndl);
//   float nBias = normalBias * sinNL;
// 
//   // float depth = (length(directionToLight - worldNormal * nBias) + nearFar.x) / nearFar.y;
//   vec3 absDir = abs(directionToLight);
//   float depth = max(max(absDir.x, absDir.y), absDir.z);
//   float farMinusNear = nearFar.y - nearFar.x;
//   // TODO : there is a more efficient way to project depth without this costly operation for each fragment
//   depth = ((nearFar.y + nearFar.x) - 2.0 * nearFar.y * nearFar.x / depth) / farMinusNear;
//   // depth = (length(directionToLight - worldNormal * nBias) + nearFar.x) / nearFar.y;
//   // depth = clamp(depth, 0., 1.0);
// 
//   // directionToLight = normalize(directionToLight);
//   
//   float shadow = texture(itemBuffer, directionToLight).x + nBias;
//   // return vec3(shadow - depth);
//   return step(depth, shadow);
// }

void main(void) {
    worldNormal = normalize(vWorldNormal);

    vec3 directionToLight = vec3(view * vec4(vWorldPos, 1.0)).xyz * vec3(1.0, -1.0, 1.0);
    float minBias = 0.00001;
    float maxBias = 0.0000001;
    float bias = max(maxBias * (1.0 - dot(worldNormal, normalize(lightPos - vWorldPos))), minBias); 

    float sampledDepth = texture(depthMap, directionToLight).x;

    vec3 absDir = abs(directionToLight);
    float depth = max(max(absDir.x, absDir.y), absDir.z);
    float farMinusNear = nearFar.y - nearFar.x;
    depth = ((nearFar.y + nearFar.x) - 2.0 * nearFar.y * nearFar.x / depth) / farMinusNear;

    float visible = step(depth - bias, sampledDepth);

    // float visible = depth / nearFar.y;
    // float visible = sampledDepth / nearFar.y;

    glFragColor = vec4(visible, visible, visible, 1.0);
}
