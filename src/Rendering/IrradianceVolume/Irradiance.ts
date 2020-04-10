import { Scene } from '../../scene';
import { Probe } from './Probe';
import { RenderTargetTexture } from '../../Materials/Textures/renderTargetTexture';
import { Mesh } from '../../Meshes/mesh';
import { VertexData } from '../../Meshes/mesh.vertexData';
import { ShaderMaterial } from '../../Materials/shaderMaterial';
import { Texture } from '../../Materials';
import { CubeMapToSphericalPolynomialTools } from '../../Misc/HighDynamicRange/cubemapToSphericalPolynomial';
import { SphericalHarmonics } from '../../Maths/sphericalPolynomial';

export class Irradiance {

    private _scene : Scene;
    
    public probeList : Array<Probe>;
    public resolution : number;
    
    public cubeMapLine : RenderTargetTexture;
    public shCoeff : RenderTargetTexture;
     
    private _groundForRender : Mesh;
    private _promise : Promise<void>;

    constructor(scene : Scene, probes : Array<Probe>, resolution : number){
        this._scene = scene;
        this.probeList = probes;
        this.resolution = resolution;
        this._createGround();
        this._promise = this._createPromise();
    }

    public addProbe(probe : Probe) {
        this.probeList.push(probe);
        this._promise = this._createPromise();
    }   

    public render() : void {
        let irradiance = this;
        this._promise.then( function () {
            irradiance._computeCubeMapLines();

            // irradiance._CPUcomputeSHCoeff();
        });
    }

    private _createPromise() : Promise<void> {
        return new Promise((resolve, reject) => {
            this.cubeMapLine = new RenderTargetTexture("cubeMapLine",
            {
                width : this.resolution * 6,
                height : this.resolution * this.probeList.length
            },
            this._scene
            );
            this.shCoeff = new RenderTargetTexture("shCoef", {width : 9, height : 1}, this._scene);

            let interval = setInterval(() => {
                let readyStates = [
                    this._isSHReady(),
                    this._isCubeMapLineReady()
                ];
                for (let i = 0 ; i < readyStates.length; i++) {
                    if (!readyStates[i]) {
                        return ;
                    }
                }
                clearInterval(interval);
                resolve();
            }, 200);
        });
    }

    private _isSHReady() : boolean {
        
        return this.shCoeff.isReady();
    }

    private _isCubeMapLineReady() : boolean {
        
        return this.cubeMapLine.isReady();
    }

    private _createGround() : void {
        this._groundForRender= new Mesh("custom", this._scene);
        let position = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0];
        let indices = [0, 1, 2, 3, 4, 5];
        let vertexData = new VertexData();
        this._groundForRender.visibility = 0;
        vertexData.positions = position;
        vertexData.indices = indices;

        vertexData.applyToMesh(this._groundForRender);
    }

    private _CPUcomputeSHCoeff() : void {

        let sp = CubeMapToSphericalPolynomialTools.ConvertCubeMapTextureToSphericalPolynomial(this.probeList[0].cubicMRT.textures[0]);
        let sh;
        if (sp != null)
        sh = SphericalHarmonics.FromPolynomial(sp);
    }

    private _GPUcomputeSHCoeff() : void {
        var shMaterial = new ShaderMaterial("shCoef", this._scene, "./../../src/Shaders/shCoef", {
            attributes : ["position"]
        });
        shMaterial.setInt("numberCube", this.probeList.length);
        shMaterial.setInt("resolution", this.resolution);
        shMaterial.setTexture("cubeMapLine", this.cubeMapLine);
        shMaterial.backFaceCulling = false;

            
        this.shCoeff.onBeforeRenderObservable.add(() => {
            this._groundForRender.material = shMaterial;
        });

        this.shCoeff.onAfterRenderObservable.add(() => {
            let pixels = this.shCoeff.readPixels();
        });
 
        this.shCoeff.renderList = [this._groundForRender];
        this._scene.customRenderTargets.push(this.shCoeff);
        this.shCoeff.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;
    }

    private _computeCubeMapLines() : void {
        var cubeMapMaterial = new ShaderMaterial("cubeMap", this._scene, "./../../src/Shaders/cubeMapInLine", {
            attributes : ["position"]
        });
        
        let textureArray = new Array<Texture>();
        for (let probe of this.probeList) {
            textureArray.push(probe.cubicMRT.textures[1]);
        }
        cubeMapMaterial.setTextureArray("cubeMapArray", textureArray);
        cubeMapMaterial.setInt("resolution", this.resolution);
        cubeMapMaterial.setInt("numberCube", this.probeList.length);
        cubeMapMaterial.backFaceCulling = false;
        
        this.cubeMapLine.onBeforeRenderObservable.add(() => {
            this._groundForRender.material = cubeMapMaterial;
        });

        this.cubeMapLine.renderList = [this._groundForRender];
        this._scene.customRenderTargets.push(this.cubeMapLine);
        this.cubeMapLine.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;
    }
}