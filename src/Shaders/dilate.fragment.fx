in vec2 vUV;
uniform vec2 texelSize;
uniform sampler2D inputTexture;

void main(void) {
    vec4 c = texture2D(inputTexture, vUV);

    c = c.a>0.0? c : texture2D(inputTexture, vUV - texelSize);

    c = c.a>0.0? c : texture2D(inputTexture, vUV + vec2(0, -texelSize.y));

    c = c.a>0.0? c : texture2D(inputTexture, vUV + vec2(texelSize.x, -texelSize.y));

    c = c.a>0.0? c : texture2D(inputTexture, vUV + vec2(-texelSize.x, 0));

    c = c.a>0.0? c : texture2D(inputTexture, vUV + vec2(texelSize.x, 0));

    c = c.a>0.0? c : texture2D(inputTexture, vUV + vec2(-texelSize.x, texelSize.y));

    c = c.a>0.0? c : texture2D(inputTexture, vUV + vec2(0, texelSize.y));

    c = c.a>0.0? c : texture2D(inputTexture, vUV + texelSize);

    gl_FragColor = c;
}
