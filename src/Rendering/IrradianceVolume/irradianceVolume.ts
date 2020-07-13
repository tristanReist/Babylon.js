import { Mesh } from '../../Meshes/mesh';
import { Vector3, Vector4 } from '../../Maths/math.vector';
import { Probe } from './Probe';
import { MeshDictionary } from './meshDictionary';
import { Irradiance } from './Irradiance';
import { ProbeIrradianceGradient } from './ProbeIrradianceGradient';
import { Scene } from '../../scene';

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

    public irradianceProbeList : Array<ProbeIrradianceGradient>;

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


    private _tempProbeIndexForIrradiance = -1;
    private _tempLastRect : number[];

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
        numberBounces : number, probeDisp : Array<Vector4>, numberProbes : Vector3){
        this._scene = scene;
        this.meshForIrradiance = meshes;
        this.probeList = [];
        this.irradianceProbeList = [];
        this._probesDisposition = numberProbes;
        this._tempLastRect = [];
        //Create and dispatch the probes inside the irradiance volume

        this._createProbeFromProbeDisp(probeDisp);
        this._lowerLeft = new Vector3(probeDisp[0].x, probeDisp[0].y, probeDisp[0].z);
        this._volumeSize = new Vector3(probeDisp[probeDisp.length - 1].x - this._lowerLeft.x,
            probeDisp[probeDisp.length - 1].y - this._lowerLeft.y,
            probeDisp[probeDisp.length - 1].z - this._lowerLeft.z);
        this._createIrradianceGradientProbes();
        this.dictionary = new MeshDictionary(meshes, scene);
        this.irradiance = new Irradiance(this._scene, this.probeList, this.irradianceProbeList, this.meshForIrradiance, this.dictionary,
            numberBounces, this._probesDisposition, this._lowerLeft, this._volumeSize);
    }

    private _createProbeFromProbeDisp(probeDisp : Array<Vector4>){
        for (let probePos of probeDisp){
            this.probeList.push(new Probe(new Vector3(probePos.x, probePos.y, probePos.z),
            this._scene, 16, probePos.w));
        }
    }

    private _moveRight(movingSquare : number[], xPos : number, yPos : number, finsihSquare : number[]){
        this._checkNewProbeInMovingSquare(movingSquare);

        movingSquare[2] = movingSquare[3];
        movingSquare[0] = movingSquare[1];
        movingSquare[3]++
        xPos++;
        if (yPos != 0){
            movingSquare[1]++;
        }
        else {
            movingSquare[0] = -1;
            movingSquare[1] = -1;
        }
        if (xPos == this._probesDisposition.x){
            movingSquare[3] = -1;
            movingSquare[1] = -1;
            this._moveUp(movingSquare, xPos, yPos, finsihSquare);
        }
        else if (movingSquare[0] != -1 && movingSquare[1] != -1 && this.probeList[movingSquare[1]].probeInHouse != Probe.OUTSIDE_HOUSE && this.probeList[movingSquare[0]].probeInHouse == Probe.OUTSIDE_HOUSE){
            this._moveDown(movingSquare, xPos, yPos, finsihSquare);
        }
        else if (this.probeList[movingSquare[3]].probeInHouse == Probe.OUTSIDE_HOUSE){
            this._moveUp(movingSquare, xPos, yPos, finsihSquare);
        }
        else{
            this._moveRight(movingSquare, xPos, yPos, finsihSquare)
        }

    }

    private _moveDown(movingSquare : number[], xPos : number, yPos : number, finsihSquare : number[]){
        this._checkNewProbeInMovingSquare(movingSquare);

        let step = this._probesDisposition.x * this._probesDisposition.y;
        movingSquare[2] = movingSquare[0];
        movingSquare[3] = movingSquare[1];
        movingSquare[1] -= step;
        if (xPos != 0){
            movingSquare[0] -= step;
        }
        else{
            movingSquare[0] = -1;
            movingSquare[2] = -1;
        }
        yPos--;
        if (yPos == 0){
            movingSquare[0] = -1;
            movingSquare[1] = -1;
            if (movingSquare[0] == finsihSquare[0] && movingSquare[1] == finsihSquare[1] && movingSquare[2] == finsihSquare[2] && movingSquare[3] == finsihSquare[3] ) {
                return;
            }
            else{
                this._moveRight(movingSquare, xPos, yPos, finsihSquare);
            }
        }
        else if (movingSquare[0] != -1 && movingSquare[2] != -1 && this.probeList[movingSquare[0]].probeInHouse != Probe.OUTSIDE_HOUSE && this.probeList[movingSquare[2]].probeInHouse == Probe.OUTSIDE_HOUSE){
            this._moveLeft(movingSquare, xPos, yPos, finsihSquare);
        }
        else if (this.probeList[movingSquare[1]].probeInHouse == Probe.OUTSIDE_HOUSE){
            this._moveRight(movingSquare, xPos, yPos, finsihSquare);
        }
        else{
            this._moveDown(movingSquare, xPos, yPos, finsihSquare);
        }
    }

    private _moveUp(movingSquare : number[], xPos : number, yPos : number, finsihSquare : number[]){
        this._checkNewProbeInMovingSquare(movingSquare);
        
        let step = this._probesDisposition.x * this._probesDisposition.y;
        movingSquare[0] = movingSquare[2];
        movingSquare[1] = movingSquare[3];
   
        movingSquare[2] += step;
        if (xPos != this._probesDisposition.x){
            movingSquare[3] += step;
        }
        else {
            movingSquare[1] = -1;
            movingSquare[3] = -1;
        }
        yPos++;
        if (yPos == this._probesDisposition.z){
            movingSquare[2] = -1;
            movingSquare[3] = -1;
            this._moveLeft(movingSquare, xPos, yPos, finsihSquare);
        }
        else if (movingSquare[1] != -1 && movingSquare[3] != -1 && this.probeList[movingSquare[3]].probeInHouse != Probe.OUTSIDE_HOUSE && this.probeList[movingSquare[1]].probeInHouse == Probe.OUTSIDE_HOUSE) {
            this._moveRight(movingSquare, xPos, yPos, finsihSquare);
        }
        else if (this.probeList[movingSquare[2]].probeInHouse == Probe.OUTSIDE_HOUSE){
            this._moveLeft(movingSquare, xPos, yPos, finsihSquare);
        }
        else{
            this._moveUp(movingSquare, xPos, yPos, finsihSquare);
        }
    }

    private _moveLeft(movingSquare : number[], xPos : number, yPos : number, finsihSquare : number[]){
        this._checkNewProbeInMovingSquare(movingSquare);
        
        movingSquare[1] = movingSquare[0];
        movingSquare[3] = movingSquare[2];

        movingSquare[0]--;
        if (yPos != this._probesDisposition.z){
            movingSquare[2]--;
        }
        else {
            movingSquare[2] = -1;
            movingSquare[3] = -1;
        }
        xPos--;
        if (xPos == 0){
            movingSquare[0] = -1;
            movingSquare[2] = -1;
            this._moveDown(movingSquare, xPos, yPos, finsihSquare);
        }
        else if (movingSquare[2] != -1 && movingSquare[3] != -1 && this.probeList[movingSquare[2]].probeInHouse != Probe.OUTSIDE_HOUSE && this.probeList[movingSquare[3]].probeInHouse == Probe.OUTSIDE_HOUSE){
            this._moveUp(movingSquare, xPos, yPos, finsihSquare);
        }
        else if (this.probeList[movingSquare[0]].probeInHouse == Probe.OUTSIDE_HOUSE){
            this._moveDown(movingSquare, xPos, yPos, finsihSquare);
        }
        else {
            this._moveLeft(movingSquare, xPos, yPos, finsihSquare);
        }
    }

    private _checkNewProbeInMovingSquare(movingSquare : number[]){
        let probesThatNeedIrradiance = [];
        for (let probeIndex of movingSquare){
            if (probeIndex != -1 && this.probeList[probeIndex].needIrradianceGradient){
                probesThatNeedIrradiance.push(probeIndex);
            }
        }
        if (this._tempProbeIndexForIrradiance != -1 ){
            if (probesThatNeedIrradiance.indexOf(this._tempProbeIndexForIrradiance) != -1){
                this._tempLastRect = [];
                for (let element of movingSquare){
                    this._tempLastRect.push(element);
                }
            }
            else {
                this._createNewGradientProbes();
                this._checkNewProbeInMovingSquare(movingSquare);
                // S'il en reste 2 nouveaux => on crée le truc directement avec le carré en cours et on appelle de nouveau createNewGradient
                // S'il en reste 1, on le prend comme base 
                // S'il reste rien, on réinitialise imédiatement

                // Update new values 
                
            }
        }
        else {
            if (probesThatNeedIrradiance.length > 0){
                for (let element of movingSquare){
                    this._tempLastRect.push(element);
                }
                this._tempProbeIndexForIrradiance = probesThatNeedIrradiance[0];
            }
        }
    }

    private _createNewGradientProbes(){
        let probePosition = new Vector3(0, 0, 0);
        let numberIrradianceGradientNeeded = 0;
        for (let corner of this._tempLastRect){
            if (corner != -1 && this.probeList[corner].needIrradianceGradient){
                numberIrradianceGradientNeeded++;
            }
        }

        let index = this._tempLastRect.indexOf(this._tempProbeIndexForIrradiance);
        let secondProbeIndex = -1;
        let distanceBetweenProbes = new Vector3(this._volumeSize.x / (this._probesDisposition.x - 1), this._volumeSize.y / (this._probesDisposition.y - 1), this._volumeSize.z / (this._probesDisposition.z - 1));
        switch (index){
            case 0: {
                let currentProbePosition = this.probeList[this._tempLastRect[0]].sphere.position;
                if (this._tempLastRect[1] != -1 && this.probeList[this._tempLastRect[1]].probeInHouse != Probe.OUTSIDE_HOUSE){
                    probePosition = new Vector3(currentProbePosition.x  + distanceBetweenProbes.x / 2, currentProbePosition.y + distanceBetweenProbes.y, currentProbePosition.z - distanceBetweenProbes.z / 2);
                    secondProbeIndex = 1;
                }
                else {
                    // The other one is the second in the square
                    probePosition = new Vector3(currentProbePosition.x  - distanceBetweenProbes.x / 2, currentProbePosition.y + distanceBetweenProbes.y, currentProbePosition.z + distanceBetweenProbes.z / 2);
                    secondProbeIndex = 2;
                }
                break;
            }
            case 1: {
                let currentProbePosition = this.probeList[this._tempLastRect[1]].sphere.position;
                if (this._tempLastRect[0] != -1 && this.probeList[this._tempLastRect[0]].probeInHouse != Probe.OUTSIDE_HOUSE){
                    probePosition = new Vector3(currentProbePosition.x  - distanceBetweenProbes.x / 2, currentProbePosition.y + distanceBetweenProbes.y, currentProbePosition.z - distanceBetweenProbes.z / 2);
                    secondProbeIndex = 0;
                }
                else {
                    // The other one is the 4th in the square
                    probePosition = new Vector3(currentProbePosition.x  + distanceBetweenProbes.x / 2, currentProbePosition.y + distanceBetweenProbes.y, currentProbePosition.z + distanceBetweenProbes.z / 2);
                    secondProbeIndex = 4;
                }
                break;
            }
            case 2: {
                let currentProbePosition = this.probeList[this._tempLastRect[2]].sphere.position;
                if (this._tempLastRect[0] != -1 && this.probeList[this._tempLastRect[0]].probeInHouse != Probe.OUTSIDE_HOUSE){
                    probePosition = new Vector3(currentProbePosition.x  - distanceBetweenProbes.x / 2, currentProbePosition.y + distanceBetweenProbes.y, currentProbePosition.z - distanceBetweenProbes.z / 2);
                    secondProbeIndex = 0;
                }
                else {
                    // The other one is the 4th in the square
                    probePosition = new Vector3(currentProbePosition.x  + distanceBetweenProbes.x / 2, currentProbePosition.y + distanceBetweenProbes.y, currentProbePosition.z + distanceBetweenProbes.z / 2);
                    secondProbeIndex = 4;
                }
                break;
            }
            case 3: {
                let currentProbePosition = this.probeList[this._tempLastRect[3]].sphere.position;
                if (this._tempLastRect[1] != -1 && this.probeList[this._tempLastRect[1]].probeInHouse != Probe.OUTSIDE_HOUSE){
                    probePosition = new Vector3(currentProbePosition.x  + distanceBetweenProbes.x / 2, currentProbePosition.y + distanceBetweenProbes.y, currentProbePosition.z - distanceBetweenProbes.z / 2);
                    secondProbeIndex = 1;
                }
                else {
                    // The other one is the second in the square
                    probePosition = new Vector3(currentProbePosition.x  - distanceBetweenProbes.x / 2, currentProbePosition.y + distanceBetweenProbes.y, currentProbePosition.z + distanceBetweenProbes.z / 2);
                    secondProbeIndex = 2;
                }
                break;
            }
        }
        let newProbe = new ProbeIrradianceGradient(probePosition, this._scene, 16, 1);
        this.irradianceProbeList.push(newProbe);


        for (let heightLevel = 0 ; heightLevel < this._probesDisposition.y; heightLevel++){
            this.probeList[this._tempLastRect[index] + heightLevel * this._probesDisposition.x].needIrradianceGradient = false;
            this.probeList[this._tempLastRect[index] + heightLevel * this._probesDisposition.x].probeForIrradiance = newProbe;
        }
        if (numberIrradianceGradientNeeded > 1) {
            for (let heightLevel = 0 ; heightLevel < this._probesDisposition.y; heightLevel++){
                this.probeList[this._tempLastRect[secondProbeIndex] + heightLevel * this._probesDisposition.x].needIrradianceGradient = false;
                this.probeList[this._tempLastRect[secondProbeIndex] + heightLevel * this._probesDisposition.x].probeForIrradiance = newProbe;
            }
        }
        if (numberIrradianceGradientNeeded > 2){
            for (let i = 0; i < 4; i++){
                let corner = this._tempLastRect[i];
                if (corner != -1 && this.probeList[corner].needIrradianceGradient){
                    this._tempProbeIndexForIrradiance = corner;
                }
            }
        }
        else {
            this._tempProbeIndexForIrradiance = -1;
            this._tempLastRect = [];
        }
    }

    
// BE CAREFUL WITH THE BOTTOM LEFT WHICH MIGHT NOT BE TESTED
// DO A SPECIAL CASE THEN 

    /**
     * Function that will be use to see if we need to create probes to compute irradiance gradient at some places
     */
    private _createIrradianceGradientProbes(){
        let movingSquare = [-1, -1, -1, 0];
        let xPos = 0;
        let yPos = 0;
        //As the bounding box is based on the reduced polygon of the room, there is one inside the first line
        while (this.probeList[movingSquare[3]].probeInHouse == Probe.OUTSIDE_HOUSE){
            movingSquare[2]++;
            movingSquare[3]++;
            xPos++;
        }
        // Position of the top right of the square
        let finsihSquare = [];
        for (let element of movingSquare){
            finsihSquare.push(element);
        }
        this._moveRight(movingSquare, xPos, yPos, finsihSquare);
    }

    /**
     * Called to change the directLightmap of the dictionary
     * Must ba called when the radiosity has been updates, othermwise, it does not do anything
     */
    public updateDicoDirectLightmap() {
        for (let mesh of this.dictionary.keys()) {
            let value = this.dictionary.getValue(mesh);
            if (value != null) {
                value.directLightmap = mesh.getShadowMap();
            }
        }
    }

    /**
     * Start rendering the irradiance volume
     */
    public render() {
        this.irradiance.render();
    }

    public updateGlobalIllumStrength(value : number) {
        this.dictionary.globalIllumStrength = value;
        this.dictionary.render();
    }

    public updateDirectIllumStrength(value : number) {
        this.dictionary.directIllumStrength = value;
        this.dictionary.render();
    }

    public updateDirectIllumForEnv(envMultiplicator : number) {
        this.irradiance.updateDirectIllumForEnv(envMultiplicator);
    }
}
