import { Mesh } from "../../Meshes/mesh";
import { Vector3, Matrix } from '../../Maths/math.vector';
import { MeshBuilder } from '../../Meshes/meshBuilder';
import { Scene } from '../../scene';
import { Color4 } from '../../Maths/math.color';
import { InternalTexture } from '../../Materials/Textures/internalTexture';
import { MultiRenderTarget } from '../../Materials/Textures/multiRenderTarget';
import { SubMesh } from '../../Meshes/subMesh';
import { VertexBuffer } from '../../Meshes/buffer'
import { Material } from '../../Materials/material';
import { Effect } from '../../Materials/effect';
import { Texture } from '../../Materials/Textures/texture';
import { SmartArray } from '../../Misc';
import { UniversalCamera } from '../../Cameras/universalCamera';

import "../../Shaders/uv.fragment"
import "../../Shaders/uv.vertex"



export class Probe {

    public static readonly PX : number = 0;
    public static readonly NX : number = 1;
    public static readonly PY : number = 2;
    public static readonly NY : number = 3;
    public static readonly PZ : number = 4;
    public static readonly NZ : number = 5;

    private _scene : Scene;
    private _resolution : number;
    public sphere : Mesh;
    public cameraList : Array<UniversalCamera>;


    public uvEffect : Effect;
    public albedo : Texture;
    public cubicMRT : MultiRenderTarget;

    public promise : Promise<void>;

    /*
    Create the probe which is a combination of a sphere and 6 cameras
    */
    constructor(position : Vector3, scene : Scene) {
        this._scene = scene;
        this.sphere = MeshBuilder.CreateSphere("probe", { diameter : 0.25 }, scene);
        this.sphere.visibility = 0;
        this.cameraList = new Array<UniversalCamera>();
        

        
        //First Camera ( x axis )
        let cameraPX = new UniversalCamera("px", position, scene);
        cameraPX.rotation = new Vector3(0, Math.PI / 2, 0);
        this.cameraList.push(cameraPX);

        //Second Camera ( - x  axis )
        let cameraNX = new UniversalCamera("nx", position, scene);
        cameraNX.rotation = new Vector3(0, - Math.PI / 2, 0);
        this.cameraList.push(cameraNX);

        //Third Camera ( y axis )
        let cameraPY = new UniversalCamera("py", position, scene);
        cameraPY.rotation = new Vector3( Math.PI / 2, 0, 0);
        this.cameraList.push(cameraPY);
    
        //Fourth Camera ( - y axis )
        let cameraNY = new UniversalCamera("ny", position, scene);
        cameraNY.rotation = new Vector3( - Math.PI / 2, 0, 0);
        this.cameraList.push(cameraNY);

        //Fifth Camera ( z axis )
        let cameraPZ = new UniversalCamera("pz", position, scene);
        cameraPZ.rotation = new Vector3( 0, 0, 0);
        this.cameraList.push(cameraPZ);

        //Sixth Camera ( - z axis )
        let cameraNZ = new UniversalCamera("nz", position, scene);
        cameraNZ.rotation = new Vector3( 0, Math.PI, 0);
        this.cameraList.push(cameraNZ);

        //Change the attributes of all cameras
        for (let camera of this.cameraList) {
            camera.parent = this.sphere;
        }

        this.sphere.translate(position, 1);

    }

    public setResolution(resolution : number) : void {
        this._resolution = resolution;
        this.promise = this._createPromise();
    }

    /**
     * Add a parent to the probe
     * @param parent The parent to be added
     */
    public setParent(parent : Mesh): void {
        this.sphere.parent = parent;
    }

    /**
     * Set the visibility of the probe
     * @param visisble 
     */
    public setVisibility(visisble : number) : void {
        this.sphere.visibility = visisble;
    }


    private _renderCubeTexture(subMeshes : SmartArray<SubMesh>) : void {

        var renderSubMesh = (subMesh : SubMesh, effect : Effect, view : Matrix, projection : Matrix) => {
    
            let mesh = subMesh.getRenderingMesh();
            mesh._bind(subMesh, effect, Material.TriangleFillMode);   

            if ( subMesh.verticesCount === 0) {
                return;
            }

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
        
        this.uvEffect.setTexture("albedo", this.albedo);
        
        let uvInternal = <InternalTexture>this.cubicMRT.textures[0]._texture;
        let albedoInternal = <InternalTexture> this.cubicMRT.textures[1]._texture;

        gl.bindFramebuffer(gl.FRAMEBUFFER, uvInternal._framebuffer);
        engine.setState(false, 0, true, scene.useRightHandedSystem);

        let viewMatrices = [ this.cameraList[Probe.PX].getViewMatrix(),
            this.cameraList[Probe.NX].getViewMatrix(),
            this.cameraList[Probe.PY].getViewMatrix(),
            this.cameraList[Probe.NY].getViewMatrix(),
            this.cameraList[Probe.PZ].getViewMatrix(),
            this.cameraList[Probe.NZ].getViewMatrix()
        ];

        let projectionMatrix =  Matrix.PerspectiveFovLH(Math.PI / 2, 1, this.cameraList[0].minZ, this.cameraList[0].maxZ);

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
            for (let i = 0; i < subMeshes.length; i++){

                renderSubMesh(subMeshes.data[i], this.uvEffect, viewMatrices[j], projectionMatrix);
            }
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }


    /**
     * Render the 6 cameras of the probes with different effect to create the cube map we need
     * @param meshes The meshes we want to render
     * @param ground 
     */
    public render(meshes : Array<Mesh>) : void {
        let probe = this;
        this.promise.then( function () {
            probe.cubicMRT.renderList = meshes;
            probe._scene.customRenderTargets.push(probe.cubicMRT);
            probe.cubicMRT.boundingBoxPosition = probe.sphere.position;
            probe.cubicMRT.refreshRate = MultiRenderTarget.REFRESHRATE_RENDER_ONCE;
            probe.cubicMRT.customRenderFunction = (opaqueSubMeshes: SmartArray<SubMesh>, alphaTestSubMeshes: SmartArray<SubMesh>, transparentSubMeshes: SmartArray<SubMesh>, depthOnlySubMeshes: SmartArray<SubMesh>): void => {
                probe._renderCubeTexture(opaqueSubMeshes);          
            }
        });
    }



    private _createPromise() : Promise<void> {
        return new Promise((resolve, reject) => {
            let size = this._resolution;
            this.cubicMRT = new MultiRenderTarget("uvAlbedo", size, 2, this._scene, {isCube : true});
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