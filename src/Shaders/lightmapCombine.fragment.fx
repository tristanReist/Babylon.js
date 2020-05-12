#version 300 es
precision highp float;

in vec2 vUV;

// Current mesh lightmap
uniform sampler2D inputTexture;
uniform vec2 texelSize;

// out vec4 outColor;
layout(location = 0) out vec4 glFragData[7];

void main() {
	vec4 n = texture(inputTexture, clamp(vec2(vUV.x, vUV.y + texelSize.y), 0.0, 1.0));
	vec4 s = texture(inputTexture, clamp(vec2(vUV.x, vUV.y - texelSize.y), 0.0, 1.0));
	vec4 e = texture(inputTexture, clamp(vec2(vUV.x + texelSize.x, vUV.y), 0.0, 1.0));
	vec4 w = texture(inputTexture, clamp(vec2(vUV.x - texelSize.x, vUV.y), 0.0, 1.0));
	vec4 ne = texture(inputTexture, clamp(vec2(vUV.x + texelSize.x, vUV.y + texelSize.y), 0.0, 1.0));
	vec4 se = texture(inputTexture, clamp(vec2(vUV.x + texelSize.x, vUV.y - texelSize.y), 0.0, 1.0));
	vec4 nw = texture(inputTexture, clamp(vec2(vUV.x - texelSize.x, vUV.y + texelSize.y), 0.0, 1.0));
	vec4 sw = texture(inputTexture, clamp(vec2(vUV.x - texelSize.x, vUV.y - texelSize.y), 0.0, 1.0));

	glFragData[4] = vec4((n.xyz + s.xyz + e.xyz + w.xyz + nw.xyz + sw.xyz + ne.xyz + se.xyz) / (8.0), 1.0);
}
