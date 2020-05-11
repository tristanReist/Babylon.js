varying vec3 vPosition;

uniform samplerCube envMap;
uniform samplerCube envMapUV;
uniform sampler2D irradianceMap;
uniform sampler2D directIlluminationLightMap;
uniform bool firstBounce;

void main ( void ) {
    vec2 uv = textureCube(envMapUV, vPosition).rg;
    vec4 diffuse = vec4(textureCube(envMap, vPosition).rgb, 1.);
    vec4 irradiance =texture(irradianceMap, uv);
    if ( irradiance.a != 0. ){
       irradiance /= irradiance.a;
    }
        gl_FragColor = (irradiance + texture(directIlluminationLightMap, uv)) * diffuse;
}