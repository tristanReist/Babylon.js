// Attributes
in vec3 position;
in vec3 normal;
in vec2 uv2;

uniform mat4 world;

out vec2 vUV;
out vec4 vWorldPos;
out vec3 vWorldNormal;

void main(void) {
        vUV = uv2;
        vWorldPos = world * vec4(position, 1.0);
        vWorldNormal = (world * vec4(normal, 0.0)).xyz;
        gl_Position = vec4(vUV * 2. - 1., 0.0, 1.0);
}
