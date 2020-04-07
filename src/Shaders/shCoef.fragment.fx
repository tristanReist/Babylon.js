varying vec2 vUV;

void main(){
    vec2 uv = ( vUV + 1. ) * 0.5;
    int cas = int(uv.x * 6.);

    vec4 color = vec4(1., 1., 1., 1.);

    if ( cas == 0 ){
        color = vec4(1., 0., 0., 1.);
    }
    else if (cas == 1 ){
        color = vec4(0., 1., 0., 1.); 
    }
    else if ( cas == 2 ) {
        color = vec4(0., 0., 1., 1.); 
    }
    else if ( cas == 3 ) {
        color = vec4(1., 1., 0., 1.);
    }
    else if ( cas == 4 ){
        color = vec4(0., 1., 1., 1.);
    }

    gl_FragColor = color;
}