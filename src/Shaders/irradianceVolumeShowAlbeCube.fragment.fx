varying vec3 vPosition;

uniform samplerCube albedo;


void main(void) 
{
    //Changing y & z and neg for y, because it is inverted in babjs
    vec3 pos = vec3(vPosition.x, - vPosition.y, vPosition.z);
    gl_FragColor = vec4(textureCube(albedo, pos).rgb, 1);
}