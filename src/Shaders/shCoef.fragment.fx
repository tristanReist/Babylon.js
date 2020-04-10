varying vec2 vUV;

uniform int numberCube;
uniform int resolution;
uniform sampler2D cubeMapLine;

mat3 computeTransformationMatrix(int face) {
    if (face == 0) {  //Positive_x
        return mat3(0., 0., 1.,
                    0., 1., 0.,
                    -1., 0., 0.);
    }
    else if (face == 1) { //Negative_Z
        return mat3(-1., 0., 0.,
                    0., 1., 0.,
                    0., 0., -1.);
    }
    else if (face == 2) { //Negative_X
        return mat3(0., 0., -1.,
                    0., 1., 0.,
                    1., 0., 0.);
    }
    else if (face == 3) { //Positive_Z
        return mat3(1., 0., 0.,
                    0., 1., 0.,
                    0., 0., 1.);
    }
    else if (face == 4) { //Negative_Y
        return mat3(1., 0., 0.,
                    0., 0., -1.,
                    0., 1., 0.);
    }
    else { //Positive_Y
        return mat3(1., 0., 0.,
                    0., 0., 1.,
                    0., -1., 0.);
    }
}

float computeWeight(int sh, vec3 tempPos, mat3 transformMatrix) {
    vec3 position = transformMatrix * tempPos;
    if ( sh == 0 ){     //L00
        return 0.282095;
    }
    else if ( sh == 1 ){    //L11
        return 0.488603 * position.x; 
    }
    else if ( sh == 2 ){    //L10
        return 0.488603 * position.z; 
    }
    else if ( sh == 3 ){    //L1-1
        return 0.488603 * position.y;  
    }
    else if ( sh == 4 ){    //L22
        return 0.546274 * (position.x * position.x - position.y * position.y);
    }
    else if ( sh == 5 ){    //L21
        return 1.092548 * position.x * position.z;
    }
    else if ( sh == 6 ){    //L20
        return 0.315392 * (3. * position.z * position.z - 1.);
    }
    else if ( sh == 7 ){    //L2-1
        return 1.092548 * position.y * position.z;
    }
    else if (sh == 8 ){                   //L2-2
        return 1.092548 * position.x * position.y;
    }
}

vec4 computeSHCoef(int sh, int currentCube) {
    vec4 color;
    vec3 sum = vec3(0., 0., 0.);
    float divider = 0.;
    for (int i = 0; i < 6; i++){
        //Mat3 to map on cube
        mat3 transformation = computeTransformationMatrix(i); //OK

        for (int x = 0; x < resolution; x++ ){
            float uvX = float(i * resolution + x) / float(resolution * 6); 
            uvX = 2. * uvX - 1.; // Coordonée x entre -1 et 1 de toute la texture
            for (int y = 0; y < resolution; y++ ){
 
                float uvY = float(  currentCube * resolution + y ) / float(resolution * numberCube);
                uvY = 2. * uvY - 1.;
                vec3 textColor = texture2D(cubeMapLine, vec2(uvX, uvY)).rgb; //Semble ok
                
                vec3 tempPos = vec3( -1. + float(x) / (float(resolution) / 2.),
                  -1. + float(y) / (float(resolution)/2.), -1.); // semble OK
                tempPos = normalize(tempPos);
                float weight = computeWeight(sh, tempPos, transformation);
                sum += textColor * weight;
                divider += -tempPos.z; 
            }
        }
    }
    // divider = 1.;
    color = vec4(sum / divider , 1.);
    return color;

}



void main(){
    vec2 uv = ( vUV + 1. ) * 0.5;   
    int cas = int(uv.x * 9.);  //OK
    int currentCube = int(uv.y * float(numberCube));  //OK Attention, c'est en partant du bas 
    currentCube = 0;
    vec4 color = computeSHCoef(cas, currentCube);   // Problème
    gl_FragColor = color; //OK
}