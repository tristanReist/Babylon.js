varying vec3 vPosition;
varying vec3 vNormal;

uniform mat4 world;

uniform vec3 probePosition[NUM_PROBES];
uniform vec3 shCoef[NUM_PROBES * 9];

uniform vec3 numberProbesInSpace;
uniform vec3 boxSize;
uniform vec3 bottomLeft;
uniform int isUniform;



vec2[8] responsibleProbesUniform( vec4 position ) {
    vec2 responsibleProbes[8];

    // Recherche du Z :

    float distProbesZ = (boxSize.z / (numberProbesInSpace.z));
    int indexZ = int(floor((position.z - bottomLeft.z) /  distProbesZ));
    float zd = (position.z - (bottomLeft.z + float(indexZ) * distProbesZ)) / ((bottomLeft.z + float(indexZ + 1) * distProbesZ) - (bottomLeft.z + float(indexZ) * distProbesZ));
    
    int multiplier = int(numberProbesInSpace.x * numberProbesInSpace.y);
    if (indexZ < 0){
        responsibleProbes[1] = vec2(0, 0.);
        responsibleProbes[0] = vec2(-1, 0.);
    }
    else if (indexZ == int(numberProbesInSpace.z) - 1){
        responsibleProbes[0] = vec2(indexZ * multiplier, 0.);
        responsibleProbes[1] = vec2(-1, 0.);
    }
    else {
        responsibleProbes[0]= vec2(indexZ * multiplier, 0.);
        responsibleProbes[1] = vec2((indexZ + 1) * multiplier, 0.);
    }


    // Recherche de la position y
    float distProbesY = (boxSize.y / (numberProbesInSpace.y));
    int indexY =  int(floor((position.y - bottomLeft.y) / distProbesY));
    float yd = (position.y - (bottomLeft.y + float(indexY) * distProbesY)) / ((bottomLeft.y + float(indexY + 1) * distProbesY) - (bottomLeft.y + float(indexY) * distProbesY));

    multiplier = int(numberProbesInSpace.x);
    if (indexY < 0){
        for (int i = 0; i < 2; i++){
            responsibleProbes[i + 2 ] = responsibleProbes[i];
            responsibleProbes[i].x = -1.; 
        }
    }
    else if (indexY == int(numberProbesInSpace.y) - 1){
        for (int i = 0; i < 2; i++){
            responsibleProbes[i + 2 ] = vec2(-1, 0.);
            if (responsibleProbes[i].x != -1. ){
                responsibleProbes[i].x += float(indexY * multiplier);
            }
        }
    }
    else{
        for (int i = 0; i < 2; i++){
            responsibleProbes[i + 2] = responsibleProbes[i];
            if (responsibleProbes[i].x != -1.){
                responsibleProbes[i].x += float(indexY * multiplier);
                responsibleProbes[i + 2].x += float((indexY + 1) * multiplier);
            }
        }
    }

    //Recherche de la position x
    float distProbesX = (boxSize.x / (numberProbesInSpace.x ));
    int indexX =  int(floor((position.x - bottomLeft.x) / distProbesX));
   float xd = (position.x - (bottomLeft.x + float(indexX) * distProbesX)) / ((bottomLeft.x + float(indexX + 1) * distProbesX) - (bottomLeft.x + float(indexX) * distProbesX));

    multiplier = 1;
    if (indexX < 0){
        for (int i = 0; i < 4; i++){
            responsibleProbes[i + 4 ] = responsibleProbes[i];
            responsibleProbes[i].x = -1.; 
        }
    }

    else if (indexX == int(numberProbesInSpace.x) - 1){
        for (int i = 0; i < 4; i++){
            responsibleProbes[i + 4 ] = vec2(-1, 0.);
            if (responsibleProbes[i].x != -1.){
                responsibleProbes[i].x += float(indexX * multiplier);
            }
        }
    }

    else{
        for (int i = 0; i < 4; i++){
            responsibleProbes[i + 4] = responsibleProbes[i];
            if (responsibleProbes[i].x != -1. ){
                responsibleProbes[i].x += float(indexX * multiplier);
                responsibleProbes[i + 4].x += float((indexX + 1)* multiplier);
            }
        }
    }

     //Works in alll casees because everything simplify itself, if it is negative
        responsibleProbes[0].y = (1. - xd) * (1. - yd) * (1. - zd);
        responsibleProbes[1].y = (1. - xd) * (1. - yd) * (zd);   
        responsibleProbes[2].y = (1. - xd) * (yd) * (1. - zd);
        responsibleProbes[3].y = (1. - xd) * (yd) * (zd);
        responsibleProbes[4].y = (xd) * (1. - yd) * (1. - zd);
        responsibleProbes[5].y = (xd) * (1. - yd) * (zd);
        responsibleProbes[6].y = (xd) * (yd) * (1. - zd);
        responsibleProbes[7].y = (xd) * (yd) * (zd);

    return responsibleProbes;
}

vec4 probeContribution(int probe, float weight, vec4 position, vec4 normal) {
    vec3 L00 = shCoef[probe * 9];

    vec3 L11 = shCoef[probe * 9 + 1];
    vec3 L10 = shCoef[probe * 9 + 2];
    vec3 L1m1 = shCoef[probe * 9 + 3];

    vec3 L22 = shCoef[probe * 9 + 4];
    vec3 L21 = shCoef[probe * 9 + 5];
    vec3 L20 = shCoef[probe * 9 + 6];
    vec3 L2m1 = shCoef[probe * 9 + 7];
    vec3 L2m2 = shCoef[probe * 9 + 8];

    vec4 direction = position - vec4(probePosition[probe], 1.);
    if (dot(direction, normal) >= 0.){
        return vec4(0., 0., 0., 0.);
    }

    direction = vec4(normalize( - normal.xyz), 1.);
    
    direction.yz = vec2(- direction.z, direction.y); 
// ____________________________________________
    vec3 x1, x2, x3;

    vec4 cAr = vec4(L11.r, L10.r, L1m1.r, L00.r);
    vec4 cAg = vec4(L11.g, L10.g, L1m1.g, L00.g);
    vec4 cAb = vec4(L11.b, L10.b, L1m1.b, L00.b);

    vec4 cBr = vec4(L2m2.r, L2m1.r, L20.r, L21.r);
    vec4 cBg = vec4(L2m2.g, L2m1.g, L20.g, L21.g);
    vec4 cBb = vec4(L2m2.b, L2m1.b, L20.b, L21.b);

    // Linear + constant polynomial terms
    x1.r = dot(cAr, direction);
    x1.g = dot(cAg, direction);
    x1.b = dot(cAb, direction);

    // 4 of the quadratic polynomial terms
    vec4 vB = direction.xyzz * direction.yzzx;

    x2.r = dot(cBr, vB);
    x2.g = dot(cBg, vB);
    x2.b = dot(cBb, vB);

    // Final quadratic polynomial
    float vC = direction.x * direction.x - direction.y * direction.y;
    x3 = L22.rgb * vC;

    return vec4( weight * (x1 + x2 + x3) , weight);    
    // return vec4( x1 + x2 + x3 , 1.);
}



void main(){
    vec4 wPosition =  world *  vec4(vPosition, 1.); 
    vec4 normalizeNormal = normalize(world * vec4(vNormal, 0.));

    vec4 color = vec4(0., 0., 0., 0.);
    if (isUniform == 1){
        vec2 probeIndices[] = responsibleProbesUniform(wPosition);
        for (int i = 0 ; i < 8 ; i++){
            if (int(probeIndices[i].x) != -1){
                color += probeContribution(int(probeIndices[i].x), probeIndices[i].y, wPosition, normalizeNormal);
            }
        }
    }
    


    else {
        for ( int i = 0; i < NUM_PROBES; i++ ) {
            color += probeContribution(i, 1., wPosition, normalizeNormal);
        }
    }
 
    if (color.w == 0.){
        color.w = 1.;
    }
    
    color /= color.w;

    gl_FragColor = color;
}