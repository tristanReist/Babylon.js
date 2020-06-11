import { Scene } from '../../scene';
import { Mesh } from '../../Meshes/mesh';
import { VertexBuffer } from '../../Meshes/buffer';
import { Vector3 } from '../../Maths/math.vector';
import { Probe } from './Probe';
import { MeshDictionary } from './meshDictionary';
import { Irradiance } from './Irradiance';

/**
 * Class that represent the irradiance volume
 * It contains all the probe used to render the scene, and is responsible of rendering the irradiance
 * 
 */
export class IrradianceVolume {

    /**
     * List of probes that are used to render the scene
     */
    public probeList : Array<Probe>;
    /**
     * The dictionary that contains the lightmaps for each scene
     */
    public meshForIrradiance : Array<Mesh>;
    /**
     * Instance of the irradiance class that aims to comput irradiance
     */
    public irradiance : Irradiance;
    /**
     * The dictionary that store the lightmaps
     */
    public dictionary : MeshDictionary;

    private _scene : Scene;
    private _probesDispotion : Vector3;
    private _lowerLeft : Vector3;
    private _volumeSize : Vector3;


    /**
     * Creation of the irradiance volume
     * @param meshes  The meshes that need to be rendered by the probes
     * @param scene  The scene
     * @param probeRes The resolution that is used for rendering the probes
     * @param numberProbeX The number of probes wanted on the x axis
     * @param numberProbeY The number of probes wanted on the y axis
     * @param numberProbeZ The number of probes wanted on the z axis
     * @param numberBounces the number of bounces wanted
     */
    constructor(meshes : Array<Mesh>, scene : Scene, probeRes : number, 
        probeDisposition : Vector3, numberBounces : number) {
        this._scene = scene;
        this.meshForIrradiance = meshes;
        this.probeList = [];
        this._probesDispotion = probeDisposition;
        //Create and dispatch the probes inside the irradiance volume
        this._createProbeList(probeRes);
        this.dictionary = new MeshDictionary(meshes, scene);
        this.irradiance = new Irradiance(this._scene, this.probeList, this.meshForIrradiance, this.dictionary,
            numberBounces, this._probesDispotion, this._lowerLeft, this._volumeSize);
    }

    private _createProbeList(probeRes : number) {
        let positions = [];
        for (let mesh of this.meshForIrradiance) {
            let wMatrix = mesh.getWorldMatrix();
            let meshVertices = mesh.getVerticesData(VertexBuffer.PositionKind);
            if (meshVertices != null) {
                for (let i = 0; i < meshVertices.length; i += 3) {
                    let vertexPosition = new Vector3(meshVertices[i], meshVertices[i + 1], meshVertices[i + 2]);
                    let res = Vector3.TransformCoordinates(vertexPosition, wMatrix);
                    positions.push(res);
                }
            }
        }
        let minVec = new Vector3(Infinity, Infinity, Infinity);
        let maxVec = new Vector3(- Infinity, - Infinity, - Infinity);
        for (let vertex of positions) {
            if (vertex.x <= minVec.x) {
                minVec.x = vertex.x;
            }
            else if (vertex.x >= maxVec.x) {
                maxVec.x = vertex.x;
            }
            if (vertex.y <= minVec.y) {
                minVec.y = vertex.y;
            }
            else if (vertex.y >= maxVec.y) {
                maxVec.y = vertex.y;
            }
            if (vertex.z <= minVec.z) {
                minVec.z = vertex.z;
            }
            else if (vertex.z >= maxVec.z) {
                maxVec.z = vertex.z;
            }
        }
        this._volumeSize = new Vector3(maxVec.x - minVec.x, maxVec.y - minVec.y, maxVec.z - minVec.z);

        this._lowerLeft = new Vector3();
        this._lowerLeft.x = minVec.x + this._volumeSize.x / (2 * this._probesDispotion.x);
        this._lowerLeft.y = minVec.y + this._volumeSize.y / (2 * this._probesDispotion.y);
        this._lowerLeft.z = minVec.z + this._volumeSize.z / (2 * this._probesDispotion.z);

        for (let z = 0; z < this._probesDispotion.z  ; z += 1) {
            for (let y = 0; y <  this._probesDispotion.y ; y += 1) {
                for (let x = 0; x <  this._probesDispotion.x ; x += 1) {
                    this.probeList.push(new Probe(new Vector3(
                        this._lowerLeft.x + x * this._volumeSize.x / this._probesDispotion.x,
                        this._lowerLeft.y + y * this._volumeSize.y / this._probesDispotion.y,
                        this._lowerLeft.z + z * this._volumeSize.z / this._probesDispotion.z),
                         this._scene, probeRes));
                }
            }
        }
    }

    /**
     * Called to change the directLightmap of the dictionary
     * Must ba called when the radiosity has been updates, othermwise, it does not do anything
     */
    public updateDicoDirectLightmap(){
        for (let mesh of this.dictionary.keys()){
            let value = this.dictionary.getValue(mesh);
            if (value != null) {
                value.directLightmap = mesh.getRadiosityTexture();
            }
        }
    }

    /**
     * Start rendering the irradiance volume
     */
    public render() {
        this.irradiance.render();
    }


    public updateGlobalIllumStrength(value : number){
        this.dictionary.globalIllumStrength = value;
        for (let value of this.dictionary.values()){
            value.sumOfBoth.render();
        }
    }

    public updateDirectIllumStrength(value : number){
        this.dictionary.directIllumStrength = value;
        for (let value of this.dictionary.values()){
            value.sumOfBoth.render();
        }
    }

    public updateDirectIllumForEnv(envMultiplicator : number){     
        this.irradiance.updateDirectIllumForEnv(envMultiplicator);

    }
}