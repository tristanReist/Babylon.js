import { Mesh } from "../Meshes/mesh";
import { SubMesh } from "../Meshes/subMesh";
import { Scene } from "../scene";
import { Texture } from "../Materials/Textures/texture";
import { RenderTargetTexture } from "../Materials/Textures/renderTargetTexture";
import { Effect } from "../Materials/effect";
import { Material } from "../Materials/material";
import { Constants } from "../Engines/constants";
import { Vector3 } from "../Maths/math";
import { Color4 } from "../Maths/math";
import { Matrix } from "../Maths/math";
import { DirectEffectsManager } from "./directEffectManager";

import { Nullable } from "../types";

declare module "../Meshes/mesh" {
    export interface Mesh {
        /** Object containing radiosity information for this mesh */
        directInfo: {
            /** Size of the lightmap texture */
            shadowMapSize: {
                width: number,
                height: number
            };

            /** How much world units a texel represents */
            // texelWorldSize: number;
            texelWorldSize: {
                width: number,
                height: number
            };

            /** Emissive color of the surface */
            color: Nullable<Vector3>; // TODO color 3

            /** Unused for now. Color multiplier. */
            lightStrength: Vector3; // TODO unused

            depthMap: Nullable<RenderTargetTexture>;

            shadowMap: Nullable<RenderTargetTexture>;
        };

        /** Inits the `directInfo` object */
        initForDirect(): void;

        /** Gets radiosity texture
         * @return the radiosity texture. Can be fully black if the radiosity process has not been run yet.
         */
        getShadowMap(): Nullable<Texture>;
    }
}

Mesh.prototype.initForDirect = function() {
    this.directInfo = {
        shadowMapSize: {
            width: 256,
            height: 256
        },
        // texelWorldSize: 1,
        texelWorldSize: {
            width: 1,
            height: 1,
        },

        color: null,
        lightStrength: new Vector3(0, 0, 0),

        depthMap: null,
        shadowMap: null,
    };
};

Mesh.prototype.getShadowMap = function() {
    return this.directInfo.shadowMap;
};

declare interface DirectRendererOptions {
    near?: number;
    far?: number;
    bias?: number;
    normalBias?: number;
}

/**
 * Radiosity Renderer
 * Creates patches from uv-mapped (lightmapped) geometry.
 * Renders hemicubes or spheres from patches
 * Shoots light from emissive patches
 * Can be used as direct light baking, or radiosity light baking solution
 */
export class DirectRenderer {
    /**
     * Meshes involved in the radiosity solution process. Scene meshes that are not in this list will be ignored,
     * and therefore will not occlude or receive radiance.
     */
    public meshes: Mesh[];

    // Add some randomness to patch position to avoid banding effect
    public randomizePosition: boolean = true;

    private _options: DirectRendererOptions;
    /**
     * Verbosity level for performance of the renderer
     * Accepted values are 0, 1, 2 or 3
     */
    public static PERFORMANCE_LOGS_LEVEL: number = 1;
    /**
     * Verbosity level for information about current radiosity solving
     * Accepted values are 0, 1 or 2
     */
    public static RADIOSITY_INFO_LOGS_LEVEL: number = 1;
    /**
     * Verbosity level for warnings
     * Accepted values are 0 or 1
     */
    public static WARNING_LOGS: number = 1;

    private _scene: Scene;

    private _near: number;
    private _far: number;
    private _bias: number;
    private _normalBias: number;

    private _depthCubeSize: number = 2048;

    private _projectionMatrix: Matrix;
    private _projectionMatrixPX: Matrix;
    private _projectionMatrixNX: Matrix;
    private _projectionMatrixPY: Matrix;
    private _projectionMatrixNY: Matrix;

    private _directEffectsManager: DirectEffectsManager;

    // private squareToDiskArea(a: number) {
    //     return a * a * Math.PI / 4;
    // }

    private rectangleToDiskArea(a: number, b: number = a) {
        return a * b * Math.PI / 4;
    }

    /**
     * Instanciates a radiosity renderer
     * @param scene The current scene
     * @param meshes The meshes to include in the radiosity solver
     */
    constructor(scene: Scene, meshes?: Mesh[], options?: DirectRendererOptions) {
        this._options = options || {};
        this._scene = scene;
        this._near = this._options.near || 0.1;
        this._far = this._options.far || 10000;
        this._bias = this._options.bias || 1e-4;
        this._normalBias = this._options.normalBias || 1e-4;
        this.meshes = meshes || [];

        for (const mesh of this.meshes) {
             mesh.directInfo.shadowMap = new RenderTargetTexture(
                "shadowMap",
                mesh.directInfo.shadowMapSize,
                this._scene,
                false,
                true,
                Constants.TEXTURETYPE_FLOAT,
                false,
                Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
                false,
                false
            );
        }

        this._projectionMatrix = Matrix.PerspectiveFovLH(Math.PI / 2,
            1, // squared texture
            this._near,
            this._far,
        );

        this._projectionMatrixPX = this._projectionMatrix.multiply(Matrix.FromValues(2, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            1, 0, 0, 1
        ));

        this._projectionMatrixNX = this._projectionMatrix.multiply(Matrix.FromValues(2, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            -1, 0, 0, 1
        ));

        this._projectionMatrixPY = this._projectionMatrix.multiply(Matrix.FromValues(1, 0, 0, 0,
            0, 2, 0, 0,
            0, 0, 1, 0,
            0, 1, 0, 1
        ));

        this._projectionMatrixNY = this._projectionMatrix.multiply(Matrix.FromValues(1, 0, 0, 0,
            0, 2, 0, 0,
            0, 0, 1, 0,
            0, -1, 0, 1
        ));

        this._directEffectsManager = new DirectEffectsManager(this._scene);
        while (!this._directEffectsManager.isReady()) {
        }
    }

    /**
     * Prepare textures for radiosity
     */
    public createDepthMaps(lights: Mesh[]) {
        for (const light of lights) {
            const size = light.directInfo.shadowMapSize;

            if (!size || !light.directInfo) {
                continue;
            }

             const depthMap = new RenderTargetTexture(
                "depthMap",
                this._depthCubeSize,
                this._scene,
                false,
                true,
                Constants.TEXTURETYPE_FLOAT,
                // true, // isCube ?
                false, // isCube ?
                // Constants.TEXTURE_NEAREST_SAMPLINGMODE,
                Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
                true,
                false
            );
            depthMap.createDepthStencilTexture(Constants.LESS, true);

            light.directInfo.depthMap = depthMap;

            if (DirectRenderer.RADIOSITY_INFO_LOGS_LEVEL >= 2) {
                console.log(`Generating depthmap for mesh : ${light.name}.`);
            }

            this.renderVisibilityMapCube(light);
        }
    }

    private renderToShadowMapTexture(light: Mesh) {
        const viewMatrix = Matrix.LookAtLH(light.position, light.position.add(new Vector3(1, 0, 0)), Vector3.Up());
        const engine = this._scene.getEngine();

        // light.directInfo.shadowMap = new RenderTargetTexture(
        //     "shadowMap",
        //     2048,
        //     this._scene,
        //     false,
        //     true,
        //     Constants.TEXTURETYPE_FLOAT,
        //     false,
        //     Constants.TEXTURE_NEAREST_SAMPLINGMODE,
        //     true,
        //     false
        // );
        // light.directInfo.shadowMap.createDepthStencilTexture(Constants.LESS, true);

        engine.enableEffect(this._directEffectsManager.shadowMappingEffect);

        // engine.bindFramebuffer(light.directInfo.shadowMap._texture);
        // engine.clear(new Color4(0, 0, 0, 0), true, true);

        this._directEffectsManager.shadowMappingEffect.setTexture("depthMap", light.directInfo.depthMap);
        this._directEffectsManager.shadowMappingEffect.setMatrix("view", viewMatrix);
        this._directEffectsManager.shadowMappingEffect.setMatrix("projection", this._projectionMatrix);
        this._directEffectsManager.shadowMappingEffect.setFloat2("nearFar", this._near, this._far);
        this._directEffectsManager.shadowMappingEffect.setVector3("lightPos", light.position);

        for (const mesh of this.meshes) {
            if (DirectRenderer.PERFORMANCE_LOGS_LEVEL >= 3) {
                console.log(`Lightmap size for this submesh : ${mesh.directInfo.shadowMapSize.width} x ${mesh.directInfo.shadowMapSize.height}`);
            }

            engine.setDirectViewport(0, 0, mesh.directInfo.shadowMapSize.width, mesh.directInfo.shadowMapSize.height);
            engine.setState(false, 0, true, true);
            engine.bindFramebuffer(mesh.directInfo.shadowMap._texture);
            // engine.clear(new Color4(0, 0, 0, 0), true, true);

            for (const subMesh of mesh.subMeshes) {
                var batch = mesh._getInstancesRenderList(subMesh._id);

                if (batch.mustReturn) {
                    return;
                }

                var hardwareInstancedRendering = Boolean(engine.getCaps().instancedArrays && batch.visibleInstances[subMesh._id]);
                mesh._bind(subMesh, this._directEffectsManager.shadowMappingEffect, Material.TriangleFillMode);
                mesh._processRendering(mesh, subMesh, this._directEffectsManager.shadowMappingEffect, Material.TriangleFillMode, batch, hardwareInstancedRendering,
                    (isInstance, world) => this._directEffectsManager.shadowMappingEffect.setMatrix("world", world));
            }

            engine.unBindFramebuffer(mesh.directInfo.shadowMap._texture);
        }

        // engine.unBindFramebuffer(light.directInfo.shadowMap._texture);
    }

    // private swap<T>(textureArray: T[], i: number, j: number) {
    //     var t = textureArray[i];
    //     textureArray[i] = textureArray[j];
    //     textureArray[j] = t;
    // }

    // private postProcessLightmap(texture: MultiRenderTarget) {
    //     var textureArray = texture.textures;

    //     this.dilate(1, textureArray[6], textureArray[4]);
    //     this.swap(textureArray, 4, 6);
    //     this.swap(texture.internalTextures, 4, 6);

    //     this.toneMap(textureArray[4], textureArray[6]);
    //     this.swap(textureArray, 4, 6);
    //     this.swap(texture.internalTextures, 4, 6);
    // }

    /**
     * Bakes only direct light on lightmaps
     * @returns true if energy has been shot. (false meaning that there was no emitter)
     */
    public generateShadowMap(lights: Mesh[]): boolean {
        if (!this.isReady()) {
            if (DirectRenderer.WARNING_LOGS) {
                console.log("Not ready yet");
            }

            return true;
        }

        let hasShot = false;
        console.log("Shooting");
        for (const light of lights) {
            this.renderToShadowMapTexture(light);
        }

        // for (let i = 0; i < this._patchMaps.length; i++) {
        //     this.postProcessLightmap(this._patchMaps[i]));
        // }

        return hasShot;
    }

    /**
     * Checks if the renderer is ready
     * @returns True if the renderer is ready
     */
    public isReady() {
        return this._directEffectsManager.isReady();
    }

    // private toneMap(origin: Texture, dest: Texture) {
    //     var engine = this._scene.getEngine();
    //     var effect = this._radiosityEffectsManager.radiosityPostProcessEffect;
    //     engine.enableEffect(effect);
    //     engine.setState(false);
    //     let gl = engine._gl;
    //     let fb = this._frameBuffer1;
    //     gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    //     gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, (<InternalTexture>dest._texture)._webGLTexture, 0);

    //     engine.clear(new Color4(0.0, 0.0, 0.0, 0.0), true, true, true);
    //     let vb: any = {};
    //     vb[VertexBuffer.PositionKind] = this._radiosityEffectsManager.screenQuadVB;
    //     effect.setTexture("inputTexture", origin);
    //     effect.setFloat("_ExposureAdjustment", 1); // TODO
    //     effect.setColor3("ambientColor", new Color3(0.4, 0.4, 0.4)); // TODO
    //     engine.bindBuffers(vb, this._radiosityEffectsManager.screenQuadIB, effect);

    //     engine.setDirectViewport(0, 0, dest.getSize().width, dest.getSize().height);
    //     engine.drawElementsType(Material.TriangleFillMode, 0, 6);
    //     // Tools.DumpFramebuffer(dest.getSize().width, dest.getSize().height, engine);

    //     gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // }

    // private dilate(padding: number = 1, origin: Texture, dest: Texture) {
    //     // TODO padding unused
    //     var engine = this._scene.getEngine();
    //     var effect = this._radiosityEffectsManager.dilateEffect;
    //     engine.enableEffect(effect);
    //     engine.setState(false);
    //     let gl = engine._gl;
    //     let fb = this._frameBuffer1;
    //     gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    //     gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, (<InternalTexture>dest._texture)._webGLTexture, 0);

    //     engine.clear(new Color4(0.0, 0.0, 0.0, 0.0), true, true, true);
    //     let vb: any = {};
    //     vb[VertexBuffer.PositionKind] = this._radiosityEffectsManager.screenQuadVB;
    //     effect.setTexture("inputTexture", origin);
    //     effect.setFloat2("texelSize", 1 / dest.getSize().width, 1 / dest.getSize().height);
    //     engine.bindBuffers(vb, this._radiosityEffectsManager.screenQuadIB, effect);

    //     engine.setDirectViewport(0, 0, dest.getSize().width, dest.getSize().height);
    //     engine.drawElementsType(Material.TriangleFillMode, 0, 6);
    //     gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // }

    private renderSubMesh = (subMesh: SubMesh, effect: Effect) => {
        let engine = this._scene.getEngine();
        let mesh = subMesh.getRenderingMesh();
        let material = subMesh.getMaterial();

        if (!material || subMesh.verticesCount === 0) {
            return;
        }

        mesh._bind(subMesh, effect, Material.TriangleFillMode);
        engine.setState(material.backFaceCulling);

        var batch = mesh._getInstancesRenderList(subMesh._id);

        if (batch.mustReturn) {
            return;
        }

        // Draw triangles
        const hardwareInstancedRendering = Boolean(engine.getCaps().instancedArrays && batch.visibleInstances[subMesh._id]);
        mesh._processRendering(mesh, subMesh, effect, Material.TriangleFillMode, batch, hardwareInstancedRendering,
            (isInstance, world) => effect.setMatrix("world", world));
    }

    private _setCubeVisibilityUniforms(effect: Effect, view: Matrix, projection: Matrix) {
        effect.setMatrix("view", view);
        effect.setMatrix("projection", projection);
        effect.setFloat2("nearFar", this._near, this._far);
        effect.setFloat("bias", this._bias);
    }

    private renderVisibilityMapCube(light: Mesh) {
        let engine = this._scene.getEngine();

        const viewMatrix = Matrix.LookAtLH(light.position, light.position.add(new Vector3(1, 0, 0)), Vector3.Up());
        let xAxis = new Vector3(viewMatrix.m[0], viewMatrix.m[4], viewMatrix.m[8]); // Tangent
        let yAxis = new Vector3(viewMatrix.m[1], viewMatrix.m[5], viewMatrix.m[9]); // "Up"
        let zAxis = new Vector3(viewMatrix.m[2], viewMatrix.m[6], viewMatrix.m[10]); // depth

        const viewMatrixPX = Matrix.LookAtLH(light.position, light.position.add(xAxis), yAxis);
        const viewMatrixNX = Matrix.LookAtLH(light.position, light.position.subtract(xAxis), yAxis);
        const viewMatrixPY = Matrix.LookAtLH(light.position, light.position.add(yAxis), zAxis.scale(-1));
        const viewMatrixNY = Matrix.LookAtLH(light.position, light.position.subtract(yAxis), zAxis);

        let viewMatrices = [
            viewMatrix,
            viewMatrixPX,
            viewMatrixNX,
            viewMatrixPY,
            viewMatrixNY
        ];

        let projectionMatrices = [this._projectionMatrix,
        this._projectionMatrixPX,
        this._projectionMatrixNX,
        this._projectionMatrixPY,
        this._projectionMatrixNY
        ];

        let viewportMultipliers = [
            [1, 1],
            [0.5, 1],
            [0.5, 1],
            [1, 0.5],
            [1, 0.5],
        ];
        let viewportOffsets = [
            [0, 0],
            [0, 0],
            [0.5, 0],
            [0, 0],
            [0, 0.5],
        ];

        // engine.enableEffect(this._directEffectsManager.visibilityEffect);
        // engine.bindFramebuffer(light.directInfo.depthMap._texture);

        // engine.clear(new Color4(0, 0, 0, 0), true, true);

        // this._setCubeVisibilityUniforms(this._directEffectsManager.visibilityEffect, viewMatrix, this._projectionMatrix);
        // // this._directEffectsManager.visibilityEffect.setVector3("lightPos", light.absolutePosition);

        // for (const mesh of this.meshes) {
        //     for (const subMesh of mesh.subMeshes) {
        //         this.renderSubMesh(subMesh, this._directEffectsManager.visibilityEffect);
        //     }
        // }

        // engine.unBindFramebuffer(light.directInfo.depthMap._texture);

        for (let viewIndex = 0; viewIndex < viewMatrices.length; viewIndex++) {
            engine.enableEffect(this._directEffectsManager.visibilityEffect);

            // Render on each face of the hemicube
            engine.bindFramebuffer(light.directInfo.depthMap._texture, viewIndex);

            // Full cube viewport when rendering the front face
            engine.setDirectViewport(viewportOffsets[viewIndex][0] * this._depthCubeSize, viewportOffsets[viewIndex][1] * this._depthCubeSize, this._depthCubeSize, this._depthCubeSize * viewportMultipliers[viewIndex][1]);

            engine.clear(new Color4(0, 0, 0, 0), true, true);

            for (const mesh of this.meshes) {
                for (const subMesh of mesh.subMeshes) {
                    this._setCubeVisibilityUniforms(this._directEffectsManager.visibilityEffect, viewMatrices[viewIndex], projectionMatrices[viewIndex]);
                    // this._directEffectsManager.visibilityEffect.setVector3("lightPos", light.absolutePosition);
                    this.renderSubMesh(subMesh, this._directEffectsManager.visibilityEffect);
                }
            }

            engine.unBindFramebuffer(light.directInfo.depthMap._texture);
        }
    }

    /**
     * Disposes of the radiosity renderer.
     */
    public dispose(): void {
    }
}
