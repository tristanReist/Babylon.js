import { Scene } from '../../scene';
import { DirectionalLight } from '../../Lights/directionalLight';
import { RenderTargetTexture } from '../../Materials/Textures/renderTargetTexture';
import { Mesh } from '../../Meshes/mesh';
import { Nullable } from '../../types';
import { Material } from '../../Materials/material';
import { ArcRotateCamera } from '../../Cameras/arcRotateCamera';
import { Vector3, Matrix } from '../../Maths/math.vector';
import { ShaderMaterial } from '../../Materials/shaderMaterial';


/*
Render a direct lightmap used in the IrradianceVolume rendering method
*/

export class DirectLightMapGeneration{
    private _scene : Scene;
    public light : DirectionalLight;
    public distLight : number;
    public depthLightTexture : RenderTargetTexture;  //Texture qui stockera la depth du point de vue de la lumière
    public directLightMapTexture : RenderTargetTexture; //Texture qui stockera la lightmap pouyr utiliser sur les probes
    public lightCamera : ArcRotateCamera;
    public projectionMatrix : Matrix;


    constructor (light : DirectionalLight, meshes : Array<Mesh>, scene : Scene, dist : number = 30){
        this._scene = scene;
        this.light = light;
        this.distLight = dist;
        let cameraPosition = new Vector3( - light.direction.x, - light.direction.y, - light.direction.z);
        cameraPosition = cameraPosition.normalize().multiplyByFloats(dist, dist, dist);
        this.lightCamera = new ArcRotateCamera("lightCamera", 0, 0, 0, new Vector3(0, 0, 0), scene)
        this.lightCamera.position = cameraPosition;
        this.projectionMatrix = Matrix.PerspectiveFovLH(Math.PI / 2, 1, this.lightCamera.minZ, this.lightCamera.maxZ);
        this._createDepthTexture(meshes);
        this._createLightMap(meshes);
    
    }


    private _createDepthTexture(meshes : Array<Mesh>) : void {
        this.depthLightTexture = new RenderTargetTexture("lightDepth", 2048, this._scene);
        this._scene.customRenderTargets.push(this.depthLightTexture);
        this.depthLightTexture.refreshRate = 0;//RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
        this.depthLightTexture.renderList = meshes;
        this.depthLightTexture.activeCamera = this.lightCamera;
        
        var previousMaterials = new Array<Nullable<Material>>();


        
        var shaderMaterial = new ShaderMaterial("depthShader", this._scene, "./../../src/Shaders/irradianceVolumeMyDepth", {
            attributes: ["position"],
            uniforms: ["world"]
        });

        shaderMaterial.setMatrix("projection",  this.projectionMatrix);
        shaderMaterial.setMatrix("view", this.lightCamera.getViewMatrix());


        this.depthLightTexture.onBeforeRenderObservable.add(() => {
            for (var mesh  of meshes){
               
                previousMaterials.push(mesh.material);
                mesh.material = shaderMaterial;

            }
        });


        this.depthLightTexture.onAfterRenderObservable.add(() => {
            for (var i = 0; i < meshes.length; i++){
                meshes[i].material = previousMaterials[i];
            }  
        });


    }

    private _createLightMap(meshes : Array<Mesh>) : void {
        this.directLightMapTexture = new RenderTargetTexture("lightMap", 2048, this._scene);
        this._scene.customRenderTargets.push(this.directLightMapTexture);
        this.directLightMapTexture.refreshRate = 0;
        this.directLightMapTexture.renderList = meshes;
        this.directLightMapTexture.activeCamera = this.lightCamera;

        var previousMaterials = new Array<Nullable<Material>>();

        var shaderMaterial = new ShaderMaterial("lightMap", this._scene, "./../../src/Shaders/irradianceVolumeLightMap", {
            attributes : ["position", "uv"],
            uniforms : ["world"]
        });
        shaderMaterial.setMatrix("projection",  this.projectionMatrix);
        shaderMaterial.setMatrix("view", this.lightCamera.getViewMatrix());
        shaderMaterial.setTexture("depth", this.depthLightTexture);   
        shaderMaterial.backFaceCulling = false;

        this.directLightMapTexture.onBeforeRenderObservable.add(() => {
            for (var mesh  of meshes){
                previousMaterials.push(mesh.material);
                mesh.material = shaderMaterial;
            }
        });

        this.directLightMapTexture.onAfterRenderObservable.add(() => {
            for (var i = 0; i < meshes.length; i++){
                meshes[i].material = previousMaterials[i];
            }  
        });
    }

}
