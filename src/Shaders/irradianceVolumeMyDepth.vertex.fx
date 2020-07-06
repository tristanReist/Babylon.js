attribute vec3 position;


uniform mat4 world;
uniform mat4 projection;
uniform mat4 view;

varying float depth;


void main( void )
{
  
    depth = (view * world * vec4(position, 1.0)).z;
    gl_Position = projection * view * world * vec4(position, 1.0);
}


