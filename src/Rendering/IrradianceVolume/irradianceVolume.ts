// import * as GUI from './../../../gui/src';

import { Scene } from '../../scene';
import { Mesh } from '../../Meshes/mesh';
import { Vector3 } from '../../Maths/math.vector';
import { RadiosityRenderer } from '../../Radiosity/radiosityRenderer';
import { UvMapper } from '../../Misc/uvMapper';
import { StandardMaterial } from '../../Materials/standardMaterial';
import { MeshDictionary } from './meshDictionary';
import { UniformVolume } from './uniformVolume';
/*
import {AdvancedDynamicTexture} from './../../../gui/src/2D/advancedDynamicTexture';
import {Slider} from  './../../../gui/src/2D/controls/sliders/slider';
import {TextBlock} from  './../../../gui/src/2D/controls/textBlock';
import {StackPanel} from  './../../../gui/src/2D/controls/stackPanel';
import {Control} from './../../../gui/src/2D/controls/control';
*/
export class IrradianceVolume {

    private _lightSources : Array<Mesh>;
    private _meshForIrradiance : Array<Mesh>;
    private _meshForRadiance : Array<Mesh>;
    private _scene : Scene;
    private _numberBounces : number;
    private _probesDisposition : Vector3;
    private _dictionary : MeshDictionary;
    private _volume : UniformVolume;


    constructor(meshes : Array<Mesh>, lightSources : Array<Mesh>, scene : Scene,  numberProbeX : number, numberProbeY : number, numberProbeZ : number, numberBounces : number) {
        this._lightSources = lightSources;
        this._scene = scene;
        this._numberBounces = numberBounces;
        this._probesDisposition = new Vector3(numberProbeX, numberProbeY, numberProbeZ);
        this._sortMeshes(meshes);
        this._dictionary = new MeshDictionary(this._meshForIrradiance, this._scene);
        this._computeRadiosity();   // Will lead to the computation of irradiance
    }

    private _sortMeshes(meshes : Array<Mesh>) {
        this._meshForIrradiance = [];
        for (let mesh of meshes) {
            if (mesh.name != "ground" && mesh.name != "earth" && mesh.name != "skybox" && mesh.name != "avatar" && mesh.name != "__root__"){
                this._meshForIrradiance.push(mesh);
                if (mesh.material != null) {
                    mesh.material = mesh.material.clone(mesh.material.name);
                }
            }      
        }

        this._meshForRadiance = [];
        for (let mesh of this._meshForIrradiance) {
            this._meshForRadiance.push(mesh);
        }
        for (let mesh of this._lightSources) {
            this._meshForRadiance.push(mesh);
        }
    }

    private _computeRadiosity() {
        let pr = new RadiosityRenderer(this._scene, this._meshForRadiance,  { bias: 0.000002, normalBias: 0.000002 });
        this._mapNewUV2();
        pr.createMaps();
        let observer = this._scene.onAfterRenderTargetsRenderObservable.add(() => {
            if (!pr.isReady()) {
                return;
            }
            pr.gatherDirectLightOnly();
            this._scene.onAfterRenderTargetsRenderObservable.remove(observer);
            console.log("end compute radiosity");

            //Update material of the light sources
            for (let light of this._lightSources){
                if (light.material != null) {
                    (<StandardMaterial> light.material).emissiveTexture = light.getRadiosityTexture();
                    light.material.backFaceCulling = false; 
                }

            }

            //Update directLight of dictionaries
            for (let mesh of this._meshForIrradiance) {
                let value = this._dictionary.getValue(mesh);
                if ( value != null ) {
                    value.directLightmap = mesh.getRadiosityTexture();
                }
            } 

            this._computeIrradiance();
        });
    }

    private _mapNewUV2() {
        const uvMapper = new UvMapper();
        for (let mesh of this._meshForRadiance) {
            let [worldToUVRatio, polygonsArea] = uvMapper.map([mesh]);
            mesh.initForRadiosity();
            let indexLightMesh = this._lightSources.indexOf(mesh);
            if (indexLightMesh > -1){
                let light = this._lightSources[indexLightMesh];
                light.radiosityInfo.lightmapSize = {width : 16, height : 16};
                light.radiosityInfo.color = new Vector3(10., 10., 10.);
            }
            else {
                mesh.radiosityInfo.lightmapSize = {width : 256, height : 256};
            }
            mesh.radiosityInfo.texelWorldSize = 1 / ( worldToUVRatio * mesh.radiosityInfo.lightmapSize.width);   
            mesh.radiosityInfo.polygonWorldArea = polygonsArea[0];     
        }
    }

    private _computeIrradiance() {

        this._dictionary.initLightmapTextures();

        console.log(this._probesDisposition);
        this._volume = new UniformVolume(this._meshForIrradiance, this._scene, this._dictionary, 16, 
            this._probesDisposition.x , this._probesDisposition.y, this._probesDisposition.z, this._numberBounces);

        this._volume.render();


        let finsihPromise = new Promise((resolve, reject) => {
            let interval = setInterval(() => {
                if ( ! this._volume.irradiance.finish ) {
                        return ;
                    }                
                clearInterval(interval);
                resolve();
            }, 200);
        });

        finsihPromise.then( () => {
            for (let value of this._dictionary.values()) {
                value.sumOfBoth.render();
            }
            // this._initializeSlider();
        });


    }

    /*
    private _initializeSlider() {
        // var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

        // var panel = new GUI.StackPanel();
        // panel.width = "220px";
        // panel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        // panel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        // advancedTexture.addControl(panel);

        // var header = new GUI.TextBlock();
        // header.text = "Number of bounces : " + this._numberBounces;
        // header.height = "30px";
        // header.color = "white";
        // panel.addControl(header); 

        // var slider = new GUI.Slider();
        // slider.minimum = 0;
        // slider.maximum = 10;
        // slider.value = this._numberBounces;
        // slider.height = "20px";
        // slider.width = "200px";
        // slider.step = 1;
        // slider.onValueChangedObservable.add((value: number) =>  {
        //     header.text = "Number of bounces : " + slider.value;
        // });
        // slider.onPointerUpObservable.add((value : number) =>  {
        //     this._numberBounces = slider.value;
        //     header.text = "Number of bounces : " + this._numberBounces;
        //     this._volume.updateNumberBounces(this._numberBounces);
        // });
        // panel.addControl(slider);  
        var advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");

        var panel = new StackPanel();
        panel.width = "220px";
        panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
        panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
        advancedTexture.addControl(panel);

        var header = new TextBlock();
        header.text = "Number of bounces : " + this._numberBounces;
        header.height = "30px";
        header.color = "white";
        panel.addControl(header); 

        var slider = new Slider();
        slider.minimum = 0;
        slider.maximum = 10;
        slider.value = this._numberBounces;
        slider.height = "20px";
        slider.width = "200px";
        slider.step = 1;
        slider.onValueChangedObservable.add((value: number) =>  {
            header.text = "Number of bounces : " + slider.value;
        });
        slider.onPointerUpObservable.add((value : number) =>  {
            this._numberBounces = slider.value;
            header.text = "Number of bounces : " + this._numberBounces;
            this._volume.updateNumberBounces(this._numberBounces);
        });
        panel.addControl(slider);  
    }
*/

}