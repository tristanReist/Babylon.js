import { Mesh } from "../../Meshes/mesh";
import { Vector3, Matrix } from '../../Maths/math.vector';
import { MeshBuilder } from '../../Meshes/meshBuilder';
import { Scene } from '../../scene';
import { Color4 } from '../../Maths/math.color';
import { InternalTexture } from '../../Materials/Textures/internalTexture';
import { MultiRenderTarget } from '../../Materials/Textures/multiRenderTarget';
import { SubMesh } from '../../Meshes/subMesh';
import { Material } from '../../Materials/material';
import { Effect } from '../../Materials/effect';
import { SmartArray } from '../../Misc';
import { UniversalCamera } from '../../Cameras/universalCamera';
import { CubeMapToSphericalPolynomialTools } from '../../Misc/HighDynamicRange/cubemapToSphericalPolynomial';
import { SphericalHarmonics } from '../../Maths/sphericalPolynomial';
import { ShaderMaterial } from '../../Materials/shaderMaterial';
import { RenderTargetTexture } from '../../Materials/Textures/renderTargetTexture';

import "../../Shaders/irradianceVolumeProbeEnv.vertex";
import "../../Shaders/irradianceVolumeProbeEnv.fragment";
import "../../Shaders/irradianceVolumeUpdateProbeBounceEnv.vertex";
import "../../Shaders/irradianceVolumeUpdateProbeBounceEnv.fragment";
import { PBRMaterial } from '../../Materials/PBR/pbrMaterial';

import { MeshDictionary } from './meshDictionary';

/**
 * The probe is what is used for irradiance volume
 * It aims to sample the irradiance at  a certain point of the scene
 * For that, it create a cube map of its environment that will be used to compute the irradiance at that point
 */
export class Probe {

    /**
     * Static number to access to the cameras with their direction
     */
    public static readonly PX : number = 0;
    public static readonly NX : number = 1;
    public static readonly PY : number = 2;
    public static readonly NY : number = 3;
    public static readonly PZ : number = 4;
    public static readonly NZ : number = 5;

    private _scene : Scene;
    private _resolution : number;

    /**
     * The sphere that we choose to be visible or not,
     * that keep the information of irradiance
     */
    public sphere : Mesh;

    /**
     * The list of camera that are attached to the probe,
     * used to render the cube map
     */
    public cameraList : Array<UniversalCamera>;

    /**
     * Boolean use to know if the texture we are using for rendering is cubic or not
     */
    public isCube : boolean;

    /**
     * The effect used for rendering the cube map
     */
    public uvEffect : Effect;

    public bounceEffect : Effect;

    /**
     * The string representing the path to the texture that is used
     */
    public albedoStr : string;


    public dictionary : MeshDictionary;

    /**
     * The multirendertarget that is use to redner the scene from the probe
     */
    public cubicMRT : MultiRenderTarget;

    /**
     * The spherical harmonic coefficients that represent the irradiance capture by the probe
     */
    public sphericalHarmonic : SphericalHarmonics;

    /**
     * RenderTargetTexture that aims to copy the cubicMRT envCubeMap and add the irradiance compute previously to it, to simulate the bounces of the light
     */
    public tempBounce : RenderTargetTexture;

    /**
     * Variable helpful and use to know when the environment cube map has been rendered to continue the process
     */
    public envCubeMapRendered = false;

    /**
     * Variable helpful and use to know when the spherical harmonic coefficient has been computed to continue the process
     */
    public sphericalHarmonicChanged : boolean;

    public firstBounce = true;

    /**
     * Create the probe used to capture the irradiance at a point
     * @param position The position at which the probe is set
     * @param scene the scene in which the probe is place
     * @param albedoName the path to the albedo
     * @param isCube Is the texture we want to use a cube or not ?
     */
    constructor(position : Vector3, scene : Scene) {
        this._scene = scene;
        this.sphere = MeshBuilder.CreateSphere("probe", { diameter : 30 }, scene);
        this.sphere.visibility = 1;

        this.cameraList = new Array<UniversalCamera>();

        //First Camera ( x axis )
        let cameraPX = new UniversalCamera("px", Vector3.Zero(), scene);
        cameraPX.rotation = new Vector3(0, Math.PI / 2, 0);
        this.cameraList.push(cameraPX);

        //Second Camera ( - x  axis )
        let cameraNX = new UniversalCamera("nx", Vector3.Zero(), scene);
        cameraNX.rotation = new Vector3(0, - Math.PI / 2, 0);
        this.cameraList.push(cameraNX);

        //Third Camera ( y axis )
        let cameraPY = new UniversalCamera("py", Vector3.Zero(), scene);
        cameraPY.rotation = new Vector3(Math.PI / 2, 0, 0);
        this.cameraList.push(cameraPY);

        //Fourth Camera ( - y axis )
        let cameraNY = new UniversalCamera("ny", Vector3.Zero(), scene);
        cameraNY.rotation = new Vector3(- Math.PI / 2, 0, 0);
        this.cameraList.push(cameraNY);

        //Fifth Camera ( z axis )
        let cameraPZ = new UniversalCamera("pz", Vector3.Zero(), scene);
        cameraPZ.rotation = new Vector3(0, 0, 0);
        this.cameraList.push(cameraPZ);

        //Sixth Camera ( - z axis )
        let cameraNZ = new UniversalCamera("nz", Vector3.Zero(), scene);
        cameraNZ.rotation = new Vector3(0, Math.PI, 0);
        this.cameraList.push(cameraNZ);

        //Change the attributes of all cameras
        for (let camera of this.cameraList) {
            camera.parent = this.sphere;
        }

        this.sphere.translate(position, 1);
        this.sphericalHarmonicChanged = false;
    }

    /**
     * Set the resolution used by the probe to render its surrounding
     * @param resolution The resolution to use
     */
    public setResolution(resolution : number) : void {
        this._resolution = resolution;
    }

    /**
     * Add a parent to the probe
     * @param parent The parent to be added
     */
    public setParent(parent : Mesh): void {
        this.sphere.parent = parent;
    }

    /**
     * Set the visibility of the probe
     * @param visisble The visibility of the probe
     */
    public setVisibility(visisble : number) : void {
        this.sphere.visibility = visisble;
    }

    private _renderCubeTexture(subMeshes : SmartArray<SubMesh>, isMRT : boolean) : void {

        var renderSubMesh = (subMesh : SubMesh, effect : Effect, view : Matrix, projection : Matrix, isMRT : boolean, rotation : Matrix) => {
            let mesh = subMesh.getRenderingMesh();

            mesh._bind(subMesh, effect, Material.TriangleFillMode);
            mesh.cullingStrategy = 2;
            if (subMesh.verticesCount === 0) {
                return;
            }
            if (isMRT)  {
                effect.setMatrix("view", view);
                effect.setMatrix("projection", projection);
                effect.setFloat("lightmapNumber", this.dictionary.containsKey(mesh.name) / this.dictionary.values().length);
                if (mesh.material != null) {
                    let color = (<PBRMaterial> (mesh.material)).albedoColor;
                    effect.setVector3("albedoColor", new Vector3(color.r, color.g, color.b));
                    if ((<PBRMaterial> (mesh.material)).albedoTexture != null){
                        effect.setBool("hasTexture", true);
                        effect.setTexture("albedoTexture", (<PBRMaterial> (mesh.material)).albedoTexture);
                    }
                    else {
                        effect.setBool("hasTexture", false);
                    }
                }
                effect.setVector3("probePosition", this.sphere.position);
            }
            else {
                effect.setMatrix("view", view);
                effect.setMatrix("projection", projection);
                if (mesh.material != null) {
                    let color = (<PBRMaterial> (mesh.material)).albedoColor;
                    effect.setVector3("albedoColor", new Vector3(color.r, color.g, color.b));
                    if ((<PBRMaterial> (mesh.material)).albedoTexture != null){
                        effect.setBool("hasTexture", true);
                        effect.setTexture("albedoTexture", (<PBRMaterial> (mesh.material)).albedoTexture);
                    }
                    else {
                        effect.setBool("hasTexture", false);
                    }
                }
                
                effect.setVector3("probePosition", this.sphere.position);

                let value = this.dictionary.getValue(mesh.name);
                if (value != null){
                    
                    effect.setTexture("irradianceMap", value.irradianceLightmap);
                    effect.setTexture("directIlluminationLightmap", value.directLightmap);
                }



                effect.setBool("firstBounce", this.firstBounce);

                /* 
                To add when we want the upgrade, where we render only one mesh
                */
                // effect.setTexture("envMap", this.cubicMRT.textures[1]);
                // effect.setTexture("envMapUV", this.cubicMRT.textures[0]);
                // effect.setInt("numberLightmap", this.dictionary.values().length);
                // let irradianceArray = new Array<BaseTexture>();
                // let directLightArray = new Array<BaseTexture>();
                // for (let value of this.dictionary.values()){
                //     irradianceArray.push(<BaseTexture> value.irradianceLightmap);
                //     if (value.directLightmap != null){
                //         directLightArray.push(<BaseTexture> value.directLightmap);
                //     }
                // }
                // effect.setTextureArray("irradianceMapArray",[irradianceArray[0],irradianceArray[0] ]);
                // effect.setTextureArray("directIlluminationLightMapArray", [directLightArray[0], directLightArray[0]]);
                
                // effect.setMatrix("rotation", rotation);

            }
            var batch = mesh._getInstancesRenderList(subMesh._id);
            if (batch.mustReturn) {
                return ;
            }
            var hardwareInstanceRendering = (engine.getCaps().instancedArrays) &&
            (batch.visibleInstances[subMesh._id] !== null);
            mesh._processRendering(mesh, subMesh, effect, Material.TriangleFillMode, batch, hardwareInstanceRendering,
                (isInstance, world) => effect.setMatrix("world", world));
        };

        let scene = this._scene;
        let engine = scene.getEngine();
        let gl = engine._gl;

        let internalTexture;
        let secondInternalTexture;
        let effect;
        if (isMRT) {
            internalTexture = <InternalTexture>this.cubicMRT.textures[0]._texture;
            secondInternalTexture = <InternalTexture> this.cubicMRT.textures[1]._texture;
            effect = this.uvEffect;
        }
        else {
            internalTexture = <InternalTexture>this.tempBounce.getInternalTexture();
            effect = this.bounceEffect;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, internalTexture._framebuffer);
        engine.setState(false, 0, true, scene.useRightHandedSystem);

        let viewMatrices = [ this.cameraList[Probe.PX].getViewMatrix(),
            this.cameraList[Probe.NX].getViewMatrix(),
            this.cameraList[Probe.PY].getViewMatrix(),
            this.cameraList[Probe.NY].getViewMatrix(),
            this.cameraList[Probe.PZ].getViewMatrix(),
            this.cameraList[Probe.NZ].getViewMatrix()
        ];

        let projectionMatrix =  Matrix.PerspectiveFovLH(Math.PI / 2, 1, 0.1, this.cameraList[0].maxZ);

        let cubeSides = [
            gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
        ];

        let rotationMatrices = [
            Matrix.RotationZ(-Math.PI / 2).multiply(Matrix.RotationX(Math.PI / 2)),
            Matrix.RotationZ(Math.PI / 2).multiply(Matrix.RotationX(Math.PI / 2)),
            Matrix.RotationX(-Math.PI),
            Matrix.Identity(),
            Matrix.RotationX(Math.PI / 2),
            Matrix.RotationZ(Math.PI).multiply(Matrix.RotationX(Math.PI / 2))
        ];
        engine.enableEffect(effect);

        for (let j = 0; j < 6; j++) {
            engine.setDirectViewport(0, 0, this.cubicMRT.getRenderWidth(), this.cubicMRT.getRenderHeight());
            gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, cubeSides[j], internalTexture._webGLTexture, 0);
            if (isMRT && secondInternalTexture != null) {
                gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT1, cubeSides[j], secondInternalTexture._webGLTexture, 0);
            }

            engine.clear(new Color4(0, 0, 0, 0), true, true);
            for (let i = 0; i < subMeshes.length; i++) {
                renderSubMesh(subMeshes.data[i], effect, viewMatrices[j], projectionMatrix, isMRT, rotationMatrices[j]);
            }
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /**
     * Render the 6 cameras of the probes with different effect to create the cube map we need
     * @param meshes The meshes we want to render
     */
    public render(meshes : Array<Mesh>, dictionary : MeshDictionary, uvEffet : Effect, bounceEffect : Effect) : void {
        this.dictionary = dictionary;
        this.uvEffect = uvEffet;
        this.bounceEffect = bounceEffect;
        /*
        for (let texture of this.cubicMRT.textures) {
            texture.isRenderTarget = true;
        }
        this.cubicMRT.renderList = meshes;
        this._scene.customRenderTargets.push(this.cubicMRT);
        this.cubicMRT.boundingBoxPosition = this.sphere.position;
        this.cubicMRT.refreshRate = MultiRenderTarget.REFRESHRATE_RENDER_ONCE;


        this.cubicMRT.customRenderFunction = (opaqueSubMeshes: SmartArray<SubMesh>, alphaTestSubMeshes: SmartArray<SubMesh>, transparentSubMeshes: SmartArray<SubMesh>, depthOnlySubMeshes: SmartArray<SubMesh>): void => {
            this._renderCubeTexture(opaqueSubMeshes, true);
        };

        this.cubicMRT.onAfterRenderObservable.add(() => {
            this.envCubeMapRendered = true;
        });
*/
    }

    /**
     * Render one bounce of the light from the point of view of a probe
     *
     * @param irradianceLightMap THe irradiance lightmap use to render the bounces
     */
    public renderBounce(meshes : Array<Mesh>) : void {
/*
        let ground = MeshBuilder.CreateGround("test", {width : 2, height : 2}, this._scene);
        ground.visibility = 0;
        ground.translate(new Vector3(0, 1, 0), 1.);
*/

        this.tempBounce.renderList = meshes;
        this._scene.customRenderTargets.push(this.tempBounce);

        this.tempBounce.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
        this.tempBounce.boundingBoxPosition = this.sphere.position;
        this.tempBounce.customRenderFunction =  (opaqueSubMeshes: SmartArray<SubMesh>, alphaTestSubMeshes: SmartArray<SubMesh>, transparentSubMeshes: SmartArray<SubMesh>, depthOnlySubMeshes: SmartArray<SubMesh>): void => {
            this._renderCubeTexture(opaqueSubMeshes, false);
        };
        this.tempBounce.onAfterRenderObservable.add(() => {
            this._CPUcomputeSHCoeff();
        });
    }

    /**
     * Initialise what need time to be ready
     * Is called in irradiance for the creation of the promise
     */
    public initPromise() : void {
        this.cubicMRT = new MultiRenderTarget("uvAlbedo", this._resolution, 2, this._scene, {isCube : true});
        this.tempBounce = new RenderTargetTexture("tempLightBounce", this._resolution, this._scene, undefined, true, this.cubicMRT.textureType, true);
    }

    /**
     * Return if the probe is ready to be render
     */
    public isProbeReady() : boolean {
        return this._isMRTReady() && this._isTempBounceReady();
    }

    private _isMRTReady() : boolean {
        return this.cubicMRT.isReady();
    }

    private _isTempBounceReady() : boolean {

        return this.tempBounce.isReady();
    }

    private _CPUcomputeSHCoeff() : void {
        //Possible problem, y can be inverted
        let sp = CubeMapToSphericalPolynomialTools.ConvertCubeMapTextureToSphericalPolynomial(this.tempBounce);
        if (sp != null) {
            this.sphericalHarmonic = SphericalHarmonics.FromPolynomial(sp);
            this._weightSHCoeff();
            this.sphericalHarmonicChanged = true;
        }
        this._computeProbeIrradiance();
    }

    private _computeProbeIrradiance() : void {
        //We use a shader to add this texture to the probe
        let shaderMaterial = new ShaderMaterial("irradianceOnSphere", this._scene,  "./../../src/Shaders/irradianceVolumeComputeIrradiance", {
            attributes : ["position", "normal"],
            uniforms : ["worldViewProjection"]
        });

        shaderMaterial.setVector3("L00", this.sphericalHarmonic.l00);

        shaderMaterial.setVector3("L10", this.sphericalHarmonic.l10);
        shaderMaterial.setVector3("L11", this.sphericalHarmonic.l11);
        shaderMaterial.setVector3("L1m1", this.sphericalHarmonic.l1_1);

        shaderMaterial.setVector3("L20", this.sphericalHarmonic.l20);
        shaderMaterial.setVector3("L21", this.sphericalHarmonic.l21);
        shaderMaterial.setVector3("L22", this.sphericalHarmonic.l22);
        shaderMaterial.setVector3("L2m1", this.sphericalHarmonic.l2_1);
        shaderMaterial.setVector3("L2m2", this.sphericalHarmonic.l2_2);
        this.sphere.material = shaderMaterial;

    }

    private _weightSHCoeff() {
        let weight = 0.5;
        this.sphericalHarmonic.l00 = this.sphericalHarmonic.l00.multiplyByFloats(weight, weight, weight);
        this.sphericalHarmonic.l10 = this.sphericalHarmonic.l10.multiplyByFloats(weight, weight, weight);
        this.sphericalHarmonic.l11 = this.sphericalHarmonic.l11.multiplyByFloats(weight, weight, weight);
        this.sphericalHarmonic.l1_1 = this.sphericalHarmonic.l1_1.multiplyByFloats(weight, weight, weight);
        this.sphericalHarmonic.l20 = this.sphericalHarmonic.l20.multiplyByFloats(weight, weight, weight);
        this.sphericalHarmonic.l21 = this.sphericalHarmonic.l21.multiplyByFloats(weight, weight, weight);
        this.sphericalHarmonic.l22 = this.sphericalHarmonic.l22.multiplyByFloats(weight, weight, weight);
        this.sphericalHarmonic.l2_1 = this.sphericalHarmonic.l2_1.multiplyByFloats(weight, weight, weight);
        this.sphericalHarmonic.l2_2 = this.sphericalHarmonic.l2_2.multiplyByFloats(weight, weight, weight);
    }

}