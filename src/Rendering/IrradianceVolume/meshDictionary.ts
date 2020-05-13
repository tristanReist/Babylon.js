import { Mesh } from "../../Meshes/mesh";
import { RenderTargetTexture } from '../../Materials/Textures/renderTargetTexture';
import { Nullable } from '../../types';
import { Texture } from '../../Materials/Textures/texture';

export interface IMeshesGroup {
    meshes : Mesh[];
    directLightmap : Nullable<Texture>;
    irradianceLightmap : Nullable<RenderTargetTexture>; 
}

export class MeshDictionary {
    private _keys : string[];
    private _values : IMeshesGroup[];


    constructor (meshes : Mesh[]){
        this._keys = [];
        this._values = [];
        for (let mesh of meshes){
            this._add(mesh);
        }
    }

    private _add(mesh : Mesh) : void {
        let index = this._containsKey(mesh.name);
        if (index == -1){
            this._keys.push(mesh.name);
            let meshGroup = <IMeshesGroup> { meshes : [mesh], directLightmap : null, irradianceLightmap : null};
            this._values.push(meshGroup);
        }
        else {
            this._values[index].meshes.push(mesh);
        }

        
    }


    public keys() : string[] {
        return this._keys;
    }

    public getValue( key : string ) : Nullable<IMeshesGroup> {
        let index = this._containsKey(key);
        if (index != -1){
            return this._values[index];
        }
        return null;
    }

    private _containsKey(  key : string ) : number {
        for (let i = 0; i < this._keys.length; i++){
            if (this._keys[i] == key){
                return i;
            }
        }
        return -1;
    }


}
