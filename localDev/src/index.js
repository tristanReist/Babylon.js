// const sceneFolder = "/";
// const sceneFilename = "openRoom.babylon";
const sceneFolder = "./assets/models/kzp-scene/";
const sceneFilename = "fileName.gltf";
let placeHolderMaterial = null;
let viewManagerInstance = null;

const debug = true;
if (debug) {
    window.spector = new SPECTOR.Spector();
    window.spector.spyCanvases();
    window.spector.displayUI();
}

const uvm = new BABYLON.UvMapper();
const quality = 3;
const qualitySettings = [
    {
        objectLightmapSize: {
            width: 64,
            height: 64,
        },
        lightLightmapSize: {
            width: 8,
            height: 8,
        },
    },
    {
        objectLightmapSize: {
            width: 128,
            height: 128,
        },
        lightLightmapSize: {
            width: 16,
            height: 16,
        },
    },
    {
        objectLightmapSize: {
            width: 256,
            height: 256,
        },
        lightLightmapSize: {
            width: 32,
            height: 32,
        },
    },
    {
        objectLightmapSize: {
            width: 512,
            height: 512,
        },
        lightLightmapSize: {
            width: 64,
            height: 64,
        },
    },
];

const prepareUvs = (meshes) => {
    const meshesToProcess = meshes.filter((mesh) => (mesh.geometry && mesh.material && mesh.material.alpha === 1
        && mesh.name !== "earth"
        && mesh.name !== "skybox"
        && mesh.name !== "avatar"
        && mesh.name !== "ground"
    ));
    // const [uvWorldRatio, polygonsArea] = uvm.map(meshesToProcess, 0, 66.0);

    for (let i = 0; i < meshesToProcess.length; i++) {
        const mesh = meshesToProcess[i];
        const [[uvWorldRatioX, uvWorldRationY], polygonsArea] = uvm.map([mesh], 10, 66.0);

        if (!mesh.directInfo) {
            mesh.initForDirect();
            mesh.directInfo.shadowMapSize = qualitySettings[quality].objectLightmapSize;
        }

        mesh.directInfo.texelWorldSize = { width: 1 / (uvWorldRatioX * mesh.directInfo.shadowMapSize.width), height: 1 / (uvWorldRationY * mesh.directInfo.shadowMapSize.height) };
        // mesh.radiosityInfo.texelWorldSize = { width: 1 / (uvWorldRatioX * mesh.radiosityInfo.lightmapSize.width), height: 1 / (uvWorldRationY * mesh.radiosityInfo.lightmapSize.height) };
        // mesh.radiosityInfo.polygonWorldArea = polygonsArea[0];
        // mesh.radiosityInfo.polygonWorldArea = polygonsArea[i];
    }

    return meshesToProcess;
}

const addArealight = (position, size, scene) => {
    const light = BABYLON.Mesh.CreateGround("", size.x, size.y, 1, scene);
    light.position = position;
    light.material = placeHolderMaterial.clone();

    light.initForDirect();
    light.directInfo.shadowMapSize = qualitySettings[quality].lightLightmapSize;

    light.directInfo.color = new BABYLON.Vector3(50, 50, 50);

    prepareUvs([light]);

    return light;
}

const createScene = () => {
    const scene = new BABYLON.Scene(engine);
    viewManagerInstance = new ViewManager(engine);
    placeHolderMaterial = new BABYLON.StandardMaterial("place-holder", scene);
    placeHolderMaterial.ambientColor = new BABYLON.Color3(1.0, 1.0, 1.0);

    const camera = new BABYLON.FreeCamera("", new BABYLON.Vector3(0, 100, 0), scene);
    camera.speed = 10;
    camera.attachControl(engine.getRenderingCanvas(), true);

    const light = addArealight(new BABYLON.Vector3(-500, 160, 135), new BABYLON.Vector2(140, 140), scene);
    light.rotation.x = -Math.PI / 2;
    light.rotation.y = -Math.PI / 2;
    light.computeWorldMatrix(true);

    BABYLON.SceneLoader.ImportMesh("", sceneFolder, sceneFilename, scene, (meshes) => {
        for (const mesh of meshes) {
            if (mesh.material) {
                mesh.material = mesh.material.clone(mesh.material.name);
            } else {
                mesh.material = placeHolderMaterial.clone();
            }
        }

        const meshesLightmapped = prepareUvs(meshes);

        const near = 1;
        const far = 1500;
        const bias = 1e-6;
        // const pr = new BABYLON.RadiosityRenderer(scene, meshesLightmapped.concat(light), { near, far, bias });
        const pr = new BABYLON.DirectRenderer(scene, meshesLightmapped, { near, far, bias });
        // window.spector.startCapture(engine.getRenderingCanvas(), 1000000, false);
        pr.createDepthMaps([light]);
        // window.spector.stopCapture();

        const observer = scene.onAfterRenderTargetsRenderObservable.add(() => {
            // window.spector.startCapture(engine.getRenderingCanvas(), 1000000, false);
            pr.generateShadowMap([light]);
            // window.spector.stopCapture();

            for (const mesh of meshesLightmapped) {
                mesh.material.lightmapTexture = mesh.directInfo.shadowMap;
                mesh.material.useLightmapAsShadowmap = true;
                mesh.material.lightmapTexture.coordinatesIndex = 1;
            }

            scene.onAfterRenderTargetsRenderObservable.remove(observer);
        });

        // const observer = scene.onAfterRenderTargetsRenderObservable.add(() => {
        //     if (!pr.isReady()) {
        //         return;
        //     }

        //     pr.gatherDirectLightOnly();

        //     let plainteCount = 0;
        //     for (const mesh of meshesLightmapped.concat(light)) {
        //         mesh.material.lightmapTexture = mesh.getRadiosityTexture();
        //         mesh.material.lightmapTexture.coordinatesIndex = 1;

        //         console.log(mesh);
        //         if (mesh.material.name === "10") { // 14 plainte
        //             const uvs = mesh.getVerticesData(BABYLON.VertexBuffer.UV2Kind);
        //             const indices = mesh.getIndices();
        //             const size = 256;
        //             uvm.debugUvs(
        //                 new BABYLON.Vector2(Math.floor(plainteCount / 7) * (size + 10), size * (plainteCount % 7)),
        //                 new BABYLON.Vector2(size, size),
        //                 [uvs],
        //                 [indices]
        //             );
        //             const lightmapView = new ColorTextureView(
        //                 engine.getRenderingCanvas(),
        //                 new BABYLON.Vector2(size * (plainteCount % 7), Math.floor(plainteCount / 7) * (size + 10)),
        //                 new BABYLON.Vector2(size, size),
        //                 // mesh.radiosityInfo.residualTexture.textures[0]._texture
        //                 mesh.material.lightmapTexture._texture
        //             );
        //             viewManagerInstance.AddView(lightmapView);
        //             plainteCount++;
        //         }
        //     }

        //     console.log("Converged !");

        //     scene.onAfterRenderTargetsRenderObservable.remove(observer);
        //     // scene.ambientColor = new BABYLON.Color3(1, 1, 1);
        // });
    });

    return scene;
}
