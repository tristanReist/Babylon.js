in vec2 vUV;
uniform vec2 texelSize;
uniform sampler2D inputTexture;

void main(void) {
    vec4 c = texture2D(inputTexture, vUV);

    c = c.a > 0.0 ? c : texture2D(inputTexture, vUV - texelSize);

    c = c.a > 0.0 ? c : texture2D(inputTexture, vUV + vec2(0, -texelSize.y));

    c = c.a > 0.0 ? c : texture2D(inputTexture, vUV + vec2(texelSize.x, -texelSize.y));

    c = c.a > 0.0 ? c : texture2D(inputTexture, vUV + vec2(-texelSize.x, 0));

    c = c.a > 0.0 ? c : texture2D(inputTexture, vUV + vec2(texelSize.x, 0));

    c = c.a > 0.0 ? c : texture2D(inputTexture, vUV + vec2(-texelSize.x, texelSize.y));

    c = c.a > 0.0 ? c : texture2D(inputTexture, vUV + vec2(0, texelSize.y));

    c = c.a > 0.0 ? c : texture2D(inputTexture, vUV + texelSize);

    gl_FragColor = c;

    // vec4 c = texture2D(inputTexture, vUV);

    // float minSampleCount = 2.0;
    // float sampleCount = 32.0;
    // float minValue = minSampleCount / sampleCount;

    // c = c.r > minValue ? c : texture2D(inputTexture, vUV - texelSize);

    // c = c.r > minValue ? c : texture2D(inputTexture, vUV + vec2(0, -texelSize.y));

    // c = c.r > minValue ? c : texture2D(inputTexture, vUV + vec2(texelSize.x, -texelSize.y));

    // c = c.r > minValue ? c : texture2D(inputTexture, vUV + vec2(-texelSize.x, 0));

    // c = c.r > minValue ? c : texture2D(inputTexture, vUV + vec2(texelSize.x, 0));

    // c = c.r > minValue ? c : texture2D(inputTexture, vUV + vec2(-texelSize.x, texelSize.y));

    // c = c.r > minValue ? c : texture2D(inputTexture, vUV + vec2(0, texelSize.y));

    // c = c.r > minValue ? c : texture2D(inputTexture, vUV + texelSize);

    // if (c.r >= 8.0 / 32.0) {
    //     gl_FragColor = vec4(1.0);
    // } else if (c.r > minValue) {
    //     gl_FragColor = c;
    // } else {
    //     gl_FragColor = vec4(0.0);
    // }

    // gl_FragColor = c;
}
