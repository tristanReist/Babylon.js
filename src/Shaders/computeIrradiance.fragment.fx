varying vec4 vNormal;

uniform vec3 L00;

uniform vec3 L11;
uniform vec3 L10;
uniform vec3 L1m1;

uniform vec3 L22;
uniform vec3 L21;
uniform vec3 L20;
uniform vec3 L2m1;
uniform vec3 L2m2;

void main( void ) {
    
    vec3 x1, x2, x3;

    vec4 cAr = vec4(L11.r, L10.r, L1m1.r, L00.r);
    vec4 cAg = vec4(L11.g, L10.g, L1m1.g, L00.g);
    vec4 cAb = vec4(L11.b, L10.b, L1m1.b, L00.b);

    vec4 cBr = vec4(L2m2.r, L2m1.r, L20.r, L21.r);
    vec4 cBg = vec4(L2m2.g, L2m1.g, L20.g, L21.g);
    vec4 cBb = vec4(L2m2.b, L2m1.b, L20.b, L21.b);

    // Linear + constant polynomial terms
    x1.r = dot(cAr, vNormal);
    x1.g = dot(cAg, vNormal);
    x1.b = dot(cAb, vNormal);

    // 4 of the quadratic polynomial terms
    vec4 vB = vNormal.xyzz * vNormal.yzzx;

    x2.r = dot(cBr, vB);
    x2.g = dot(cBg, vB);
    x2.b = dot(cBb, vB);

    // Final quadratic polynomial
    float vC = vNormal.x * vNormal.x - vNormal.y * vNormal.y;
    x3 = L22.rgb * vC;



    gl_FragColor = vec4(x1 + x2 + x3, 1.);
}
