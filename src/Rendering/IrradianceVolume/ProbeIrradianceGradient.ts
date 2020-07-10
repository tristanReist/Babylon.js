import { Probe } from './Probe';
import { Vector3 } from '../../Maths/math.vector';
import { Scene } from '../../scene';
import { Mesh, SubMesh } from '../../Meshes';
import { MeshDictionary } from './meshDictionary';
import { Effect } from '../../Materials';
import { SmartArray } from '../../Misc';
import { SphericalHarmonics } from '../../Maths';

export class ProbeIrradianceGradient extends Probe {

    private adjacentProbesForIrradiance : Array<Probe>;
    private distanceBetweenProbesForGradient = 40;

    public gradientSphericalHarmonics : SphericalHarmonics[];

    constructor(position : Vector3, scene : Scene, resolution : number, inRoom : number){
        super(position, scene, resolution, inRoom);
        this.adjacentProbesForIrradiance = [];
        this.gradientSphericalHarmonics = [];


        // +x
        let newPosition = new Vector3(position.x + this.distanceBetweenProbesForGradient, position.y, position.z);
        this.adjacentProbesForIrradiance.push(new Probe(newPosition, scene, resolution, inRoom));
        
        // -x
        newPosition = new Vector3(position.x - this.distanceBetweenProbesForGradient, position.y, position.z);
        this.adjacentProbesForIrradiance.push(new Probe(newPosition, scene, resolution, inRoom));
    
        // +y
        newPosition = new Vector3(position.x , position.y + this.distanceBetweenProbesForGradient, position.z);
        this.adjacentProbesForIrradiance.push(new Probe(newPosition, scene, resolution, inRoom));
    
        // -y
        newPosition = new Vector3(position.x , position.y - this.distanceBetweenProbesForGradient, position.z);
        this.adjacentProbesForIrradiance.push(new Probe(newPosition, scene, resolution, inRoom));
    
        // +z
        newPosition = new Vector3(position.x , position.y, position.z  + this.distanceBetweenProbesForGradient);
        this.adjacentProbesForIrradiance.push(new Probe(newPosition, scene, resolution, inRoom));
       
        // +z
        newPosition = new Vector3(position.x , position.y, position.z  - this.distanceBetweenProbesForGradient);
        this.adjacentProbesForIrradiance.push(new Probe(newPosition, scene, resolution, inRoom));
    }


    public render(meshes : Array<Mesh>, dictionary : MeshDictionary, uvEffet : Effect, bounceEffect : Effect) : void {
        super.render(meshes, dictionary, uvEffet, bounceEffect);
        for (let probe of this.adjacentProbesForIrradiance){
            probe.render(meshes, dictionary, uvEffet, bounceEffect);
        }
    }

    public initPromise() : void {
        super.initPromise();
        for (let probe of this.adjacentProbesForIrradiance){
            probe.initPromise();
        }
    }

    public renderBounce(meshes : Array<Mesh>) : void {
        super.renderBounce(meshes);
        for (let probe of this.adjacentProbesForIrradiance){
            probe.renderBounce(meshes);
        }
        this.tempBounce.customRenderFunction =(opaqueSubMeshes: SmartArray<SubMesh>, alphaTestSubMeshes: SmartArray<SubMesh>, transparentSubMeshes: SmartArray<SubMesh>, depthOnlySubMeshes: SmartArray<SubMesh>): void => {
            this._renderCubeTexture(opaqueSubMeshes, false);
            for (let probe of this.adjacentProbesForIrradiance){
                probe.tempBounce.isCube = false;
                probe.tempBounce.render();
                probe.tempBounce.isCube = true;
            }
            this._computeIrradianceGradient();
        };
    }

    public setVisibility(visible : number) : void {
        super.setVisibility(visible);
        for (let probe of this.adjacentProbesForIrradiance){
            probe.setVisibility(visible);
        }
    }


    private _computeIrradianceGradient() : void {
        let temp : SphericalHarmonics;
        for (let i = 0; i < 3; i++){
            temp = new SphericalHarmonics();
            let floatForMultiply = new Vector3(1 / (2 * this.distanceBetweenProbesForGradient), 1/  (2 * this.distanceBetweenProbesForGradient), 1 / (2 * this.distanceBetweenProbesForGradient));
            temp.l00 = (this.adjacentProbesForIrradiance[i*2].sphericalHarmonic.l00.subtract(this.adjacentProbesForIrradiance[i*2+1].sphericalHarmonic.l00)).multiply(floatForMultiply);
            
            temp.l10 = (this.adjacentProbesForIrradiance[i*2].sphericalHarmonic.l10.subtract(this.adjacentProbesForIrradiance[i*2+1].sphericalHarmonic.l10)).multiply(floatForMultiply);
            temp.l11 = (this.adjacentProbesForIrradiance[i*2].sphericalHarmonic.l11.subtract(this.adjacentProbesForIrradiance[i*2+1].sphericalHarmonic.l11)).multiply(floatForMultiply);
            temp.l1_1 = (this.adjacentProbesForIrradiance[i*2].sphericalHarmonic.l1_1.subtract(this.adjacentProbesForIrradiance[i*2+1].sphericalHarmonic.l1_1)).multiply(floatForMultiply);

            temp.l20 = (this.adjacentProbesForIrradiance[i*2].sphericalHarmonic.l20.subtract(this.adjacentProbesForIrradiance[i*2+1].sphericalHarmonic.l20)).multiply(floatForMultiply);
            temp.l21 = (this.adjacentProbesForIrradiance[i*2].sphericalHarmonic.l21.subtract(this.adjacentProbesForIrradiance[i*2+1].sphericalHarmonic.l21)).multiply(floatForMultiply);
            temp.l2_1 = (this.adjacentProbesForIrradiance[i*2].sphericalHarmonic.l2_1.subtract(this.adjacentProbesForIrradiance[i*2+1].sphericalHarmonic.l2_1)).multiply(floatForMultiply);
            temp.l22 = (this.adjacentProbesForIrradiance[i*2].sphericalHarmonic.l22.subtract(this.adjacentProbesForIrradiance[i*2+1].sphericalHarmonic.l22)).multiply(floatForMultiply);
            temp.l2_2 = (this.adjacentProbesForIrradiance[i*2].sphericalHarmonic.l2_2.subtract(this.adjacentProbesForIrradiance[i*2+1].sphericalHarmonic.l2_2)).multiply(floatForMultiply);
            
            this.gradientSphericalHarmonics.push(temp);
        }
    }



}