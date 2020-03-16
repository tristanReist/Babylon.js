import { Mesh } from "../../Meshes/mesh";
import { Vector3 } from '../../Maths/math.vector';
import { MeshBuilder } from '../../Meshes/meshBuilder';
import { Scene } from '../../scene';
import { StandardMaterial } from '../../Materials/standardMaterial';
import { Color3 } from '../../Maths/math.color';
import { ShaderMaterial } from '../../Materials/shaderMaterial';
import { Texture } from '../../Materials/Textures/texture';
import { SideCamera } from './SideCamera';

export class Probe {

    public sphere : Mesh;
    public cameraList : Array<SideCamera>

    /*
    Création de la sphère et ajout des 6 caméras
    */
    constructor(position : Vector3, scene : Scene) {
        this.sphere = MeshBuilder.CreateSphere("probe", { diameter : 0.25 }, scene);
        this.sphere.visibility = 0;
        this.cameraList = new Array<SideCamera>();

        
        //First Camera ( x axis )
        this.cameraList.push(new SideCamera("x", scene, new Vector3(0, Math.PI / 2, 0)));

        //Second Camera ( - x  axis )
        this.cameraList.push(new SideCamera("-x", scene, new Vector3(0, - Math.PI / 2, 0)));

        //Third Camera ( y axis )
        this.cameraList.push(new SideCamera("y", scene, new Vector3( - Math.PI / 2, 0, 0)));

        //Fourth Camera ( - y axis )
        this.cameraList.push(new SideCamera("-y", scene, new Vector3( Math.PI / 2, 0, 0)));

        //Fifth Camera ( z axis )
        this.cameraList.push(new SideCamera("z", scene, new Vector3(0 , 0, 0)));

        //Sixth Camera ( - z axis )
        this.cameraList.push(new SideCamera("-z", scene, new Vector3(0 , Math.PI, 0)));

        //Change the attributes of all cameras
        for (let cameraSide of this.cameraList) {
            cameraSide.camera.parent = this.sphere;
            cameraSide.camera.fovMode = 1;
            // camera.fov = Math.PI / 2;
            cameraSide.camera.fov = Math.PI / 2;
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
        var shaderMaterial = new ShaderMaterial("uvShader", scene, "./../../src/Shaders/uv", {
            attributes: ["position", "uv"],
            uniforms: ["worldViewProjection"]
        });
        var texture = new Texture("./../../Playground/textures/bloc.jpg", scene);
        shaderMaterial.setTexture("albedo", texture);

        
        for (var camera of this.cameraList){
            camera.renderSide(meshes, shaderMaterial);
        }

    

        var textureMaterial = new StandardMaterial("textureMat", scene);
        textureMaterial.diffuseTexture = this.cameraList[0].getUVTexture();
        var albedo = new StandardMaterial("textureMat", scene);
        albedo.diffuseTexture = this.cameraList[0].getAlbedoTexture();
        this.sphere.material = textureMaterial;
        ground.material = albedo;


    }

}