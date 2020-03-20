import { InternalTexture, InternalTextureSource } from '../../Materials/Textures/internalTexture';
import { IMultiRenderTargetOptions } from '../../Materials/Textures/multiRenderTarget';
import { Logger } from '../../Misc/logger';
import { Constants } from '../constants';
import { ThinEngine } from '../thinEngine';

declare module "../../Engines/thinEngine" {
    export interface ThinEngine {
         /**
         * Unbind a list of render target textures from the webGL context
         * This is used only when drawBuffer extension or webGL2 are active
         * @param textures defines the render target textures to unbind
         * @param disableGenerateMipMaps defines a boolean indicating that mipmaps must not be generated
         * @param onBeforeUnbind defines a function which will be called before the effective unbind
         */
        unBindMultiColorAttachmentFramebufferCube(textures: InternalTexture[], disableGenerateMipMaps: boolean, onBeforeUnbind?: () => void): void;
   
        
        /**
         * Create a multi render target cube texture
         * @param size defines the size of the texture
         * @param options defines the creation options
         * @returns the cube texture as an InternalTexture
         */
        createMultipleRenderTargetCube(size: any, options: IMultiRenderTargetOptions): InternalTexture[];
    }
}

ThinEngine.prototype.unBindMultiColorAttachmentFramebufferCube = function(textures: InternalTexture[], disableGenerateMipMaps: boolean = false, onBeforeUnbind?: () => void): void {
    this._currentRenderTarget = null;

    // If MSAA, we need to bitblt back to main texture
    var gl = this._gl;

    if (textures[0]._MSAAFramebuffer) {
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, textures[0]._MSAAFramebuffer);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, textures[0]._framebuffer);

        var attachments = textures[0]._attachments;
        if (!attachments) {
            attachments = new Array(textures.length);
            textures[0]._attachments = attachments;
        }

        for (var i = 0; i < textures.length; i++) {
            var texture = textures[i];

            for (var j = 0; j < attachments.length; j++) {
                attachments[j] = gl.NONE;
            }

            attachments[i] = (<any>gl)[this.webGLVersion > 1 ? "COLOR_ATTACHMENT" + i : "COLOR_ATTACHMENT" + i + "_WEBGL"];
            gl.readBuffer(attachments[i]);
            gl.drawBuffers(attachments);
            gl.blitFramebuffer(0, 0, texture.width, texture.height,
                0, 0, texture.width, texture.height,
                gl.COLOR_BUFFER_BIT, gl.NEAREST);

        }
        for (var i = 0; i < attachments.length; i++) {
            attachments[i] = (<any>gl)[this.webGLVersion > 1 ? "COLOR_ATTACHMENT" + i : "COLOR_ATTACHMENT" + i + "_WEBGL"];
        }
        gl.drawBuffers(attachments);
    }

    for (var i = 0; i < textures.length; i++) {
        var texture = textures[i];
        if (texture.generateMipMaps && !disableGenerateMipMaps && !texture.isCube) {
            this._bindTextureDirectly(gl.TEXTURE_2D, texture, true);
            gl.generateMipmap(gl.TEXTURE_2D);
            this._bindTextureDirectly(gl.TEXTURE_2D, null);
        }
        else if (texture.generateMipMaps && !disableGenerateMipMaps && texture.isCube) {
            this._bindTextureDirectly(gl.TEXTURE_CUBE_MAP, texture, true);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            this._bindTextureDirectly(gl.TEXTURE_CUBE_MAP, null);
        }
    }

    if (onBeforeUnbind) {
        if (textures[0]._MSAAFramebuffer) {
            // Bind the correct framebuffer
            this._bindUnboundFramebuffer(textures[0]._framebuffer);
        }
        onBeforeUnbind();
    }

    this._bindUnboundFramebuffer(null);
};

ThinEngine.prototype.createMultipleRenderTargetCube = function(size: any, options: IMultiRenderTargetOptions): InternalTexture[] {
    var generateMipMaps = false;
    var generateDepthBuffer = true;
    var generateStencilBuffer = false;
    var generateDepthTexture = false;
    var textureCount = 1;

    var defaultType = Constants.TEXTURETYPE_UNSIGNED_INT;
    var defaultSamplingMode = Constants.TEXTURE_TRILINEAR_SAMPLINGMODE;

    var types = new Array<number>();
    var samplingModes = new Array<number>();

    if (options != undefined) {
        generateMipMaps = options.generateMipMaps === undefined ? false : options.generateMipMaps;
        generateDepthBuffer = options.generateDepthBuffer === undefined ? true : options.generateDepthBuffer;
        generateStencilBuffer = options.generateStencilBuffer === undefined ? false : options.generateStencilBuffer;
        generateDepthTexture = options.generateDepthTexture === undefined ? false : options.generateDepthTexture;
        textureCount = options.textureCount || 1;
        
        if (options.types){
            types = options.types;
        }

        if (options.samplingModes){
            samplingModes = options.samplingModes;
        }
    }
    var gl = this._gl;
    // Create the framebuffer
    var framebuffer = gl.createFramebuffer();
    this._bindUnboundFramebuffer(framebuffer);

    var width = size;
    var height = size;

    var textures = [];
    var attachments = [];

    var depthStencilBuffer = this._setupFramebufferDepthAttachments(generateStencilBuffer, generateDepthBuffer, width, height);
    
    for (var i = 0; i < textureCount; i++) {
        var samplingMode = samplingModes[i] || defaultSamplingMode;
        var type = types[i] || defaultType;


        if (type === Constants.TEXTURETYPE_FLOAT && !this._caps.textureFloatLinearFiltering) {
            // if floating point linear (gl.FLOAT) then force to NEAREST_SAMPLINGMODE
            samplingMode = Constants.TEXTURE_NEAREST_SAMPLINGMODE;
        }
        else if (type === Constants.TEXTURETYPE_HALF_FLOAT && !this._caps.textureHalfFloatLinearFiltering) {
            // if floating point linear (HALF_FLOAT) then force to NEAREST_SAMPLINGMODE
            samplingMode = Constants.TEXTURE_NEAREST_SAMPLINGMODE;
        }

        var filters = this._getSamplingParameters(samplingMode, generateMipMaps);
        if (type === Constants.TEXTURETYPE_FLOAT && !this._caps.textureFloat) {
            type = Constants.TEXTURETYPE_UNSIGNED_INT;
            Logger.Warn("Float textures are not supported. Render target forced to TEXTURETYPE_UNSIGNED_BYTE type");
        }

        var texture = new InternalTexture(this, InternalTextureSource.MultiRenderTarget);

        var attachment = (<any>gl)[this.webGLVersion > 1 ? "COLOR_ATTACHMENT" + i : "COLOR_ATTACHMENT" + i + "_WEBGL"];

        textures.push(texture);
        attachments.push(attachment);

        gl.activeTexture((<any>gl)["TEXTURE" + i]);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture._webGLTexture);

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, filters.mag);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, filters.min);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        for (var face = 0; face < 6; face++) {
            gl.texImage2D((gl.TEXTURE_CUBE_MAP_POSITIVE_X + face), 0, this._getRGBABufferInternalSizedFormat(type, gl.RGBA), size, size, 0, gl.RGBA, this._getWebGLTextureType(type), null);
            //A voir si à mettre ici 
            gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, attachment, (gl.TEXTURE_CUBE_MAP_POSITIVE_X + face), texture._webGLTexture, 0);
        }

        if (generateMipMaps) {
            this._gl.generateMipmap(this._gl.TEXTURE_CUBE_MAP);
        }

        // Unbind
        this._bindTextureDirectly(gl.TEXTURE_CUBE_MAP, null);

        texture._framebuffer = framebuffer;
        texture._depthStencilBuffer = depthStencilBuffer;
        texture.baseWidth = width;
        texture.baseHeight = height;
        texture.width = width;
        texture.height = height;
        texture.isReady = true;
        texture.samples = 1;
        texture.isCube = true;
        texture.generateMipMaps = generateMipMaps;
        texture.samplingMode = samplingMode;
        texture.type = type;
        texture._generateDepthBuffer = generateDepthBuffer;
        texture._generateStencilBuffer = generateStencilBuffer;
        texture._attachments = attachments;

        this._internalTexturesCache.push(texture);
    }

    if (generateDepthTexture && this._caps.depthTextureExtension) {
        // Depth texture

        var depthTexture = new InternalTexture(this, InternalTextureSource.MultiRenderTarget);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, depthTexture._webGLTexture);

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        for (var face = 0; face < 6; face++) {
            gl.texImage2D(
                (gl.TEXTURE_CUBE_MAP_POSITIVE_X + face),
                0,
                this.webGLVersion < 2 ? gl.DEPTH_COMPONENT : gl.DEPTH_COMPONENT16,
                size,
                size, 
                0,
                gl.DEPTH_COMPONENT,
                gl.UNSIGNED_SHORT, 
                null
            );
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, (gl.TEXTURE_CUBE_MAP_POSITIVE_X + face), depthTexture._webGLTexture, 0);
        }

        depthTexture._framebuffer = framebuffer;
        depthTexture.baseWidth = width;
        depthTexture.baseHeight = height;
        depthTexture.width = width;
        depthTexture.height = height;
        depthTexture.isReady = true;
        depthTexture.samples = 1;
        depthTexture.isCube = true;
        depthTexture.generateMipMaps = generateMipMaps;
        depthTexture.samplingMode = gl.NEAREST;
        depthTexture._generateDepthBuffer = generateDepthBuffer;
        depthTexture._generateStencilBuffer = generateStencilBuffer;

        textures.push(depthTexture);
        this._internalTexturesCache.push(depthTexture);
    }

    gl.drawBuffers(attachments);
    this._bindUnboundFramebuffer(null);

    this.resetTextureCache();

    return textures;
}


    
        

    


