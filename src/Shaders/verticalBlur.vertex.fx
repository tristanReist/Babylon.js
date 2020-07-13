in vec2 position;

out vec2 vUV;

void main(void)
{
    vUV = position * 0.5 + 0.5;
    gl_Position = vec4(position.x, position.y, 0.0, 1.0);
}
