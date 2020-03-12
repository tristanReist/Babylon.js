

varying vec4 vVertexw;
varying vec4 vNormalw;
varying vec3 vertColor;
varying vec4 eyeVector;
varying vec4 lightVector;

uniform float pa;
uniform float pd;
uniform float ps;
uniform float shininess;

float cosinus(in vec4 vecteur1, in vec4 vecteur2){
    return(dot(vecteur1, vecteur2) / (length(vecteur1) * length(vecteur2)));
}


void main( void )
{   
    float ambient = pa;
    float diffuse = pd * max(cosinus(lightVector, vNormalw), 0.);
    vec4 angleW = normalize(eyeVector + lightVector);

    float specular = ps * pow(max(cosinus(angleW, vNormalw), 0.), 64.); 

         gl_FragColor = vec4(vertColor *  (ambient + diffuse) + specular, 1);//+ diffuse);// + specular);

    
}
