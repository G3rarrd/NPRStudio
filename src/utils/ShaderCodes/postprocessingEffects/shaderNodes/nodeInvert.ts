import Framebuffer from "../../../framebuffer_textures/framebuffer";
import FramebufferPool from "../../../framebuffer_textures/framebufferPool";
import WebGLCore from "../../../webGLCore";
import ShaderInvert from "../nonCompositeTextures/shaderInvert";
import WebGLShaderPass from "../webGLShaderPass";
import DependencyResolver from "./dependencyResolver";
import { ShaderNode } from "./shaderNode";
import { InputSocket, OutputSocket } from "./socket";
import { SocketType } from "./socketTypeMap";

export class NodeInvert implements ShaderNode {
    public readonly  filter : ShaderInvert;
    public inputSockets: InputSocket<SocketType>[];
    public outputSockets: OutputSocket<SocketType>[];
    public id : number;
    public framebuffer : Framebuffer | null;
    public pool : FramebufferPool; 
    public dependencyResolver : DependencyResolver;
    public shaderPass : WebGLShaderPass;
    public textures : WebGLTexture[] = [];
    public wgl : WebGLCore;

    constructor (
        id : number, 
        pool : FramebufferPool,
        wgl : WebGLCore,
    ) {
        this.id = id;
        this.pool = pool;
        this.wgl = wgl;
        this.filter = new ShaderInvert(this.wgl);

        this.shaderPass = new WebGLShaderPass(this.wgl);

        this.inputSockets = [
            new InputSocket("input", SocketType.IMAGE, this.id)
        ];

        this.outputSockets = [
            new OutputSocket("output", SocketType.IMAGE, this.id)
        ];
        
        this.framebuffer = null;
        this.dependencyResolver = new DependencyResolver();
    }

    public isNodeNeeded() : boolean {
        return this.dependencyResolver.isResolved();
    }

    public render (
        pool : FramebufferPool,
        textureWidth : number, 
        textureHeight : number,
        inputTextures : WebGLTexture[],
    ) : WebGLTexture | null {
        const outputTextureCount = this.outputSockets.length;

        let fboWrite : Framebuffer = pool.getWrite(textureWidth, textureHeight, inputTextures, outputTextureCount);
        this.framebuffer = pool.getRead(textureWidth, textureHeight,  outputTextureCount);
        
        this.shaderPass.writeShader({
            program : this.filter.program,
            inputTextures, 
            textureWidth, 
            textureHeight, 
            fboWrite, 
            setFragmentUniforms : this.filter.setUniforms.bind(this.filter)
        });

        [this.framebuffer, fboWrite] = [fboWrite, this.framebuffer];

        pool.release(fboWrite);

        for (let i = 0; i < this.outputSockets.length; i++) {
            this.outputSockets[i].data = this.framebuffer.textures[i];
        }   

        return this.outputSockets[0].data;
    }
}



export default NodeInvert;