import { UniversalCamera } from '../../Cameras/universalCamera';
import { MultiRenderTarget } from '../../Materials/Textures/multiRenderTarget';
import { Scene } from '../../scene';
import { Vector3 } from '../../Maths/math.vector';
import { Mesh } from '../../Meshes/mesh';
import { ShaderMaterial } from '../../Materials/shaderMaterial';
import { Texture } from '../../Materials/Textures/texture';
import { Material } from '../../Materials/material';
import { Nullable } from '../../types';
import { Engine } from '../../Engines';

export class SideCamera {

    private _scene : Scene; 
    public camera : UniversalCamera;
    public mrt : MultiRenderTarget;

    constructor(name : string, scene : Scene, rotation: Vector3){
        this._scene = scene;
        this.camera = new UniversalCamera(name, Vector3.Zero(), scene);
        this.camera.rotation = rotation;
    }

    public renderSide(meshes : Array<Mesh>, shaderMaterial : ShaderMaterial) : void {
        this.mrt = new MultiRenderTarget("uvAlbedo", 100, 2, this._scene);
        this._scene.customRenderTargets.push(this.mrt);
        this.mrt.activeCamera = this.camera;
        this.mrt.refreshRate = MultiRenderTarget.REFRESHRATE_RENDER_ONCE;
        this.mrt.renderList = meshes;

        var previousMaterials = new Array<Nullable<Material>>();
        this.mrt.onBeforeRender = (e) => {
            for (var mesh  of meshes){
                previousMaterials.push(mesh.material);
                mesh.material = shaderMaterial;
            }
        }

        this.mrt.onAfterRender = (e) => {
            for (var i = 0; i < meshes.length; i++){
                meshes[i].material = previousMaterials[i];
            }          
        }
    }

    public getUVTexture() : Texture {
        return this.mrt.textures[0];
    }

    public getAlbedoTexture() : Texture {
        return this.mrt.textures[1];
    }

}