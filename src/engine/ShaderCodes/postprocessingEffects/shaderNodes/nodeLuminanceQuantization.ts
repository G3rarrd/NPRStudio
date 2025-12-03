import Framebuffer from "../../../framebuffer_textures/framebuffer";
import FramebufferPool from "../../../framebuffer_textures/framebufferPool";
import WebGLCore from "../../../webGLCore";
import ShaderLuminanceQuantization from "../nonCompositeTextures/shaderLuminanceQuantization";
import WebGLShaderPass from "../webGLShaderPass";
import DependencyResolver from "./dependencyResolver";
import { ShaderNode } from "./shaderNode";
import SliderBuilder, { Slider } from "./sliderBuilder";
import { InputSocket, OutputSocket } from "./socket";
import { SocketType } from "./socketTypeMap";

const SLIDER_CONFIGS = [{label : "color count", min:2, max: 255, step: 1, value: 10 }];

export class NodeLuminanceQuantization implements ShaderNode {
    public readonly  filter : ShaderLuminanceQuantization;
    public inputSockets: InputSocket<SocketType>[];
    public outputSockets: OutputSocket<SocketType>[];
    public id : number;
    public framebuffer : Framebuffer | null;
    public pool : FramebufferPool; 
    public dependencyResolver : DependencyResolver;
    public shaderPass : WebGLShaderPass;
    public textures : WebGLTexture[] = [];

    private sliderConfig = SLIDER_CONFIGS;
    public sliderMap: Record<string, Slider> = {} as Record<string, Slider>;

    constructor (
        id : number, 
        pool : FramebufferPool,
        wgl : WebGLCore,
    ) {
        this.id = id;
        this.pool = pool;

        this.filter = new ShaderLuminanceQuantization(wgl);
        
        this.shaderPass = new WebGLShaderPass(wgl);
        
        this.dependencyResolver = new DependencyResolver();
        this.inputSockets = [
            new InputSocket("input", SocketType.IMAGE, this.id)
        ];
        
        this.outputSockets = [
            new OutputSocket("output", SocketType.IMAGE, this.id)
        ];
        
        this.framebuffer = null;
        this.buildSliders();
    }

    public isNodeNeeded() : boolean {
        return this.dependencyResolver.isResolved();
    }

    public buildSliders () : void {
        for (const {label, min, max, step, value} of this.sliderConfig) {
            const slider = new SliderBuilder(label)
                .min(min).max(max).step(step).value(value).build();
            this.sliderMap[label] = slider;
        }

        this.updateUniformValues();
   }

    public updateUniformValues () : void {
        const colorCount : number = this.sliderMap["color count"].value;
        this.filter.setUniformValues(colorCount);
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

export default NodeLuminanceQuantization;