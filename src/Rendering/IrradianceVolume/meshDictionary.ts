import { Mesh } from "../../Meshes/mesh";
import { RenderTargetTexture } from '../../Materials/Textures/renderTargetTexture';
import { Nullable } from '../../types';
import { Texture } from '../../Materials/Textures/texture';
import { Scene } from '../../scene';
import { ShaderMaterial } from '../../Materials/shaderMaterial';
import { PBRMaterial } from '../../Materials';

export interface IMeshesGroup {
    directLightmap : Texture;
    irradianceLightmap : RenderTargetTexture;
    sumOfBoth : RenderTargetTexture;
}

export class MeshDictionary {
    private _keys : Mesh[];
    private _values : IMeshesGroup[];
    private _scene : Scene;
    private texture : Texture

    constructor(meshes : Mesh[], scene : Scene) {
        this._keys = [];
        this._values = [];
        this._scene = scene;
        for (let mesh of meshes) {
            this._add(mesh);
        }

        this.texture = new Texture("./kaza/16.png", this._scene);
      //this.initIrradianceTexture();
    }

    private _add(mesh : Mesh) : void {
            this._keys.push(mesh);
            let meshTexture = <IMeshesGroup> {};
            this._values.push(meshTexture);

    }

    public initIrradianceTexture() : void {
        for (let mesh of this._keys) {
            let value = this.getValue(mesh);
            if (value != null) {
                value.irradianceLightmap = new RenderTargetTexture("irradianceLightmap", 256, this._scene); //TODO
                value.irradianceLightmap.renderList = [mesh];

                value.sumOfBoth = new RenderTargetTexture("sumLightmap", 256, this._scene); 
            }
        }
    }

    public renderSumOfBoth() : void {

        // let customMesh = new Mesh("custom", this._scene);
        // let position = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0];
        // let indices = [0, 1, 2, 3, 4, 5];
        // let vertexData = new VertexData();
        // customMesh.visibility = 0;
        // vertexData.positions = position;
        // vertexData.indices = indices;
        // vertexData.applyToMesh(customMesh);

        
        let blendShader = new ShaderMaterial("", this._scene, "./../../src/Shaders/irradianceVolumeMixTwoTextures", {
            attributes: ["uv", "uv2"],
            uniforms: []
        });
        blendShader.backFaceCulling = false;
        for (let mesh of this._keys){
            let value = this.getValue(mesh);
            if (value != null) {
                value.sumOfBoth.renderList = [mesh];
                value.sumOfBoth.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
                this._scene.customRenderTargets.push(value.sumOfBoth);
                

                let previousMaterial = mesh.material;

                value.sumOfBoth.onBeforeRenderObservable.add(() => {
                    if (value != null){
                        blendShader.setTexture( "directLightmap", value.directLightmap);
                        blendShader.setTexture( "irradianceLightmap", value.irradianceLightmap);
                        blendShader.setColor3("albedoColor", (<PBRMaterial> previousMaterial).albedoColor);
                        blendShader.setTexture("albedoTexture", this.texture);
                        if ((<PBRMaterial> (mesh.material)).albedoTexture != null) {
                            blendShader.setInt("hasTexture", 1);

                        }
                        else {
                            blendShader.setInt("hasTexture", 0);

                        }
                    }
                    mesh.material = blendShader;
                });

                value.sumOfBoth.onAfterRenderObservable.add(() => {
                    mesh.material = previousMaterial;

                });

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
