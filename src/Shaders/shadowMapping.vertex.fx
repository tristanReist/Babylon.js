// Attributes
in vec3 position;
in vec3 normal;
in vec2 uv2;

uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;

// out vec4 vLightSpacePos;
out vec3 vWorldPos;
out vec3 vWorldNormal;
out vec2 vUV2;

void main(void) {
    mat3 normalMatrix = transpose(inverse(mat3(world)));
    vWorldPos = vec3(world * vec4(position, 1.0));
    vWorldNormal = (normalMatrix * normal).xyz;
    vUV2 = uv2;
    gl_Position = vec4(vUV2 * 2.0 - 1.0, 0.0, 1.0);
}
