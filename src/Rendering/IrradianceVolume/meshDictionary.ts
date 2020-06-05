import { Mesh } from "../../Meshes/mesh";
import { RenderTargetTexture } from '../../Materials/Textures/renderTargetTexture';
import { Nullable } from '../../types';
import { Texture } from '../../Materials/Textures/texture';
import { Scene } from '../../scene';
import { ShaderMaterial } from '../../Materials/shaderMaterial';
import { PBRMaterial, Material } from '../../Materials/material';
import { glowBlurPostProcessPixelShader } from '../../Shaders/glowBlurPostProcess.fragment';

export interface IMeshesGroup {
    directLightmap : Nullable<Texture>;
    irradianceLightmap : RenderTargetTexture;
    sumOfBoth : RenderTargetTexture;
}

export class MeshDictionary {
    private _keys : Mesh[];
    private _values : IMeshesGroup[];
    private _scene : Scene;
    private _sumOfBothMaterial : ShaderMaterial;
    private _irradianceLightmapMaterial : ShaderMaterial;

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
                let size = 256;
                value.irradianceLightmap = new RenderTargetTexture("irradianceLightmap", size, this._scene); 
                value.sumOfBoth = new RenderTargetTexture("sumOfBoth", size, this._scene);
            }
        }
        this._initSumOfBoth();
    }



    private _initSumOfBoth() : void {
        this._sumOfBothMaterial = new ShaderMaterial("", this._scene, "./../../src/Shaders/irradianceVolumeMixTwoTextures", {
            attributes: ["uv2"],
            uniforms: ["test"],
            samplers: ["texture1", "texture2"]
        });
        this._sumOfBothMaterial.backFaceCulling = false;
        for (const mesh of this._keys){
            let value = this.getValue(mesh);
            if (value != null) {
                value.sumOfBoth.renderList = [mesh];
                value.sumOfBoth.coordinatesIndex = 1;        
                let previousMaterial : Nullable<Material>;   

 
                value.sumOfBoth.onBeforeRenderObservable.add(() => {
                    if (value != null && value.directLightmap != null) {
                        this._sumOfBothMaterial.setTexture( "texture1", value.directLightmap);
                        this._sumOfBothMaterial.setTexture( "texture2", value.irradianceLightmap);
                        this._sumOfBothMaterial.setFloat("test", 1.);
                    }
                    previousMaterial = mesh.material;
                    mesh.material = this._sumOfBothMaterial;
                });

                value.sumOfBoth.onAfterRenderObservable.add(() => {
                    mesh.material = previousMaterial;
                    if (value != null){
                        (<PBRMaterial> (mesh.material)).lightmapTexture =  value.sumOfBoth;
                    }
                });

            }
        }
    }

    public areMaterialReady() : boolean {
        return( this._sumOfBothMaterial.isReady() && this._irradianceLightmapMaterial.isReady());
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

    public initIrradianceLightmapMaterial(shaderMaterial : ShaderMaterial) : void {
        this._irradianceLightmapMaterial = shaderMaterial;
    }

}
