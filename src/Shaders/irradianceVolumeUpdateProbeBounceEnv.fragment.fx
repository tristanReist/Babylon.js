varying vec3 vPosition;

uniform samplerCube envMap;
uniform samplerCube envMapUV;
uniform sampler2D irradianceMap;

void main ( void ) {
    vec2 uv = textureCube(envMapUV, vPosition).rg;
    vec4 color = vec4(textureCube(envMap, vPosition).rgb, 1.);
    vec4 irradiance = vec4(texture(irradianceMap, uv).rgb, 1.);
    if (color.rgb == vec3(0., 0., 0.)){
        gl_FragColor = irradiance;
    }
    else {
        gl_FragColor = color;
    }
}