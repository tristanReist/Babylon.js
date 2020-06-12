import { Scene } from '../../scene';
import { Mesh } from '../../Meshes/mesh';
import { IrradianceVolume } from './irradianceVolume';
import { Vector3 } from '../../Maths/math.vector';
import { RadiosityRenderer } from '../../Radiosity/radiosityRenderer';
import { UvMapper } from '../../Misc/uvMapper';
import { StandardMaterial } from '../../Materials/standardMaterial';

export class IrradianceVolumeManager {
    
    private _scene : Scene;
    private _lightSources : Array<Mesh>;
    private _meshForRadiance : Array<Mesh>;
    private _meshForIrradiance : Array<Mesh>;
    
    private _irradianceVolumes : Array<IrradianceVolume>;
    private _numberBounces : number;

    private _probesDisposition : Vector3;
    private _pr : RadiosityRenderer;

    private _forbiddenNames = ["ground", "earth", "skybox", "avatar", "__root__", 
        "originArrow1_line1_0",
         "originArrow1_line2_0",
         "originArrow1_originArrow1_0",
         "originArrow1_originArrow2_0",
         "originArrow1_endArrow1_0",
         "originArrow1_endArrow2_0",
         "originArrow1_line1_1",
         "originArrow1_line2_1",
         "originArrow1_originArrow1_1",
         "originArrow1_originArrow2_1",
         "originArrow1_endArrow1_1",
         "originArrow1_endArrow2_1",
         "originArrow1_line1_2",
         "originArrow1_line2_2",
         "originArrow1_originArrow1_2",
         "originArrow1_originArrow2_2",
         "originArrow1_endArrow1_2",
         "originArrow1_endArrow2_2",
         "originArrow1_line1_3",
         "originArrow1_line2_3",
         "originArrow1_originArrow1_3",
         "originArrow1_originArrow2_3",
         "originArrow1_endArrow1_3",
         "originArrow1_endArrow2_3"];

    constructor( meshes : Array<Mesh>, lights : Array<Mesh>, scene : Scene, numberProbesX : number,
        numberProbesY : number, numberProbesZ : number, numberBounces : number){
        this._scene = scene;
        this._lightSources = lights;
        this._probesDisposition = new Vector3(numberProbesX, numberProbesY, numberProbesZ);
        this._numberBounces = numberBounces;

        this._createMeshesArray(meshes);

        // TODO : Utilisation des fonctions de Kazaplan pour trouver les mesh propre
        // à une pièce, pour créer un truc par pièce
        console.log("TODO");

        // Creating the IrradianceVolumes with the previously definies rooms
        this._irradianceVolumes = [new IrradianceVolume(this._meshForIrradiance,
             this._scene, 16, this._probesDisposition, this._numberBounces)];

        this._pr = new RadiosityRenderer(scene, this._meshForRadiance, { bias: 0.000002, normalBias: 0.000002 });
        //
        this._mapNewUV();
    

        // Creating the radiosity of the meshes
        this._createRadiosity();

    }

    private _createMeshesArray(meshes : Array<Mesh>){
        this._meshForIrradiance = [];
        this._meshForRadiance = [];
        for (let mesh of meshes) {
            if (this._forbiddenNames.indexOf(mesh.name) == -1){
                this._meshForIrradiance.push(mesh);
                this._meshForRadiance.push(mesh);
                if (mesh.material != null){
                    mesh.material = mesh.material.clone(mesh.material.name);
                }
            }      
        }

        for (let light of this._lightSources) {
            this._meshForRadiance.push(light);
        }

    }

    private _mapNewUV(){
        const uvm = new UvMapper();
        for ( let mesh of this._meshForRadiance ) {
            let [worldToUVRatio, polygonsArea] = uvm.map([mesh], 10);
            mesh.initForRadiosity();
            if (this._lightSources.indexOf(mesh) != -1){
                mesh.radiosityInfo.lightmapSize = {width : 16, height : 16};
                mesh.radiosityInfo.color = new Vector3(10., 10., 10.);
            }
            else {
                mesh.radiosityInfo.lightmapSize = {width : 256, height : 256};           
            }
            mesh.radiosityInfo.texelWorldSize = 1 / ( worldToUVRatio * mesh.radiosityInfo.lightmapSize.width);   
            mesh.radiosityInfo.polygonWorldArea = polygonsArea[0];    
        }
    }

    private _createRadiosity(){
        this._pr.createMaps();
        let observer = this._scene.onAfterRenderTargetsRenderObservable.add(() => {
            if (!this._pr.isReady()){
                return;
            }
            this._pr.gatherDirectLightOnly();
            this._scene.onAfterRenderTargetsRenderObservable.remove(observer);

            console.log("End compute radiosity");
            
            this._renderIrradianceVolumes();
        });
    }

    private _renderIrradianceVolumes(){
        for (let light of this._lightSources){
            if (light.material != null){
                (<StandardMaterial> light.material).emissiveTexture = light.getRadiosityTexture();
                light.material.backFaceCulling = false;
            }
        }
        for ( let irradianceVolume of this._irradianceVolumes ){
            irradianceVolume.updateDicoDirectLightmap();
            irradianceVolume.render();
        }
    }

    public finished(): boolean{
        for (let irradianceVolume of this._irradianceVolumes){
            if (! irradianceVolume.irradiance.finish){
                return false;
            }
        }
        return true;
    }

    public updateNumberBounces(numberBounces : number){
        for (let irradianceVolume of this._irradianceVolumes){
            irradianceVolume.irradiance.updateNumberBounces(numberBounces);
        }
    }

    public setProbesVisibility(value : number){
        for (let irradianceVolume of this._irradianceVolumes){
            for (let probe of irradianceVolume.probeList){
                probe.setVisibility(value);
            }
        }
    }


    public updateDirectIllumStrength(directIllumStrength : number){
        for (let irradianceVolume of this._irradianceVolumes){
            irradianceVolume.updateDirectIllumStrength(directIllumStrength);
        }
    }

    public updateGlobalIllumStrength(globalIllumStrength : number){
        for (let irradianceVolume of this._irradianceVolumes){
            irradianceVolume.updateGlobalIllumStrength(globalIllumStrength);
        }
    }

    public updateDirectIllumForEnv(envMultiplicator : number){
        for (let irradianceVolume of this._irradianceVolumes){
            irradianceVolume.updateDirectIllumForEnv(envMultiplicator);
        }
    }


}