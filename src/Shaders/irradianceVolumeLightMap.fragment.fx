varying vec3 vPosition;

uniform mat4 world;
uniform mat4 projection;
uniform mat4 view;
uniform sampler2D depth;


 void main(){

    vec4 shadow_view = view * world * vec4(vPosition, 1.0);
    vec4 shadow_device = projection * shadow_view;
    vec2 shadow_coord = (shadow_device.xy/shadow_device.w)*0.5+0.5;
    float currentDepth = shadow_view.z / 60.;


    float shadow_value = texture2D(depth, shadow_coord).r ;

    float shadowed = 0.;

    if (shadow_value + 0.005 < currentDepth ){
        shadowed = 1.;
    }

    gl_FragColor = ( 1. - shadowed ) * vec4(1., 1., 1., 1.);
}