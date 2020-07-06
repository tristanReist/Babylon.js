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
import "../Shaders/shadowMapping.fragment";
import "../Shaders/shadowMapping.vertex";
import "../Shaders/horizontalBlur.fragment";
import "../Shaders/horizontalBlur.vertex";
import "../Shaders/verticalBlur.fragment";
import "../Shaders/verticalBlur.vertex";

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

    /**
      * Effect to blur the lightmap horizontally.
      */
    public horizontalBlurEffect: Effect;

    /**
      * Effect to blur the lightmap vertically.
      */
    public verticalBlurEffect: Effect;

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
                    this.isHorizontalBlurReady(),
                    this.isVerticalBlurReady(),
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
                this.isLightmapCombineEffectReady() &&
                this.isHorizontalBlurReady() &&
                this.isVerticalBlurReady();
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
        const attribs = [VertexBuffer.PositionKind];
        const uniforms = ["world", "view", "projection", "nearFar", "bias"];

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
            ["exposure"],
            ["inputTexture"], "");

        return this.radiosityPostProcessEffect.isReady();
    }

    /**
     * Checks the ready state of the horizontal blur effect
     * @returns true if the horizontal blur effect is ready
     */
    public isHorizontalBlurReady(): boolean {
        this.horizontalBlurEffect = this._scene.getEngine().createEffect("horizontalBlur",
            [VertexBuffer.PositionKind],
            ["texelSize"],
            ["inputTexture"], "");

        return this.horizontalBlurEffect.isReady();
    }

    /**
     * Checks the ready state of the vertical blur effect
     * @returns true if the vertical blur effect is ready
     */
    public isVerticalBlurReady(): boolean {
        this.verticalBlurEffect = this._scene.getEngine().createEffect("verticalBlur",
            [VertexBuffer.PositionKind],
            ["texelSize"],
            ["inputTexture"], "");

        return this.verticalBlurEffect.isReady();
    }

    /**
     * Checks the ready state of the tonemap effect
     * @returns true if the tonemap effect is ready
     */
    public isShadowMappingEffectReady(): boolean {
        const attribs: string[] = [VertexBuffer.PositionKind, VertexBuffer.NormalKind, VertexBuffer.UV2Kind];
        const uniforms: string[] = ["world", "view", "projection", "nearFar", "lightPos", "sampleCount", "normalBias"];
        const samplers: string[] = ["depthMap", "gatherTexture"];

        this.shadowMappingEffect = this._scene.getEngine().createEffect("shadowMapping",
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
