import { Scene } from '../../scene';
import { Probe } from './Probe';
import { RenderTargetTexture } from '../../Materials/Textures/renderTargetTexture';
import { Mesh } from '../../Meshes/mesh';
import { Material } from '../../Materials/material';
import { Nullable } from '../../types';
import { ShaderMaterial } from '../../Materials/shaderMaterial';
import { VertexBuffer } from '../../Meshes/buffer';
import { Effect } from '../../Materials/effect';
import { Vector3 } from '../../Maths/math.vector';
import { MeshDictionary } from './meshDictionary';
import { RawTexture } from '../../Materials/Textures/rawTexture';
import { Engine } from '../../Engines/engine';
import { Color4 } from '../../Maths/math.color';

/**
 * Class that aims to take care of everything with regard to the irradiance for the irradiance volum
 */
export class Irradiance {

    private _scene : Scene;

    private _uniformNumberProbes: Vector3;  // Only need to use when the box is uniform
    private _uniformBottomLeft : Vector3;   //Only need to use when the box is uniform
    private _uniformBoxSize : Vector3;  //Only need to use when the box is uniform

    /**
     * The list of probes that are part of this irradiance volume
     */
    public probeList : Array<Probe>;

    /**
     * The meshes that are render by the probes
     */
    public meshes : Array<Mesh>;

    private _promise : Promise<void>;

    /**
     * The effect that will be use to render the environment of each probes. It will be given to every probes of the volume
     */
    public uvEffect : Effect;

    /**
     * The effect used to render the irradiance from each probe.
     */
    public bounceEffect : Effect;

    public dictionary : MeshDictionary;

    /**
     * The number of bounces we want to render on our scene. (1 == only direct light)
     */
    public numberBounces : number;

    public finish = false;

    private _shTexture : RawTexture;

    /**
     * Initiate a new Iradiance
     * @param scene The scene the irradiance is
     * @param probes The probes that are used to render the irradiance
     * @param meshes The meshes that are rendered by the probes
     */
    constructor(scene : Scene, probes : Array<Probe>, meshes : Array<Mesh>, dictionary : MeshDictionary, numberBounces : number) {
        this._scene = scene;
        this.probeList = probes;
        this.meshes = meshes;
        this.dictionary = dictionary;
        this.numberBounces = numberBounces;
        this._promise = this._createPromise();
    }

    /**
     * Add a probe to the list of probes after initialisation
     * @param probe The probe to be added
     */
    public addProbe(probe : Probe) {
        this.probeList.push(probe);
        //We have to recreate the promise because the values have changed
        this._promise = this._createPromise();
    }

    /**
     * Method called when we have a uniform volume.
     * It will change the part where we create the irradiance light map, mainly because of the tricubic interpolation
     * @param numberProbes
     * @param bottomLeft
     * @param size
     */
    public setUniform(numberProbes : Vector3, bottomLeft : Vector3, size : Vector3) : void {
        this._uniformNumberProbes = numberProbes;
        this._uniformBottomLeft = bottomLeft;
        this._uniformBoxSize = size;
    }

    /**
     * Function that launch all the render needed to create the final light map of irradiance that contains
     * global illumination
     */
    public render() : void {

        // When all we need is ready
        this._promise.then(() => {
            for (let probe of this.probeList) {
                probe.render(this.meshes, this.dictionary, this.uvEffect, this.bounceEffect);
                probe.renderBounce(this.meshes);
            }

            let currentBounce = 0;
            for (let probe of this.probeList) {
                probe.sphericalHarmonicChanged = false;
            }
            this._initIrradianceLightMap();
            if (this.numberBounces > 0){
                this._renderBounce(currentBounce + 1);
            }
            else {
                this.finish = true;
            }
        });
    }

    private _renderBounce(currentBounce : number) {
        for (let probe of this.probeList) {
            probe.setBounce(currentBounce);
            probe.tempBounce.render();
        }

        let shCoefPromise = new Promise((resolve, reject) => {
            let interval = setInterval(() => {
                let readyStates = [
                    this._areShCoeffReady()
                ];
                for (let i = 0 ; i < readyStates.length; i++) {
                    if (!readyStates[i]) {
                        return ;
                    }
                }
                clearInterval(interval);
                resolve();
            }, 200);
        });
        shCoefPromise.then(() => {
            for (let probe of this.probeList) {
                probe.sphericalHarmonicChanged = false;
            }
            this.updateShTexture();
            for (let value of this.dictionary.values()) {
                value.irradianceLightmap.render();
                value.tempLightmap.render();
                value.cumulativeLightmap.render();
            }
            if (currentBounce < this.numberBounces) {
                this._renderBounce(currentBounce + 1);
            }
            else {
                this.finish = true;
            }
        });

    }

    public updateShTexture() : void {
        let shArray = new Float32Array(this.probeList.length * 9  * 4);
        for (let i = 0; i < this.probeList.length; i++) {
            let probe = this.probeList[i];
            let index = i * 9 * 4;

            shArray[index] =  probe.sphericalHarmonic.l00.x;
            shArray[index + 1] =  probe.sphericalHarmonic.l00.y;
            shArray[index + 2] = probe.sphericalHarmonic.l00.z;
            shArray[index + 3] = 1;

            shArray[index + 4] = probe.sphericalHarmonic.l11.x;
            shArray[index + 5] = probe.sphericalHarmonic.l11.y;
            shArray[index + 6] = probe.sphericalHarmonic.l11.z;
            shArray[index + 7] = 1;

            shArray[index + 8] = probe.sphericalHarmonic.l10.x;
            shArray[index + 9] =  probe.sphericalHarmonic.l10.y;
            shArray[index + 10] =  probe.sphericalHarmonic.l10.z;
            shArray[index + 11] = 1;

            shArray[index + 12] =  probe.sphericalHarmonic.l1_1.x;
            shArray[index + 13] =  probe.sphericalHarmonic.l1_1.y;
            shArray[index + 14] = probe.sphericalHarmonic.l1_1.z;
            shArray[index + 15] = 1;

            shArray[index + 16] =  probe.sphericalHarmonic.l22.x;
            shArray[index + 17] =  probe.sphericalHarmonic.l22.y;
            shArray[index + 18] =  probe.sphericalHarmonic.l22.z;
            shArray[index + 19] = 1;

            shArray[index + 20] =  probe.sphericalHarmonic.l21.x;
            shArray[index + 21] =  probe.sphericalHarmonic.l21.y;
            shArray[index + 22] =  probe.sphericalHarmonic.l21.z;
            shArray[index + 23] = 1;

            shArray[index + 24] =  probe.sphericalHarmonic.l20.x;
            shArray[index + 25] =  probe.sphericalHarmonic.l20.y;
            shArray[index + 26] =  probe.sphericalHarmonic.l20.z;
            shArray[index + 27] = 1;

            shArray[index + 28] =  probe.sphericalHarmonic.l2_1.x;
            shArray[index + 29] =  probe.sphericalHarmonic.l2_1.y;
            shArray[index + 30] =  probe.sphericalHarmonic.l2_1.z;
            shArray[index + 31] = 1;

            shArray[index + 32] =  probe.sphericalHarmonic.l2_2.x;
            shArray[index + 33] =  probe.sphericalHarmonic.l2_2.y;

        }
        this._shTexture.update(shArray);
    }

    private _initIrradianceLightMap() : void {
        let irradianceMaterial = new ShaderMaterial("irradianceMaterial", this._scene,
        "./../../src/Shaders/irradianceVolumeIrradianceLightmap", {
            attributes : ["position", "normal", "uv2"],
            uniforms : ["world"],
            defines : ["#define NUM_PROBES " + this.probeList.length]
        });

        if (this._uniformBottomLeft != null) {
            irradianceMaterial.setInt("isUniform", 1);
            irradianceMaterial.setVector3("numberProbesInSpace", this._uniformNumberProbes);
            irradianceMaterial.setVector3("boxSize", this._uniformBoxSize);
            irradianceMaterial.setVector3("bottomLeft", this._uniformBottomLeft);

        }
        irradianceMaterial.backFaceCulling = false;

        for (let mesh of this.dictionary.keys()) {
            let value = this.dictionary.getValue(mesh);
            if (value != null) {
                value.irradianceLightmap.renderList = [mesh];
                this._scene.customRenderTargets.push(value.irradianceLightmap);
                value.irradianceLightmap.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
                let previousMaterial : Nullable<Material>;

                value.irradianceLightmap.onBeforeRenderObservable.add(() => {
                    let probePosition = [];
                    // let shCoef = [];
                    for (let probe of  this.probeList) {
                        probePosition.push(probe.sphere.position.x);
                        probePosition.push(probe.sphere.position.y);
                        probePosition.push(probe.sphere.position.z);
                    }
                    irradianceMaterial.setArray3("probePosition", probePosition);
                    irradianceMaterial.setTexture("shText", this._shTexture);

                    //Add the right material to the mesh
                    previousMaterial = mesh.material;
                    mesh.material = irradianceMaterial;

                });

                value.irradianceLightmap.onAfterRenderObservable.add(() => {
                    //Put the previous material on the meshes
                    mesh.material = previousMaterial;

                });
            }

        }

    }

    private _createPromise() : Promise<void> {
        return new Promise((resolve, reject) => {
            this._initProbesPromise();
            let initArray = new Float32Array(this.probeList.length * 9 * 4);
            this._shTexture = new RawTexture(initArray, 9, this.probeList.length, Engine.TEXTUREFORMAT_RGBA, this._scene, false, false, 0, Engine.TEXTURETYPE_FLOAT);
            let interval = setInterval(() => {
                let readyStates = [
                    this._isRawTextReady(),
                    this._areIrradianceLightMapReady(),
                    this._areProbesReady(),
                    this._isUVEffectReady(),
                    this._isBounceEffectReady(),
                    this.dictionary.areMaterialReady()
                ];
                for (let i = 0 ; i < readyStates.length; i++) {
                    if (!readyStates[i]) {
                        return ;
                    }
                }
                clearInterval(interval);
                resolve();
            }, 200);
        });
    }

    private _initProbesPromise() : void {
        for (let probe of this.probeList) {
            probe.initPromise();
        }
    }

    private _isRawTextReady() : boolean {
        return this._shTexture.isReady();
    }

    private _areProbesReady() : boolean {
        let ready = true;
        for (let probe of this.probeList) {
            ready = probe.isProbeReady() && ready;
            if (!ready) {
                return false;
            }
        }
        return true;
    }

    private _isUVEffectReady() : boolean {
        var attribs = [VertexBuffer.PositionKind, VertexBuffer.NormalKind, VertexBuffer.UVKind, VertexBuffer.UV2Kind];
        var uniforms = ["world", "projection", "view", "probePosition", "albedoColor", "hasTexture", "lightmapNumber"];
        var samplers = ["albedoTexture"];
        this.uvEffect = this._scene.getEngine().createEffect("irradianceVolumeProbeEnv",
            attribs,
            uniforms,
            samplers);

        return this.uvEffect.isReady();
    }

    private _isBounceEffectReady() : boolean {
        // var attribs = [VertexBuffer.PositionKind, VertexBuffer.UVKind];
        var attribs = [VertexBuffer.PositionKind, VertexBuffer.NormalKind, VertexBuffer.UVKind, VertexBuffer.UV2Kind];
        // var samplers = ["envMap", "envMapUV", "irradianceMapArray", "directIlluminationLightMapArray"];
        var samplers = ["envMap", "envMapUV", "irradianceMap", "albedoTexture", "directIlluminationLightmap"];

        // var uniform = ["world", "rotation", "numberLightmap"];
        var uniform = ["projection", "view", "probePosition", "albedoColor", "hasTexture", "world", "firstBounce" ];
        this.bounceEffect = this._scene.getEngine().createEffect("irradianceVolumeUpdateProbeBounceEnv",
            attribs, uniform,
            samplers);

        return this.bounceEffect.isReady();
    }

    private _areIrradianceLightMapReady() : boolean {
        for (let value of this.dictionary.values()) {
            if (!value.irradianceLightmap.isReady()) {
                return false;
            }
            if (value.directLightmap != null && !value.directLightmap.isReady()) {
                return false;
            }
        }
        return true;
    }
/*
    private  _areProbesEnvMapReady() : boolean {
        for (let probe of this.probeList) {
            if (probe.envCubeMapRendered == false) {
                return false;
            }
        }
        return true;
    }
*/
    private _areShCoeffReady() : boolean {
        for (let probe of this.probeList) {
            if (! probe.sphericalHarmonicChanged) {
                return false;
            }
        }
        return true;
    }

    public updateNumberBounces(numberBounces : number) {
        if (this.numberBounces < numberBounces){
            this.finish = false;
            let currentBounce = this.numberBounces + 1;
            this.numberBounces = numberBounces;
            this._renderBounce(currentBounce);
        }
        else if (this.numberBounces > numberBounces) {
            this.finish = false;
            this.numberBounces = numberBounces;
            let engine = this._scene.getEngine();
            for (let value of this.dictionary.values()){
                let internal = value.irradianceLightmap.getInternalTexture();
                if (internal != null){
                    engine.bindFramebuffer(internal);
                    engine.clear(new Color4(0., 0., 0., 1.), true, true, true);
                    engine.unBindFramebuffer(internal);
                }
            }

            if (this.numberBounces == 0){
                this.finish = true;
            }
            else {
                this._renderBounce(1);
            }
        }
        else {
            console.log("same");
            return;
        }


        let finsihPromise = new Promise((resolve, reject) => {
            let interval = setInterval(() => {
                if ( ! this.finish ) {
                        return ;
                    }                
                clearInterval(interval);
                resolve();
            }, 200);
        });

        finsihPromise.then( () => {
            for (let value of this.dictionary.values()){
                value.sumOfBoth.render();
            }
        });

    }
}