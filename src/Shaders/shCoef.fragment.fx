varying vec2 vUV;

void main(){
    vec4 color = vec4(1., 1., 1., 1.);


    if (vUV.x >= -1. && vUV.x < -0.66){
        color = vec4(1., 0., 0., 1.);
    }
    if (vUV.x >= -0.66 && vUV.x < -0.33 ){
        color = vec4(0., 1., 0., 1.);
    }
    if (vUV.x >= -0.33 && vUV.x < 0.){
        color = vec4(0., 0., 1., 1.);
    }
    if (vUV.x >= 0. && vUV.x < 0.33){
        color = vec4(0., 1., 1., 1.);
    }
    if (vUV.x >= 0.33 && vUV.x < 0.66){
        color = vec4(1., 1., 0., 1.);
    }

    gl_FragColor = color;
}