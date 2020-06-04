varying vec2 vUV;
varying vec2 vUV2;
varying vec3 wNormal;
varying vec3 wPosition;

uniform vec3 probePosition;
uniform vec3 albedoColor;
uniform sampler2D albedoTexture;
uniform bool hasTexture;


uniform sampler2D irradianceMap;
uniform sampler2D directIlluminationLightmap;


void main ( void ) {

    vec3 vector = wPosition - probePosition;
    vec4 diffuseColor;

    if (hasTexture) {
        diffuseColor = vec4(texture(albedoTexture, vUV));
    }
    else {
        diffuseColor = vec4(albedoColor, 1.);
    }

    vec4 irradiance = texture(irradianceMap, vUV2);
    vec4 directIllumination = clamp(texture(directIlluminationLightmap, vec2(vUV2.x, vUV2.y)) * 1.5, 0., 1.);


    gl_FragColor = (irradiance + directIllumination ) * diffuseColor;
   
}

/*
// varying vec3 vPosition;

// precision highp sampler2DArray;

// uniform samplerCube envMap;
// uniform samplerCube envMapUV;
// uniform sampler2D irradianceMapArray[2];
// uniform sampler2D directIlluminationLightMapArray[2];
// uniform int numberLightmap;

// void main ( void ) {
//     vec3 uv = textureCube(envMapUV, vPosition).rgb;
//     uv.z *= float(numberLightmap);
//     uv.z = round(uv.z);
//     vec4 diffuse = vec4(textureCube(envMap, vPosition).rgb, 1.);
//  //  vec4 irradiance =texture(irradianceMapArray, vec2(uv.xy));//, uv.z));
//     vec4 irradiance =texture(irradianceMapArray, vec3(uv.xy, uv.z));
//     if ( irradiance.a != 0. ){
//        irradiance /= irradiance.a;
//     }

//     gl_FragColor = (irradiance + texture(directIlluminationLightMapArray, vec3(uv.xy, 0))) * diffuse;
//     //gl_FragColor = (irradiance + texture(directIlluminationLightMapArray, vec2(uv.xy))) * diffuse;//, uv.z))) * diffuse;
// }
*/