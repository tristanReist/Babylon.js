attribute vec3 position;

varying vec2 vUV;

void main( void )
{
    /*
    float x = position.x;
    float y = position.y;
    float z = position.z;
    int u = 0;
    if (x > 0.99){
        u = 0;
    }
    else if (x < -0.99){
        u = 1;
    }
    else if ( y > 0.99){
        u = 2;
    }
    else if (y < -0.99){
        u = 3;
    }
    else if ( z > 0.99){
        u = 4;
    }
    else {
        u = 5;
    }

    vFace = u;

   gl_Position = vec4(float(u) / 6., 0., 0., 1.);
*/

    vUV = vec2(position.x, position.y);
    gl_Position = vec4(position.x, position.y, 0, 1);
}