import Framebuffer from "../../../framebuffer_textures/framebuffer";
import FramebufferPool from "../../../framebuffer_textures/framebufferPool";
import WebGLCore from "../../../webGLCore";
import CompositeShaderFBL from "../compositeTextures/compositeShaderFBL";
import DependencyResolver from "./dependencyResolver";
import { ShaderNode } from "./shaderNode";
import SliderBuilder, { Slider } from "./sliderBuilder";
import { InputSocket, OutputSocket } from "./socket";
import { SocketType } from "./socketTypeMap";




const SLIDER_CONFIG = [
            {min: 0.01, max: 60, step : 0.001, value: 1.0, label: "radius e"},
            {min: 0.01, max: 60, step : 0.001, value: 1.0, label: "range radius e"},
            {min: 0.01, max: 60, step : 0.001, value: 1.0, label: "radius g"},
            {min: 0.01, max: 60, step : 0.001, value: 1.0, label: "range radius g"},
            {min: 3, max: 21, step : 2, value: 3, label: "etf kernel size"},
            {min: 2, max: 255, step : 1, value: 10,label: "color count"},
            {min: 1, max: 5, step : 1, value: 2, label: "iteration"},
            {min: 1, max: 5, step : 1, value: 2, label: "etf iteration"},
        ]

export class NodeFBL implements ShaderNode {
    public readonly  filter : CompositeShaderFBL;
    public inputSockets: InputSocket<SocketType>[];
    public outputSockets: OutputSocket<SocketType>[];
    public id : number;
    public framebuffer : Framebuffer | null;
    public pool : FramebufferPool; 
    public dependencyResolver : DependencyResolver;
    public textures : WebGLTexture[] = [];

    private sliderConfig = SLIDER_CONFIG;
    public sliderMap: Record<string, Slider> = {} as Record<string, Slider>;;

    constructor (id : number, pool : FramebufferPool, wgl : WebGLCore) {
        this.id = id;
        this.pool = pool;
        this.filter = new CompositeShaderFBL(wgl);
        
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
        const radiusE        : number = this.sliderMap["radius e"].value;
        const rangeRadiusE   : number = this.sliderMap["range radius e"].value;
        const radiusG        : number = this.sliderMap["radius g"].value;
        const rangeRadiusG   : number = this.sliderMap["range radius g"].value;
        const etfKernelSize  : number = this.sliderMap["etf kernel size"].value;
        const colorCount     : number = this.sliderMap["color count"].value;
        const iteration      : number = this.sliderMap["iteration"].value;
        const etfIteration   : number = this.sliderMap["etf iteration"].value;

        this.filter.setUniformValues(etfKernelSize, radiusE, radiusG, rangeRadiusE, rangeRadiusG, iteration, etfIteration, colorCount);
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

export default NodeFBL;