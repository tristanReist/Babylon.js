import { Scene } from '../../scene';
import { Mesh } from '../../Meshes/mesh';
import { Volume } from './Volume';
import { VertexBuffer } from '../../Meshes/buffer';
import { Vector3 } from '../../Maths/math.vector';
import { Probe } from './Probe';
import { MeshDictionary } from './meshDictionary';

/**
 * Class that represent the irradiance volume
 * It contains all the probe used to render the scene, and is responsible of pre rendering the irradiance
 */
export class UniformVolume extends Volume {

    private _width : number;
    private _height : number;
    private _depth : number;
    private _numberX : number;
    private _numberY : number;
    private _numberZ : number;
    private _lowerLeft : Vector3;

    /**
     * Creation of a volume where the probes are equireparted in the scene
     * @param meshes The meshes that need to be rendered by the probes
     * @param scene The scene that will be render
     * @param width the width of the rectangle of probes
     * @param depth The depth of the rectangle form by the probes
     * @param height The height of the rectangle form by the probes
     * @param probeRes The resolution with which the probes will be rendered
     * @param space The space between probes
     */
    constructor(meshes : Array<Mesh>, scene : Scene, dictionary : MeshDictionary, probeRes : number,  numberProbeX : number, numberProbeY : number, numberProbeZ : number, numberBounces : number) {
        super(meshes, scene, dictionary, numberBounces, probeRes);
        this.probeList = [];
        this._numberX = numberProbeX;
        this._numberY = numberProbeY;
        this._numberZ = numberProbeZ;
        this._createProbeList();
        this._initProbeIrradiance(this.probeList);
        this.irradiance.setUniform(new Vector3(this._numberX, this._numberY, this._numberZ),
                    this._lowerLeft, new Vector3(this._width, this._height, this._depth));
    }

    private _createProbeList() {
        let positions = [];

        for (let mesh of this.meshList) {
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

        this._width = maxVec.x - minVec.x;
        this._height = maxVec.y - minVec.y;
        this._depth = maxVec.z - minVec.z;

        this._lowerLeft = new Vector3();
        this._lowerLeft.x = minVec.x + this._width / (2 * this._numberX);
        this._lowerLeft.y = minVec.y + this._height / (2 * this._numberY);
        this._lowerLeft.z = minVec.z + this._depth / (2 * this._numberZ);

        for (let z = 0; z < this._numberZ  ; z += 1) {
            for (let y = 0; y <  this._numberY ; y += 1) {
                for (let x = 0; x <  this._numberX ; x += 1) {
                    this.probeList.push(new Probe(new Vector3(this._lowerLeft.x + x * this._width / this._numberX ,
                    this._lowerLeft.y + y * this._height / this._numberY,
                    this._lowerLeft.z + z * this._depth / this._numberZ), this._scene));
                }
            }
        }
    }

}