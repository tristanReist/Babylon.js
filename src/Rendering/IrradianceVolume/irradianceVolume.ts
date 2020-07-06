import { Scene } from '../../scene';
import { Mesh } from '../../Meshes/mesh';
import { Vector3, Vector4, Vector2 } from '../../Maths/math.vector';
import { Probe } from './Probe';
import { MeshDictionary } from './meshDictionary';
import { Irradiance } from './Irradiance';
import { _BabylonLoaderRegistered } from '../../Loading';

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
    private _lowerLeft : Vector3;
    private _volumeSize : Vector3;

    private _probesDisposition : Vector3;


    /**
     * Creation of the irradiance volume
     * @param meshes  The meshes that need to be rendered by the probes
     * @param scene  The scene
     * @param probeRes The resolution that is used for rendering the probes
     * @param numberBounces the number of bounces wanted
     * @param probeDisp The disposition of the probes in the scene
     * @param numberProbes The number of probes placed on each axis
     */
    constructor(meshes : Array<Mesh>, scene : Scene, probeRes : number, 
        numberBounces : number, probeDisp : Array<Vector4>, numberProbes : Vector3) {
        this._scene = scene;
        this.meshForIrradiance = meshes;
        this.probeList = [];
        this._probesDisposition = numberProbes;
        //Create and dispatch the probes inside the irradiance volume
       
        this._createProbeFromProbeDisp(probeDisp);
        // this._createIrradianceGradientProbes();
        this._lowerLeft = new Vector3(probeDisp[0].x, probeDisp[0].y, probeDisp[0].z);
        this._volumeSize = new Vector3(probeDisp[probeDisp.length - 1].x - this._lowerLeft.x,
            probeDisp[probeDisp.length - 1].y - this._lowerLeft.y,
            probeDisp[probeDisp.length - 1].z - this._lowerLeft.z);
        this.dictionary = new MeshDictionary(meshes, scene);
        this.irradiance = new Irradiance(this._scene, this.probeList, this.meshForIrradiance, this.dictionary,
            numberBounces, this._probesDisposition, this._lowerLeft, this._volumeSize);
    }


    private _createProbeFromProbeDisp(probeDisp : Array<Vector4>) {
        for (let probePos of probeDisp){
            this.probeList.push(new Probe(new Vector3(probePos.x, probePos.y, probePos.z),
            this._scene, 16, probePos.w));
        }
    }




    private _moveRigh(movingSquare : number[], xPos : number, yPos : number){
        movingSquare[2]++;
        movingSquare[3]++;
        xPos++;
        if (yPos != 0){
            movingSquare[0]++;
            movingSquare[1]++;
        }

        if (xPos == this._probesDisposition.x){

        }


        if (this.probeList[movingSquare[]])
    }

    private _moveDown(movingSquare : number[], xPos : number, yPos : number){

    }

    private _moveUp(movingSquare : number[], xPos : number, yPos : number){

    }

    private _moveLeft(movingSquare : number[], xPos : number, yPos : number){

    }

    /**
     * Function that will be use to see if we need to create probes to compute irradiance gradient at some places
     */
    private _createIrradianceGradientProbes(){
        let movingSquare = [-1, -1, -1, 0];
        // Position of the top right of the square
        let xPos = 0;
        let yPos = 0;
        this._moveRigh(movingSquare, xPos, yPos);

     


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
        this.dictionary.render();
    }

    public updateDirectIllumStrength(value : number){
        this.dictionary.directIllumStrength = value;
        this.dictionary.render();
    }

    public updateDirectIllumForEnv(envMultiplicator : number){     
        this.irradiance.updateDirectIllumForEnv(envMultiplicator);

    }
}