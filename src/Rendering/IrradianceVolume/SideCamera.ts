import { UniversalCamera } from '../../Cameras/universalCamera';
import { MultiRenderTarget } from '../../Materials/Textures/multiRenderTarget';
import { Scene } from '../../scene';
import { Vector3, Matrix } from '../../Maths/math.vector';
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

    public renderSide(meshes : Array<Mesh>) : void {
        this.mrt = new MultiRenderTarget("uvAlbedo", 1024, 2, this._scene);
        this._scene.customRenderTargets.push(this.mrt);
        this.mrt.activeCamera = this.camera;
        this.mrt.refreshRate = 0;//MultiRenderTarget.REFRESHRATE_RENDER_ONCE;
        this.mrt.renderList = meshes;
        var previousMaterials = new Array<Nullable<Material>>();

        // Creation of the shader material
        var projectionMatrix = Matrix.PerspectiveFovLH(Math.PI / 2, 1, this.camera.minZ, this.camera.maxZ);

        var shaderMaterial = new ShaderMaterial("uvShader", this._scene, "./../../src/Shaders/uv", {
            attributes: ["position", "uv"],
            uniforms: ["world"]
        });

        var texture = new Texture("./../../Playground/textures/bloc.jpg", this._scene);
        shaderMaterial.setTexture("albedo", texture);
        shaderMaterial.setMatrix("projection",  projectionMatrix);
        shaderMaterial.setMatrix("view", this.camera.getViewMatrix());


        this.mrt.onBeforeRenderObservable.add(() => {
            for (var mesh  of meshes){
                previousMaterials.push(mesh.material);
                mesh.material = shaderMaterial;
            }
        });


        this.mrt.onAfterRenderObservable.add(() => {
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