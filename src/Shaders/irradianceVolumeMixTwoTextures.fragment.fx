uniform sampler2D texture1;
uniform sampler2D texture2;
uniform float globalIllumStrength;
uniform float directIllumStrength;

varying vec2 vPosition;

void main ( void ) {
    vec2 uv2 = (vPosition + 1.) * 0.5 ;
    vec3 tempColor = texture(texture1, uv2).rgb  * directIllumStrength +  texture(texture2, uv2).rgb * globalIllumStrength;
    gl_FragColor = vec4(tempColor, 1.);
}