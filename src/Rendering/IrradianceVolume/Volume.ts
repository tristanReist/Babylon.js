import { Scene } from '../../scene';
import { Probe } from './Probe';
import { Mesh } from '../../Meshes/mesh';
import { Irradiance } from './Irradiance';

/**
 * Abstract class of a volume
 * Will be used for different types of columes that will be created during the developpement of the irradiance volume
 */
export abstract class Volume {

    protected _scene : Scene;

    /**
     * List of the probes that are present in the scene
     */
    public probeList : Array<Probe>;

    /**
     * List of the meshes that need to be render on the probes
     */
    public meshList : Array<Mesh>;

    /**
     * Instance of irradiance class that aims to compute all the irradiance needed for the rendering
     */
    public irradiance : Irradiance;

    /**
     * Resolution with which the probes will render the scene
     */
    public renderResolution : number;

    public lightMapName : string;

    public numberBounces : number;

    /**
     * Instanciate a new volume for the scene
     * @param meshes List of
     * @param scene The scene the volume belong to
     * @param probeRes The resolution with which the probes will render
     * @param probes The list of probes that will be render
     */
    constructor(meshes : Array<Mesh>, scene : Scene, lightMapName : string, numberBounces : number, probeRes = 16) {
        this._scene = scene;
        this.meshList = meshes;
        this.renderResolution = probeRes;
        this.lightMapName = lightMapName;
        this.numberBounces = numberBounces;
    }

    protected _initProbeIrradiance(probes? : Array<Probe>) : void {
        if (probes) {
            //Check if the resolution is the same for all probes
            this.probeList = probes;
            for (let probe of this.probeList) {
                probe.setResolution(this.renderResolution);
                probe.setVisibility(1);
            }
        }
        else {
            this.probeList = new Array<Probe>();
        }
        this.irradiance = new Irradiance(this._scene, this.probeList, this.meshList, this.lightMapName, this.numberBounces);
    }

    /**
     * Launch the process of rendering the scene to compute the irradiance of it
     */
    public render() : void {
        this.irradiance.render();
    }

}