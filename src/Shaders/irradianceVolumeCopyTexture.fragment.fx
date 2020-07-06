uniform sampler2D texture1;


varying vec2 vUV2;

void main ( void ) {
    vec2 uv2 = vUV2;
    vec3 tempColor = texture(texture1, uv2).rgb;
    gl_FragColor = vec4(tempColor, 1.);
}