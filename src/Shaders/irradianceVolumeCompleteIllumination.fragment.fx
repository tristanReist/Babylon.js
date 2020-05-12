varying vec2 vUV;

uniform sampler2D irradianceMap;
uniform sampler2D text;

void main ( void ){
    vec2 uv = vec2(vUV.x, 1. - vUV.y);
    vec4 textureColor = vec4(texture2D(text, uv).rgb, 1);
    vec4 irradianceColor = texture2D(irradianceMap, uv);
    if ( irradianceColor.a != 0. ){
        irradianceColor /= irradianceColor.a;
    }
    gl_FragColor = irradianceColor + textureColor;
}