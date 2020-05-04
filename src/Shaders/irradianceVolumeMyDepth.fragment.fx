varying float depth;

void main (void) 
{ 
    gl_FragColor = vec4(depth / 60., 0, 0, 1);     
}
