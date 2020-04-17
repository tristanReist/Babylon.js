import { Scene } from '../../scene';
import { Probe } from './Probe';
import { Mesh } from '../../Meshes/mesh';
import { Irradiance } from './Irradiance';
import { Volume } from './Volume';
import { Vector3 } from '../../Maths';

/**
 * Class that represent the irradiance volume
 * It contains all the probe used to render the scene, and is responsible of pre rendering the irradiance 
 */
export class UniformVolume extends Volume{


    private _width : number;
    private _height : number;
    private _depth : number;
    private _spaceBetweenProbes : number;

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
    constructor(meshes : Array<Mesh>, scene : Scene, width : number, depth : number, height : number, probeRes = 16 , space = 1 ){
        super(meshes, scene, probeRes);
        this._width = width;
        this._height = height;
        this._depth = depth;
        this._spaceBetweenProbes = space;
        this._createProbeList();
        this.irradiance =  = new Irradiance(this._scene, this.probeList, this.meshList);
    }


    private _createProbeList(){

    }


}