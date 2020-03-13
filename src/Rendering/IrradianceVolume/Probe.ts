import { Mesh } from "../../Meshes/mesh";
import { Vector3 } from '../../Maths/math.vector';
import { MeshBuilder } from '../../Meshes/meshBuilder';
import { Scene } from '../../scene';
import { UniversalCamera } from '../../Cameras/universalCamera';
import { StandardMaterial } from '../../Materials/standardMaterial';
import { Color3 } from '../../Maths/math.color';
import { MultiRenderTarget } from '../../Materials/Textures/multiRenderTarget';
import { ShaderMaterial } from '../../Materials/shaderMaterial';
import { InternalTexture } from '../../Materials/Textures/internalTexture';
import { Effect } from '../../Materials';

export class Probe {

    public sphere : Mesh;
    public cameraList : Array<UniversalCamera>;

    /*
    Création de la sphère et ajout des 6 caméras
    */
    constructor(position : Vector3, scene : Scene) {
        this.sphere = MeshBuilder.CreateSphere("probe", { diameter : 0.25 }, scene);
        this.sphere.visibility = 0;
        this.cameraList = new Array<UniversalCamera>();
        //First Camera ( x axis )
        this.cameraList.push(new UniversalCamera("x", Vector3.Zero(), scene));
        this.cameraList[0].rotation.y = Math.PI / 2;

        //Second Camera ( - x  axis )
        this.cameraList.push(new UniversalCamera("-x", Vector3.Zero(), scene));
        this.cameraList[1].rotation.y = - Math.PI / 2;

        //Third Camera ( y axis )
        this.cameraList.push(new UniversalCamera("y", Vector3.Zero(), scene));
        this.cameraList[2].rotation.x = - Math.PI / 2;

        //Fourth Camera ( - y axis )
        this.cameraList.push(new UniversalCamera("-y", Vector3.Zero(), scene));
        this.cameraList[3].rotation.x = Math.PI / 2;

        //Fifth Camera ( z axis )
        this.cameraList.push(new UniversalCamera("z", Vector3.Zero(), scene));

        //Sixth Camera ( - z axis )
        this.cameraList.push(new UniversalCamera("-z", Vector3.Zero(), scene));
        this.cameraList[5].rotation.y = Math.PI;

        //Change the attributes of all cameras
        for (let camera of this.cameraList) {
            camera.parent = this.sphere;
            camera.fovMode = 1;
            // camera.fov = Math.PI / 2;
            camera.fov = Math.PI / 2;
        }
        this.sphere.translate(position, 1);
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

    public createCubeMap(scene : Scene, meshes : Array<Mesh>, ground : Mesh) : void {
        
        var previousActiveCam = scene.activeCamera;
        var multiRender = new MultiRenderTarget("uv", 50, 1, scene);
        scene.customRenderTargets.push(multiRender);
        var shaderMaterial = new ShaderMaterial("uvShader", scene, "./../../src/Shaders/uv", {
            attributes: ["position", "uv"],
            uniforms: ["worldViewProjection"]
        });
        multiRender.activeCamera = this.cameraList[1];
        multiRender.refreshRate = MultiRenderTarget.REFRESHRATE_RENDER_ONCE;
        multiRender.renderList = [];
        for (var mesh  of meshes){
            multiRender.renderList.push(mesh);
        }
        multiRender.onBeforeRender = (e) => {
            for (var mesh  of meshes){
                mesh.material = shaderMaterial;
            }
        }

        // multiRender.onAfterRender = (e) => {
        //     for (var mesh  of meshes){
        //         mesh.material = null;
        //     }          
        // }
    
    
        var textureMaterial = new StandardMaterial("textureMat", scene);
        textureMaterial.diffuseTexture = multiRender.textures[0];
        this.sphere.material = textureMaterial;
        ground.material = textureMaterial;
        scene.activeCamera = previousActiveCam;

    }
}