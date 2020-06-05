import { Scene } from '../../scene';
import { Mesh } from '../../Meshes/mesh';
import { VertexBuffer } from '../../Meshes/buffer';
import { Vector3 } from '../../Maths/math.vector';
import { Probe } from './Probe';
import { MeshDictionary } from './meshDictionary';
import { Irradiance } from './Irradiance';

/**
 * Class that represent the irradiance volume
 * It contains all the probe used to render the scene, and is responsible of pre rendering the irradiance
 */
export class IrradianceVolume {

    private _scene : Scene;
    public probeList : Array<Probe>;
    public meshForIrradiance : Array<Mesh>;
    public irradiance : Irradiance;

    public dictionary : MeshDictionary;

    private _probesDispotion : Vector3;
    private _lowerLeft : Vector3;
    private _volumeSize : Vector3;


    /**
     * Creation of the irradiance volume where the probes are equireparted in the scene
     * @param meshes  The meshes that need to be rendered by the probes
     * @param scene  The meshes that need to be rendered by the probes
     * @param dictionary 
     * @param probeRes 
     * @param numberProbeX 
     * @param numberProbeY 
     * @param numberProbeZ 
     * @param numberBounces 
     */
    constructor(meshes : Array<Mesh>, scene : Scene, probeRes : number, numberProbeX : number,
            numberProbeY : number, numberProbeZ : number, numberBounces : number) {
        this._scene = scene;
        this.meshForIrradiance = meshes;
        this.probeList = [];
        this._probesDispotion = new Vector3(numberProbeX, numberProbeY, numberProbeZ);
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

    public updateDicoDirectLightmap(){
        for (let mesh of this.dictionary.keys()){
            let value = this.dictionary.getValue(mesh);
            if (value != null) {
                value.directLightmap = mesh.getRadiosityTexture();
            }
        }
    }

    public render() {
        this.irradiance.render();
    }

}