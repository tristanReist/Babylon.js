import { Scene } from '../../scene';
import { Probe } from './Probe';
import { Mesh } from '../../Meshes/mesh';
import { Material } from '../../Materials/material';
import { Nullable } from '../../types';
import { ShaderMaterial } from '../../Materials/shaderMaterial';
import { VertexBuffer } from '../../Meshes/buffer';
import { Effect } from '../../Materials/effect';
import { Vector3, Matrix } from '../../Maths/math.vector';
import { MeshDictionary } from './meshDictionary';
import { RawTexture } from '../../Materials/Textures/rawTexture';
import { Engine } from '../../Engines/engine';
import { Color4 } from '../../Maths/math.color';
import { SmartArray } from '../../Misc/smartArray';
import { SubMesh } from '../../Meshes/subMesh';
import { RenderTargetTexture } from '../../Materials/Textures/renderTargetTexture';
import { InternalTexture } from '../../Materials';

/**
 * Class that aims to take care of everything with regard to the irradiance for the irradiance volume 
 */
export class Irradiance {

    private _scene : Scene;

    private _uniformNumberProbes: Vector3;
    private _uniformBottomLeft : Vector3;
    private _uniformBoxSize : Vector3;

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

    /**
     * The dictionary that stores the lightmaps linked to each mesh
     */
    public dictionary : MeshDictionary;

    /**
     * The number of bounces we want to add to the scene
     */
    public numberBounces : number;

    /**
     * Value that will be set to true once the rendering is finish.
     * Can be used to check if the rendering is finished outiside of this class, because we use Promess
     */
    public finish = false;

    private _shTexture : RawTexture;

    public allProbesEnv : RenderTargetTexture;

    /**
     * Initializer of the irradiance class
     * @param scene The scene of the meshes
     * @param probes The probes that are used to render irradiance
     * @param meshes The meshes that are used to render irradiance
     * @param dictionary The dictionary that contains information about meshes
     * @param numberBounces The number of bounces we want to render
     * @param probeDisposition A vec3 representing the number of probes on each axis of the volume
     * @param bottomLeft    A position representing the position of the probe on the bottom left of the irradiance volume
     * @param volumeSize A vec3 containing the volume width, height and depth
     */
    constructor(scene : Scene, probes : Array<Probe>, meshes : Array<Mesh>, dictionary : MeshDictionary, numberBounces : number,
        probeDisposition : Vector3, bottomLeft : Vector3, volumeSize : Vector3 ) {
        this._scene = scene;
        this.probeList = probes;
        this.meshes = meshes;
        this.dictionary = dictionary;
        this.numberBounces = numberBounces;
        this._uniformNumberProbes = probeDisposition;
        this._uniformBottomLeft = bottomLeft;
        this._uniformBoxSize = volumeSize;
        dictionary.initLightmapTextures();
        //We can only initialize the irradiance lightmap after setting the uniforms attributes, as it is needed for the material
        this._initIrradianceLightMap();
        this._promise = this._createPromise();
    }


    /**
     * Function that launch the render process
     */
    public render() : void {

        // When all we need is ready
        this._promise.then(() => {
            for (let probe of this.probeList) {
                // Init the renderTargetTexture needed for each probes
                probe.render(this.meshes, this.dictionary, this.uvEffect, this.bounceEffect);
                probe.renderBounce(this.meshes);
            }
            for (let probe of this.probeList) {
                probe.cubicMRT.render();
            }
         
            let currentBounce = 0;
            for (let probe of this.probeList) {
                // Set these value to false to ensure that the promess will finish when we want it too
                probe.sphericalHarmonicChanged = false;
            }
            if (this.numberBounces > 0){
                // Call the recursive function that will render each bounce
                this._renderBounce(currentBounce + 1);
            }
            else {
                // We are done with the rendering process, finish has to be set to true
                this.finish = true;
            }
        });
    }

    private _renderBounce(currentBounce : number) {
        let beginBounce = new Date().getTime();
        // for (let value of this.dictionary.values()){
        //     value.irradianceLightmap.readPixels();
        // }
        let readPixels = new Date().getTime();
        let endProbeEnv = new Date().getTime();
        for (let probe of this.probeList) {
            readPixels = new Date().getTime();
            probe.tempBounce.render();
            endProbeEnv = new Date().getTime();
            console.log("with Sh coef computation");
            console.log(endProbeEnv - readPixels);
        }

        this.updateShTexture();
        for (let value of this.dictionary.values()) {
            value.irradianceLightmap.render();
        }

        let endBounce = new Date().getTime();
        console.log("bounce : " + currentBounce);
        console.log(endBounce - beginBounce);
        console.log(readPixels - beginBounce); 
        console.log(endBounce - endProbeEnv);

        if (currentBounce < this.numberBounces) {
            this._renderBounce(currentBounce + 1);
        }
        else {
            this.finish = true;
        }
    

    }

    /**
     * Method called to store the spherical harmonics coefficient into a texture,
     * allowing to have less uniforms in our shader
     */
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
            uniforms : ["world", "isUniform", "numberProbesInSpace", "boxSize", "bottomLeft", "probePosition"],
            defines : ["#define NUM_PROBES " + this.probeList.length],
            samplers : ["shText"]
        });

        irradianceMaterial.setInt("isUniform", 1);
        irradianceMaterial.setVector3("numberProbesInSpace", this._uniformNumberProbes);
        irradianceMaterial.setVector3("boxSize", this._uniformBoxSize);
        irradianceMaterial.setVector3("bottomLeft", this._uniformBottomLeft);
        irradianceMaterial.backFaceCulling = false;

        this.dictionary.initIrradianceLightmapMaterial(irradianceMaterial);

        for (let mesh of this.dictionary.keys()) {
            let value = this.dictionary.getValue(mesh);
            if (value != null) {
                value.irradianceLightmap.renderList = [mesh];
                // this._scene.customRenderTargets.push(value.irradianceLightmap);
                // value.irradianceLightmap.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
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
            this.allProbesEnv = new RenderTargetTexture("allProbesEnv", {width : 16 * 6, height : 16 * this.probeList.length}, this._scene);
            let interval = setInterval(() => {
                let readyStates = [
                    this._isRawTextReady(),
                    this._areIrradianceLightMapReady(),
                    this._areProbesReady(),
                    this._isUVEffectReady(),
                    this._isBounceEffectReady(),
                    this.dictionary.areMaterialReady(),
                    this._isAllProbeReady()
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


    private _isAllProbeReady() : boolean {
        return this.allProbesEnv.isReady();
    }


    private _isUVEffectReady() : boolean {
        var attribs = [VertexBuffer.PositionKind, VertexBuffer.NormalKind, VertexBuffer.UVKind, VertexBuffer.UV2Kind];
        var uniforms = ["world", "projection", "view", "probePosition", "albedoColor", "hasTexture", "lightmapNumber"];
        var samplers = ["albedoTexture", "lightmapTexture"];
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
        var samplers = ["envMap", "envMapUV", "envMapLight"];

        // var uniform = ["world", "rotation", "numberLightmap"];
        var uniform = ["world",  "rotation"];
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


    private  _areProbesEnvMapReady() : boolean {
        for (let probe of this.probeList) {
            if (probe.envCubeMapRendered == false) {
                return false;
            }
        }
        return true;
    }


/*
    private _areShCoeffReady() : boolean {
        for (let probe of this.probeList) {
            if (! probe.sphericalHarmonicChanged) {
                return false;
            }
        }
        return true;
    }
*/
    
    /**
     * Method to call when you want to update the number of bounces, after the irradiance rendering has been done
     * @param numberBounces 
     */
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

/*
    private _drawAllProbesEnvironment(subMeshes : SmartArray<SubMesh>, isMRT : boolean) : void {

        var renderSubMesh = (subMesh : SubMesh, effect : Effect, view : Matrix, projection : Matrix) => {
            let mesh = subMesh.getRenderingMesh();

            mesh._bind(subMesh, effect, Material.TriangleFillMode);
            mesh.cullingStrategy = 2;
            if (subMesh.verticesCount === 0) {
                return;
            }
            else {


                effect.setTexture("envMap", this.cubicMRT.textures[1]);
                effect.setTexture("envMapUV", this.cubicMRT.textures[0]);
                effect.setTexture("envMapLight", this.cubicMRT.textures[2]);
                effect.setMatrix("rotation", rotation);

            }
            var batch = mesh._getInstancesRenderList(subMesh._id);
            if (batch.mustReturn) {
                return ;
            }
            var hardwareInstanceRendering = (engine.getCaps().instancedArrays) &&
            (batch.visibleInstances[subMesh._id] !== null);
            
            mesh._processRendering(mesh, subMesh, effect, Material.TriangleFillMode, batch, hardwareInstanceRendering,
                (isInstance, world) => effect.setMatrix("world", world));
        };

        let scene = this._scene;
        let engine = scene.getEngine();
        let gl = engine._gl;

        let internalTexture = <InternalTexture> this.allProbesEnv._texture;
        let effect = this._allProbesEffect;


        gl.bindFramebuffer(gl.FRAMEBUFFER, internalTexture._framebuffer);
        engine.setState(false, 0, true, scene.useRightHandedSystem);


        
        let viewMatrices = [ this.cameraList[Probe.PX].getViewMatrix(),
            this.cameraList[Probe.NX].getViewMatrix(),
            this.cameraList[Probe.PY].getViewMatrix(),
            this.cameraList[Probe.NY].getViewMatrix(),
            this.cameraList[Probe.PZ].getViewMatrix(),
            this.cameraList[Probe.NZ].getViewMatrix()
        ];

        let projectionMatrix =  Matrix.PerspectiveFovLH(Math.PI / 2, 1, 0.1, this.cameraList[0].maxZ);


        engine.enableEffect(effect);

        engine.setDirectViewport(0, 0, this.allProbesEnv.getRenderWidth(), this.allProbesEnv.getRenderHeight());
        gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, internalTexture._webGLTexture, 0);
        engine.clear(new Color4(0, 0, 0, 0), true, true);
        for (let i = 0; i < subMeshes.length; i++) {
            renderSubMesh(subMeshes.data[i], effect, viewMatrices, projectionMatrix);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    }
*/  
}