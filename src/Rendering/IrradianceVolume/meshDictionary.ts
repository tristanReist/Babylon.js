import { Mesh } from "../../Meshes/mesh";
import { RenderTargetTexture } from '../../Materials/Textures/renderTargetTexture';
import { Nullable } from '../../types';
import { Texture } from '../../Materials/Textures/texture';
import { Scene } from '../../scene';
import { ShaderMaterial } from '../../Materials/shaderMaterial';
import { Material } from '../../Materials/material';
import { PBRMaterial } from '../../Materials/PBR/pbrMaterial';
import { VertexData } from '../../Meshes/mesh.vertexData';

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
            attributes: ["position"],
            uniforms: ["test"],
            samplers: ["texture1", "texture2"]
        });
        
        let customMesh = new Mesh("custom", this._scene);
        let position = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0];
        let indices = [0, 1, 2, 3, 4, 5];
        let vertexData = new VertexData();
        customMesh.visibility = 0;
        vertexData.positions = position;
        vertexData.indices = indices;

        vertexData.applyToMesh(customMesh);
        this._sumOfBothMaterial.backFaceCulling = false;
        for (let value of this._values){
            value.sumOfBoth.renderList = [customMesh];
            value.sumOfBoth.coordinatesIndex = 1;        
            // let previousMaterial : Nullable<Material>;   


            value.sumOfBoth.onBeforeRenderObservable.add(() => {
                if (value != null && value.directLightmap != null) {
                    this._sumOfBothMaterial.setTexture( "texture1", value.directLightmap);
                    this._sumOfBothMaterial.setTexture( "texture2", value.irradianceLightmap);
                    this._sumOfBothMaterial.setFloat("test", 1.);
                }
                customMesh.material = this._sumOfBothMaterial;
            });

            value.sumOfBoth.onAfterRenderObservable.add(() => {
                let mesh = this._getMesh(value);
                if (mesh != null) {
                    (<PBRMaterial> (mesh.material)).lightmapTexture =  value.sumOfBoth;
                }
            });

            
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

    private _getMesh(value : IMeshesGroup) : Nullable<Mesh> {
        for (let i = 0; i < this._values.length; i++){
            if (this._values[i] == value){
                return this._keys[i];
            }
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
