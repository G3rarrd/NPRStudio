import Framebuffer from "../../../framebuffer_textures/framebuffer";
import DependencyResolver from "./dependencyResolver";
import { ShaderNode } from "./shaderNode";
import { InputSocket, OutputSocket } from "./socket";
import { SocketType } from "./socketTypeMap";

export class NodeInput implements ShaderNode {
    public inputSockets: InputSocket<SocketType>[];
    public outputSockets: OutputSocket<SocketType>[];
    public id : number;
    public framebuffer : Framebuffer | null = null;
    public dependencyResolver : DependencyResolver;
    public startTexture : WebGLTexture; 

    constructor (id : number, startTexture : WebGLTexture) {
        this.id = id;
        this.inputSockets = [];
        this.outputSockets = [new OutputSocket("output", SocketType.IMAGE, this.id )]; // Texture from the image is placed on this output socket
        this.startTexture = startTexture;
        this.dependencyResolver = new DependencyResolver();
    }

    public isNodeNeeded() : boolean{
        return this.dependencyResolver.isResolved();
    }

    public render () : WebGLTexture | null {
        this.outputSockets[0].data = this.startTexture;
        return this.outputSockets[0].data;
    }   
}

export default NodeInput;