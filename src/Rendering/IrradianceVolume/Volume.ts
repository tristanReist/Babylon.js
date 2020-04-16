import { Scene } from '../../scene';
import { Probe } from './Probe';
import { Mesh } from '../../Meshes/mesh';
import { Irradiance } from './Irradiance';

export class Volume {

    private _scene : Scene;
    private _renderStarted : boolean;

    public probeList : Array<Probe>;
    public meshList : Array<Mesh>

    public irradiance : Irradiance;
    
    public renderResolution : number;


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

        this.irradiance = new Irradiance(this._scene, this.probeList, this.renderResolution, this.meshList);
    }

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

    public render() : void {
        this.irradiance.render();
    }



}