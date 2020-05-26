import { Mesh } from "../../Meshes/mesh";
import { RenderTargetTexture } from '../../Materials/Textures/renderTargetTexture';
import { Nullable } from '../../types';
import { Texture } from '../../Materials/Textures/texture';
import { Scene } from '../../scene';

export interface IMeshesGroup {
    directLightmap : Nullable<Texture>;
    irradianceLightmap : RenderTargetTexture;
}

export class MeshDictionary {
    private _keys : Mesh[];
    private _values : IMeshesGroup[];
    private _scene : Scene;

    constructor(meshes : Mesh[], scene : Scene) {
        this._keys = [];
        this._values = [];
        this._scene = scene;
        for (let mesh of meshes) {
            this._add(mesh);
        }
      //this.initIrradianceTexture();
    }

    private _add(mesh : Mesh) : void {
            this._keys.push(mesh);
            let meshTexture = <IMeshesGroup> {directLightmap : null};
            this._values.push(meshTexture);

    }

    public initIrradianceTexture() : void {
        for (let mesh of this._keys) {
            let value = this.getValue(mesh);
            if (value != null) {
                value.irradianceLightmap = new RenderTargetTexture("irradianceLightmap", 512, this._scene); //TODO
                value.irradianceLightmap.coordinatesIndex = 1;
                value.irradianceLightmap.renderList = [mesh];
            }
        }
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
