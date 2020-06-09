import { Mesh } from "../../Meshes/mesh";
import { RenderTargetTexture } from '../../Materials/Textures/renderTargetTexture';
import { Nullable } from '../../types';
import { Texture } from '../../Materials/Textures/texture';
import { Scene } from '../../scene';
import { ShaderMaterial } from '../../Materials/shaderMaterial';
import { PBRMaterial } from '../../Materials';
import { VertexData } from '../../Meshes/mesh.vertexData';

/**
 * Interface that contains the different textures that are linked to a mesh
 */
export interface IMeshesGroup {
    //The lightmap that contains information about direct illumination
    directLightmap : Nullable<Texture>;
    //The lightmap that contains information about the inidrect illumination
    irradianceLightmap : RenderTargetTexture;
    //The lightmap that contains the sum of both previous texture
    sumOfBoth : RenderTargetTexture;

    cumulativeLightmap : RenderTargetTexture;
    tempLightmap : RenderTargetTexture;
}


/**
 * This dictionary contains meshes as key and textures are value
 * In our implementation, we create one lightmap per mesh
 * The dictionary allows to find quickly the texture linked to the meshes
 */
export class MeshDictionary {

    private _keys : Mesh[];
    private _values : IMeshesGroup[];
    private _scene : Scene;
    private _sumOfBothMaterial : ShaderMaterial;
    private _irradianceLightmapMaterial : ShaderMaterial;
    private _cumulativeLightmapMaterial : ShaderMaterial;
    private _tempLightmapMaterial : ShaderMaterial;

    /**
     * Create the dictionary
     * Each mesh of meshes will be a key
     * @param meshes The meshes that are stored inside the dictionary
     * @param scene The scene
     */
    constructor(meshes : Mesh[], scene : Scene) {
        this._keys = [];
        this._values = [];
        this._scene = scene;
        for (let mesh of meshes) {
            this._add(mesh);
        }
    }

    private _add(mesh : Mesh) : void {
            this._keys.push(mesh);
            let meshTexture = <IMeshesGroup> {};
            this._values.push(meshTexture);

    }

    /**
     * Initialize the lightmap that are not the directIllumination
     * Must be called once
     */
    public initLightmapTextures() : void {
        for (let mesh of this._keys) {
            let value = this.getValue(mesh);
            if (value != null) {
                let size = 256;
                value.irradianceLightmap = new RenderTargetTexture("irradianceLightmap", size, this._scene); 
                value.sumOfBoth = new RenderTargetTexture("sumOfBoth", size, this._scene);
                value.tempLightmap = new RenderTargetTexture("temp", size, this._scene);
                value.cumulativeLightmap = new RenderTargetTexture("cumulative", size, this._scene);
            }
        }
        this._initTempLightmap();
        this._initCumulativeLightmap();
        //Init the material for the sumOfBoth lightmap
        this._initSumOfBoth();
    }


   private _initTempLightmap() : void {
        this._tempLightmapMaterial = new ShaderMaterial("", this._scene, "./../../src/Shaders/irradianceVolumeMixTwoTextures", {
            attributes: ["position"],
            samplers: ["texture1", "texture2"]
        });

        let customMesh = new Mesh("custom", this._scene);
        let position = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0];
        let indices = [0, 1, 2, 3, 4, 5];
        let vertexData = new VertexData();
        customMesh.visibility = 0;
        vertexData.positions = position;
        vertexData.indices = indices;
        
        vertexData.applyToMesh(customMesh);
        this._tempLightmapMaterial.backFaceCulling = false;


        for (let value of this._values){
                value.tempLightmap.renderList = [customMesh];
                value.tempLightmap.coordinatesIndex = 1;                   

                value.tempLightmap.onBeforeRenderObservable.add(() => {
                    this._tempLightmapMaterial.setTexture( "texture1", value.cumulativeLightmap);
                    this._tempLightmapMaterial.setTexture( "texture2", value.irradianceLightmap);
                    customMesh.material = this._tempLightmapMaterial;
                });
                value.tempLightmap.onAfterRenderObservable.add(() => {
                    value.cumulativeLightmap.render();  
                });
        }
        
   }


   private _initCumulativeLightmap() : void {
    this._cumulativeLightmapMaterial = new ShaderMaterial("", this._scene, "./../../src/Shaders/irradianceVolumeCopyTexture", {
        attributes: ["uv2"],
        uniforms: [],
        samplers : ["texture1"]
    });
    this._cumulativeLightmapMaterial.backFaceCulling = false;
    for (let mesh of this._keys){
        let value = this.getValue(mesh);
        if (value != null) {
            value.cumulativeLightmap.renderList = [mesh];   
            let previousMaterial = mesh.material;
            value.cumulativeLightmap.onBeforeRenderObservable.add(() => {
                if (value != null){
                    this._cumulativeLightmapMaterial.setTexture( "texture1", value.tempLightmap);
                }
                mesh.material = this._cumulativeLightmapMaterial;
            });

            value.cumulativeLightmap.onAfterRenderObservable.add(() => {
                mesh.material = previousMaterial;
            });
        }
    }
}


    private _initSumOfBoth() : void {
        this._sumOfBothMaterial = new ShaderMaterial("", this._scene, "./../../src/Shaders/irradianceVolumeMixTwoTextures", {
            attributes: ["position"],
            samplers: ["texture1", "texture2"]
        });
        
        let customMesh = new Mesh("custom", this._scene);
        let position = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0];
        let indices = [0, 1, 2, 3, 4, 5];
        let vertexData = new VertexData();
        customMesh.visibility = 0;
        vertexData.positions = position;
        vertexData.indices = indices;

        vertexData.applyToMesh(customMesh);
        this._sumOfBothMaterial.backFaceCulling = false;
        for (let value of this._values){
            value.sumOfBoth.renderList = [customMesh];
            value.sumOfBoth.coordinatesIndex = 1;        

            value.sumOfBoth.onBeforeRenderObservable.add(() => {
                if (value != null && value.directLightmap != null) {
                    this._sumOfBothMaterial.setTexture( "texture1", value.cumulativeLightmap);
                    this._sumOfBothMaterial.setTexture( "texture2", value.directLightmap);
                }
                customMesh.material = this._sumOfBothMaterial;
            });

            value.sumOfBoth.onAfterRenderObservable.add(() => {
                let mesh = this._getMesh(value);
                if (mesh != null) {
                    (<PBRMaterial> (mesh.material)).lightmapTexture =  value.sumOfBoth;
                }
            });
   
        }
    }

    /**
     * Functions called to check if the materials are ready for rendering
     */
    public areMaterialReady() : boolean {
        return( this._sumOfBothMaterial.isReady() && this._irradianceLightmapMaterial.isReady() && this._cumulativeLightmapMaterial.isReady() && this._tempLightmapMaterial.isReady());
     }
    
    /**
     * Return the list of meshes that are present in the dictionary
     */
    public keys() : Mesh[] {
        return this._keys;
    }

    /**
     * Return the list of light maps presents in the dictionary
     */
    public values() : IMeshesGroup[] {
        return this._values;
    }

    /**
     * Get the lightmaps associated to a mesh
     * @param mesh The mesh we want the value from
     */
    public getValue(mesh : Mesh) : Nullable<IMeshesGroup> {
        let index = this._containsKey(mesh);
        if (index != -1) {
            return this._values[index];
        }
        return null;
    }

    private _getMesh(value : IMeshesGroup) : Nullable<Mesh> {
        for (let i = 0; i < this._values.length; i++){
            if (this._values[i] == value){
                return this._keys[i];
            }
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

    /**
     * Update the value from the directlightmap
     * @param mesh The mesh we wants its lightmap to be update
     * @param lightmap The lightmap with which we are going to replace the previous one
     */
    public addDirectLightmap(mesh : Mesh, lightmap : Texture) : void {
        let value = this.getValue(mesh);
        if (value != null) {
            value.directLightmap = lightmap;
        }
    }

    /**
     * Init the material of the irradianceLightmap
     * @param shaderMaterial The new material
     */
    public initIrradianceLightmapMaterial(shaderMaterial : ShaderMaterial) : void {
        this._irradianceLightmapMaterial = shaderMaterial;
    }

}
