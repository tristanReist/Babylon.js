uniform sampler2D directLightmap;
uniform sampler2D irradianceLightmap;

uniform sampler2D albedoTexture;
uniform vec3 albedoColor;
uniform int hasTexture;

varying vec2 vUV;
varying vec2 vUV2;

void main ( void ) {
    vec2 uv2 = vUV2;
    vec3 tempColor = texture(directLightmap, uv2).rgb + 1.2 * texture(irradianceLightmap, uv2).rgb;
    if (hasTexture > 0 ){
        tempColor *= texture(albedoTexture, vUV).rgb;
    }
    else {
        tempColor *= albedoColor;
    }
    gl_FragColor = vec4(tempColor, 1.);
}