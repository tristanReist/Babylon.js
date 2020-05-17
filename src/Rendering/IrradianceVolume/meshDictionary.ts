import { Mesh } from "../../Meshes/mesh";
import { RenderTargetTexture } from '../../Materials/Textures/renderTargetTexture';
import { Nullable } from '../../types';
import { Texture } from '../../Materials/Textures/texture';
import { __values } from 'tslib';
import { Scene } from '../../scene';

export interface IMeshesGroup {
    meshes : Mesh[];
    directLightmap : Nullable<Texture>;
    irradianceLightmap : RenderTargetTexture; 
}

export class MeshDictionary {
    private _keys : string[];
    private _values : IMeshesGroup[];
    private _scene : Scene;


    constructor (meshes : Mesh[], scene : Scene){
        this._keys = [];
        this._values = [];
        this._scene = scene;
        for (let mesh of meshes){
            this._add(mesh);
        }
        this._initIrradianceTexture();
    }

    private _add(mesh : Mesh) : void {
        let index = this.containsKey(mesh.name);
        if (index == -1){
            this._keys.push(mesh.name);
            let meshGroup = <IMeshesGroup> { meshes : [mesh], directLightmap : null};
            this._values.push(meshGroup);
        }
        else {
            this._values[index].meshes.push(mesh);
        }        
    }

    private _initIrradianceTexture() : void {
        for (let value of this._values){
            value.irradianceLightmap = new RenderTargetTexture("irradianceLightmap", 512, this._scene);
            value.irradianceLightmap.renderList = value.meshes;
        }
    }


    public keys() : string[] {
        return this._keys;
    }

    public values() : IMeshesGroup[] {
        return this._values;
    }

    public getValue( mesh : Mesh ) : Nullable<IMeshesGroup> {
        let key = mesh.name;
        let index = this.containsKey(key);
        if (index != -1){
            return this._values[index];
        }
        return null;
    }

    public containsKey(  key : string ) : number {     
        for (let i = 0; i < this._keys.length; i++){
            if (this._keys[i] == key){
                return i;
            }
        }
        return -1;
    }


}
