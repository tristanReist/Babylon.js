#version 300 es

layout(location = 0) out vec4 glFragColor;

// Attributes
in vec2 vUV;
in vec4 vWorldPos;    // world pos of receiving element
in vec3 vWorldNormal; // world normal of receiving element

uniform samplerCube depthMap;

uniform vec3 lightPos;
uniform vec2 nearFar;
uniform float normalBias;

uniform mat4 view;

vec3 r;           // Direction from shooter to receiver

float visible()
{
  vec3 worldPos = vWorldPos.xyz / vWorldPos.w;
  // Look up projected point
  vec3 directionToLight = vec3(view * vec4(worldPos, 1.0)).xyz*vec3(1.0, -1.0, 1.0);
   
  vec3 r2 = lightPos - worldPos;
  vec3 worldLightDir = normalize(r2);

  float ndl = dot(vWorldNormal, worldLightDir);
  float sinNL = sqrt(1.0 - ndl * ndl);
  float nBias = normalBias * sinNL;

  vec3 absDir = abs(directionToLight);
  float depth = max(max(absDir.x, absDir.y), absDir.z);
  float farMinusNear = nearFar.y - nearFar.x;
  depth = ((nearFar.y + nearFar.x) - 2.0 * nearFar.y * nearFar.x / depth) / farMinusNear;
  
  // float shadow = texture(depthMap, directionToLight).x + nBias;
  float shadow = texture(depthMap, directionToLight).x;
  // return vec3(shadow - depth);
  return step(depth, shadow);
}

void main(void) {
    float visible = visible();
    glFragColor = vec4(visible, visible, visible, 1.0);
}
