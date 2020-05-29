// Attributes
in vec2 vUV;
uniform sampler2D inputTexture;
uniform float _ExposureAdjustment;

float gamma = 2.2;

void main(void) {
<<<<<<< HEAD
    vec3 color = texture2D(inputTexture, vUV).rgb;

        vec3 mapped = vec3(1.0) - exp(-color * _ExposureAdjustment);
        color = pow(mapped, vec3(1.0 / gamma));
    gl_FragColor = vec4(color.rgb, 1.0);
}
=======
	vec3 color = texture2D(inputTexture, vUV).rgb;

        vec3 mapped = vec3(1.0) - exp(-color * _ExposureAdjustment);
        color = pow(mapped, vec3(1.0 / gamma));

	gl_FragColor = vec4(color.rgb, 1.0);
}
>>>>>>> e260fd7860d209e93834ad697f3e0e2dbcbcbf1d
