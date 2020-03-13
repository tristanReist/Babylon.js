import { Probe } from './Probe';
import { Vector3 } from '../../Maths/math.vector';
import { Scene } from '../../scene';
import { MeshBuilder } from '../../Meshes/meshBuilder';
import { Mesh } from '../../Meshes/mesh';
import { int } from '../../types';

export class UniformVolume {

    public box : Mesh;
    public width : int;
    public height : int;
    public depth : int;
    public probeList : Array<Probe>;

    /*
    Premier cas, on oblige la taille de la box à être un entier
    Ca ne sera pas le truc final donc on peut se permettre de faire ça
    Truc final = octree
    */
    constructor(name : string,  options: { size?: int, width?: int, height?: int, depth?: int}, scene: Scene , position? : Vector3) {
        this.box = MeshBuilder.CreateBox(name, options, scene);
        this.box.visibility = 0;
        //Create all the Probes

        this.probeList = new Array<Probe>();
        this.width = options.width || options.size || 1;
        this.height = options.height || options.size || 1;
        this.depth = options.depth || options.size || 1;
        for (var _z = - this.depth / 2; _z <= this.depth / 2; _z += 1) {
            for (var _y = - this.height / 2; _y <= this.height / 2; _y += 1) {
                for (var _x = - this.width / 2; _x <= this.width / 2; _x += 1) {
                    var currentProbe = new Probe(new Vector3(_x, _y, _z), scene);
                    currentProbe.setParent(this.box);
                    this.probeList.push(currentProbe);
                }
            }
        }

        //Translate the box and all the probes attach
        if (position) {
            this.box.translate(position, 1);
        }
    }

    /**
     * Find the surrounding probes of a position in space and
     * light these probes to show if it's working or not
     * @param point
     */
    public findSurroundingProbes(point : Vector3) : void {
        var selectedProbeIndexList = new Array<number>();
        //x, y & z index of. Find a probe == zIndex * width * hieght + yIndex * width + xIndex
        //If < 0 take the probes which are the closest
        var xIndex = point.x  - (this.box.position.x - (this.width / 2));
        var yIndex = point.y  - (this.box.position.y - (this.height / 2));
        var zIndex = point.z  - (this.box.position.z - (this.depth / 2));
        if (Math.floor(zIndex) < 0) {
            selectedProbeIndexList.push(0);
        }
        else if (Math.floor(zIndex) >= this.depth) {
            selectedProbeIndexList.push(this.depth * (this.width + 1) * (this.height + 1));
        }
        else {
            selectedProbeIndexList.push(Math.floor(zIndex) * (this.width + 1) * (this.height + 1));
            selectedProbeIndexList.push(Math.ceil(zIndex) * (this.width + 1) * (this.height + 1));
        }

        if (Math.floor(yIndex) < 0) {
            //Do nothing because it's + 0
        }
        else if (Math.floor(yIndex) >= this.height) {
            for (var _i = 0; _i < selectedProbeIndexList.length; _i++) {
              selectedProbeIndexList[_i] += this.height * (this.width + 1);
            }
        }
        else {
            var length = selectedProbeIndexList.length;
            for (var _i = 0; _i < length; _i++) {
                selectedProbeIndexList.push(selectedProbeIndexList[_i] + Math.floor(yIndex) * (this.width + 1));
                selectedProbeIndexList[_i] += Math.ceil(yIndex) * (this.width + 1);
            }
        }

        if (Math.floor(xIndex) < 0) {
            //Do nothing because it's + 0
        }
        else if (Math.floor(xIndex) >= this.width) {
            for (var _i = 0; _i < selectedProbeIndexList.length; _i++) {
                selectedProbeIndexList[_i] += this.width;
              }
        }
        else {
            var length = selectedProbeIndexList.length;
            for (var _i = 0; _i < length; _i++) {
                selectedProbeIndexList.push(selectedProbeIndexList[_i] + Math.floor(xIndex));
                selectedProbeIndexList[_i] += Math.ceil(xIndex);
            }
        }

        for (let index of selectedProbeIndexList) {
            this.probeList[index].addColor();
        }
    }

    public setProbeVisibility(visible : number) : void {
        for (let probe of this.probeList) {
            probe.setVisibility(visible);
        }
    }

}