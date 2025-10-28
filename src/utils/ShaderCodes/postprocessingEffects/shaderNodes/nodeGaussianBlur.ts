import Framebuffer from "../../../framebuffer_textures/framebuffer";
import FramebufferPool from "../../../framebuffer_textures/framebufferPool";
import WebGLCore from "../../../webGLCore";
import CompositeShaderGaussianBlur from "../compositeTextures/compositeShaderGaussianBlur";
import DependencyResolver from "./dependencyResolver";
import { ShaderNode } from "./shaderNode";
import SliderBuilder, { Slider } from "./sliderBuilder";
import { InputSocket, OutputSocket } from "./socket";
import { SocketType } from "./socketTypeMap";

const SLIDER_CONFIGS = [{label : "radius", min: 0.01, max: 60, step: 0.01, value: 2.0 }];

export class NodeGaussianBlur implements ShaderNode {
    public readonly  filter :CompositeShaderGaussianBlur;
    public inputSockets: InputSocket<SocketType>[];
    public outputSockets: OutputSocket<SocketType>[];
    public id : number;
    public framebuffer : Framebuffer | null;
    public pool : FramebufferPool; 
    public dependencyResolver : DependencyResolver;
    public textures : WebGLTexture[] = [];

    public sliderConfigs = SLIDER_CONFIGS;
    public sliderMap: Record<string, Slider> = {};

    constructor (id : number, pool : FramebufferPool, wgl : WebGLCore) {
        this.id = id;
        this.pool = pool;
        // this.wgl = wgl;
        this.filter = new CompositeShaderGaussianBlur(wgl);
        
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

    private buildSliders () : void {
        for (const config of this.sliderConfigs) {
            const {label, min, max, value, step} = config;
            const slider : Slider = new SliderBuilder(label)
                .min(min).max(max).step(step).value(value).build();

            this.sliderMap[label] = slider;
        }
    }

    public updateUniformValues () :void {
        const radiusValue : number = this.sliderMap[this.sliderConfigs[0].label].value;
        this.filter.setUniformValues(radiusValue);
    } 

    public render (
        pool : FramebufferPool,
        textureWidth : number, 
        textureHeight : number,
        inputTextures : WebGLTexture[],
    ) : WebGLTexture | null {

       this.framebuffer = this.filter.render(pool, textureWidth, textureHeight, inputTextures);

        for (let i = 0; i < this.outputSockets.length; i++) {
            this.outputSockets[i].data = this.framebuffer.textures[i];
        }   

        return this.outputSockets[0].data;
    }
}

export default NodeGaussianBlur;





