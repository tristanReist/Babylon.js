varying vec2 vUV2;

uniform sampler2D irradianceMap;
uniform sampler2D text;

void main ( void ){
    vec2 uv = vec2(vUV2.x, vUV2.y);
    vec4 textureColor = vec4(texture2D(text, uv).rgb, 1);
    vec4 irradianceColor = texture2D(irradianceMap, uv);
    gl_FragColor = irradianceColor + textureColor;
}