varying vec2 vUV;

uniform int numberCube;
uniform int resolution;
// uniform samplerCube cubeMapArray[10];
uniform samplerCube cubeMapArray[1];

void main() {

    vec4 color = vec4(1., 1., 1., 1.);

    vec2 uv = (vUV + 1.) * 0.5;

    int currentCube = int (uv.y * float(numberCube));
    int pixelY = int((uv.y * float(numberCube) - float(currentCube)) * float(resolution));
    float y = - (-1. + float(pixelY) / (float(resolution) / 2.));
    // float y = - vUV.y; //Our samplerCube are inverse cube mode

    int face = int(uv.x * 6.);
    int pixelInFace = int((uv.x * 6. - float(face)) * float(resolution) );
    float x = -1. + float(pixelInFace) / (float(resolution) / 2.);

 
    for ( int i = 0 ; i < 1; i++ ){
        if (i == currentCube){
            if ( face == 0 ){           //Positive_X
                color =  vec4(textureCube(cubeMapArray[0], vec3(1., y, - x)).rgb, 1); 
            }
            else if ( face == 2 ){      //Negative_X
                color =  vec4(textureCube(cubeMapArray[0], vec3(-1., y, x)).rgb, 1); 
            }
            else if ( face == 4 ) {     //Negative_Y
                color =  vec4(textureCube(cubeMapArray[0], vec3(x, - 1., y)).rgb, 1);
            }
            else if ( face == 5 ) {     //Positive_Y
                color =  vec4(textureCube(cubeMapArray[0], vec3(x, 1., - y)).rgb, 1);
            }
            else if ( face == 3 ){      //Positive_Z
                color =  vec4(textureCube(cubeMapArray[0], vec3(x, y, 1.)).rgb, 1);
            }
            else if ( face == 1 ){      //Negative_Z
                color = vec4(textureCube(cubeMapArray[0], vec3(-x, y, -1.)).rgb, 1.);
            }
        }
    } 


    gl_FragColor = color;


}