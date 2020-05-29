#if defined(BUMP) || !defined(NORMAL) || defined(FORCENORMALFORWARD) || defined(SPECULARAA) || defined(CLEARCOAT_BUMP) || defined(ANISOTROPIC)
#extension GL_OES_standard_derivatives : enable
#endif

#ifdef LODBASEDMICROSFURACE
#extension GL_EXT_shader_texture_lod : enable
#endif

#define CUSTOM_FRAGMENT_BEGIN

#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif

precision highp float;

// Forces linear space for image processing
#ifndef FROMLINEARSPACE
    #define FROMLINEARSPACE
#endif

// Declaration
#include<__decl__pbrFragment>
#include<pbrFragmentExtraDeclaration>
#include<__decl__lightFragment>[0..maxSimultaneousLights]
#include<pbrFragmentSamplersDeclaration>
#include<imageProcessingDeclaration>
#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>

// Helper Functions
#include<helperFunctions>
#include<pbrHelperFunctions>
#include<imageProcessingFunctions>
#include<shadowsFragmentFunctions>
#include<harmonicsFunctions>
#include<pbrDirectLightingSetupFunctions>
#include<pbrDirectLightingFalloffFunctions>
#include<pbrBRDFFunctions>
#include<pbrDirectLightingFunctions>
#include<pbrIBLFunctions>
#include<bumpFragmentFunctions>

#ifdef REFLECTION
    #include<reflectionFunction>
#endif

#include<pbrBlockAlbedoOpacity>
#include<pbrBlockReflectivity>
#include<pbrBlockAmbientOcclusion>
#include<pbrBlockAlphaFresnel>
#include<pbrBlockAnisotropic>
#include<pbrBlockReflection>
#include<pbrBlockSheen>
#include<pbrBlockClearcoat>
#include<pbrBlockSubSurface>

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

float c_textureSize = 512.0;
float c_onePixel = 1.0 / 512.0;
float c_twoPixels = 2.0 / 512.0;

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

// _____________________________ MAIN FUNCTION ____________________________
void main(void) {

    #define CUSTOM_FRAGMENT_MAIN_BEGIN

    #include<clipPlaneFragment>

    // _____________________________ Geometry Information ____________________________
    #include<pbrBlockNormalGeometric>

    #include<bumpFragment>

    #include<pbrBlockNormalFinal>

    // _____________________________ Albedo & Opacity ______________________________
    albedoOpacityOutParams albedoOpacityOut;

#ifdef ALBEDO
    vec4 albedoTexture = texture2D(albedoSampler, vAlbedoUV + uvOffset);
#endif

#ifdef OPACITY
    vec4 opacityMap = texture2D(opacitySampler, vOpacityUV + uvOffset);
#endif

    albedoOpacityBlock(
        vAlbedoColor,
    #ifdef ALBEDO
        albedoTexture,
        vAlbedoInfos,
    #endif
    #ifdef OPACITY
        opacityMap,
        vOpacityInfos,
    #endif
        albedoOpacityOut
    );

    vec3 surfaceAlbedo = albedoOpacityOut.surfaceAlbedo;
    float alpha = albedoOpacityOut.alpha;

    #define CUSTOM_FRAGMENT_UPDATE_ALPHA

    #include<depthPrePass>

    #define CUSTOM_FRAGMENT_BEFORE_LIGHTS

    // _____________________________ AO  _______________________________
    ambientOcclusionOutParams aoOut;

#ifdef AMBIENT
    vec3 ambientOcclusionColorMap = texture2D(ambientSampler, vAmbientUV + uvOffset).rgb;
#endif

    ambientOcclusionBlock(
    #ifdef AMBIENT
        ambientOcclusionColorMap,
        vAmbientInfos,
    #endif
        aoOut
    );

#ifdef UNLIT
    vec3 diffuseBase = vec3(1., 1., 1.);
#else

    // _____________________________ Reflectivity _______________________________
    vec3 baseColor = surfaceAlbedo;

    reflectivityOutParams reflectivityOut;

    reflectivityBlock(
        vReflectivityColor,
        uvOffset,
    #ifdef METALLICWORKFLOW
        surfaceAlbedo,
    #endif
    #ifdef REFLECTIVITY
        vReflectivityInfos,
        vReflectivityUV,
        reflectivitySampler,
    #endif
    #if defined(METALLICWORKFLOW) && defined(REFLECTIVITY)  && defined(AOSTOREINMETALMAPRED)
        aoOut.ambientOcclusionColor,
    #endif
    #ifdef MICROSURFACEMAP
        vMicroSurfaceSamplerUV,
        vMicroSurfaceSamplerInfos,
        microSurfaceSampler,
    #endif
        reflectivityOut
    );

    float microSurface = reflectivityOut.microSurface;
    float roughness = reflectivityOut.roughness;

    #ifdef METALLICWORKFLOW
        surfaceAlbedo = reflectivityOut.surfaceAlbedo;
    #endif
    #if defined(METALLICWORKFLOW) && defined(REFLECTIVITY) && defined(AOSTOREINMETALMAPRED)
        aoOut.ambientOcclusionColor = reflectivityOut.ambientOcclusionColor;
    #endif

    // _____________________________ Alpha Fresnel ___________________________________
    #ifdef ALPHAFRESNEL
        #if defined(ALPHATEST) || defined(ALPHABLEND)
            alphaFresnelOutParams alphaFresnelOut;

            alphaFresnelBlock(
                normalW,
                viewDirectionW,
                alpha,
                microSurface,
                alphaFresnelOut
            );

            alpha = alphaFresnelOut.alpha;
        #endif
    #endif

    // _____________________________ Compute Geometry info _________________________________
    #include<pbrBlockGeometryInfo>

    // _____________________________ Anisotropy _______________________________________
    #ifdef ANISOTROPIC
        anisotropicOutParams anisotropicOut;

        anisotropicBlock(
            vAnisotropy,
        #ifdef ANISOTROPIC_TEXTURE
            vAnisotropyInfos,
            vAnisotropyUV,
            uvOffset,
            anisotropySampler,
        #endif
            TBN,
            normalW,
            viewDirectionW,
            anisotropicOut
        );
    #endif

    // _____________________________ Reflection Info _______________________________________
    #ifdef REFLECTION
        reflectionOutParams reflectionOut;

        reflectionBlock(
            vPositionW,
            normalW,
            alphaG,
            vReflectionMicrosurfaceInfos,
            vReflectionInfos,
        #ifdef ANISOTROPIC
            anisotropicOut,
        #endif
        #if defined(LODINREFLECTIONALPHA) && !defined(REFLECTIONMAP_SKYBOX)
            NdotVUnclamped,
        #endif
        #ifdef LINEARSPECULARREFLECTION
            roughness,
        #endif
            reflectionSampler,
        #if defined(NORMAL) && defined(USESPHERICALINVERTEX)
            vEnvironmentIrradiance,
        #endif
        #ifdef USESPHERICALFROMREFLECTIONMAP
            #if !defined(NORMAL) || !defined(USESPHERICALINVERTEX)
                reflectionMatrix,
            #endif
        #endif
        #ifdef USEIRRADIANCEMAP
            irradianceSampler,
        #endif
            reflectionOut
        );
    #endif

    // ___________________ Compute Reflectance aka R0 F0 info _________________________
    #include<pbrBlockReflectance0>

    // ________________________________ Sheen ______________________________
    #ifdef SHEEN
        sheenOutParams sheenOut;

        sheenBlock(
            vSheenColor,
        #ifdef SHEEN_ROUGHNESS
            vSheenRoughness,
        #endif
            roughness,
        #ifdef SHEEN_TEXTURE
            vSheenUV,
            vSheenInfos,
            uvOffset,
            sheenSampler,
        #endif
            reflectance,
        #ifdef SHEEN_LINKWITHALBEDO
            baseColor,
            surfaceAlbedo,
        #endif
        #ifdef ENVIRONMENTBRDF
            NdotV,
        #endif
        #if defined(REFLECTION) && defined(ENVIRONMENTBRDF)
            AARoughnessFactors,
            vReflectionMicrosurfaceInfos,
            vReflectionInfos,
            vReflectionColor,
            vLightingIntensity,
            reflectionSampler,
            reflectionOut.reflectionCoords,
            NdotVUnclamped,
            #ifndef LODBASEDMICROSFURACE
                reflectionSamplerLow,
                reflectionSamplerHigh,
            #endif
            environmentBrdf,
            #if !defined(REFLECTIONMAP_SKYBOX) && defined(RADIANCEOCCLUSION)
                seo,
            #endif
            #if !defined(REFLECTIONMAP_SKYBOX) && defined(HORIZONOCCLUSION) && defined(BUMP) && defined(REFLECTIONMAP_3D)
                eho,
            #endif
        #endif
            sheenOut
        );

        #ifdef SHEEN_LINKWITHALBEDO
            surfaceAlbedo = sheenOut.surfaceAlbedo;
        #endif
    #endif

    // _____________________________ Clear Coat ____________________________
    clearcoatOutParams clearcoatOut;

    #ifdef CLEARCOAT
        clearcoatBlock(
            vPositionW,
            geometricNormalW,
            viewDirectionW,
            vClearCoatParams,
            uvOffset,
            specularEnvironmentR0,
        #ifdef CLEARCOAT_TEXTURE
            vClearCoatUV,
            vClearCoatInfos,
            clearCoatSampler,
        #endif
        #ifdef CLEARCOAT_TINT
            vClearCoatTintParams,
            clearCoatColorAtDistance,
            vClearCoatRefractionParams,
            #ifdef CLEARCOAT_TINT_TEXTURE
                vClearCoatTintUV,
                clearCoatTintSampler,
            #endif
        #endif
        #ifdef CLEARCOAT_BUMP
            vClearCoatBumpInfos,
            vClearCoatBumpUV,
            clearCoatBumpSampler,
            #if defined(TANGENT) && defined(NORMAL)
                vTBN,
            #else
                vClearCoatTangentSpaceParams,
            #endif
            #ifdef OBJECTSPACE_NORMALMAP
                normalMatrix,
            #endif
        #endif
        #if defined(FORCENORMALFORWARD) && defined(NORMAL)
            faceNormal,
        #endif
        #ifdef REFLECTION
            vReflectionMicrosurfaceInfos,
            vLightingIntensity,
            reflectionSampler,
            #ifndef LODBASEDMICROSFURACE
                reflectionSamplerLow,
                reflectionSamplerHigh,
            #endif
        #endif
        #if defined(ENVIRONMENTBRDF) && !defined(REFLECTIONMAP_SKYBOX)
            #ifdef RADIANCEOCCLUSION
                ambientMonochrome,
            #endif
        #endif
            clearcoatOut
        );
    #else
        clearcoatOut.specularEnvironmentR0 = specularEnvironmentR0;
    #endif

    // _________________________ Specular Environment Reflectance __________________________
    #include<pbrBlockReflectance>

    // ___________________________________ SubSurface ______________________________________
    subSurfaceOutParams subSurfaceOut;

    #ifdef SUBSURFACE
        subSurfaceBlock(
            vThicknessParam,
            vTintColor,
            normalW,
            specularEnvironmentReflectance,
        #ifdef SS_THICKNESSANDMASK_TEXTURE
            vThicknessUV,
            uvOffset,
            thicknessSampler,
        #endif
        #ifdef REFLECTION
            #ifdef SS_TRANSLUCENCY
                reflectionMatrix,
                #ifdef USESPHERICALFROMREFLECTIONMAP
                    #if !defined(NORMAL) || !defined(USESPHERICALINVERTEX)
                        reflectionOut.irradianceVector,
                    #endif
                #endif
                #ifdef USEIRRADIANCEMAP
                    irradianceSampler,
                #endif
            #endif
        #endif
        #ifdef SS_REFRACTION
            vPositionW,
            viewDirectionW,
            view,
            surfaceAlbedo,
            vRefractionInfos,
            refractionMatrix,
            vRefractionMicrosurfaceInfos,
            vLightingIntensity,
            #ifdef SS_LINKREFRACTIONTOTRANSPARENCY
                alpha,
            #endif
            #ifdef SS_LODINREFRACTIONALPHA
                NdotVUnclamped,
            #endif
            #ifdef SS_LINEARSPECULARREFRACTION
                roughness,
            #else
                alphaG,
            #endif
            refractionSampler,
            #ifndef LODBASEDMICROSFURACE
                refractionSamplerLow,
                refractionSamplerHigh,
            #endif
            #ifdef ANISOTROPIC
                anisotropicOut,
            #endif
        #endif
        #ifdef SS_TRANSLUCENCY
            vDiffusionDistance,
        #endif
            subSurfaceOut
        );

        #ifdef SS_REFRACTION
            surfaceAlbedo = subSurfaceOut.surfaceAlbedo;
            #ifdef SS_LINKREFRACTIONTOTRANSPARENCY
                alpha = subSurfaceOut.alpha;
            #endif
        #endif
    #else
        subSurfaceOut.specularEnvironmentReflectance = specularEnvironmentReflectance;
    #endif

    // _____________________________ Direct Lighting Info __________________________________
    #include<pbrBlockDirectLighting>

    #include<lightFragment>[0..maxSimultaneousLights]

    // _____________________________ Compute Final Lit Components ________________________
    #include<pbrBlockFinalLitComponents>
#endif // UNLIT

    #include<pbrBlockFinalUnlitComponents>

    #include<pbrBlockFinalColorComposition>

    #include<logDepthFragment>
    #include<fogFragment>(color, finalColor)

    #include<pbrBlockImageProcessing>

    #define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR

    gl_FragColor = finalColor;

    #include<pbrDebug>
}
