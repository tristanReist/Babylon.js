import { Mesh } from "../Meshes/mesh";
import { VertexBuffer } from "../Meshes/buffer";
import { SubMesh } from "../Meshes/subMesh";
import { Scene } from "../scene";
import { Texture } from "../Materials/Textures/texture";
import { RenderTargetTexture } from "../Materials/Textures/renderTargetTexture";
import { Effect } from "../Materials/effect";
import { Material } from "../Materials/material";
import { Constants } from "../Engines/constants";
import { Vector2, Vector3, Color4, Matrix } from "../Maths/math";
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

            shadowMap: Nullable<RenderTargetTexture>;
            tempTexture: Nullable<RenderTargetTexture>;
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

        depthMap: null,
        shadowMap: null,
    };
};

Mesh.prototype.getShadowMap = function() {
    return this.directInfo.shadowMap;
};

export class Arealight {
    public position: Vector3;

    public normal: Vector3;

    public size: Vector2;

    public depthMapSize: {
        width: number,
        height: number
    };

    public depthMap: RenderTargetTexture;

    constructor(position: Vector3, normal: Vector3, size: Vector2, depthMapSize: { width: number, height: number }, scene: Scene) {
        this.position = position;
        this.normal = normal;
        this.size = size;

        this.depthMapSize = depthMapSize;

        this.depthMap = new RenderTargetTexture(
            "depthMap",
            this.depthMapSize,
            scene,
            false,
            true,
            Constants.TEXTURETYPE_FLOAT,
            true,
            Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
            true,
            false
        );
    }
}

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

             mesh.directInfo.tempTexture = new RenderTargetTexture(
                "tempMap",
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
    public createDepthMaps(lights: Arealight[]) {
        for (const light of lights) {
            this.renderVisibilityMapCube(light);
        }
    }

    private renderToShadowMapTexture(light: Arealight) {
        const viewMatrix = Matrix.LookAtLH(light.position, light.position.add(light.normal), Vector3.Up());
        const engine = this._scene.getEngine();
        const effect = this._directEffectsManager.shadowMappingEffect;

        for (const mesh of this.meshes) {
            engine.enableEffect(effect);
            effect.setTexture("depthMap", light.depthMap);
            effect.setMatrix("view", viewMatrix);
            effect.setMatrix("projection", this._projectionMatrix);
            effect.setFloat2("nearFar", this._near, this._far);
            effect.setVector3("lightPos", light.position);

            engine.setDirectViewport(0, 0, mesh.directInfo.shadowMapSize.width, mesh.directInfo.shadowMapSize.height);
            engine.setState(false, 0, true, true);
            engine.bindFramebuffer(mesh.directInfo.shadowMap._texture);
            engine.clear(new Color4(0, 0, 0, 0), true, true);

            for (const subMesh of mesh.subMeshes) {
                // this.renderSubMesh(subMesh, effect);
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

            // this.dilate(mesh.directInfo.shadowMap, mesh.directInfo.tempTexture);
        }
    }

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
    public generateShadowMap(lights: Arealight[]) {
        console.log("Shooting");
        for (const light of lights) {
            this.renderToShadowMapTexture(light);
        }

        // for (let i = 0; i < this._patchMaps.length; i++) {
        //     this.postProcessLightmap(this._patchMaps[i]));
        // }
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

    // private dilate(origin: Texture, dest: Texture) {
    //     const engine = this._scene.getEngine();
    //     const effect = this._directEffectsManager.dilateEffect;

    //     engine.enableEffect(effect);
    //     engine.bindFramebuffer(dest._texture);

    //     engine.clear(new Color4(0.0, 0.0, 0.0, 0.0), true, true, true);

    //     let vb: any = {};
    //     vb[VertexBuffer.PositionKind] = this._directEffectsManager.screenQuadVB;
    //     effect.setTexture("inputTexture", origin);
    //     effect.setFloat2("texelSize", 1 / origin.getSize().width, 1 / origin.getSize().height);
    //     engine.bindBuffers(vb, this._directEffectsManager.screenQuadIB, effect);

    //     engine.setDirectViewport(0, 0, dest.getSize().width, dest.getSize().height);
    //     engine.drawElementsType(Material.TriangleFillMode, 0, 6);

    //     engine.unBindFramebuffer(dest._texture);
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
    }

    private renderVisibilityMapCube(light: Arealight) {
        const engine = this._scene.getEngine();
        const gl = engine._gl;

        // const viewMatrix = Matrix.LookAtLH(light.position, light.position.add(new Vector3(1, 0, 0)), Vector3.Up());
        const viewMatrix = Matrix.LookAtLH(light.position, light.position.add(light.normal), Vector3.Up());
        let xAxis = new Vector3(viewMatrix.m[0], viewMatrix.m[4], viewMatrix.m[8]); // Tangent
        let yAxis = new Vector3(viewMatrix.m[1], viewMatrix.m[5], viewMatrix.m[9]); // "Up"
        let zAxis = new Vector3(viewMatrix.m[2], viewMatrix.m[6], viewMatrix.m[10]); // depth

        const viewMatrixPX = Matrix.LookAtLH(light.position, light.position.add(xAxis), yAxis);
        const viewMatrixNX = Matrix.LookAtLH(light.position, light.position.subtract(xAxis), yAxis);
        const viewMatrixPY = Matrix.LookAtLH(light.position, light.position.add(yAxis), zAxis.scale(-1));
        const viewMatrixNY = Matrix.LookAtLH(light.position, light.position.subtract(yAxis), zAxis);

        const viewMatrices = [
            viewMatrix,
            viewMatrixPX,
            viewMatrixNX,
            viewMatrixPY,
            viewMatrixNY
        ];

        let projectionMatrices = [
            this._projectionMatrix,
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
        let cubeSides = [
            gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
        ];

        engine.enableEffect(this._directEffectsManager.visibilityEffect);

        // Hemi cube rendering
        for (let viewIndex = 0; viewIndex < cubeSides.length; viewIndex++) {
            // Render on each face of the hemicube
            engine.bindFramebuffer(light.depthMap._texture, cubeSides[viewIndex] - gl.TEXTURE_CUBE_MAP_POSITIVE_X);

            // Full cube viewport when rendering the front face
            engine.setDirectViewport(
                viewportOffsets[viewIndex][0] * this._depthCubeSize,
                viewportOffsets[viewIndex][1] * this._depthCubeSize,
                light.depthMapSize.width * viewportMultipliers[viewIndex][0],
                light.depthMapSize.height* viewportMultipliers[viewIndex][1]
            );

            engine.clear(new Color4(0, 0, 0, 0), true, true);

            this._setCubeVisibilityUniforms(this._directEffectsManager.visibilityEffect, viewMatrices[viewIndex], projectionMatrices[viewIndex]);

            for (const mesh of this.meshes) {
                for (const subMesh of mesh.subMeshes) {
                    this.renderSubMesh(subMesh, this._directEffectsManager.visibilityEffect);
                }
            }

            engine.unBindFramebuffer(light.depthMap._texture);
        }
    }

    /**
     * Disposes of the radiosity renderer.
     */
    public dispose(): void {
    }
}
