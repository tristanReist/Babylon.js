import { Scene } from '../../scene';
import { Probe } from './Probe';
import { Mesh } from '../../Meshes/mesh';
import { Volume } from './Volume';

/**
 * Class that represent a kind of volume where we manually add probes
 * It is possible to add some probes, after the creation, only if the render has not startess
 */
export class OwnVolume extends Volume{

    private _renderStarted : boolean; 

    /**
     * Instanciate a new volume for the scene
     * @param meshes List of 
     * @param scene The scene the volume belong to  
     * @param probeRes The resolution with which the probes will render
     * @param probes The list of probes that will be render
     */
    constructor(meshes : Array<Mesh>, scene : Scene, strAlbedo : string, probeRes = 16, probes? : Array<Probe>){
        super(meshes, scene, strAlbedo, probeRes);
        this._initProbeIrradiance(probes);
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
     * Start the rendering of the volume, for the computation of irradiance
     */
    public render() : void {
        this._renderStarted = true;
        super.render();
    }

}