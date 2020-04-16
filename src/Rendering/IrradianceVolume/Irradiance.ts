import { Scene } from '../../scene';
import { Probe } from './Probe';
import { RenderTargetTexture } from '../../Materials/Textures/renderTargetTexture';
import { Mesh } from '../../Meshes/mesh';
import { Material } from '../../Materials/material';
import { Nullable } from '../../types';
import { ShaderMaterial } from '../../Materials/shaderMaterial';


export class Irradiance {

    private _scene : Scene;
    
    public probeList : Array<Probe>;
    public resolution : number;
    public meshes : Array<Mesh>;

    public irradianceLightmap : RenderTargetTexture; 

    private _promise : Promise<void>;


    constructor(scene : Scene, probes : Array<Probe>, resolution : number, meshes : Array<Mesh>){
        this._scene = scene;
        this.probeList = probes;
        this.resolution = resolution;
        this.meshes = meshes;
        this._promise = this._createPromise();
    }


    public addProbe(probe : Probe) {
        this.probeList.push(probe);
        this._promise = this._createPromise();
    }   


    public render() : void {
        let irradiance = this;
        this._promise.then( function () {
            for (let probe of irradiance.probeList){
                probe.render(irradiance.meshes);
            }

            let shCoefPromise = new Promise((resolve, reject) => {
                let interval = setInterval(() => {
                    let readyStates = [
                        irradiance._areShCoeffReady()
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

            shCoefPromise.then( function (){
                irradiance._fillLightMap();
            });
            // irradiance._fillLightMap();
        });
    }

    private _createPromise() : Promise<void> {
        return new Promise((resolve, reject) => {
            this._initProbesPromise();
            this.irradianceLightmap = new RenderTargetTexture("irradianceLightMap", 1024, this._scene);
            let interval = setInterval(() => {
                let readyStates = [
                    this._isIrradianceLightMapReady(),
                    this._areProbesReady()
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
        for (let probe of this.probeList){
            probe.initPromise();
        }
    }

    private _areProbesReady() : boolean {
        let ready = true;
        for (let probe of this.probeList){
            ready = probe.isProbeReady() && ready;
            if (!ready){
                return false;
            }
        }
        return true;
    }

    private _isIrradianceLightMapReady() : boolean {
        
        return this.irradianceLightmap.isReady();
    }

    private _areShCoeffReady() : boolean {
        for (let probe of this.probeList) {
            if (probe.sphericalHarmonic == null){
                return false;
            }
        }
        return true;
    };

    private _fillLightMap() : void {
        this.irradianceLightmap.renderList = this.meshes;
        this._scene.customRenderTargets.push(this.irradianceLightmap);
        this.irradianceLightmap.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;
       
        let irradianceMaterial = new ShaderMaterial("irradianceMaterial", this._scene, 
            "./../../src/Shaders/irradianceLightmap", {
                attributes : ["position", "normal", "uv"],
                uniforms : ["world"],
                defines : ["#define NUM_PROBES " + this.probeList.length]
        });

        let probePosition = [];
        let shCoef = [];
        for (let probe of  this.probeList){
            probePosition.push(probe.sphere.position.x);
            probePosition.push(probe.sphere.position.y);
            probePosition.push(probe.sphere.position.z);

            //We need to put float instead of vector3
            shCoef.push(probe.sphericalHarmonic.l00.x);
            shCoef.push(probe.sphericalHarmonic.l00.y);
            shCoef.push(probe.sphericalHarmonic.l00.z);

            shCoef.push(probe.sphericalHarmonic.l11.x);
            shCoef.push(probe.sphericalHarmonic.l11.y);
            shCoef.push(probe.sphericalHarmonic.l11.z);

            shCoef.push(probe.sphericalHarmonic.l10.x);
            shCoef.push(probe.sphericalHarmonic.l10.y);
            shCoef.push(probe.sphericalHarmonic.l10.z);

            shCoef.push(probe.sphericalHarmonic.l1_1.x);
            shCoef.push(probe.sphericalHarmonic.l1_1.y);
            shCoef.push(probe.sphericalHarmonic.l1_1.z);

            shCoef.push(probe.sphericalHarmonic.l22.x);
            shCoef.push(probe.sphericalHarmonic.l22.y);
            shCoef.push(probe.sphericalHarmonic.l22.z);

            shCoef.push(probe.sphericalHarmonic.l21.x);
            shCoef.push(probe.sphericalHarmonic.l21.y);
            shCoef.push(probe.sphericalHarmonic.l21.z);

            shCoef.push(probe.sphericalHarmonic.l20.x);
            shCoef.push(probe.sphericalHarmonic.l20.y);
            shCoef.push(probe.sphericalHarmonic.l20.z);

            shCoef.push(probe.sphericalHarmonic.l2_1.x);
            shCoef.push(probe.sphericalHarmonic.l2_1.y);
            shCoef.push(probe.sphericalHarmonic.l2_1.z);

            shCoef.push(probe.sphericalHarmonic.l2_2.x);
            shCoef.push(probe.sphericalHarmonic.l2_2.y);
            shCoef.push(probe.sphericalHarmonic.l2_2.z);
        }
        irradianceMaterial.setArray3("probePosition", probePosition);
        irradianceMaterial.setArray3("shCoef", shCoef);

        irradianceMaterial.backFaceCulling = false;

        let previousMaterial = new Array<Nullable<Material>>();
        
        this.irradianceLightmap.onBeforeRenderObservable.add(() => {
            //Add the right material to the meshes
            for ( let mesh of this.meshes ){
                previousMaterial.push(mesh.material);
                mesh.material = irradianceMaterial;
            }
        });

        this.irradianceLightmap.onAfterRenderObservable.add(() => {
            //Put the previous material on the meshes
            for ( let i =  0; i < this.meshes.length; i++ ) {
                this.meshes[i].material = previousMaterial[i];
            }
        });
    }

}