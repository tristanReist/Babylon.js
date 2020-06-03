import { Mesh } from "../../Meshes/mesh";
import { RenderTargetTexture } from '../../Materials/Textures/renderTargetTexture';
import { Nullable } from '../../types';
import { Texture } from '../../Materials/Textures/texture';
import { Scene } from '../../scene';
import { ShaderMaterial } from '../../Materials/shaderMaterial';
import { PBRMaterial } from '../../Materials';
import { Color4 } from '../../Maths/math.color';

export interface IMeshesGroup {
    directLightmap : Texture;
    irradianceLightmap : RenderTargetTexture;
    cumulativeLightmap : RenderTargetTexture;
    tempLightmap : RenderTargetTexture;
    sumOfBoth : RenderTargetTexture;
}

export class MeshDictionary {
    private _keys : Mesh[];
    private _values : IMeshesGroup[];
    private _scene : Scene;
    private _sumOfBothMaterial : ShaderMaterial;
    private _cumulativeLightmapMaterial : ShaderMaterial;
    private _tempLightmapMaterial : ShaderMaterial;

    constructor(meshes : Mesh[], scene : Scene) {
        this._keys = [];
        this._values = [];
        this._scene = scene;
        for (let mesh of meshes) {
            this._add(mesh);
        }
    }

    private _add(mesh : Mesh) : void {
            this._keys.push(mesh);
            let meshTexture = <IMeshesGroup> {};
            this._values.push(meshTexture);

    }

    public initLightmapTextures() : void {
        for (let mesh of this._keys) {
            let value = this.getValue(mesh);
            if (value != null) {
                let size = value.directLightmap.getSize().width;
                value.irradianceLightmap = new RenderTargetTexture("irradianceLightmap", size, this._scene); 
                value.tempLightmap = new RenderTargetTexture("tempLightmap", size, this._scene);
                value.cumulativeLightmap = new RenderTargetTexture("sumLightmap", size, this._scene); 
                value.sumOfBoth = new RenderTargetTexture("sumOfBoth", size, this._scene);
            }
        }
        this._initCumulativeLightmap();
        this._initTempLightmap();
        this._initSumOfBoth();
    }


   private _initTempLightmap() : void {
        this._tempLightmapMaterial = new ShaderMaterial("", this._scene, "./../../src/Shaders/irradianceVolumeMixTwoTextures", {
            attributes: ["uv2"],
            uniforms: []
        });
        this._tempLightmapMaterial.backFaceCulling = false;
        for (let mesh of this._keys){
            let value = this.getValue(mesh);
            if (value != null) {
                value.tempLightmap.renderList = [mesh];       
                let previousMaterial = mesh.material;
                value.tempLightmap.clearColor = new Color4(0., 0., 0., 1.);
                this._scene.customRenderTargets.push(value.tempLightmap);
                value.tempLightmap.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;

                value.tempLightmap.onBeforeRenderObservable.add(() => {
                    if (value != null){
                        this._tempLightmapMaterial.setTexture( "texture1", value.cumulativeLightmap);
                        this._tempLightmapMaterial.setTexture( "texture2", value.irradianceLightmap);
                    }
                    mesh.material = this._tempLightmapMaterial;
                });

                value.tempLightmap.onAfterRenderObservable.add(() => {
                    mesh.material = previousMaterial;
  
                });
            }
        }
   }


   private _initCumulativeLightmap() : void {
    this._cumulativeLightmapMaterial = new ShaderMaterial("", this._scene, "./../../src/Shaders/irradianceVolumeCopyTexture", {
        attributes: ["uv2"],
        uniforms: []
    });
    this._cumulativeLightmapMaterial.backFaceCulling = false;
    for (let mesh of this._keys){
        let value = this.getValue(mesh);
        if (value != null) {
            value.cumulativeLightmap.renderList = [mesh];   
            let previousMaterial = mesh.material;
            this._scene.customRenderTargets.push(value.cumulativeLightmap);
            value.cumulativeLightmap.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
            value.cumulativeLightmap.clearColor = new Color4(0., 0., 0., 1.);
            value.cumulativeLightmap.onBeforeRenderObservable.add(() => {
                if (value != null){
                    this._cumulativeLightmapMaterial.setTexture( "texture1", value.tempLightmap);
                }
                mesh.material = this._cumulativeLightmapMaterial;
            });

            value.cumulativeLightmap.onAfterRenderObservable.add(() => {
                mesh.material = previousMaterial;
            });
        }
    }
}


    private _initSumOfBoth() : void {
        this._sumOfBothMaterial = new ShaderMaterial("", this._scene, "./../../src/Shaders/irradianceVolumeMixTwoTextures", {
            attributes: ["uv2"],
            uniforms: []
        });
        this._sumOfBothMaterial.backFaceCulling = false;
        for (const mesh of this._keys){
            let value = this.getValue(mesh);
            if (value != null) {
                value.sumOfBoth.renderList = [mesh];
                value.sumOfBoth.coordinatesIndex = 1;        
                let previousMaterial = mesh.material;   
                this._scene.customRenderTargets.push(value.sumOfBoth);
                value.sumOfBoth.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
                value.sumOfBoth.onBeforeRenderObservable.add(() => {
                    if (value != null){
                        this._sumOfBothMaterial.setTexture( "texture1", value.directLightmap);
                        this._sumOfBothMaterial.setTexture( "texture2", value.cumulativeLightmap);
                    }
                    
                    mesh.material = this._sumOfBothMaterial;
                });

                value.sumOfBoth.onAfterRenderObservable.add(() => {
                    mesh.material = previousMaterial;
                    if (value != null)
                    (<PBRMaterial> (mesh.material)).lightmapTexture =  value.sumOfBoth;
                });

            }
        }
     }

    public areMaterialReady() : boolean {
        return( this._sumOfBothMaterial.isReady() && this._cumulativeLightmapMaterial.isReady() && this._tempLightmapMaterial.isReady());
     }
    

    public keys() : Mesh[] {
        return this._keys;
    }

    public values() : IMeshesGroup[] {
        return this._values;
    }

    public getValue(mesh : Mesh) : Nullable<IMeshesGroup> {
        let index = this._containsKey(mesh);
        if (index != -1) {
            return this._values[index];
        }
        return null;
    }

    private _containsKey(key : Mesh) : number {
        for (let i = 0; i < this._keys.length; i++) {
            if (this._keys[i] == key) {
                return i;
            }
        }
        return -1;
    }

    public addDirectLightmap(mesh : Mesh, lightmap : Texture) : void {
        let value = this.getValue(mesh);
        if (value != null) {
            value.directLightmap = lightmap;
        }
    }

}
