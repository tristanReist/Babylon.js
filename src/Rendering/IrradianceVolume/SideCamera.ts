import { UniversalCamera } from '../../Cameras/universalCamera';
import { MultiRenderTarget } from '../../Materials/Textures/multiRenderTarget';
import { Scene } from '../../scene';
import { Vector3 } from '../../Maths/math.vector';
import { Mesh } from '../../Meshes/mesh';
import { ShaderMaterial } from '../../Materials/shaderMaterial';
import { Texture } from '../../Materials/Textures/texture';
import { Material } from '../../Materials/material';
import { Nullable } from '../../types';

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
        this.mrt = new MultiRenderTarget("uvAlbedo", 300, 2, this._scene);
        this._scene.customRenderTargets.push(this.mrt);
        this.mrt.activeCamera = this.camera;
        this.mrt.refreshRate = MultiRenderTarget.REFRESHRATE_RENDER_ONCE;
        this.mrt.renderList = meshes;
        var previousWidth = this._scene.getEngine().getRenderWidth();
        var previousHeight = this._scene.getEngine().getRenderHeight();
        var previousMaterials = new Array<Nullable<Material>>();

        this.mrt.onBeforeRenderObservable.add(() => {
            this._scene.getEngine().setSize(800, 800);
            for (var mesh  of meshes){
                previousMaterials.push(mesh.material);
                mesh.material = shaderMaterial;
            }
        });

        this.mrt.onAfterRenderObservable.add(() => {
           this._scene.getEngine().setSize(previousWidth, previousHeight);
            for (var i = 0; i < meshes.length; i++){
                meshes[i].material = previousMaterials[i];
            }  
        });

    }

    public getUVTexture() : Texture {
        return this.mrt.textures[0];
    }

    public getAlbedoTexture() : Texture {
        return this.mrt.textures[1];
    }

}