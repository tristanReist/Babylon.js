import { Scene } from '../../scene';
import { Probe } from './Probe';
import { Mesh } from '../../Meshes/mesh';
import { Irradiance } from './Irradiance';

/**
 * Class that represent the irradiance volume
 * It contains all the probe used to render the scene, and is responsible of pre rendering the irradiance 
 */
export class Volume {

    private _scene : Scene;
    private _renderStarted : boolean;

    /**
     * List of the probes that are present in the scene
     */
    public probeList : Array<Probe>;

    /**
     * List of the meshes that need to be render on the probes
     */
    public meshList : Array<Mesh>

    /**
     * Instance of irradiance class that aims to compute all the irradiance needed for the rendering
     */
    public irradiance : Irradiance;
    
    /**
     * Resolution with which the probes will render the scene
     */
    public renderResolution : number;


    /**
     * Instanciate a new volume for the scene
     * @param meshes List of 
     * @param scene The scene the volume belong to  
     * @param probeRes The resolution with which the probes will render
     * @param probes The list of probes that will be render
     */
    constructor(meshes : Array<Mesh>, scene : Scene, probeRes = 16, probes? : Array<Probe>){
        this._scene = scene;
        this.meshList = meshes;
        if (probes) {
            //Check if the resolution is the same for all probes
            this.probeList = probes;
            for (let probe of this.probeList){
                probe.setResolution(probeRes);
            }
        }
        else {
            this.probeList = new Array<Probe>();
        }
        this.renderResolution = probeRes;
        this.irradiance = new Irradiance(this._scene, this.probeList, this.meshList);
    }

    /**
     * Add a probe to the volume manually
     * Can only work if we didn't render the volume yet
     * @param probe  The probe to be render
     */
    public addProbe(probe : Probe) : void {
        if (this._renderStarted){
            console.log("Render has already started");
            return;
        }
        probe.setResolution(this.renderResolution);
        this.probeList.push(probe);
        this.irradiance.addProbe(probe);
        return;
    }


    /**
     * Launch the process of rendering the scene to compute the irradiance of it
     */
    public render() : void {
        this.irradiance.render();
    }



}