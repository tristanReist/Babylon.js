varying vec3 vPosition;
varying vec3 vNormal;

uniform mat4 world;

uniform vec3 probePosition[NUM_PROBES];
uniform vec3 shCoef[NUM_PROBES * 9];

uniform vec3 numberProbesInSpace;
uniform vec3 boxSize;
uniform vec3 bottomLeft;
uniform int isUniform;


int[8] responsibleProbesUniform( vec4 position ) {
    int responsibleProbes[] = int[](-1, -1, -1, -1, -1, -1, -1, -1);
    //Chercher les meilleurs trucs
    int number = 0;
    // Recherche du Z :
    int indexZ = int((position.z - bottomLeft.z) / (boxSize.z / (numberProbesInSpace.z + 1.)) ) ;
    int multiplier = int(numberProbesInSpace.x * numberProbesInSpace.y);
    if (indexZ == 0){
        responsibleProbes[0] = 0;
        number += 1;
    } 
    else if (indexZ == int(numberProbesInSpace.z)){
        responsibleProbes[0] = (indexZ - 1) * multiplier ;
        number =+ 1;
    }
    else {
        responsibleProbes[1] = indexZ * multiplier;
        responsibleProbes[0]= (indexZ - 1) * multiplier;
        number += 2;
    }

    // Recherche de la position y
    int indexY =  int((position.y - bottomLeft.y) / (boxSize.y / (numberProbesInSpace.y + 1.)));
    multiplier = int(numberProbesInSpace.x);
    if (indexY == 0){
    }
    else if (indexY == int(numberProbesInSpace.y)){
        for (int i = 0; i < number; i++){
            responsibleProbes[i] += (indexY - 1) * multiplier;
        }
    }
    else {
        for (int i = 0; i < number; i++){
            responsibleProbes[i + number] = responsibleProbes[i];
            responsibleProbes[i] += (indexY - 1) * multiplier;
            responsibleProbes[i + number] += indexY * multiplier;
        }
        number *= 2;
    }


    //Recherche de la position x
    int indexX =  int((position.x - bottomLeft.x) / (boxSize.x / (numberProbesInSpace.x + 1.)));
    multiplier = 1;
    if (indexX == 0){
    }
    else if (indexX == int(numberProbesInSpace.x)){
        for (int i = 0; i < number; i++){
            responsibleProbes[i] += (indexX - 1 ) * multiplier;
        }
    }
    else {
        for (int i = 0; i < number; i++){
            responsibleProbes[i + number] = responsibleProbes[i];
            responsibleProbes[i] += (indexX - 1) * multiplier;
            responsibleProbes[i + number] += indexX * multiplier;
        }
        number *= 2;
    }

    return responsibleProbes;
}

vec4 probeContribution(int probe, vec4 position, vec4 normal) {
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

    direction = vec4(normalize(direction.xyz), 1.);
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


    return vec4(x1 + x2 + x3, 1.);;
}



void main(){
    vec4 wPosition =  world *  vec4(vPosition, 1.); 
    vec4 normalizeNormal = normalize(world * vec4(vNormal, 0.));

    vec4 color = vec4(1., 0., 0., 0.);
    if (isUniform == 1){
        int probeIndices[] = responsibleProbesUniform(wPosition);
        for (int i = 0; i < 8; i++){
            if (probeIndices[i] == 14 + 9){
                color = vec4(1., 1., 1., 1.);
            }
        }

    }

    else {
        for ( int i = 0; i < NUM_PROBES; i++ ) {
            color += probeContribution(i, wPosition, normalizeNormal);
        }
    }
    if (color.w == 0.){
        color.w = 1.;
    }
    
    color /= color.w;



    gl_FragColor = color;
}