import { Mesh } from "../../Meshes/mesh";
import { Vector3, Matrix } from '../../Maths/math.vector';
import { MeshBuilder } from '../../Meshes/meshBuilder';
import { Scene } from '../../scene';
import { StandardMaterial } from '../../Materials/standardMaterial';
import { Color3, Color4 } from '../../Maths/math.color';
import { SideCamera } from './SideCamera';
import { InternalTexture } from '../../Materials/Textures/internalTexture';
import { MultiRenderTarget } from '../../Materials/Textures/multiRenderTarget';
import { SubMesh } from '../../Meshes/subMesh';
import { VertexBuffer } from '../../Meshes/buffer'
import { Material } from '../../Materials/material';
import { Effect } from '../../Materials/effect';

import "../../Shaders/uv.fragment"
import "../../Shaders/uv.vertex"
import { Texture } from '../../Materials/Textures/texture';

export class Probe {

    public static readonly PX : number = 0;
    public static readonly NX : number = 1;
    public static readonly PY : number = 2;
    public static readonly NY : number = 3;
    public static readonly PZ : number = 4;
    public static readonly NZ : number = 5;

    private _scene : Scene;
    public sphere : Mesh;
    public cameraList : Array<SideCamera>;

    public uvEffect : Effect;
    public albedo : Texture;
    public cubicMRT : MultiRenderTarget;

    public readyPromise : Promise<void>;

    /*
    Création de la sphère et ajout des 6 caméras
    */
    constructor(position : Vector3, scene : Scene) {
        this._scene = scene;
        this.sphere = MeshBuilder.CreateSphere("probe", { diameter : 0.25 }, scene);
        this.sphere.visibility = 0;
        this.cameraList = new Array<SideCamera>();

        
        //First Camera ( x axis )
        this.cameraList.push(new SideCamera("px", scene, new Vector3(0, Math.PI / 2, 0)));

        //Second Camera ( - x  axis )
        this.cameraList.push(new SideCamera("nx", scene, new Vector3(0, - Math.PI / 2, 0)));

        //Third Camera ( y axis )
        this.cameraList.push(new SideCamera("py", scene, new Vector3( - Math.PI / 2, 0, 0)));

        //Fourth Camera ( - y axis )
        this.cameraList.push(new SideCamera("ny", scene, new Vector3( Math.PI / 2, 0, 0)));

        //Fifth Camera ( z axis )
        this.cameraList.push(new SideCamera("pz", scene, new Vector3(0 , 0, 0)));

        //Sixth Camera ( - z axis )
        this.cameraList.push(new SideCamera("nz", scene, new Vector3(0 , Math.PI, 0)));

        //Change the attributes of all cameras
        for (let cameraSide of this.cameraList) {
            cameraSide.camera.parent = this.sphere;
            cameraSide.camera.fovMode = 0;
            // camera.fov = Math.PI / 2;
            cameraSide.camera.fov = Math.PI / 2;
        }
        this.sphere.translate(position, 1);

        this.readyPromise = this._createPromise();
    }

    public setParent(parent : Mesh): void {
        this.sphere.parent = parent;
    }

    public setVisibility(visisble : number) : void {
        this.sphere.visibility = visisble;
    }

    public addColor() : void {
        var myMaterial = new StandardMaterial("myMaterial", this.sphere._scene);
        myMaterial.emissiveColor = new Color3(0.23, 0.98, 0.53);
        this.sphere.material = myMaterial;
    }



    public createCubeMap(meshes : Array<Mesh>, ground : Mesh) : void {
        for (var camera of this.cameraList){
            camera.renderSide(meshes);
        }
        var textureMaterial = new StandardMaterial("textureMat", this._scene);
        textureMaterial.diffuseTexture = this.cameraList[0].getUVTexture();
        var albedo = new StandardMaterial("textureMat", this._scene);
        albedo.diffuseTexture = this.cameraList[5].getUVTexture();
        this.sphere.material = textureMaterial;
        ground.material = albedo;
    }

    private _testBoite(meshes : Array<Mesh>, ground : Mesh) : void {

        var render = (subMesh : SubMesh, effect : Effect, view : Matrix, projection : Matrix) => {
    
            let mesh = subMesh.getRenderingMesh();
            mesh._bind(subMesh, effect, Material.TriangleFillMode);   

            effect.setMatrix("view", view);
            effect.setMatrix("projection", projection);

            var batch = mesh._getInstancesRenderList(subMesh._id);
            if (batch.mustReturn) {
                return ;
            }
            var hardwareInstanceRendering = (engine.getCaps().instancedArrays) && 
            (batch.visibleInstances[subMesh._id] !== null);
            mesh._processRendering(mesh, subMesh, effect, Material.TriangleFillMode, batch, hardwareInstanceRendering,
                (isInstance, world) => effect.setMatrix("world", world));
        };
    
        let scene = this._scene;
        let engine = scene.getEngine();
        let gl = engine._gl;
        
        
        this._scene.customRenderTargets.push(this.cubicMRT);
        this.cubicMRT.boundingBoxPosition = this.sphere.position;
        this.cubicMRT.refreshRate = 1;

        this.uvEffect.setTexture("albedo", this.albedo);
        
        let uvInternal = <InternalTexture>this.cubicMRT.textures[0]._texture;
        let albedoInternal = <InternalTexture> this.cubicMRT.textures[1]._texture;

        gl.bindFramebuffer(gl.FRAMEBUFFER, uvInternal._framebuffer);
        engine.setState(false, 0, true, scene.useRightHandedSystem);

        let viewMatrices = [ this.cameraList[Probe.PX].camera.getViewMatrix(),
            this.cameraList[Probe.NX].camera.getViewMatrix(),
            this.cameraList[Probe.PY].camera.getViewMatrix(),
            this.cameraList[Probe.NY].camera.getViewMatrix(),
            this.cameraList[Probe.PZ].camera.getViewMatrix(),
            this.cameraList[Probe.NZ].camera.getViewMatrix()
        ];

        let projectionMatrix =  Matrix.PerspectiveFovLH(Math.PI / 2, 1, this.cameraList[0].camera.minZ, this.cameraList[0].camera.maxZ);

        let cubeSides = [
            gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
        ];

        engine.enableEffect(this.uvEffect);
        for (let j = 0; j < 6; j++){
            engine.setDirectViewport(0, 0, this.cubicMRT.getRenderWidth(), this.cubicMRT.getRenderHeight());
            gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, cubeSides[j], uvInternal._webGLTexture, 0);
            gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT1, cubeSides[j], albedoInternal._webGLTexture, 0);

            engine.clear(new Color4(0, 0, 0, 0), true, true);
            for (let i = 0; i < meshes.length; i++){
                render(meshes[i].subMeshes[0], this.uvEffect, viewMatrices[j], projectionMatrix);
            }
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }


    public render(probe : Probe, meshes : Array<Mesh>, ground : Mesh) : void {
        if (probe != this){
            return;
        }
        this.readyPromise.then( function () {
            probe._testBoite(meshes, ground);

            console.log(probe.cubicMRT.isCube);
            var albedo = new StandardMaterial("albe", probe._scene);
            albedo.diffuseTexture = probe.cubicMRT.textures[0];

            // meshes[0].material = albedo;
            // ground.material = albedo;
        });
    }


    




    private _createPromise() : Promise<void> {
        return new Promise((resolve, reject) => {
            this.cubicMRT = new MultiRenderTarget("uvAlbedo", 1024, 2, this._scene, {isCube : true});
            this.albedo = new Texture("./../../Playground/textures/bloc.jpg", this._scene);
            let interval = setInterval(() => {
                let readyStates = [
                    this._isEffectReady(),
                    this._isMRTReady(),
                    this._isTextureReady()
                ];
                for (let i = 0 ; i < readyStates.length; i++) {
                    if (!readyStates[i]) {
                        return ;
                    }
                }
                console.log("created");
                clearInterval(interval);
                resolve();
            }, 200);
        });
    }

    private _isEffectReady() : boolean {
        var attribs = [VertexBuffer.PositionKind, VertexBuffer.UVKind];
        var uniforms = ["world", "projection", "view", "albedo"];

        this.uvEffect = this._scene.getEngine().createEffect("uv", 
            attribs,
            uniforms,
            [], "");

        return this.uvEffect.isReady();
    }

    private _isMRTReady() : boolean {
 
        return this.cubicMRT.isReady();
    }

    private _isTextureReady() : boolean {
       
        return this.albedo.isReady();
    }

}