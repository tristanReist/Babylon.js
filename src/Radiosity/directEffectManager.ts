import { Effect } from "../Materials/effect";
import { VertexBuffer } from "../Meshes/buffer";
import { DataBuffer } from "../Meshes/dataBuffer";
import { Scene } from "../scene";

import "../Shaders/visibility.fragment";
import "../Shaders/visibility.vertex";
import "../Shaders/dilate.fragment";
import "../Shaders/dilate.vertex";
import "../Shaders/radiosityPostProcess.fragment";
import "../Shaders/radiosityPostProcess.vertex";
import "../Shaders/shadowmapping.fragment";
import "../Shaders/shadowmapping.vertex";

/**
  * Creates various effects to solve radiosity.
  */
export class DirectEffectsManager {
    /**
      * Effect for visibility
      */
    public visibilityEffect: Effect;
    /**
      * Effect to dilate the lightmap. Useful to avoid seams.
      */
    public dilateEffect: Effect;
    /**
      * Effect to tonemap the lightmap. Necessary to map the dynamic range into 0;1.
      */
    public radiosityPostProcessEffect: Effect;

    public lightmapCombineEffect: Effect;

    public shadowMappingEffect: Effect;

    private _vertexBuffer: VertexBuffer;
    private _indexBuffer: DataBuffer;

    private _scene: Scene;

    /**
      * Creates the manager
      * @param scene The current scene
      * @param useHemicube If true, uses hemicube instead of hemispherical projection
      * @param useDepthCompare If true, uses depth instead of surface id for visibility
      */
    constructor(scene: Scene) {
        this._scene = scene;

        this.prepareBuffers();
        this.createEffects();
    }

    /**
      * Gets a screen quad vertex buffer
      */
    public get screenQuadVB(): VertexBuffer {
        return this._vertexBuffer;
    }

    /**
      * Gets a screen quad index buffer
      */
    public get screenQuadIB(): DataBuffer {
        return this._indexBuffer;
    }

    private createEffects(): Promise<void> {

        return new Promise((resolve, reject) => {
            let interval = setInterval(() => {
                let readyStates = [
                    this.isVisiblityEffectReady(),
                    this.isRadiosityPostProcessReady(),
                    this.isShadowMappingEffectReady(),
                    this.isDilateEffectReady(),
                    this.isLightmapCombineEffectReady(),
                ];

                for (let i = 0; i < readyStates.length; i++) {
                    if (!readyStates[i]) {
                        return;
                    }
                }

                clearInterval(interval);
                resolve();
            }, 200);
        });
    }

    /**
      * Checks the ready state of all the effets
      * @returns true if all the effects are ready
      */
    public isReady(): boolean {
        return  this.isVisiblityEffectReady() &&
                this.isRadiosityPostProcessReady() &&
                this.isShadowMappingEffectReady() &&
                this.isDilateEffectReady() &&
                this.isLightmapCombineEffectReady();
    }

    private prepareBuffers(): void {
        if (this._vertexBuffer) {
            return;
        }

        // VBO
        var vertices = [];
        vertices.push(1, 1);
        vertices.push(-1, 1);
        vertices.push(-1, -1);
        vertices.push(1, -1);

        this._vertexBuffer = new VertexBuffer(this._scene.getEngine(), vertices, VertexBuffer.PositionKind, false, false, 2);

        this._buildIndexBuffer();
    }

    private _buildIndexBuffer(): void {
        // Indices
        var indices = [];
        indices.push(0);
        indices.push(1);
        indices.push(2);

        indices.push(0);
        indices.push(2);
        indices.push(3);

        this._indexBuffer = this._scene.getEngine().createIndexBuffer(indices);
    }

    /**
     * Checks the ready state of the visibility effect
     * @returns true if the visibility effect is ready
     */
    public isVisiblityEffectReady(): boolean {
        let attribs = [VertexBuffer.PositionKind, VertexBuffer.UV2Kind];
        let uniforms = ["world", "view", "projection", "nearFar", "bias"];

        this.visibilityEffect = this._scene.getEngine().createEffect("visibility",
            attribs,
            uniforms,
            [], "");

        return this.visibilityEffect.isReady();
    }

    /**
     * Checks the ready state of the dilate effect
     * @returns true if the dilate effect is ready
     */
    public isDilateEffectReady(): boolean {
        this.dilateEffect = this._scene.getEngine().createEffect("dilate",
            [VertexBuffer.PositionKind],
            ["offset", "texelSize"],
            ["inputTexture"], "");

        return this.dilateEffect.isReady();
    }

    /**
     * Checks the ready state of the tonemap effect
     * @returns true if the tonemap effect is ready
     */
    public isRadiosityPostProcessReady(): boolean {
        this.radiosityPostProcessEffect = this._scene.getEngine().createEffect("radiosityPostProcess",
            [VertexBuffer.PositionKind],
            ["_ExposureAdjustment"],
            ["inputTexture"], "");

        return this.radiosityPostProcessEffect.isReady();
    }

    /**
     * Checks the ready state of the tonemap effect
     * @returns true if the tonemap effect is ready
     */
    public isShadowMappingEffectReady(): boolean {
        var attribs = [VertexBuffer.PositionKind, VertexBuffer.NormalKind, VertexBuffer.UV2Kind];
        var uniforms = [];
        var samplers = ["depthMap"];

        this.shadowMappingEffect = this._scene.getEngine().createEffect("shadowmapping",
            attribs,
            uniforms,
            samplers, "");

        return this.radiosityPostProcessEffect.isReady();
    }

    public isLightmapCombineEffectReady(): boolean {
        const attribs = [VertexBuffer.UV2Kind];
        this.lightmapCombineEffect = this._scene.getEngine().createEffect("lightmapCombine",
            attribs,
            [],
            ["inputTexture"]);

        return this.lightmapCombineEffect.isReady();
    }
}
