attribute vec3 position;
attribute vec3 normal;

uniform vec3 color;
uniform vec3 lightPosition;
uniform mat4 worldViewProjection;
uniform vec3 cameraPosition;
uniform mat4 world;

varying vec4 vVertexw;
varying vec4 vNormalw;
varying vec3 vertColor;
varying vec4 eyeVector;
varying vec4 lightVector;


void main( void )
{
    // vec3 lightPosition = vec3(0,20,10);

    // vertNormal.xyz = normalize(normalMatrix * normal.xyz);
    // vertNormal.w = 0.0;
    vVertexw = world * vec4(position, 1.0);
    vNormalw = normalize(world * vec4(normal, 0));
    eyeVector = normalize(vec4(cameraPosition, 1) - vVertexw);
    lightVector = normalize(-vVertexw + vec4(lightPosition, 1));
    vertColor = color;


    gl_Position = worldViewProjection * vec4(position, 1.0);
}
