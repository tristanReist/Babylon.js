varying vec3 vPosition;

precision highp sampler2DArray;

uniform samplerCube envMap;
uniform samplerCube envMapUV;
uniform sampler2DArray irradianceMapArray;
uniform sampler2DArray directIlluminationLightMapArray;
uniform bool firstBounce;
uniform int numberLightmap;

void main ( void ) {
    vec3 uv = textureCube(envMapUV, vPosition).rgb;
    uv.z *= float(numberLightmap);
    uv.z = round(uv.z);
    vec4 diffuse = vec4(textureCube(envMap, vPosition).rgb, 1.);
   // vec4 irradiance =texture(irradianceMapArray, vec2(uv.xy));//, uv.z));
   vec4 irradiance =texture(irradianceMapArray, vec3(uv.xy, uv.z));
    if ( irradiance.a != 0. ){
       irradiance /= irradiance.a;
    }
    gl_FragColor = (irradiance + texture(directIlluminationLightMapArray, vec3(uv.xy, uv.z))) * diffuse;
    //gl_FragColor = (irradiance + texture(directIlluminationLightMapArray, vec2(uv.xy))) * diffuse;//, uv.z))) * diffuse;
}