import { Mesh } from "../../Meshes/mesh";
import { RenderTargetTexture } from '../../Materials/Textures/renderTargetTexture';
import { Nullable } from '../../types';
import { Texture } from '../../Materials/Textures/texture';
import { Scene } from '../../scene';
import { ShaderMaterial } from '../../Materials/shaderMaterial';
import { PBRMaterial } from '../../Materials/PBR/pbrMaterial';
import { VertexData } from '../../Meshes/mesh.vertexData';
import { Vector2 } from '../../Maths/math.vector';
import { Color4 } from '../../Maths/math.color';

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
    // Lightmap for toneMapping
    toneMappingLightmap : RenderTargetTexture;
    // Lightmap for dilatte
    dilateLightmap : RenderTargetTexture;
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
    private _toneMappingMaterial : ShaderMaterial;
    private _dilateMaterial : ShaderMaterial;
    public globalIllumStrength = 1;
    public directIllumStrength = 1;
     

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
                value.toneMappingLightmap = new RenderTargetTexture("toneMap", size, this._scene);
                value.dilateLightmap = new RenderTargetTexture("dilate", size, this._scene);
            }
        }
        //Init the material for the sumOfBoth lightmap
        this._initSumOfBoth();
        this._initToneMapping();
        this._initDilate();
    }



    private _initSumOfBoth() : void {
        this._sumOfBothMaterial = new ShaderMaterial("", this._scene, "./../../src/Shaders/irradianceVolumeMixTwoTextures", {
            attributes: ["position"],
            uniforms: ["directIllumStrength", "globalIllumStrength"],
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
            // value.sumOfBoth.clearColor = new Color4(0., 0., 0., 1.);

            value.sumOfBoth.onBeforeRenderObservable.add(() => {
                if (value != null && value.directLightmap != null) {
                    this._sumOfBothMaterial.setTexture( "texture1", value.directLightmap);
                    this._sumOfBothMaterial.setTexture( "texture2", value.dilateLightmap);
                    // this._sumOfBothMaterial.setTexture( "texture2", value.irradianceLightmap);
                    this._sumOfBothMaterial.setFloat("directIllumStrength", this.directIllumStrength);
                    this._sumOfBothMaterial.setFloat("globalIllumStrength", this.globalIllumStrength);
                }
                customMesh.material = this._sumOfBothMaterial;
            });

            value.sumOfBoth.onAfterRenderObservable.add(() => {
                value.toneMappingLightmap.render();
                let mesh = this._getMesh(value);
                // if (mesh != null) {
                //     let i = this._containsKey(mesh);
                    // (<PBRMaterial> (mesh.material)).lightmapTexture =  value.sumOfBoth;
                // }
            });
   
        }
    }

    private _initToneMapping() {
        this._toneMappingMaterial = new ShaderMaterial("", this._scene, "./../../src/Shaders/radiosityPostProcess", {
            attributes: ["position"],
            uniforms: ["_ExposureAdjustment"],
            samplers: ["inputTexture"]
        });

        let customMesh = new Mesh("custom", this._scene);
        let position = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0];
        let indices = [0, 1, 2, 3, 4, 5];
        let vertexData = new VertexData();
        customMesh.visibility = 0;
        vertexData.positions = position;
        vertexData.indices = indices;
        vertexData.applyToMesh(customMesh);   


        this._toneMappingMaterial.backFaceCulling = false;
        for (let value of this._values){
            value.toneMappingLightmap.renderList = [customMesh];
            value.toneMappingLightmap.coordinatesIndex = 1;        


            // this._scene.customRenderTargets.push(value.toneMappingLightmap);
            value.toneMappingLightmap.onBeforeRenderObservable.add(() => {
                if (value != null) {
                    this._toneMappingMaterial.setTexture( "inputTexture", value.sumOfBoth);
                    this._toneMappingMaterial.setFloat("_ExposureAdjustment", 2.);
                }
                customMesh.material = this._toneMappingMaterial;
            });

            value.toneMappingLightmap.onAfterRenderObservable.add(() => {
                let mesh = this._getMesh(value);
                if (mesh != null) {
                    (<PBRMaterial> (mesh.material)).lightmapTexture =  value.toneMappingLightmap;
                }
                // value.dilateLightmap.render();
            });
   
        }
    }

    private _initDilate(){
        this._dilateMaterial = new ShaderMaterial("", this._scene, "./../../src/Shaders/dilate", {
            attributes: ["position"],
            uniforms: ["texelSize"],
            samplers: ["inputTexture"]
        });

        let customMesh = new Mesh("custom", this._scene);
        let position = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0];
        let indices = [0, 1, 2, 3, 4, 5];
        let vertexData = new VertexData();
        customMesh.visibility = 0;
        vertexData.positions = position;
        vertexData.indices = indices;
        vertexData.applyToMesh(customMesh);
        


        this._dilateMaterial.backFaceCulling = false;
        for (let value of this._values){
            value.dilateLightmap.renderList = [customMesh];
            value.dilateLightmap.coordinatesIndex = 1;        

            value.dilateLightmap.clearColor = new Color4(0., 1., 0., 1.);

            // this._scene.customRenderTargets.push(value.dilateLightmap);

            value.dilateLightmap.onBeforeRenderObservable.add(() => {
                if (value != null) {
                    this._dilateMaterial.setTexture( "inputTexture", value.irradianceLightmap);
                    // let a = new Vector2(1 / value.dilateLightmap.getSize().width, 1 / value.dilateLightmap.getSize().height);
                    // console.log(a);
                    this._dilateMaterial.setVector2("texelSize", new Vector2(1 / value.dilateLightmap.getSize().width, 1 / value.dilateLightmap.getSize().height));
                }
                customMesh.material = this._dilateMaterial;
            });

            value.dilateLightmap.onAfterRenderObservable.add(() => {
                value.sumOfBoth.render();
                // let mesh = this._getMesh(value);
                // if (mesh != null) {
                //     (<PBRMaterial> (mesh.material)).lightmapTexture =  value.dilateLightmap;
                // }
            });
   
        }
    }


    /**
     * Functions called to check if the materials are ready for rendering
     */
    public areMaterialReady() : boolean {
        return( this._sumOfBothMaterial.isReady() && this._irradianceLightmapMaterial.isReady() && this._toneMappingMaterial.isReady() && this._dilateMaterial.isReady());
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
