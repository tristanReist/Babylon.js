#include<__decl__defaultFragment>

#if defined(BUMP) || !defined(NORMAL)
#extension GL_OES_standard_derivatives : enable
#endif

#define CUSTOM_FRAGMENT_BEGIN

#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif

// Constants
#define RECIPROCAL_PI2 0.15915494

uniform vec3 vEyePosition;
uniform vec3 vAmbientColor;

// Input
varying vec3 vPositionW;

#ifdef NORMAL
varying vec3 vNormalW;
#endif

#ifdef VERTEXCOLOR
varying vec4 vColor;
#endif

#ifdef MAINUV1
	varying vec2 vMainUV1;
#endif

#ifdef MAINUV2
	varying vec2 vMainUV2;
#endif

// Helper functions
#include<helperFunctions>

// Lights
#include<__decl__lightFragment>[0..maxSimultaneousLights]

#include<lightsFragmentFunctions>
#include<shadowsFragmentFunctions>

// Samplers
#ifdef DIFFUSE
	#if DIFFUSEDIRECTUV == 1
		#define vDiffuseUV vMainUV1
	#elif DIFFUSEDIRECTUV == 2
		#define vDiffuseUV vMainUV2
	#else
		varying vec2 vDiffuseUV;
	#endif
	uniform sampler2D diffuseSampler;
#endif

#ifdef AMBIENT
	#if AMBIENTDIRECTUV == 1
		#define vAmbientUV vMainUV1
	#elif AMBIENTDIRECTUV == 2
		#define vAmbientUV vMainUV2
	#else
		varying vec2 vAmbientUV;
	#endif
	uniform sampler2D ambientSampler;
#endif

#ifdef OPACITY	
	#if OPACITYDIRECTUV == 1
		#define vOpacityUV vMainUV1
	#elif OPACITYDIRECTUV == 2
		#define vOpacityUV vMainUV2
	#else
		varying vec2 vOpacityUV;
	#endif
	uniform sampler2D opacitySampler;
#endif

#ifdef EMISSIVE
	#if EMISSIVEDIRECTUV == 1
		#define vEmissiveUV vMainUV1
	#elif EMISSIVEDIRECTUV == 2
		#define vEmissiveUV vMainUV2
	#else
		varying vec2 vEmissiveUV;
	#endif
	uniform sampler2D emissiveSampler;
#endif

#ifdef LIGHTMAP
	#if LIGHTMAPDIRECTUV == 1
		#define vLightmapUV vMainUV1
	#elif LIGHTMAPDIRECTUV == 2
		#define vLightmapUV vMainUV2
	#else
		varying vec2 vLightmapUV;
	#endif
	uniform sampler2D lightmapSampler;
#endif

#ifdef REFRACTION

#ifdef REFRACTIONMAP_3D
uniform samplerCube refractionCubeSampler;
#else
uniform sampler2D refraction2DSampler;
#endif

#endif

#if defined(SPECULAR) && defined(SPECULARTERM)
	#if SPECULARDIRECTUV == 1
		#define vSpecularUV vMainUV1
	#elif SPECULARDIRECTUV == 2
		#define vSpecularUV vMainUV2
	#else
		varying vec2 vSpecularUV;
	#endif
	uniform sampler2D specularSampler;
#endif

#ifdef ALPHATEST
	uniform float alphaCutOff;
#endif

// Fresnel
#include<fresnelFunction>

// Reflection
#ifdef REFLECTION
#ifdef REFLECTIONMAP_3D
uniform samplerCube reflectionCubeSampler;
#else
uniform sampler2D reflection2DSampler;
#endif

#ifdef REFLECTIONMAP_SKYBOX
varying vec3 vPositionUVW;
#else
#if defined(REFLECTIONMAP_EQUIRECTANGULAR_FIXED) || defined(REFLECTIONMAP_MIRROREDEQUIRECTANGULAR_FIXED)
varying vec3 vDirectionW;
#endif

#endif

#include<reflectionFunction>

#endif

#include<imageProcessingDeclaration>

#include<imageProcessingFunctions>

#include<bumpFragmentFunctions>
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>

#define CUSTOM_FRAGMENT_DEFINITIONS

float w0(float a)
{
    return (1.0f/6.0f)*(a*(a*(-a + 3.0f) - 3.0f) + 1.0f);   // optimized
}

float w1(float a)
{
    return (1.0f/6.0f)*(a*a*(3.0f*a - 6.0f) + 4.0f);
}

float w2(float a)
{
    return (1.0f/6.0f)*(a*(a*(-3.0f*a + 3.0f) + 3.0f) + 1.0f);
}

float w3(float a)
{
    return (1.0f/6.0f)*(a*a*a);
}

float g0(float a)
{
    return w0(a) + w1(a);
}

float g1(float a)
{
    return w2(a) + w3(a);
}

float h0(float a)
{
    return -1.0f + w1(a) / (w0(a) + w1(a));
}

float h1(float a)
{
    return 1.0f + w3(a) / (w2(a) + w3(a));
}

vec4 cubicFilter(float x, vec4 c0, vec4 c1, vec4 c2, vec4 c3)
{
    vec4 r;
    r = c0 * w0(x);
    r += c1 * w1(x);
    r += c2 * w2(x);
    r += c3 * w3(x);
    return r;
}

float c_textureSize = 256.0;
float c_onePixel = 1.0 / 256.0;
float c_twoPixels = 2.0 / 256.0;

// slow but precise bicubic lookup using 16 texture lookups
vec4 tex2DBicubic(sampler2D inputTexture, vec2 uv)
{
    uv = uv * c_textureSize + 0.5;
    float px = floor(uv.x);
    float py = floor(uv.y);
    float fx = fract(uv.x);
    float fy = fract(uv.y);

    return cubicFilter(fy,
                          cubicFilter(fx, texture2D(inputTexture, (vec2(px-1.0, py-1.0) - 0.5) / c_textureSize), texture2D(inputTexture, (vec2(px, py-1.0) - 0.5)/ c_textureSize), texture2D(inputTexture, (vec2(px+1.0, py-1.0) - 0.5) / c_textureSize), texture2D(inputTexture, (vec2(px+2.0,py-1.0) - 0.5) / c_textureSize)),
                          cubicFilter(fx, texture2D(inputTexture, (vec2(px-1.0, py) - 0.5) / c_textureSize),   texture2D(inputTexture, (vec2(px, py) - 0.5) / c_textureSize),   texture2D(inputTexture, (vec2(px+1.0, py) - 0.5) / c_textureSize),   texture2D(inputTexture, (vec2(px+2.0, py) - 0.5) / c_textureSize)),
                          cubicFilter(fx, texture2D(inputTexture, (vec2(px-1.0, py+1.0) - 0.5) / c_textureSize), texture2D(inputTexture, (vec2(px, py+1.0) - 0.5) / c_textureSize), texture2D(inputTexture, (vec2(px+1.0, py+1.0) - 0.5) / c_textureSize), texture2D(inputTexture, (vec2(px+2.0, py+1.0) - 0.5) / c_textureSize)),
                          cubicFilter(fx, texture2D(inputTexture, (vec2(px-1.0, py+2.0) - 0.5) / c_textureSize), texture2D(inputTexture, (vec2(px, py+2.0) - 0.5) / c_textureSize), texture2D(inputTexture, (vec2(px+1.0, py+2.0) - 0.5) / c_textureSize), texture2D(inputTexture, (vec2(px+2.0, py+2.0) - 0.5) / c_textureSize))
                         );
}

// fast bicubic texture lookup using 4 bilinear lookups
// assumes texture is set to non-normalized coordinates, point sampling
vec4 tex2DFastBicubic(sampler2D inputTexture, vec2 uv)
{
    uv = uv * c_textureSize + 0.5;
    float px = floor(uv.x);
    float py = floor(uv.y);
    float fx = fract(uv.x);
    float fy = fract(uv.y);

    // note: we could store these functions in a lookup table texture, but maths is cheap
    float g0x = g0(fx);
    float g1x = g1(fx);
    float h0x = h0(fx);
    float h1x = h1(fx);
    float h0y = h0(fy);
    float h1y = h1(fy);

    vec4 r = g0(fy) * (g0x * texture2D(inputTexture, (vec2(px + h0x, py + h0y) - 0.5) / c_textureSize)   +
                    g1x * texture2D(inputTexture, (vec2(px + h1x, py + h0y) - 0.5) / c_textureSize)) +
          g1(fy) * (g0x * texture2D(inputTexture, (vec2(px + h0x, py + h1y) - 0.5) / c_textureSize)   +
                    g1x * texture2D(inputTexture, (vec2(px + h1x, py + h1y) - 0.5) / c_textureSize));
    return r;
}

float c_x0 = -1.0;
float c_x1 =  0.0;
float c_x2 =  1.0;
float c_x3 =  2.0;

vec3 CubicLagrange (vec3 A, vec3 B, vec3 C, vec3 D, float t)
{
    return
        A * 
        (
            (t - c_x1) / (c_x0 - c_x1) * 
            (t - c_x2) / (c_x0 - c_x2) *
            (t - c_x3) / (c_x0 - c_x3)
        ) +
        B * 
        (
            (t - c_x0) / (c_x1 - c_x0) * 
            (t - c_x2) / (c_x1 - c_x2) *
            (t - c_x3) / (c_x1 - c_x3)
        ) +
        C * 
        (
            (t - c_x0) / (c_x2 - c_x0) * 
            (t - c_x1) / (c_x2 - c_x1) *
            (t - c_x3) / (c_x2 - c_x3)
        ) +       
        D * 
        (
            (t - c_x0) / (c_x3 - c_x0) * 
            (t - c_x1) / (c_x3 - c_x1) *
            (t - c_x2) / (c_x3 - c_x2)
        );
}

//=======================================================================================
vec3 BicubicLagrangeTextureSample (sampler2D inputTexture, vec2 P)
{
    vec2 pixel = P * 256.0 + 0.5;
    vec2 frac = fract(pixel);
    pixel = floor(pixel) / 256.0 - vec2(c_onePixel/2.0);

    vec3 C00 = texture2D(inputTexture, pixel + vec2(-c_onePixel ,-c_onePixel)).rgb;
    vec3 C10 = texture2D(inputTexture, pixel + vec2( 0.0        ,-c_onePixel)).rgb;
    vec3 C20 = texture2D(inputTexture, pixel + vec2( c_onePixel ,-c_onePixel)).rgb;
    vec3 C30 = texture2D(inputTexture, pixel + vec2( c_twoPixels,-c_onePixel)).rgb;

    vec3 C01 = texture2D(inputTexture, pixel + vec2(-c_onePixel , 0.0)).rgb;
    vec3 C11 = texture2D(inputTexture, pixel + vec2( 0.0        , 0.0)).rgb;
    vec3 C21 = texture2D(inputTexture, pixel + vec2( c_onePixel , 0.0)).rgb;
    vec3 C31 = texture2D(inputTexture, pixel + vec2( c_twoPixels, 0.0)).rgb;

    vec3 C02 = texture2D(inputTexture, pixel + vec2(-c_onePixel , c_onePixel)).rgb;
    vec3 C12 = texture2D(inputTexture, pixel + vec2( 0.0        , c_onePixel)).rgb;
    vec3 C22 = texture2D(inputTexture, pixel + vec2( c_onePixel , c_onePixel)).rgb;
    vec3 C32 = texture2D(inputTexture, pixel + vec2( c_twoPixels, c_onePixel)).rgb;

    vec3 C03 = texture2D(inputTexture, pixel + vec2(-c_onePixel , c_twoPixels)).rgb;
    vec3 C13 = texture2D(inputTexture, pixel + vec2( 0.0        , c_twoPixels)).rgb;
    vec3 C23 = texture2D(inputTexture, pixel + vec2( c_onePixel , c_twoPixels)).rgb;
    vec3 C33 = texture2D(inputTexture, pixel + vec2( c_twoPixels, c_twoPixels)).rgb;

    vec3 CP0X = CubicLagrange(C00, C10, C20, C30, frac.x);
    vec3 CP1X = CubicLagrange(C01, C11, C21, C31, frac.x);
    vec3 CP2X = CubicLagrange(C02, C12, C22, C32, frac.x);
    vec3 CP3X = CubicLagrange(C03, C13, C23, C33, frac.x);

    return CubicLagrange(CP0X, CP1X, CP2X, CP3X, frac.y);
}

vec3 CubicHermite (vec3 A, vec3 B, vec3 C, vec3 D, float t)
{
	float t2 = t*t;
    float t3 = t*t*t;
    vec3 a = -A/2.0 + (3.0*B)/2.0 - (3.0*C)/2.0 + D/2.0;
    vec3 b = A - (5.0*B)/2.0 + 2.0*C - D / 2.0;
    vec3 c = -A/2.0 + C/2.0;
   	vec3 d = B;
    
    return a*t3 + b*t2 + c*t + d;
}

//=======================================================================================
vec3 BicubicHermiteTextureSample (sampler2D inputTexture, vec2 P)
{
    vec2 pixel = P * c_textureSize + 0.5;
    
    vec2 frac = fract(pixel);
    pixel = floor(pixel) / c_textureSize - vec2(c_onePixel/2.0);
    
    vec3 C00 = texture2D(inputTexture, pixel + vec2(-c_onePixel ,-c_onePixel)).rgb;
    vec3 C10 = texture2D(inputTexture, pixel + vec2( 0.0        ,-c_onePixel)).rgb;
    vec3 C20 = texture2D(inputTexture, pixel + vec2( c_onePixel ,-c_onePixel)).rgb;
    vec3 C30 = texture2D(inputTexture, pixel + vec2( c_twoPixels,-c_onePixel)).rgb;
    
    vec3 C01 = texture2D(inputTexture, pixel + vec2(-c_onePixel , 0.0)).rgb;
    vec3 C11 = texture2D(inputTexture, pixel + vec2( 0.0        , 0.0)).rgb;
    vec3 C21 = texture2D(inputTexture, pixel + vec2( c_onePixel , 0.0)).rgb;
    vec3 C31 = texture2D(inputTexture, pixel + vec2( c_twoPixels, 0.0)).rgb;    
    
    vec3 C02 = texture2D(inputTexture, pixel + vec2(-c_onePixel , c_onePixel)).rgb;
    vec3 C12 = texture2D(inputTexture, pixel + vec2( 0.0        , c_onePixel)).rgb;
    vec3 C22 = texture2D(inputTexture, pixel + vec2( c_onePixel , c_onePixel)).rgb;
    vec3 C32 = texture2D(inputTexture, pixel + vec2( c_twoPixels, c_onePixel)).rgb;    
    
    vec3 C03 = texture2D(inputTexture, pixel + vec2(-c_onePixel , c_twoPixels)).rgb;
    vec3 C13 = texture2D(inputTexture, pixel + vec2( 0.0        , c_twoPixels)).rgb;
    vec3 C23 = texture2D(inputTexture, pixel + vec2( c_onePixel , c_twoPixels)).rgb;
    vec3 C33 = texture2D(inputTexture, pixel + vec2( c_twoPixels, c_twoPixels)).rgb;    
    
    vec3 CP0X = CubicHermite(C00, C10, C20, C30, frac.x);
    vec3 CP1X = CubicHermite(C01, C11, C21, C31, frac.x);
    vec3 CP2X = CubicHermite(C02, C12, C22, C32, frac.x);
    vec3 CP3X = CubicHermite(C03, C13, C23, C33, frac.x);
    
    return CubicHermite(CP0X, CP1X, CP2X, CP3X, frac.y);
}

void main(void) {

#define CUSTOM_FRAGMENT_MAIN_BEGIN

#include<clipPlaneFragment>



	vec3 viewDirectionW = normalize(vEyePosition - vPositionW);

	// Base color
	vec4 baseColor = vec4(1., 1., 1., 1.);
	vec3 diffuseColor = vDiffuseColor.rgb;
	
	

	// Alpha
	float alpha = vDiffuseColor.a;

	// Bump
#ifdef NORMAL
	vec3 normalW = normalize(vNormalW);
#else
	vec3 normalW = normalize(-cross(dFdx(vPositionW), dFdy(vPositionW)));
#endif

#include<bumpFragment>

#ifdef TWOSIDEDLIGHTING
	normalW = gl_FrontFacing ? normalW : -normalW;
#endif

#ifdef DIFFUSE
	baseColor = texture2D(diffuseSampler, vDiffuseUV + uvOffset);

	#if defined(ALPHATEST) && !defined(ALPHATEST_AFTERALLALPHACOMPUTATIONS)
		if (baseColor.a < alphaCutOff)
			discard;
	#endif

	#ifdef ALPHAFROMDIFFUSE
		alpha *= baseColor.a;
	#endif
	
	#define CUSTOM_FRAGMENT_UPDATE_ALPHA

	baseColor.rgb *= vDiffuseInfos.y;
#endif



#include<depthPrePass>

#ifdef VERTEXCOLOR
	baseColor.rgb *= vColor.rgb;
#endif

#define CUSTOM_FRAGMENT_UPDATE_DIFFUSE

	// Ambient color
	vec3 baseAmbientColor = vec3(1., 1., 1.);

#ifdef AMBIENT
	baseAmbientColor = texture2D(ambientSampler, vAmbientUV + uvOffset).rgb * vAmbientInfos.y;
#endif

#define CUSTOM_FRAGMENT_BEFORE_LIGHTS

	// Specular map
#ifdef SPECULARTERM
	float glossiness = vSpecularColor.a;
	vec3 specularColor = vSpecularColor.rgb;

#ifdef SPECULAR
	vec4 specularMapColor = texture2D(specularSampler, vSpecularUV + uvOffset);
	specularColor = specularMapColor.rgb;
#ifdef GLOSSINESS
	glossiness = glossiness * specularMapColor.a;
#endif
#endif
#else
	float glossiness = 0.;
#endif

	// Lighting
	vec3 diffuseBase = vec3(0., 0., 0.);
	lightingInfo info;
#ifdef SPECULARTERM
	vec3 specularBase = vec3(0., 0., 0.);
#endif
	float shadow = 1.;

#ifdef LIGHTMAP
	// vec3 lightmapColor = texture2D(lightmapSampler, vLightmapUV + uvOffset).rgb * vLightmapInfos.y;
	vec3 lightmapColor = tex2DFastBicubic(lightmapSampler, vLightmapUV + uvOffset).rgb * vLightmapInfos.y;
	// vec3 lightmapColor = tex2DBicubic(lightmapSampler, vLightmapUV + uvOffset).rgb * vLightmapInfos.y;
	// vec3 lightmapColor = BicubicLagrangeTextureSample(lightmapSampler, vLightmapUV + uvOffset).rgb * vLightmapInfos.y;
	// vec3 lightmapColor = BicubicHermiteTextureSample(lightmapSampler, vLightmapUV + uvOffset).rgb * vLightmapInfos.y;
#endif

#include<lightFragment>[0..maxSimultaneousLights]

	// Refraction
	vec3 refractionColor = vec3(0., 0., 0.);

#ifdef REFRACTION
	vec3 refractionVector = normalize(refract(-viewDirectionW, normalW, vRefractionInfos.y));
	#ifdef REFRACTIONMAP_3D
		refractionVector.y = refractionVector.y * vRefractionInfos.w;

		if (dot(refractionVector, viewDirectionW) < 1.0) {
			refractionColor = textureCube(refractionCubeSampler, refractionVector).rgb;
		}
	#else
		vec3 vRefractionUVW = vec3(refractionMatrix * (view * vec4(vPositionW + refractionVector * vRefractionInfos.z, 1.0)));

		vec2 refractionCoords = vRefractionUVW.xy / vRefractionUVW.z;

		refractionCoords.y = 1.0 - refractionCoords.y;
		
		refractionColor = texture2D(refraction2DSampler, refractionCoords).rgb;
	#endif
	#ifdef IS_REFRACTION_LINEAR
		refractionColor = toGammaSpace(refractionColor);
	#endif
	refractionColor *= vRefractionInfos.x;
#endif

// Reflection
vec3 reflectionColor = vec3(0., 0., 0.);

#ifdef REFLECTION
	vec3 vReflectionUVW = computeReflectionCoords(vec4(vPositionW, 1.0), normalW);

	#ifdef REFLECTIONMAP_3D
		#ifdef ROUGHNESS
			float bias = vReflectionInfos.y;

			#ifdef SPECULARTERM
				#ifdef SPECULAR
					#ifdef GLOSSINESS
						bias *= (1.0 - specularMapColor.a);
					#endif
				#endif
			#endif

			reflectionColor = textureCube(reflectionCubeSampler, vReflectionUVW, bias).rgb;
		#else
			reflectionColor = textureCube(reflectionCubeSampler, vReflectionUVW).rgb;
		#endif
	#else
		vec2 coords = vReflectionUVW.xy;

		#ifdef REFLECTIONMAP_PROJECTION
			coords /= vReflectionUVW.z;
		#endif

		coords.y = 1.0 - coords.y;
		reflectionColor = texture2D(reflection2DSampler, coords).rgb;
	#endif
	#ifdef IS_REFLECTION_LINEAR
		reflectionColor = toGammaSpace(reflectionColor);
	#endif
	reflectionColor *= vReflectionInfos.x;
	#ifdef REFLECTIONFRESNEL
		float reflectionFresnelTerm = computeFresnelTerm(viewDirectionW, normalW, reflectionRightColor.a, reflectionLeftColor.a);

		#ifdef REFLECTIONFRESNELFROMSPECULAR
			#ifdef SPECULARTERM
				reflectionColor *= specularColor.rgb * (1.0 - reflectionFresnelTerm) + reflectionFresnelTerm * reflectionRightColor.rgb;
			#else
				reflectionColor *= reflectionLeftColor.rgb * (1.0 - reflectionFresnelTerm) + reflectionFresnelTerm * reflectionRightColor.rgb;
			#endif
		#else
			reflectionColor *= reflectionLeftColor.rgb * (1.0 - reflectionFresnelTerm) + reflectionFresnelTerm * reflectionRightColor.rgb;
		#endif
	#endif
#endif

#ifdef REFRACTIONFRESNEL
	float refractionFresnelTerm = computeFresnelTerm(viewDirectionW, normalW, refractionRightColor.a, refractionLeftColor.a);

	refractionColor *= refractionLeftColor.rgb * (1.0 - refractionFresnelTerm) + refractionFresnelTerm * refractionRightColor.rgb;
#endif

#ifdef OPACITY
	vec4 opacityMap = texture2D(opacitySampler, vOpacityUV + uvOffset);

#ifdef OPACITYRGB
	opacityMap.rgb = opacityMap.rgb * vec3(0.3, 0.59, 0.11);
	alpha *= (opacityMap.x + opacityMap.y + opacityMap.z)* vOpacityInfos.y;
#else
	alpha *= opacityMap.a * vOpacityInfos.y;
#endif

#endif

#ifdef VERTEXALPHA
	alpha *= vColor.a;
#endif

#ifdef OPACITYFRESNEL
	float opacityFresnelTerm = computeFresnelTerm(viewDirectionW, normalW, opacityParts.z, opacityParts.w);

	alpha += opacityParts.x * (1.0 - opacityFresnelTerm) + opacityFresnelTerm * opacityParts.y;
#endif

#ifdef ALPHATEST
    #ifdef ALPHATEST_AFTERALLALPHACOMPUTATIONS
        if (alpha < alphaCutOff)
            discard;
    #endif
    #ifndef ALPHABLEND
        // Prevent to blend with the canvas.
        alpha = 1.0;
    #endif
#endif

	// Emissive
	vec3 emissiveColor = vEmissiveColor;
#ifdef EMISSIVE
	emissiveColor += texture2D(emissiveSampler, vEmissiveUV + uvOffset).rgb * vEmissiveInfos.y;
#endif

#ifdef EMISSIVEFRESNEL
	float emissiveFresnelTerm = computeFresnelTerm(viewDirectionW, normalW, emissiveRightColor.a, emissiveLeftColor.a);

	emissiveColor *= emissiveLeftColor.rgb * (1.0 - emissiveFresnelTerm) + emissiveFresnelTerm * emissiveRightColor.rgb;
#endif

	// Fresnel
#ifdef DIFFUSEFRESNEL
	float diffuseFresnelTerm = computeFresnelTerm(viewDirectionW, normalW, diffuseRightColor.a, diffuseLeftColor.a);

	diffuseBase *= diffuseLeftColor.rgb * (1.0 - diffuseFresnelTerm) + diffuseFresnelTerm * diffuseRightColor.rgb;
#endif

	// Composition
#ifdef EMISSIVEASILLUMINATION
	vec3 finalDiffuse = clamp(diffuseBase * diffuseColor + vAmbientColor, 0.0, 1.0) * baseColor.rgb;
#else
#ifdef LINKEMISSIVEWITHDIFFUSE
	vec3 finalDiffuse = clamp((diffuseBase + emissiveColor) * diffuseColor + vAmbientColor, 0.0, 1.0) * baseColor.rgb;
#else
	vec3 finalDiffuse = clamp(diffuseBase * diffuseColor + emissiveColor + vAmbientColor, 0.0, 1.0) * baseColor.rgb;
#endif
#endif

#ifdef SPECULARTERM
	vec3 finalSpecular = specularBase * specularColor;
	#ifdef SPECULAROVERALPHA
		alpha = clamp(alpha + dot(finalSpecular, vec3(0.3, 0.59, 0.11)), 0., 1.);
	#endif
#else
	vec3 finalSpecular = vec3(0.0);
#endif

#ifdef REFLECTIONOVERALPHA
	alpha = clamp(alpha + dot(reflectionColor, vec3(0.3, 0.59, 0.11)), 0., 1.);
#endif

	// Composition
#ifdef EMISSIVEASILLUMINATION
	vec4 color = vec4(clamp(finalDiffuse * baseAmbientColor + finalSpecular + reflectionColor + emissiveColor + refractionColor, 0.0, 1.0), alpha);
#else
	vec4 color = vec4(finalDiffuse * baseAmbientColor + finalSpecular + reflectionColor + refractionColor, alpha);
#endif

//Old lightmap calculation method
#ifdef LIGHTMAP
    #ifndef LIGHTMAPEXCLUDED
        #ifdef USELIGHTMAPASSHADOWMAP
            color.rgb *= lightmapColor;
        #else
            color.rgb += lightmapColor;
        #endif
    #endif
#endif

#define CUSTOM_FRAGMENT_BEFORE_FOG
color.rgb = max(color.rgb, 0.);
#include<logDepthFragment>
#include<fogFragment>

// Apply image processing if relevant. As this applies in linear space, 
// We first move from gamma to linear.
#ifdef IMAGEPROCESSINGPOSTPROCESS
	color.rgb = toLinearSpace(color.rgb);
#else
	#ifdef IMAGEPROCESSING
		color.rgb = toLinearSpace(color.rgb);
		color = applyImageProcessing(color);
	#endif
#endif

	color.a *= visibility;

#ifdef PREMULTIPLYALPHA
	// Convert to associative (premultiplied) format if needed.
	color.rgb *= color.a;
#endif

#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR
	gl_FragColor = color;
}
