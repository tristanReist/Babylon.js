varying vec3 vPosition;

uniform samplerCube envMap;
uniform samplerCube envMapUV;
uniform sampler2D irradianceMap;
uniform bool firstBounce;

void main ( void ) {
    vec2 uv = textureCube(envMapUV, vPosition).rg;
    vec4 color = vec4(textureCube(envMap, vPosition).rgb, 1.);
    vec4 irradiance =texture(irradianceMap, uv);
    if ( irradiance.a != 0. ){
       irradiance /= irradiance.a;
    }
    if (firstBounce){
         gl_FragColor = color;
    }
    else {
        gl_FragColor = irradiance;
    }
}