// Attributes
in vec3 position;
in vec3 normal;
in vec2 uv2;

uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;

out vec4 vLightSpacePos;
out vec3 vWorldPos;
out vec3 vWorldNormal;

void main(void) {
        vWorldPos = vec3(world * vec4(position, 1.0));
        vWorldNormal = (world * vec4(normal, 0.0)).xyz;
        vLightSpacePos = projection * view * world * vec4(position, 1.0);
        gl_Position = vec4(uv2 * 2. - 1., 0.0, 1.0);
        // gl_Position = vLightSpacePos;
}
